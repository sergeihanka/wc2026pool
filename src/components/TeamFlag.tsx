import { teamFlagUrl } from '@/lib/flags'

interface Props {
  tla: string
  size?: number
}

export function TeamFlag({ tla, size = 24 }: Props) {
  const url = teamFlagUrl(tla)
  if (!url) return <span style={{ fontFamily: 'monospace' }}>{tla}</span>
  return (
    <img
      src={url}
      alt={tla}
      style={{ height: size, display: 'inline-block', verticalAlign: 'middle', borderRadius: 2 }}
    />
  )
}
