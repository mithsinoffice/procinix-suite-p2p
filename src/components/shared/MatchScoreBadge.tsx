import { cn } from '../../lib/utils'

interface Props {
  score:      number
  lane:       string
  guardrails?: string[]
  compact?:   boolean
}

const LANE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  STP:    { bg: 'bg-green-50 border-green-200',  text: 'text-green-700',  label: 'STP'    },
  REVIEW: { bg: 'bg-amber-50 border-amber-200',  text: 'text-amber-700',  label: 'Review' },
  MANUAL: { bg: 'bg-red-50   border-red-200',    text: 'text-red-700',    label: 'Manual' },
}

const GUARDRAIL_LABELS: Record<string, string> = {
  FIRST_INVOICE_FROM_VENDOR:   'First invoice — manual required',
  AMOUNT_EXCEEDS_STP_CEILING:  'Amount exceeds STP limit',
  BANK_KYC_NOT_VALID:          'Bank KYC not verified',
  EINVOICE_IRN_MISSING:        'e-Invoice IRN missing',
  '206AB_FLAG':                '206AB applicable',
  GST_RETURN_RISK_HIGH:        'High GST return risk',
}

export function MatchScoreBadge({ score, lane, guardrails = [], compact = false }: Props) {
  const style = LANE_STYLES[lane] ?? LANE_STYLES.MANUAL

  if (compact) {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', style.bg, style.text)}>
        <span className="tabular-nums font-semibold">{score}</span>
        <span className="opacity-70">/100</span>
        <span className="ml-0.5">{style.label}</span>
      </span>
    )
  }

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', style.bg)}>
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-sm font-semibold', style.text)}>Match score: {score}/100</p>
          <p className={cn('text-xs mt-0.5', style.text, 'opacity-70')}>AP Lane: {style.label}</p>
        </div>
        <div className="relative h-12 w-12">
          <svg className="rotate-[-90deg]" viewBox="0 0 36 36" style={{ width: 48, height: 48 }}>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3" className="opacity-20" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="3"
              strokeDasharray={`${score} ${100 - score}`}
              strokeLinecap="round"
              className={style.text}
            />
          </svg>
          <span className={cn('absolute inset-0 flex items-center justify-center text-xs font-bold', style.text)}>{score}</span>
        </div>
      </div>

      {guardrails.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Guardrails triggered</p>
          {guardrails.map(g => (
            <div key={g} className="flex items-center gap-1.5 text-xs text-red-600">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {GUARDRAIL_LABELS[g] ?? g}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
