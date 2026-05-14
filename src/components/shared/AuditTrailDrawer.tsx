import { useEffect, useRef } from 'react'
import { X, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { formatDateTime } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface Props {
  open:       boolean
  onClose:    () => void
  entityType: string
  entityId:   string
  entityName: string
}

const ACTION_COLORS: Record<string, string> = {
  created:   'bg-green-100 text-green-700',
  updated:   'bg-blue-100 text-blue-700',
  submitted: 'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  deleted:   'bg-red-100 text-red-700',
}

function getActionColor(action: string): string {
  for (const [key, color] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return color
  }
  return 'bg-gray-100 text-gray-700'
}

export function AuditTrailDrawer({ open, onClose, entityType, entityId, entityName }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit', entityType, entityId],
    queryFn:  () => http.get<any[]>(`/api/masters/${entityType}s/${entityId}/audit`),
    enabled:  open && !!entityId,
    staleTime: 30_000,
  })

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Overlay */}
      {open && <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />}

      {/* Drawer */}
      <div
        ref={ref}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Audit trail</p>
            <p className="text-xs text-muted-foreground">{entityName}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No audit history yet</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {logs.map(log => {
                  const actionLabel = log.action.split('.').pop() ?? log.action
                  const color       = getActionColor(log.action)
                  return (
                    <div key={log.id} className="relative flex gap-3 pl-9">
                      {/* Dot */}
                      <div className={cn('absolute left-2 top-1 h-3 w-3 rounded-full border-2 border-background', color.split(' ')[0].replace('bg-', 'bg-').replace('100', '400'))} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize', color)}>
                            {actionLabel}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">by {log.userId}</p>

                        {/* Changes */}
                        {log.after && Object.keys(log.after).length > 0 && (
                          <div className="mt-2 rounded-md bg-muted/50 p-2 space-y-1">
                            {Object.entries(log.after as Record<string, unknown>)
                              .filter(([k]) => !['tenantId', 'createdByUserId'].includes(k))
                              .slice(0, 6)
                              .map(([k, v]) => (
                                <div key={k} className="flex items-start gap-1.5 text-xs">
                                  <span className="text-muted-foreground font-medium min-w-0 truncate max-w-[120px]">{k}:</span>
                                  <span className="text-foreground truncate">{String(v ?? '—')}</span>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
