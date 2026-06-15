import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POOL_MEMBERS } from '@/config/pool'

export interface ChatMessage {
  id: string
  member_id: string
  content: string
  created_at: string
}

const READ_KEY = (memberId: string) => `chat_last_read_${memberId}`

export function useChat(currentMemberId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadMentions, setUnreadMentions] = useState(0)

  // Load initial messages
  useEffect(() => {
    let cancelled = false
    supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled && data) setMessages(data as ChatMessage[])
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // Realtime subscription
  useEffect(() => {
    const channelName = `chat-${Math.random().toString(36).slice(2)}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage])
      })
      .subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [])

  // Compute unread mentions for current member
  useEffect(() => {
    if (!currentMemberId) { setUnreadMentions(0); return }
    const member = POOL_MEMBERS.find((m) => m.id === currentMemberId)
    if (!member) { setUnreadMentions(0); return }
    const firstName = member.displayName.split(' ')[0]
    const lastRead = localStorage.getItem(READ_KEY(currentMemberId))
    const lastReadDate = lastRead ? new Date(lastRead) : new Date(0)
    const count = messages.filter((msg) => {
      if (msg.member_id === currentMemberId) return false // own messages don't count
      if (new Date(msg.created_at) <= lastReadDate) return false
      return msg.content.toLowerCase().includes(`@${firstName.toLowerCase()}`)
    }).length
    setUnreadMentions(count)
  }, [messages, currentMemberId])

  function markRead() {
    if (!currentMemberId) return
    localStorage.setItem(READ_KEY(currentMemberId), new Date().toISOString())
    setUnreadMentions(0)
  }

  async function sendMessage(content: string): Promise<boolean> {
    if (!currentMemberId || !content.trim()) return false
    const { error } = await supabase.from('chat_messages').insert({
      member_id: currentMemberId,
      content: content.trim(),
    })
    return !error
  }

  return { messages, loading, unreadMentions, sendMessage, markRead }
}
