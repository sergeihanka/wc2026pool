// Maps FIFA 3-letter codes to ISO 3166-1 alpha-2 codes for local flag SVGs.
const FIFA_TO_ISO: Record<string, string> = {
  // Pool teams
  ARG: 'AR', NED: 'NL', FRA: 'FR', CRO: 'HR', ESP: 'ES', USA: 'US',
  POR: 'PT', SUI: 'CH', ENG: 'GB', MAR: 'MA', BRA: 'BR', URU: 'UY',
  // UEFA
  GER: 'DE', ITA: 'IT', BEL: 'BE', DEN: 'DK', SWE: 'SE', NOR: 'NO',
  AUT: 'AT', SRB: 'RS', ROU: 'RO', TUR: 'TR', UKR: 'UA', GRE: 'GR',
  SCO: 'GB', WAL: 'GB', IRL: 'IE', HUN: 'HU', CZE: 'CZ', SVK: 'SK',
  SVN: 'SI', POL: 'PL', ALB: 'AL', GEO: 'GE', ISL: 'IS', FIN: 'FI',
  MKD: 'MK', BIH: 'BA', MNE: 'ME', LUX: 'LU', KOS: 'XK', XKX: 'XK',
  // CONCACAF
  MEX: 'MX', CAN: 'CA', CRC: 'CR', PAN: 'PA', JAM: 'JM', HON: 'HN',
  SLV: 'SV', HAI: 'HT', TRI: 'TT', CUB: 'CU', GUA: 'GT', CUW: 'CW',
  // CONMEBOL
  COL: 'CO', ECU: 'EC', PER: 'PE', CHI: 'CL', VEN: 'VE', BOL: 'BO', PAR: 'PY',
  // CAF
  NGA: 'NG', SEN: 'SN', CMR: 'CM', EGY: 'EG', RSA: 'ZA', TUN: 'TN',
  ALG: 'DZ', CIV: 'CI', MLI: 'ML', GHA: 'GH', COD: 'CD', ETH: 'ET',
  MOZ: 'MZ', ZAM: 'ZM', TAN: 'TZ', UGA: 'UG', ANG: 'AO', ZIM: 'ZW',
  COM: 'KM', BFA: 'BF', GAB: 'GA', KEN: 'KE',
  CGO: 'CG', COG: 'CG',            // Republic of Congo
  CPV: 'CV', CAP: 'CV',            // Cape Verde
  // AFC
  JPN: 'JP', KOR: 'KR', KSA: 'SA', IRN: 'IR', CHN: 'CN', IDN: 'ID',
  QAT: 'QA', AUS: 'AU', NZL: 'NZ', UZB: 'UZ', JOR: 'JO', BHR: 'BH',
  KUW: 'KW', OMA: 'OM', IRQ: 'IQ', PLE: 'PS', UAE: 'AE', THA: 'TH',
  VIE: 'VN', KGZ: 'KG', TJK: 'TJ',
}

// Full country names for display in team drawers / popups.
export const TEAM_NAMES: Record<string, string> = {
  ARG: 'Argentina', NED: 'Netherlands', FRA: 'France', CRO: 'Croatia',
  ESP: 'Spain', USA: 'United States', POR: 'Portugal', SUI: 'Switzerland',
  ENG: 'England', MAR: 'Morocco', BRA: 'Brazil', URU: 'Uruguay',
  GER: 'Germany', ITA: 'Italy', BEL: 'Belgium', DEN: 'Denmark',
  SWE: 'Sweden', NOR: 'Norway', AUT: 'Austria', SRB: 'Serbia',
  ROU: 'Romania', TUR: 'Türkiye', UKR: 'Ukraine', GRE: 'Greece',
  SCO: 'Scotland', WAL: 'Wales', IRL: 'Ireland', HUN: 'Hungary',
  CZE: 'Czechia', SVK: 'Slovakia', SVN: 'Slovenia', POL: 'Poland',
  ALB: 'Albania', GEO: 'Georgia', ISL: 'Iceland', FIN: 'Finland',
  MKD: 'North Macedonia', BIH: 'Bosnia & Herzegovina', MNE: 'Montenegro',
  LUX: 'Luxembourg', KOS: 'Kosovo', XKX: 'Kosovo',
  MEX: 'Mexico', CAN: 'Canada', CRC: 'Costa Rica', PAN: 'Panama',
  JAM: 'Jamaica', HON: 'Honduras', SLV: 'El Salvador', HAI: 'Haiti',
  TRI: 'Trinidad & Tobago', CUB: 'Cuba', GUA: 'Guatemala', CUW: 'Curaçao',
  COL: 'Colombia', ECU: 'Ecuador', PER: 'Peru', CHI: 'Chile',
  VEN: 'Venezuela', BOL: 'Bolivia', PAR: 'Paraguay',
  NGA: 'Nigeria', SEN: 'Senegal', CMR: 'Cameroon', EGY: 'Egypt',
  RSA: 'South Africa', TUN: 'Tunisia', ALG: 'Algeria', CIV: 'Ivory Coast',
  MLI: 'Mali', GHA: 'Ghana', COD: 'DR Congo', ETH: 'Ethiopia',
  MOZ: 'Mozambique', ZAM: 'Zambia', TAN: 'Tanzania', UGA: 'Uganda',
  ANG: 'Angola', ZIM: 'Zimbabwe', COM: 'Comoros', BFA: 'Burkina Faso',
  GAB: 'Gabon', KEN: 'Kenya', CGO: 'Congo', COG: 'Congo', CPV: 'Cape Verde', CAP: 'Cape Verde',
  JPN: 'Japan', KOR: 'South Korea', KSA: 'Saudi Arabia', IRN: 'Iran',
  CHN: 'China', IDN: 'Indonesia', QAT: 'Qatar', AUS: 'Australia',
  NZL: 'New Zealand', UZB: 'Uzbekistan', JOR: 'Jordan', BHR: 'Bahrain',
  KUW: 'Kuwait', OMA: 'Oman', IRQ: 'Iraq', PLE: 'Palestine',
  UAE: 'UAE', THA: 'Thailand', VIE: 'Vietnam', KGZ: 'Kyrgyzstan', TJK: 'Tajikistan',
}

function isoToFlag(iso: string): string {
  return [...iso.toUpperCase()].map(c =>
    String.fromCodePoint(c.charCodeAt(0) + 127397),
  ).join('')
}

/** Returns the flag emoji for a FIFA TLA (e.g. 'ARG' → '🇦🇷').
 *  Falls back to the original code if no mapping exists. */
export function teamFlag(tla: string): string {
  if (!tla || tla === 'TBD') return tla
  const iso = FIFA_TO_ISO[tla.toUpperCase()]
  return iso ? isoToFlag(iso) : tla
}

/** Returns a local SVG flag URL for a FIFA TLA. */
export function teamFlagUrl(tla: string): string | null {
  if (!tla || tla === 'TBD') return null
  const iso = FIFA_TO_ISO[tla.toUpperCase()]
  return iso ? `/flags/${iso.toLowerCase()}.svg` : null
}
