import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import InputBase from '@mui/material/InputBase'
import Chip from '@mui/material/Chip'
import Collapse from '@mui/material/Collapse'
import SendIcon from '@mui/icons-material/Send'
import ReplyIcon from '@mui/icons-material/Reply'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { POOL_MEMBERS } from '@/config/pool'
import type { ChatMessage, ReactionsMap } from '@/hooks/useChat'

const QUICK_EMOJIS = ['👍', '👎', '🍆', '💯', '⚽️', '🚨']

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffH = (now.getTime() - d.getTime()) / 3600000
  if (diffH < 24) return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      const name = part.slice(1).toLowerCase()
      const member = POOL_MEMBERS.find(
        (m) => m.displayName.split(' ')[0].toLowerCase() === name ||
               m.displayName.toLowerCase().replace(' ', '') === name
      )
      return (
        <Box key={i} component="span" sx={{ color: member ? member.color : 'primary.main', fontWeight: 700 }}>
          {part}
        </Box>
      )
    }
    return part
  })
}

// ─── ReactionRow ─────────────────────────────────────────────────────────────

function ReactionRow({
  messageId,
  reactions,
  currentMemberId,
  onToggle,
}: {
  messageId: string
  reactions: ReactionsMap
  currentMemberId: string | null
  onToggle: (emoji: string) => void
}) {
  const msgReactions = reactions[messageId] ?? []
  if (msgReactions.length === 0) return null

  // group by emoji
  const grouped: Record<string, { count: number; isMine: boolean }> = {}
  for (const r of msgReactions) {
    if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, isMine: false }
    grouped[r.emoji].count++
    if (r.member_id === currentMemberId) grouped[r.emoji].isMine = true
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
      {Object.entries(grouped).map(([emoji, { count, isMine }]) => (
        <Box
          key={emoji}
          onClick={() => onToggle(emoji)}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 0.75, py: 0.25, borderRadius: 3, cursor: 'pointer',
            bgcolor: isMine ? 'rgba(144,202,249,0.18)' : 'rgba(255,255,255,0.07)',
            border: isMine ? '1px solid rgba(144,202,249,0.45)' : '1px solid rgba(255,255,255,0.12)',
            '&:active': { opacity: 0.7 },
          }}
        >
          <Typography sx={{ fontSize: '0.85rem', lineHeight: 1 }}>{emoji}</Typography>
          <Typography sx={{ fontSize: '0.65rem', color: isMine ? 'primary.light' : 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
            {count}
          </Typography>
        </Box>
      ))}
    </Box>
  )
}

// ─── EmojiPicker ─────────────────────────────────────────────────────────────

