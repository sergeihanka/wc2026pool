import type { Config, Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { POOL_MEMBERS } from '../../src/config/pool.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType = 'GOAL' | 'KICKOFF' | 'FULLTIME'

interface RequestBody {
  matchId: number
  type: NotificationType
  teamShortCode: string
  minute?: number
  scorer?: string
  homeTeam: string
  awayTeam: string
  homeScore: number | null
  awayScore: number | null
}

interface OneSignalFilter {
  field?: string
  key?: string
  relation?: string
  value?: string
  operator?: 'OR'
}

// ---------------------------------------------------------------------------
// Helper: build OneSignal filter array for multiple member IDs
// ---------------------------------------------------------------------------

function buildMemberFilters(memberIds: string[]): OneSignalFilter[] {
  const filters: OneSignalFilter[] = []
  memberIds.forEach((id, index) => {
    if (index > 0) {
      filters.push({ operator: 'OR' })
    }
    filters.push({ field: 'tag', key: 'memberId', relation: '=', value: id })
  })
  return filters
}

// ---------------------------------------------------------------------------
// Helper: build notification title + body
// ---------------------------------------------------------------------------

function buildNotificationContent(body: RequestBody): { title: string; message: string } {
  const score = `${body.homeTeam} ${body.homeScore ?? 0}–${body.awayScore ?? 0} ${body.awayTeam}`

  switch (body.type) {
    case 'GOAL':
      return {
        title: `⚽ GOAL! ${body.teamShortCode}`,
        message: `${body.scorer ?? 'Unknown'} ${body.minute ?? ''}' — ${score}`,
      }
    case 'KICKOFF':
      return {
        title: '🏁 Kick Off!',
        message: `${body.homeTeam} vs ${body.awayTeam}`,
      }
    case 'FULLTIME':
      return {
        title: '🏁 Full Time',
        message: score,
      }
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(req: Request, _context: Context): Promise<Response> {
  // POST only
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Parse and validate body
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate required fields
  if (
    typeof body.matchId !== 'number' ||
    !['GOAL', 'KICKOFF', 'FULLTIME'].includes(body.type) ||
    typeof body.teamShortCode !== 'string' ||
    typeof body.homeTeam !== 'string' ||
    typeof body.awayTeam !== 'string'
  ) {
    return new Response(JSON.stringify({ error: 'Missing or invalid required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Read server-side env vars (never exposed to client bundle)
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const oneSignalAppId = process.env['ONESIGNAL_APP_ID']
  const oneSignalApiKey = process.env['ONESIGNAL_REST_API_KEY']

  if (!supabaseUrl || !supabaseServiceKey || !oneSignalAppId || !oneSignalApiKey) {
    console.error('[send-notification] Missing required environment variables')
    return new Response(JSON.stringify({ error: 'Server misconfiguration' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ---------------------------------------------------------------------------
  // 1. Dedup check — query notification_log
  // ---------------------------------------------------------------------------
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  let dedupQuery = supabase
    .from('notification_log')
    .select('id')
    .eq('match_id', body.matchId)
    .eq('type', body.type)

  if (body.type === 'GOAL') {
    // For goals, also match scorer and minute to allow multiple goals per match
    if (body.scorer !== undefined) {
      dedupQuery = dedupQuery.eq('scorer', body.scorer)
    }
    if (body.minute !== undefined) {
      dedupQuery = dedupQuery.eq('minute', body.minute)
    }
  }

  const { data: existing, error: dedupError } = await dedupQuery.maybeSingle()

  if (dedupError) {
    console.error('[send-notification] Dedup query error:', dedupError.message)
    return new Response(JSON.stringify({ error: 'Database error during dedup check' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (existing) {
    return new Response(JSON.stringify({ skipped: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ---------------------------------------------------------------------------
  // 2. Find recipients
  // ---------------------------------------------------------------------------
  let recipientIds: string[]

  if (body.type === 'FULLTIME') {
    // Full time affects everyone's standings — notify all members
    recipientIds = POOL_MEMBERS.map((m) => m.id)
  } else {
    // GOAL or KICKOFF — only members who follow the involved team
    recipientIds = POOL_MEMBERS
      .filter((m) => m.teams.includes(body.teamShortCode))
      .map((m) => m.id)
  }

  if (recipientIds.length === 0) {
    // No one to notify — still write dedup record to prevent future checks
    await supabase.from('notification_log').insert({
      match_id: body.matchId,
      type: body.type,
      team_short_code: body.teamShortCode,
      minute: body.minute ?? null,
      scorer: body.scorer ?? null,
      sent_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ sent: true, recipientCount: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ---------------------------------------------------------------------------
  // 3. Build and send OneSignal notification
  // ---------------------------------------------------------------------------
  const { title, message } = buildNotificationContent(body)
  const filters = buildMemberFilters(recipientIds)

  const oneSignalPayload = {
    app_id: oneSignalAppId,
    filters,
    headings: { en: title },
    contents: { en: message },
  }

  const oneSignalRes = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${oneSignalApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(oneSignalPayload),
  })

  if (!oneSignalRes.ok) {
    const errText = await oneSignalRes.text()
    console.error('[send-notification] OneSignal error:', oneSignalRes.status, errText)
    return new Response(JSON.stringify({ error: 'Failed to send push notification' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // ---------------------------------------------------------------------------
  // 4. Write dedup record to notification_log
  // ---------------------------------------------------------------------------
  const { error: insertError } = await supabase.from('notification_log').insert({
    match_id: body.matchId,
    type: body.type,
    team_short_code: body.teamShortCode,
    minute: body.minute ?? null,
    scorer: body.scorer ?? null,
    sent_at: new Date().toISOString(),
  })

  if (insertError) {
    // Log but don't fail the request — notification was already sent
    console.error('[send-notification] Failed to write notification_log:', insertError.message)
  }

  return new Response(
    JSON.stringify({ sent: true, recipientCount: recipientIds.length }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

export const config: Config = {
  path: '/api/send-notification',
}
