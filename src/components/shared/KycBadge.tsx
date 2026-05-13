import { cn } from '../../lib/utils'

interface KycBadgeProps { label: string; status?: string | null; className?: string }

const STATUS_MAP: Record<string, { color: string; dot: string; text: string }> = {
  VALID:          { color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500',  text: 'Valid'      },
  ACTIVE:         { color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500',  text: 'Active'     },
  REGISTERED:     { color: 'bg-green-50 text-green-700 border-green-200',  dot: 'bg-green-500',  text: 'MSME ✓'    },
  INVALID:        { color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500',    text: 'Invalid'    },
  NAME_MISMATCH:  { color: 'bg-amber-50 text-amber-700 border-amber-200',  dot: 'bg-amber-500',  text: 'Mismatch'   },
  CANCELLED:      { color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500',    text: 'Cancelled'  },
  DEACTIVATED:    { color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500',    text: 'Deactivated'},
  STRUCK_OFF:     { color: 'bg-red-50 text-red-700 border-red-200',        dot: 'bg-red-500',    text: 'Struck off' },
  ERROR:          { color: 'bg-gray-50 text-gray-500 border-gray-200',     dot: 'bg-gray-400',   text: 'Error'      },
}

const DEFAULT = { color: 'bg-gray-50 text-gray-400 border-gray-200', dot: 'bg-gray-300', text: '—' }

export function KycBadge({ label, status, className }: KycBadgeProps) {
  const s = status ? (STATUS_MAP[status] ?? DEFAULT) : DEFAULT
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', s.color, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', s.dot)} />
      <span className="text-[10px] font-medium opacity-60">{label}</span>
      <span>{s.text}</span>
    </span>
  )
}
