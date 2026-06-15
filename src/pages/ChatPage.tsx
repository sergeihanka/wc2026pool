import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Chip from '@mui/material/Chip'
import SendIcon from '@mui/icons-material/Send'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { POOL_MEMBERS } from '@/config/pool'
import type { ChatMessage } from '@/hooks/useChat'

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3600000
  if (diffH < 24) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function renderContent(content: string): React.ReactNode {
  // Highlight @mentions
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).toLowerCase()
      const member = POOL_MEMBERS.find(
        (m) => m.displayName.split(' ')[0].toLowerCase() === name || m.displayName.toLowerCase().replace(' ', '') === name
      )
      return (
        <Box
          key={i}
          component="span"
          sx={{ color: member ? member.color : 'primary.main', fontWeight: 700 }}
        >
          {part}
        </Box>
      )
    }
    return part
  })
}

function MessageBubble({ msg, isOwn, currentMemberId }: { msg: ChatMessage; isOwn: boolean; currentMemberId: string | null }) {
  const sender = POOL_MEMBERS.find((m) => m.id === msg.member_id)
  const currentMember = POOL_MEMBERS.find((m) => m.id === currentMemberId)
  const firstName = currentMember?.displayName.split(' ')[0].toLowerCase() ?? ''
  const isMentioned = !isOwn && firstName && msg.content.toLowerCase().includes(`@${firstName}`)

  return (
    <Box sx={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 1, mb: 1.5, alignItems: 'flex-end' }}>
      {!isOwn && (
        <Avatar sx={{ bgcolor: sender?.color, width: 28, height: 28, fontSize: '0.55rem', fontWeight: 700, flexShrink: 0, mb: 0.25 }}>
          {sender?.avatarInitials ?? '?'}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '72%' }}>
        {!isOwn && (
          <Typography sx={{ fontSize: '0.65rem', color: sender?.color ?? 'text.secondary', fontWeight: 700, mb: 0.25, ml: 0.5 }}>
            {sender?.displayName.split(' ')[0] ?? msg.member_id}
          </Typography>
        )}
        <Box
          sx={{
            px: 1.5, py: 1,
            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            bgcolor: isOwn ? 'primary.dark' : isMentioned ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
            border: isMentioned ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
          }}
        >
          <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
            {renderContent(msg.content)}
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mt: 0.25, mx: 0.5, textAlign: isOwn ? 'right' : 'left' }}>
          {formatTime(msg.created_at)}
        </Typography>
      </Box>
    </Box>
  )
}

export default function ChatPage() {
  const { currentMember } = useAuth()
  const { messages, loading, sendMessage, markRead } = useChat(currentMember?.id ?? null)
  const [input, setInput] = useState('')
  const [mentioning, setMentioning] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Mark read on mount and when messages arrive
  useEffect(() => {
    markRead()
  }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text || !currentMember) return
    setInput('')
    await sendMessage(text)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
  }

  function insertMention(firstName: string) {
    setInput((prev) => {
      const atIdx = prev.lastIndexOf('@')
      const base = atIdx >= 0 ? prev.slice(0, atIdx) : prev
      return `${base}@${firstName} `
    })
    setMentioning(false)
    inputRef.current?.focus()
  }

  function handleInput(val: string) {
    setInput(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0 && lastAt === val.length - 1) {
      setMentioning(true)
    } else if (mentioning && !val.includes('@')) {
      setMentioning(false)
    }
  }

  const others = POOL_MEMBERS.filter((m) => m.id !== currentMember?.id)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.1rem', letterSpacing: 1 }}>
          POOL CHAT
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Tag someone with @Name to talk trash
        </Typography>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, pt: 1.5 }}>
        {loading ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>Loading…</Typography>
        ) : messages.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            No messages yet. Start the trash talk.
          </Typography>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isOwn={msg.member_id === currentMember?.id}
              currentMemberId={currentMember?.id ?? null}
            />
          ))
        )}
        <div ref={bottomRef} />
      </Box>

      {/* @mention picker */}
      {mentioning && (
        <Box sx={{ px: 1.5, pb: 0.75, display: 'flex', gap: 0.75, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {others.map((m) => (
            <Chip
              key={m.id}
              label={m.displayName.split(' ')[0]}
              size="small"
              onClick={() => insertMention(m.displayName.split(' ')[0])}
              sx={{ bgcolor: `${m.color}22`, border: `1px solid ${m.color}66`, color: m.color, fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
            />
          ))}
        </Box>
      )}

      {/* Input */}
      <Box
        sx={{
          px: 1.5, py: 1,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: 1, alignItems: 'flex-end',
          bgcolor: 'background.paper', flexShrink: 0,
        }}
      >
        <Avatar sx={{ bgcolor: currentMember?.color, width: 30, height: 30, fontSize: '0.55rem', fontWeight: 700, flexShrink: 0 }}>
          {currentMember?.avatarInitials}
        </Avatar>
        <Box sx={{ flex: 1, bgcolor: 'rgba(255,255,255,0.06)', borderRadius: 3, px: 1.5, py: 0.75 }}>
          <InputBase
            inputRef={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentMember ? 'Message… (@ to tag)' : 'Select your profile to chat'}
            disabled={!currentMember}
            multiline
            maxRows={4}
            fullWidth
            sx={{ fontSize: '1rem', color: 'text.primary' }}
          />
        </Box>
        <IconButton
          onClick={handleSend}
          disabled={!input.trim() || !currentMember}
          size="small"
          sx={{ color: input.trim() ? 'primary.main' : 'text.secondary', mb: 0.25 }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  )
}
