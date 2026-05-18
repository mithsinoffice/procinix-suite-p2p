import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Loader2, Send, AlertTriangle, Power } from 'lucide-react'
import { http, HttpError } from '../../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, ApiSelect,
} from '../../../components/masters/MasterFormLayout'
import { cn } from '../../../lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { value: 'AP_CLERK',         label: 'AP Clerk'         },
  { value: 'AP_MANAGER',       label: 'AP Manager'       },
  { value: 'APPROVER_L1',      label: 'Approver L1'      },
  { value: 'APPROVER_L2',      label: 'Approver L2'      },
  { value: 'APPROVER_L3',      label: 'Approver L3'      },
  { value: 'FINANCE_MANAGER',  label: 'Finance Manager'  },
  { value: 'PROCUREMENT_HEAD', label: 'Procurement Head' },
  { value: 'DEPT_HEAD',        label: 'Department Head'  },
  { value: 'CFO',              label: 'CFO'              },
  { value: 'MD',               label: 'MD / CEO'         },
  { value: 'ADMIN',            label: 'Admin'            },
  { value: 'TENANT_ADMIN',     label: 'Tenant Admin'     },
  { value: 'USER',             label: 'Standard User'    },
  { value: 'VIEWER',           label: 'Viewer'           },
]
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_REGEX = /^(\+\d{1,3})?\d{10}$/

// ── Zod ───────────────────────────────────────────────────────────────────────

const schema = z.object({
  name:               z.string().min(1, 'Name is required'),
  email:              z.string().min(1, 'Email is required').regex(EMAIL_REGEX, 'Enter a valid email address'),
  mobile:             z.string().optional().refine(v => !v || MOBILE_REGEX.test(v.replace(/\s/g, '')), 'Enter a valid mobile number'),
  profilePhoto:       z.string().optional(),
  isActive:           z.boolean(),
  mustResetPassword:  z.boolean(),
  password:           z.string().optional(),
  confirmPassword:    z.string().optional(),
  role:               z.string().min(1, 'Primary role is required'),
  additionalRoles:    z.array(z.string()).optional(),
  employeeId:         z.string().optional(),
  emailNotifications: z.boolean(),
  inAppNotifications: z.boolean(),
  dailyDigest:        z.boolean(),
}).superRefine((data, ctx) => {
  if (data.password || data.confirmPassword) {
    if ((data.password ?? '').length < 8) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Password must be at least 8 characters' })
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: 'Passwords do not match' })
    }
  }
})
type UserForm = z.infer<typeof schema>

interface EntityAccessRow {
  id?:              string
  entityId:         string
  roleOverride:     string
  canApprove:       boolean
  approvalLimit:    string  // string in form, parsed to decimal on submit
  canCreatePO:      boolean
  canCreateInvoice: boolean
  canViewOnly:      boolean
  isActive:         boolean
}

const emptyAccess = (): EntityAccessRow => ({
  entityId: '', roleOverride: '', canApprove: false, approvalLimit: '',
  canCreatePO: false, canCreateInvoice: true, canViewOnly: false, isActive: true,
})

// ── UI helpers ────────────────────────────────────────────────────────────────

function SectionHeader({ letter, title, subtitle }: { letter: string; title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border pb-2 mb-4">
      <span className="text-sm font-bold text-primary">{letter}.</span>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  )
}

function Field({ label, required, hint, error, span, children }: {
  label: string; required?: boolean; hint?: string; error?: string; span?: boolean; children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', span && 'col-span-2')}>
      <label className="text-sm font-medium">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint  && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Toggle({ value, onChange, label, description, disabled }: {
  value: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean
}) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!value)} disabled={disabled}
      className={cn(
        'flex items-start gap-3 w-full rounded-lg border border-input bg-background px-4 py-3 text-left transition-colors',
        value && 'border-primary/50 bg-primary/5',
        disabled && 'opacity-60 cursor-not-allowed',
      )}>
      <span className={cn('mt-0.5 flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors',
        value ? 'bg-primary' : 'bg-muted')}>
        <span className={cn('h-4 w-4 rounded-full bg-background transition-transform', value && 'translate-x-4')} />
      </span>
      <span className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </span>
    </button>
  )
}

function fieldCls(hasError: boolean, filledAndValid: boolean) {
  if (hasError)       return 'border-destructive focus:ring-destructive/20'
  if (filledAndValid) return 'border-primary/50'
  return ''
}

