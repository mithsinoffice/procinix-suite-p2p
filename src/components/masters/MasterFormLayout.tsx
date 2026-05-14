import { cn } from '../../lib/utils'
import { Send } from 'lucide-react'

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h3 className="text-base font-semibold">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>
}

export function FormField({
  label, hint, required, error, icon, children, span,
}: {
  label: string; hint?: string; required?: boolean
  error?: string; icon?: React.ReactNode
  children: React.ReactNode; span?: boolean
}) {
  return (
    <div className={cn('space-y-1.5', span && 'sm:col-span-2')}>
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {icon ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium select-none">{icon}</span>
          <div className="pl-7">{children}</div>
        </div>
      ) : children}
      {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

export function FormInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none',
        'placeholder:text-muted-foreground',
        'focus:ring-2 focus:ring-ring focus:ring-offset-1',
        'disabled:bg-muted/40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    />
  )
}

export function FormSelect({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none',
        'focus:ring-2 focus:ring-ring focus:ring-offset-1',
        className
      )}
      {...props}
    />
  )
}

export function FormTextarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none resize-none',
        'placeholder:text-muted-foreground',
        'focus:ring-2 focus:ring-ring focus:ring-offset-1',
        className
      )}
      {...props}
    />
  )
}

export function AutoCodeField({ value }: { value?: string }) {
  return (
    <div className={cn(
      'w-full rounded-lg border border-dashed border-input bg-muted/30 px-3 py-2.5 text-sm',
      value ? 'text-foreground font-mono' : 'text-muted-foreground'
    )}>
      {value ?? 'Auto-generated on save'}
    </div>
  )
}

export function WorkflowBanner({ rule = '1-step approval', sla = 'SLA not yet tracked' }: { rule?: string; sla?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-primary/10 border border-primary/20 px-4 py-3">
      <p className="text-sm text-primary font-medium">
        Workflow: {rule} · {sla}
      </p>
      <button className="text-sm text-primary font-medium hover:underline">View →</button>
    </div>
  )
}

export function FormPageHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack: () => void }) {
  return (
    <div className="mb-6">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3">
        <span>←</span> Back
      </button>
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  )
}

export function FormFooter({
  onCancel, onDraft, onSubmit, isPending,
}: {
  onCancel: () => void; onDraft: () => void
  onSubmit: () => void; isPending?: boolean
}) {
  return (
    <div className="flex items-center justify-end gap-3 pt-4">
      <button onClick={onCancel}
        className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted">
        Cancel
      </button>
      <button onClick={onDraft} disabled={isPending}
        className="rounded-lg border border-input px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-60">
        Save as draft
      </button>
      <button onClick={onSubmit} disabled={isPending}
        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
        <Send className="h-3.5 w-3.5" />
        Submit for approval
      </button>
    </div>
  )
}
