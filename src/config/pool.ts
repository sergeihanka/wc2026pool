/**
 * SECURITY NOTE: passwords are base64-encoded for bundle obfuscation only.
 * This is not cryptographic security — it is cosmetic per PRD §5.3.
 * Anyone with access to the bundle can decode these with atob().
 */

import type { PoolMember } from '@/types'

export const POOL_MEMBERS: PoolMember[] = [
  {
    id: 'sergei_hanka',
    displayName: 'Sergei Hanka',
    teams: ['ARG', 'NED'],
    avatarInitials: 'SH',
  },
  {
    id: 'matt_woelfel',
    displayName: 'Matt Woelfel',
    teams: ['FRA', 'CRO'],
    avatarInitials: 'MW',
  },
  {
    id: 'jacob_colstrom',
    displayName: 'Jacob Colstrom',
    teams: ['ESP', 'USA'],
    avatarInitials: 'JC',
  },
  {
    id: 'charlie_dwyer',
    displayName: 'Charlie Dwyer',
    teams: ['POR', 'SUI'],
    avatarInitials: 'CD',
  },
  {
    id: 'luke_snell',
    displayName: 'Luke Snell',
    teams: ['ENG', 'MAR'],
    avatarInitials: 'LS',
  },
  {
    id: 'micah_mogler',
    displayName: 'Micah Mogler',
    teams: ['BRA', 'URU'],
    avatarInitials: 'MM',
  },
]

/**
 * Base64-encoded passwords (cosmetic obfuscation only — not cryptographic security).
 * Encoded with btoa() at authoring time; decoded with atob() at verification time.
 */
const MEMBER_PASSWORDS: Record<string, string> = {
  sergei_hanka:    btoa('hanka-arn-ned'),
  matt_woelfel:    btoa('woelfel-fra-cro'),
  jacob_colstrom:  btoa('colstrom-esp-usa'),
  charlie_dwyer:   btoa('dwyer-por-sui'),
  luke_snell:      btoa('snell-eng-mar'),
  micah_mogler:    btoa('mogler-bra-uru'),
}

/**
 * Verifies a plaintext password against the stored base64-encoded credential.
 * Member ID lookup is case-insensitive.
 */
export function verifyPassword(memberId: string, plaintext: string): boolean {
  const normalizedId = memberId.toLowerCase()
  const encoded = MEMBER_PASSWORDS[normalizedId]
  if (!encoded) return false
  return atob(encoded) === plaintext
}
