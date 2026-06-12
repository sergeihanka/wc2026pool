// Maps FIFA 3-letter codes to ISO 3166-1 alpha-2 codes for flag emoji generation.
const FIFA_TO_ISO: Record<string, string> = {
  // Pool teams
  ARG: 'AR', NED: 'NL', FRA: 'FR', CRO: 'HR', ESP: 'ES', USA: 'US',
  POR: 'PT', SUI: 'CH', ENG: 'GB', MAR: 'MA', BRA: 'BR', URU: 'UY',
  // UEFA
  GER: 'DE', ITA: 'IT', BEL: 'BE', DEN: 'DK', SWE: 'SE', NOR: 'NO',
  AUT: 'AT', SRB: 'RS', ROU: 'RO', TUR: 'TR', UKR: 'UA', GRE: 'GR',
  SCO: 'GB', WAL: 'GB', IRL: 'IE', HUN: 'HU', CZE: 'CZ', SVK: 'SK',
  SVN: 'SI', POL: 'PL', ALB: 'AL', GEO: 'GE', ISL: 'IS', FIN: 'FI',
  MKD: 'MK', BIH: 'BA', MNE: 'ME', LUX: 'LU', KOS: 'XK',
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
  // AFC
  JPN: 'JP', KOR: 'KR', KSA: 'SA', IRN: 'IR', CHN: 'CN', IDN: 'ID',
  QAT: 'QA', AUS: 'AU', NZL: 'NZ', UZB: 'UZ', JOR: 'JO', BHR: 'BH',
  KUW: 'KW', OMA: 'OM', IRQ: 'IQ', PLE: 'PS', UAE: 'AE', THA: 'TH',
  VIE: 'VN', KGZ: 'KG', TJK: 'TJ',
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

/** Returns a flagcdn.com PNG URL for a FIFA TLA — works on all platforms including Windows. */
export function teamFlagUrl(tla: string): string | null {
  if (!tla || tla === 'TBD') return null
  const iso = FIFA_TO_ISO[tla.toUpperCase()]
  return iso ? `https://flagcdn.com/w40/${iso.toLowerCase()}.png` : null
}
