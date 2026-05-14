import { getFlagImageUrl } from '../../lib/utils/country'
import { cn } from '../../lib/utils'

interface FlagImageProps {
  code:       string
  size?:      '24x18' | '32x24' | '48x36'
  className?: string
  showCode?:  boolean
}

export function FlagImage({ code, size = '24x18', className, showCode }: FlagImageProps) {
  if (!code) return null
  return (
    <span className="inline-flex items-center gap-1.5">
      <img
        src={getFlagImageUrl(code, size)}
        alt={code}
        className={cn('inline-block rounded-sm object-cover shadow-sm', className)}
        style={{
          width:  size === '24x18' ? 24 : size === '32x24' ? 32 : 48,
          height: size === '24x18' ? 18 : size === '32x24' ? 24 : 36,
        }}
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
      {showCode && <span className="text-xs font-mono text-muted-foreground">{code}</span>}
    </span>
  )
}