const cellInputCls = 'px-1.5 py-1 text-xs rounded'

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)
  const [generatedPwd, setGeneratedPwd] = useState<string | null>(null)
  const [access, setAccess] = useState<EntityAccessRow[]>([])
  const [linkedEmployee, setLinkedEmployee] = useState<any>(null)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey:  ['user', id],
    queryFn:   () => http.get<any>(`/api/admin/users/${id}`),
    enabled:   isEdit,
    staleTime: 0,
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<UserForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      isActive:           true,
      mustResetPassword:  true,
      role:               'USER',
      additionalRoles:    [],
      emailNotifications: true,
      inAppNotifications: true,
      dailyDigest:        false,
    },
  })

  const isActive          = useWatch({ control, name: 'isActive' })          ?? true
  const mustReset         = useWatch({ control, name: 'mustResetPassword' }) ?? true
  const emailWatch        = useWatch({ control, name: 'email' })             ?? ''
  const mobileWatch       = useWatch({ control, name: 'mobile' })            ?? ''
  const additionalRoles   = useWatch({ control, name: 'additionalRoles' })   ?? []
  const employeeIdWatch   = useWatch({ control, name: 'employeeId' })        ?? ''
  const emailNoti         = useWatch({ control, name: 'emailNotifications' })?? false
  const inAppNoti         = useWatch({ control, name: 'inAppNotifications' })?? false
  const dailyDigestWatch  = useWatch({ control, name: 'dailyDigest' })       ?? false

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        name:               existing.name ?? '',
        email:              existing.email ?? '',
        mobile:             existing.mobile ?? '',
        profilePhoto:       existing.profilePhoto ?? '',
        isActive:           !!existing.isActive,
        mustResetPassword:  !!existing.mustResetPassword,
        role:               existing.role ?? 'USER',
        additionalRoles:    Array.isArray(existing.additionalRoles) ? existing.additionalRoles : [],
        employeeId:         existing.employeeId ?? '',
        emailNotifications: existing.emailNotifications ?? true,
        inAppNotifications: existing.inAppNotifications ?? true,
        dailyDigest:        existing.dailyDigest ?? false,
      })
      setAccess((existing.entityAccess ?? []).map((e: any) => ({
        id:               e.id,
        entityId:         e.entityId,
        roleOverride:     e.roleOverride ?? '',
        canApprove:       !!e.canApprove,
        approvalLimit:    e.approvalLimit ? String(e.approvalLimit) : '',
        canCreatePO:      !!e.canCreatePO,
        canCreateInvoice: e.canCreateInvoice !== false,
        canViewOnly:      !!e.canViewOnly,
        isActive:         e.isActive !== false,
      })))
    }
  }, [existing, reset])

  // Fetch the linked employee so we can show Department / Designation / Manager read-only
  useEffect(() => {
    if (!employeeIdWatch) { setLinkedEmployee(null); return }
    let cancelled = false
    http.get<any>(`/api/masters/employees/${employeeIdWatch}`)
      .then(emp => { if (!cancelled) setLinkedEmployee(emp) })
      .catch(() => { if (!cancelled) setLinkedEmployee(null) })
    return () => { cancelled = true }
  }, [employeeIdWatch])

  // ── Save ──
  const save = useMutation({
    mutationFn: async (data: UserForm) => {
      const payload: any = {
        ...data,
        entityAccess: access
          .filter(a => a.entityId)
          .map(a => ({
            entityId:         a.entityId,
            roleOverride:     a.roleOverride || null,
            canApprove:       a.canApprove,
            approvalLimit:    a.canApprove && a.approvalLimit ? Number(a.approvalLimit) : null,
            canCreatePO:      a.canCreatePO,
            canCreateInvoice: a.canCreateInvoice,
            canViewOnly:      a.canViewOnly,
            isActive:         a.isActive,
          })),
      }
      // Don't send empty strings/passwords on PUT
      if (!payload.password)        delete payload.password
      if (!payload.confirmPassword) delete payload.confirmPassword
      if (!payload.employeeId)      delete payload.employeeId
      if (!payload.mobile)          delete payload.mobile
      if (!payload.profilePhoto)    delete payload.profilePhoto

      return isEdit
        ? http.put<any>(`/api/admin/users/${id}`, payload)
        : http.post<any>('/api/admin/users', payload)
    },
    onSuccess: (res: any) => {
      setApiError(null)
      qc.invalidateQueries({ queryKey: ['users'] })
      if (!isEdit && res?.generatedPassword) {
        // Show temporary password before navigating away
        setGeneratedPwd(res.generatedPassword)
        return
      }
      navigate('/masters/users')
    },
    onError: (err: unknown) => {
      if (err instanceof HttpError)      setApiError(err.error.message || `Save failed (${err.error.status})`)
      else if (err instanceof Error)     setApiError(err.message)
      else                               setApiError('Save failed — please retry')
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => http.post<{ isActive: boolean }>(`/api/admin/users/${id}/toggle-active`, {}),
    onSuccess:  (res) => { setValue('isActive', res.isActive); qc.invalidateQueries({ queryKey: ['users'] }) },
  })

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  function toggleAdditionalRole(value: string) {
    const current = additionalRoles ?? []
    const next = current.includes(value) ? current.filter(r => r !== value) : [...current, value]
    setValue('additionalRoles', next)
  }

  const isPending = save.isPending

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.name ?? 'User'}` : 'New User'}
        description="System login, roles, entity access and notification preferences"
        backLabel="Users"
        backTo="/masters/users"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/masters/users')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            {isEdit && (
              <button type="button" disabled={toggleActive.isPending}
                onClick={() => toggleActive.mutate()}
                className={cn('flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60',
                  isActive ? 'border-red-200 text-red-700' : 'border-green-200 text-green-700')}>
                <Power className="h-3.5 w-3.5" />
                {isActive ? 'Deactivate' : 'Activate'}
              </button>
            )}
            <button type="button" disabled={isPending}
              onClick={handleSubmit(d => save.mutate(d))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              {isEdit ? 'Save changes' : 'Create user'}
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
              <div><p className="text-sm font-medium text-red-700">Save failed</p><p className="text-xs text-red-600 mt-0.5">{apiError}</p></div>
            </div>
          )}

          {generatedPwd && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-amber-800">User created — temporary password generated</p>
              <p className="text-xs text-amber-700">Share this password with the user; they'll be forced to reset on first login.</p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-white border border-amber-300 px-2 py-1 text-sm font-mono">{generatedPwd}</code>
                <button onClick={() => navigator.clipboard?.writeText(generatedPwd)} className="text-xs text-amber-700 hover:underline">Copy</button>
                <button onClick={() => navigate('/masters/users')} className="ml-auto rounded-lg bg-amber-700 px-3 py-1 text-xs font-medium text-white hover:opacity-90">Done</button>
              </div>
            </div>
          )}

          {/* A. Account Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="Account Identity" subtitle="Login credentials and basic profile" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Full name" required error={errors.name?.message}>
                <FormInput placeholder="Mithilesh Tiwari" {...register('name')} />
              </Field>
              <Field label="Email" required error={errors.email?.message}
                hint="Unique within this tenant — used as the login id">
                <FormInput type="email" placeholder="user@company.com"
                  className={fieldCls(!!errors.email, !!emailWatch && !errors.email && EMAIL_REGEX.test(emailWatch))}
                  {...register('email')} />
              </Field>
              <Field label="Mobile" error={errors.mobile?.message} hint="10 digits or +91 9XXXXXXXXX">
                <FormInput type="tel" placeholder="9800000000"
                  className={fieldCls(!!errors.mobile, !!mobileWatch && !errors.mobile && MOBILE_REGEX.test(mobileWatch.replace(/\s/g, '')))}
                  {...register('mobile')} />
              </Field>
              <Field label="Profile photo URL" hint="Optional — paste a URL or leave blank">
                <FormInput placeholder="https://…" {...register('profilePhoto')} />
              </Field>
              <Field label="Account active" span>
                <Toggle value={isActive} onChange={v => setValue('isActive', v)}
                  label="User can log in"
                  description="Deactivating prevents login but preserves their history and audit trail" />
              </Field>
              <Field label="Force password reset on next login" span>
                <Toggle value={mustReset} onChange={v => setValue('mustResetPassword', v)}
                  label="Must reset password"
                  description="When ON the user will be required to change their password on next login" />
              </Field>
            </div>
          </div>

          {/* B. Password — only on create */}
          {!isEdit && (
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="B" title="Password" subtitle="Leave blank to auto-generate a temporary password" />
              <div className="grid grid-cols-2 gap-4">
                <Field label="Password" error={errors.password?.message} hint="Minimum 8 characters">
                  <FormInput type="password" autoComplete="new-password" {...register('password')} />
                </Field>
                <Field label="Confirm password" error={errors.confirmPassword?.message}>
                  <FormInput type="password" autoComplete="new-password" {...register('confirmPassword')} />
                </Field>
              </div>
            </div>
          )}
          {isEdit && (
            <div className="rounded-xl border border-border bg-card p-6">
              <SectionHeader letter="B" title="Password" subtitle="Use the 'Reset password' action from the user list to change a password" />
              <p className="text-xs text-muted-foreground">For security, password changes go through the dedicated reset flow.</p>
            </div>
          )}

          {/* C. Role & Permissions */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Role & Permissions"
              subtitle="Primary role drives approval routing. Additional roles grant extra permissions." />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary role" required error={errors.role?.message} span>
                <FormSelect {...register('role')}>
                  {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Additional roles" hint="Grants extra permissions on top of the primary role" span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SYSTEM_ROLES.map(r => (
                    <label key={r.value}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors',
                        (additionalRoles ?? []).includes(r.value)
                          ? 'border-primary bg-primary/5'
                          : 'border-input bg-background hover:bg-muted',
                      )}>
                      <input type="checkbox"
                        checked={(additionalRoles ?? []).includes(r.value)}
                        onChange={() => toggleAdditionalRole(r.value)}
                        className="h-3.5 w-3.5 rounded border-input accent-primary" />
                      <span>{r.label}</span>
                    </label>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          {/* D. Entity Access */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="D" title="Entity Access"
              subtitle="Per-entity permissions — limits are informational; workflow definitions control actual approval routing" />

            {access.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No entities assigned — user will see all entities they have role-based access to.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-xs min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[180px]">Entity</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[160px]">Role override</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[110px]">Can approve</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[140px]">Approval limit ₹</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[110px]">Create PO</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[120px]">Create invoice</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[100px]">View only</th>
                      <th className="px-2 py-2 text-left font-medium text-muted-foreground min-w-[80px]">Active</th>
                      <th className="px-2 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {access.map((a, i) => (
                      <tr key={i}>
                        <td className="px-2 py-2">
                          <ApiSelect
                            endpoint="/api/masters/entities"
                            queryKey={['entities-lookup']}
                            value={a.entityId}
                            onChange={v => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, entityId: v } : r))}
                            placeholder="Select entity…"
                            className={cellInputCls} />
                        </td>
                        <td className="px-2 py-2">
                          <FormSelect className={cellInputCls} value={a.roleOverride}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, roleOverride: e.target.value } : r))}>
                            <option value="">— No override —</option>
                            {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </FormSelect>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={a.canApprove}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, canApprove: e.target.checked } : r))}
                            className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-2 py-2">
                          <FormInput type="number" step="0.01" min="0" disabled={!a.canApprove}
                            className={cellInputCls}
                            value={a.approvalLimit}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, approvalLimit: e.target.value } : r))} />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={a.canCreatePO}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, canCreatePO: e.target.checked } : r))}
                            className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={a.canCreateInvoice}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, canCreateInvoice: e.target.checked } : r))}
                            className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={a.canViewOnly}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, canViewOnly: e.target.checked } : r))}
                            className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input type="checkbox" checked={a.isActive}
                            onChange={e => setAccess(rows => rows.map((r, idx) => idx === i ? { ...r, isActive: e.target.checked } : r))}
                            className="h-4 w-4 rounded border-input accent-primary" />
                        </td>
                        <td className="px-2 py-2">
                          <button type="button" onClick={() => setAccess(rows => rows.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button type="button" onClick={() => setAccess(rows => [...rows, emptyAccess()])}
              className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-input px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/40">
              <Plus className="h-3.5 w-3.5" /> Add entity
            </button>
          </div>

          {/* E. Employee Link */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="E" title="Employee Link"
              subtitle="Link to employee record for department/manager auto-population in workflows" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Linked employee" span hint="Optional — improves manager-based approval routing">
                <ApiSelect
                  endpoint="/api/masters/employees"
                  queryKey={['employees-lookup']}
                  value={String(employeeIdWatch)}
                  onChange={v => setValue('employeeId', v)}
                  placeholder="Select employee…" />
              </Field>

              {linkedEmployee && (
                <>
                  <Field label="Department">
                    <FormInput readOnly value={linkedEmployee.departmentId ?? '—'} />
                  </Field>
                  <Field label="Designation">
                    <FormInput readOnly value={linkedEmployee.designationId ?? '—'} />
                  </Field>
                  <Field label="Reporting manager">
                    <FormInput readOnly value={linkedEmployee.managerId ?? '—'} />
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* F. Notifications */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="F" title="Notifications" subtitle="How this user gets notified about pending approvals and updates" />
            <div className="space-y-3">
              <Toggle value={emailNoti} onChange={v => setValue('emailNotifications', v)}
                label="Email notifications" description="Approval requests, mentions, and digests sent to the user's email" />
              <Toggle value={inAppNoti} onChange={v => setValue('inAppNotifications', v)}
                label="In-app notifications" description="Bell-icon notifications in the header bar" />
              <Toggle value={dailyDigestWatch} onChange={v => setValue('dailyDigest', v)}
                label="Daily digest" description="One summary email at 8 AM with the day's pending items" />
            </div>
          </div>

          {/* SSO stub */}
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6">
            <p className="text-sm font-semibold mb-1">Single Sign-On (SSO)</p>
            <p className="text-xs text-muted-foreground">Google / Microsoft SSO — configure in tenant settings (Phase 2).</p>
          </div>

        </div>
      </div>
    </div>
  )
}
