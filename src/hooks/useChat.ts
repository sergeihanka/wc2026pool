import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { POOL_MEMBERS } from '@/config/pool'

export interface ChatMessage {
  id: string
  member_id: string
  content: string
  created_at: string
  reply_to: string | null
}

export interface ChatReaction {
  id: string
  message_id: string
  member_id: string
  emoji: string
}

// reactions grouped by message: { [messageId]: ChatReaction[] }
export type ReactionsMap = Record<string, ChatReaction[]>

const READ_KEY = (memberId: string) => `chat_last_read_${memberId}`

export function useChat(currentMemberId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [reactions, setReactions] = useState<ReactionsMap>({})
  const [loading, setLoading] = useState(true)
  const [unreadMentions, setUnreadMentions] = useState(0)

  // Load initial messages + reactions
  useEffect(() => {
    let cancelled = false
    Promise.all([
      supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(200),
      supabase
        .from('chat_reactions')
        .select('*'),
    ]).then(([msgRes, rxRes]) => {
      if (cancelled) return
      if (msgRes.data) setMessages(msgRes.data as ChatMessage[])
      if (rxRes.data) setReactions(groupReactions(rxRes.data as ChatReaction[]))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  // Realtime: messages
  useEffect(() => {
    const ch = supabase
      .channel(`chat-msg-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage])
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [])

  // Realtime: reactions
  useEffect(() => {
    const ch = supabase
      .channel(`chat-rx-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const rx = payload.new as ChatReaction
        setReactions((prev) => {
          const list = [...(prev[rx.message_id] ?? []), rx]
          return { ...prev, [rx.message_id]: list }
        })
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_reactions' }, (payload) => {
        const rx = payload.old as ChatReaction
        setReactions((prev) => {
          const list = (prev[rx.message_id] ?? []).filter((r) => r.id !== rx.id)
          return { ...prev, [rx.message_id]: list }
        })
      })
      .subscribe()
    return () => { void supabase.removeChannel(ch) }
  }, [])

  // Unread mention count
  useEffect(() => {
    if (!currentMemberId) { setUnreadMentions(0); return }
    const member = POOL_MEMBERS.find((m) => m.id === currentMemberId)
    if (!member) { setUnreadMentions(0); return }
    const firstName = member.displayName.split(' ')[0]
    const lastRead = localStorage.getItem(READ_KEY(currentMemberId))
    const lastReadDate = lastRead ? new Date(lastRead) : new Date(0)
    const count = messages.filter((msg) => {
      if (msg.member_id === currentMemberId) return false
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

  async function sendMessage(content: string, replyTo?: string | null): Promise<boolean> {
    if (!currentMemberId || !content.trim()) return false
    const { error } = await supabase.from('chat_messages').insert({
      member_id: currentMemberId,
      content: content.trim(),
      reply_to: replyTo ?? null,
    })
    return !error
  }

  async function toggleReaction(messageId: string, emoji: string): Promise<void> {
    if (!currentMemberId) return
    const existing = (reactions[messageId] ?? []).find(
      (r) => r.member_id === currentMemberId && r.emoji === emoji,
    )
    if (existing) {
      await supabase.from('chat_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('chat_reactions').insert({ message_id: messageId, member_id: currentMemberId, emoji })
    }
  }

  return { messages, reactions, loading, unreadMentions, sendMessage, toggleReaction, markRead }
}

function groupReactions(rows: ChatReaction[]): ReactionsMap {
  const map: ReactionsMap = {}
  for (const r of rows) {
    if (!map[r.message_id]) map[r.message_id] = []
    map[r.message_id].push(r)
  }
  return map
}
