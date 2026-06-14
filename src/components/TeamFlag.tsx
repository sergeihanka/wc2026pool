import { teamFlagUrl } from '@/lib/flags'

interface Props {
  tla: string
  size?: number
}

export function TeamFlag({ tla, size = 24 }: Props) {
  const url = teamFlagUrl(tla)
  if (!url) return <span style={{ fontFamily: 'monospace', fontSize: size * 0.5 }}>{tla}</span>
  return (
    <img
      src={url}
      alt={tla}
      style={{
        width: Math.round(size * 1.333),
        height: size,
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: 2,
        flexShrink: 0,
      }}
    />
  )
}
