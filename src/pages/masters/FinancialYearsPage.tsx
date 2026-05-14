import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { http } from '../../lib/http'
import { formatDate } from '../../lib/utils/formatters'
import { cn } from '../../lib/utils'

interface FY { id: string; code: string; name: string; startDate: string; endDate: string; isCurrent: boolean; status: string }

export default function FinancialYearsPage() {
  const navigate = useNavigate()
  const { data: fys = [], isLoading } = useQuery({
    queryKey: ['masters', 'financial-years'],
    queryFn:  () => http.get<FY[]>('/api/masters/financial-years'),
  })

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 pt-3 sm:px-6">
        <button onClick={() => navigate('/masters')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          ← Masters
        </button>
      </div>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
        <div>
          <h1 className="text-base font-semibold">Financial Years</h1>
          <p className="text-xs text-muted-foreground">{fys.length} financial years</p>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {isLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {fys.map(fy => (
              <div key={fy.id} className={cn('rounded-lg border p-4 flex items-center justify-between', fy.isCurrent ? 'border-primary/40 bg-primary/5' : 'border-border')}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{fy.name}</p>
                    {fy.isCurrent && <span className="rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs font-medium">Current</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(fy.startDate)} → {formatDate(fy.endDate)}</p>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', fy.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500')}>
                  {fy.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