function EmojiPicker({ onPick }: { onPick: (e: string) => void }) {
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {QUICK_EMOJIS.map((e) => (
        <Box
          key={e}
          onClick={() => onPick(e)}
          sx={{
            fontSize: '1.3rem', cursor: 'pointer', p: 0.5, borderRadius: 1.5,
            '&:active': { bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          {e}
        </Box>
      ))}
    </Box>
  )
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  allMessages,
  isOwn,
  currentMemberId,
  reactions,
  onReply,
  onToggleReaction,
}: {
  msg: ChatMessage
  allMessages: ChatMessage[]
  isOwn: boolean
  currentMemberId: string | null
  reactions: ReactionsMap
  onReply: (msg: ChatMessage) => void
  onToggleReaction: (msgId: string, emoji: string) => void
}) {
  const sender = POOL_MEMBERS.find((m) => m.id === msg.member_id)
  const currentMember = POOL_MEMBERS.find((m) => m.id === currentMemberId)
  const firstName = currentMember?.displayName.split(' ')[0].toLowerCase() ?? ''
  const isMentioned = !isOwn && firstName && msg.content.toLowerCase().includes(`@${firstName}`)
  const [actionsOpen, setActionsOpen] = useState(false)

  const replyParent = msg.reply_to ? allMessages.find((m) => m.id === msg.reply_to) : null
  const replyParentSender = replyParent ? POOL_MEMBERS.find((m) => m.id === replyParent.member_id) : null

  function handleBubbleTap() {
    setActionsOpen((v) => !v)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: isOwn ? 'row-reverse' : 'row', gap: 1, mb: 1.5, alignItems: 'flex-end' }}>
      {!isOwn && (
        <Avatar sx={{ bgcolor: sender?.color, width: 28, height: 28, fontSize: '0.55rem', fontWeight: 700, flexShrink: 0, mb: 0.25 }}>
          {sender?.avatarInitials ?? '?'}
        </Avatar>
      )}
      <Box sx={{ maxWidth: '76%' }}>
        {!isOwn && (
          <Typography sx={{ fontSize: '0.65rem', color: sender?.color ?? 'text.secondary', fontWeight: 700, mb: 0.25, ml: 0.5 }}>
            {sender?.displayName.split(' ')[0] ?? msg.member_id}
          </Typography>
        )}

        {/* Quoted reply preview */}
        {replyParent && (
          <Box
            sx={{
              ml: isOwn ? 0 : 0.5, mr: isOwn ? 0.5 : 0,
              mb: 0.25, px: 1, py: 0.4,
              borderLeft: `3px solid ${replyParentSender?.color ?? 'rgba(255,255,255,0.4)'}`,
              bgcolor: 'rgba(255,255,255,0.05)',
              borderRadius: '0 6px 6px 0',
            }}
          >
            <Typography sx={{ fontSize: '0.6rem', color: replyParentSender?.color ?? 'text.secondary', fontWeight: 700 }}>
              {replyParentSender?.displayName.split(' ')[0] ?? 'Unknown'}
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
              {replyParent.content}
            </Typography>
          </Box>
        )}

        {/* Bubble */}
        <Box
          onClick={handleBubbleTap}
          sx={{
            px: 1.5, py: 1,
            borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            bgcolor: isOwn ? 'primary.dark' : isMentioned ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)',
            border: isMentioned ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
            cursor: 'pointer', userSelect: 'none',
          }}
        >
          <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.4, wordBreak: 'break-word' }}>
            {renderContent(msg.content)}
          </Typography>
        </Box>

        {/* Reactions */}
        <Box sx={{ mx: 0.5 }}>
          <ReactionRow
            messageId={msg.id}
            reactions={reactions}
            currentMemberId={currentMemberId}
            onToggle={(emoji) => onToggleReaction(msg.id, emoji)}
          />
        </Box>

        {/* Timestamp */}
        <Typography sx={{ fontSize: '0.6rem', color: 'text.secondary', mt: 0.25, mx: 0.5, textAlign: isOwn ? 'right' : 'left' }}>
          {formatTime(msg.created_at)}
        </Typography>

        {/* Action bar (tap-to-open) */}
        <Collapse in={actionsOpen}>
          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.5, mx: 0.5,
              flexDirection: isOwn ? 'row-reverse' : 'row',
            }}
          >
            <EmojiPicker onPick={(emoji) => { onToggleReaction(msg.id, emoji); setActionsOpen(false) }} />
            {/* Divider */}
            <Box sx={{ width: '1px', height: 22, bgcolor: 'rgba(255,255,255,0.18)', mx: 0.5, flexShrink: 0 }} />
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onReply(msg); setActionsOpen(false) }}
              sx={{ color: 'text.secondary', p: 0.5, '&:active': { color: 'primary.light' } }}
            >
              <ReplyIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Collapse>
      </Box>
    </Box>
  )
}

// ─── ChatPage ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const { currentMember } = useAuth()
  const { messages, reactions, loading, sendMessage, toggleReaction, markRead } = useChat(currentMember?.id ?? null)
  const [input, setInput] = useState('')
  const [mentioning, setMentioning] = useState(false)
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { markRead() }, [messages.length]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const text = input.trim()
    if (!text || !currentMember) return
    setInput('')
    setReplyTo(null)
    await sendMessage(text, replyTo?.id ?? null)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSend() }
    if (e.key === 'Escape') setReplyTo(null)
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
    if (lastAt >= 0 && lastAt === val.length - 1) setMentioning(true)
    else if (mentioning && !val.includes('@')) setMentioning(false)
  }

  function handleReply(msg: ChatMessage) {
    setReplyTo(msg)
    inputRef.current?.focus()
  }

  const others = POOL_MEMBERS.filter((m) => m.id !== currentMember?.id)
  const replyParentSender = replyTo ? POOL_MEMBERS.find((m) => m.id === replyTo.member_id) : null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
        <Typography sx={{ fontFamily: 'Barlow Condensed', fontWeight: 700, fontSize: '1.1rem', letterSpacing: 1 }}>
          POOL CHAT
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Tap a message to reply or react
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
              allMessages={messages}
              isOwn={msg.member_id === currentMember?.id}
              currentMemberId={currentMember?.id ?? null}
              reactions={reactions}
              onReply={handleReply}
              onToggleReaction={(msgId, emoji) => void toggleReaction(msgId, emoji)}
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

      {/* Reply preview banner */}
      {replyTo && (
        <Box
          sx={{
            mx: 1.5, mb: 0.5, px: 1.5, py: 0.75,
            bgcolor: 'rgba(255,255,255,0.05)',
            borderLeft: `3px solid ${replyParentSender?.color ?? 'rgba(255,255,255,0.4)'}`,
            borderRadius: '0 8px 8px 0',
            display: 'flex', alignItems: 'center', gap: 1,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.65rem', color: replyParentSender?.color ?? 'text.secondary', fontWeight: 700 }}>
              Replying to {replyParentSender?.displayName.split(' ')[0] ?? 'Unknown'}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {replyTo.content}
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setReplyTo(null)} sx={{ color: 'text.secondary', p: 0.25 }}>
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
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
          onClick={() => void handleSend()}
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
