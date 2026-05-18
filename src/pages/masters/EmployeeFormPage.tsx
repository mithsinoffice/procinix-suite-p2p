import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Send, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { http, HttpError } from '../../lib/http'
import {
  MasterPageHeader, FormInput, FormSelect, AutoCodeField, ApiSelect,
} from '../../components/masters/MasterFormLayout'
import { cn } from '../../lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const GENDERS         = [
  { value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER', label: 'Other' }, { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]
const BLOOD_GROUPS    = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const EMP_CATEGORIES  = ['ON_ROLL', 'CONTRACTUAL', 'CONSULTANT', 'INTERN', 'PART_TIME']
const EMP_STATUSES    = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'RESIGNED', 'TERMINATED']
const SYSTEM_ROLES    = [
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
  { value: 'TENANT_ADMIN',     label: 'Tenant Admin'     },
  { value: 'USER',             label: 'Standard User'    },
]

const PAN_REGEX    = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
const MOBILE_REGEX = /^(\+\d{1,3})?\d{10}$/
const EMAIL_REGEX  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  firstName:        z.string().min(1, 'First name is required'),
  lastName:         z.string().min(1, 'Last name is required'),
  email:            z.string().min(1, 'Email is required').regex(EMAIL_REGEX, 'Enter a valid email address'),
  mobile:           z.string().optional().refine(v => !v || MOBILE_REGEX.test(v.replace(/\s/g, '')), 'Enter a valid mobile number'),
  gender:           z.string().optional(),
  dateOfBirth:      z.string().optional(),
  bloodGroup:       z.string().optional(),
  employeeCategory: z.string().min(1, 'Employee category is required'),
  status:           z.string().min(1, 'Status is required'),
  joiningDate:      z.string().min(1, 'Joining date is required'),
  confirmationDate: z.string().optional(),
  resignationDate:  z.string().optional(),
  lastWorkingDate:  z.string().optional(),
  entityId:         z.string().min(1, 'Entity is required'),
  departmentId:     z.string().min(1, 'Department is required'),
  designationId:    z.string().min(1, 'Designation is required'),
  locationId:       z.string().min(1, 'Location is required'),
  managerId:        z.string().optional(),
  costCentreId:     z.string().optional(),
  systemRole:       z.string().optional(),
  userId:           z.string().optional(),
  pan:              z.string().optional().refine(v => !v || PAN_REGEX.test(v), 'PAN must be 10 chars (e.g. ABCDE1234F)'),
  aadhaarNo:        z.string().optional(),
  pfAccountNo:      z.string().optional(),
  esiNo:            z.string().optional(),
  bankAccountNo:    z.string().optional(),
  ifsc:             z.string().optional(),
  bankName:         z.string().optional(),
  emergencyName:    z.string().optional(),
  emergencyPhone:   z.string().optional(),
  emergencyRelation: z.string().optional(),
})
type EmployeeForm = z.infer<typeof schema>

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

// Visual state for fields — teal ring when filled-and-valid, red when errored
function fieldCls(hasError: boolean, filledAndValid: boolean): string {
  if (hasError)       return 'border-destructive focus:ring-destructive/20'
  if (filledAndValid) return 'border-primary/50'
  return ''
}

// Toggle-pill row for enum fields like category / status
function PillSelect({ value, onChange, options, disabled }: {
  value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean
}) {
  return (
    <div className="flex items-center flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" disabled={disabled} onClick={() => onChange(o)}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
            value === o
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-input bg-background hover:bg-muted',
            disabled && 'opacity-60 cursor-not-allowed',
          )}>{o.replace(/_/g, ' ')}</button>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeFormPage() {
  const navigate = useNavigate()
  const { id }   = useParams<{ id: string }>()
  const isEdit   = !!id
  const qc       = useQueryClient()
  const [apiError, setApiError] = useState<string | null>(null)

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey:  ['employee', id],
    queryFn:   () => http.get<any>(`/api/masters/employees/${id}`),
    enabled:   isEdit,
    staleTime: 0,
  })

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: '', lastName: '', email: '',
      employeeCategory: 'ON_ROLL',
      status:           'ACTIVE',
      systemRole:       'USER',
    },
  })

  const status         = useWatch({ control, name: 'status' })         ?? 'ACTIVE'
  const empCategory    = useWatch({ control, name: 'employeeCategory' }) ?? 'ON_ROLL'
  const firstName      = useWatch({ control, name: 'firstName' })      ?? ''
  const lastName       = useWatch({ control, name: 'lastName' })       ?? ''
  const email          = useWatch({ control, name: 'email' })          ?? ''
  const mobile         = useWatch({ control, name: 'mobile' })         ?? ''
  const pan            = useWatch({ control, name: 'pan' })            ?? ''
  const ifscWatched    = useWatch({ control, name: 'ifsc' })           ?? ''

  // Hydrate on edit
  useEffect(() => {
    if (existing) {
      reset({
        firstName:        existing.firstName ?? '',
        lastName:         existing.lastName  ?? '',
        email:            existing.email     ?? '',
        mobile:           existing.mobile    ?? '',
        gender:           existing.gender    ?? '',
        dateOfBirth:      existing.dateOfBirth ? String(existing.dateOfBirth).slice(0, 10) : '',
        bloodGroup:       existing.bloodGroup ?? '',
        employeeCategory: existing.employeeCategory ?? 'ON_ROLL',
        status:           existing.status    ?? 'ACTIVE',
        joiningDate:      existing.joiningDate ? String(existing.joiningDate).slice(0, 10) : '',
        confirmationDate: existing.confirmationDate ? String(existing.confirmationDate).slice(0, 10) : '',
        resignationDate:  existing.resignationDate  ? String(existing.resignationDate).slice(0, 10)  : '',
        lastWorkingDate:  existing.lastWorkingDate  ? String(existing.lastWorkingDate).slice(0, 10)  : '',
        entityId:         existing.entityId      ?? '',
        departmentId:     existing.departmentId  ?? '',
        designationId:    existing.designationId ?? '',
        locationId:       existing.locationId    ?? '',
        managerId:        existing.managerId     ?? '',
        costCentreId:     existing.costCentreId  ?? '',
        systemRole:       existing.systemRole    ?? 'USER',
        userId:           existing.userId        ?? '',
        pan:              existing.pan           ?? '',
        aadhaarNo:        existing.aadhaarNo     ?? '',
        pfAccountNo:      existing.pfAccountNo   ?? '',
        esiNo:            existing.esiNo         ?? '',
        bankAccountNo:    existing.bankAccountNo ?? '',
        ifsc:             existing.ifsc          ?? '',
        bankName:         existing.bankName      ?? '',
        emergencyName:    existing.emergencyName ?? '',
        emergencyPhone:   existing.emergencyPhone ?? '',
        emergencyRelation: existing.emergencyRelation ?? '',
      })
    }
  }, [existing, reset])

  // IFSC → bank name autofill (best-effort; routed through server proxy so we don't hit a 3rd-party origin directly)
  const ifscFetchedRef = useRef<string>('')
  useEffect(() => {
    const ifsc = (ifscWatched ?? '').toUpperCase().trim()
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc) || ifsc === ifscFetchedRef.current) return
    ifscFetchedRef.current = ifsc
    http.get<{ bank?: string; branch?: string }>(`/api/masters/lookup/ifsc/${ifsc}`)
      .then(result => {
        if (result.bank && result.branch) setValue('bankName', `${result.bank} — ${result.branch}`)
      })
      .catch(() => { /* ignore — optional autofill */ })
  }, [ifscWatched, setValue])

  // Auto-uppercase PAN
  useEffect(() => {
    if (pan && pan !== pan.toUpperCase()) setValue('pan', pan.toUpperCase())
  }, [pan, setValue])

  // ── Mutation ──
  const save = useMutation({
    mutationFn: async ({ data, submitForApproval }: { data: EmployeeForm; submitForApproval: boolean }) => {
      const payload: any = {
        ...data,
        name: `${data.firstName} ${data.lastName}`.trim(),
        submitForApproval,
        // Date strings → ISO for server; empty strings strip out so Prisma sees nulls
        dateOfBirth:      data.dateOfBirth      || undefined,
        joiningDate:      data.joiningDate      || undefined,
        confirmationDate: data.confirmationDate || undefined,
        resignationDate:  data.resignationDate  || undefined,
        lastWorkingDate:  data.lastWorkingDate  || undefined,
      }
      // Drop empty string fields so they don't overwrite existing nulls on PUT
      for (const k of Object.keys(payload)) if (payload[k] === '') delete payload[k]
      return isEdit
        ? http.put<any>(`/api/masters/employees/${id}`, payload)
        : http.post<any>('/api/masters/employees', payload)
    },
    onSuccess: () => {
      setApiError(null)
      qc.invalidateQueries({ queryKey: ['employee'] })
      navigate('/masters/employees')
    },
    onError: (err: unknown) => {
      if (err instanceof HttpError)      setApiError(err.error.message || `Save failed (${err.error.status})`)
      else if (err instanceof Error)     setApiError(err.message)
      else                               setApiError('Save failed — please retry')
    },
  })

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending           = save.isPending
  const showResignationDates = status === 'RESIGNED' || status === 'TERMINATED'

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.name ?? 'Employee'}` : 'New Employee'}
        description="Personal, employment, organisation, statutory and bank details"
        backLabel="Employees"
        backTo="/masters/employees"
        actions={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/masters/employees')}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted">Cancel</button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(data => save.mutate({ data, submitForApproval: false }))}
              className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60">
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" />}
              Save as draft
            </button>
            <button type="button" disabled={isPending}
              onClick={handleSubmit(data => save.mutate({ data, submitForApproval: true }))}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Send className="h-3.5 w-3.5" />
              Submit for approval
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-6">

          {apiError && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Save failed</p>
                <p className="text-xs text-red-600 mt-0.5">{apiError}</p>
              </div>
            </div>
          )}

          {/* A. Identity */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="A" title="Identity" subtitle="Name, contact, and personal details" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee code">
                <AutoCodeField value={existing?.code} />
              </Field>
              <div /> {/* spacer */}

              <Field label="First name" required error={errors.firstName?.message}>
                <FormInput placeholder="Rahul" className={fieldCls(!!errors.firstName, !!firstName && !errors.firstName)}
                  {...register('firstName')} />
              </Field>
              <Field label="Last name" required error={errors.lastName?.message}>
                <FormInput placeholder="Sharma" className={fieldCls(!!errors.lastName, !!lastName && !errors.lastName)}
                  {...register('lastName')} />
              </Field>

              <Field label="Email" required error={errors.email?.message}>
                <FormInput type="email" placeholder="rahul@company.com"
                  className={fieldCls(!!errors.email, !!email && !errors.email && EMAIL_REGEX.test(email))}
                  {...register('email')} />
              </Field>
              <Field label="Mobile" error={errors.mobile?.message}
                hint="10 digits or +91 9XXXXXXXXX">
                <FormInput type="tel" placeholder="9800000000"
                  className={fieldCls(!!errors.mobile, !!mobile && !errors.mobile && MOBILE_REGEX.test(mobile.replace(/\s/g, '')))}
                  {...register('mobile')} />
              </Field>

              <Field label="Gender">
                <FormSelect {...register('gender')}>
                  <option value="">—</option>
                  {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Date of birth">
                <FormInput type="date" max={new Date().toISOString().slice(0, 10)} {...register('dateOfBirth')} />
              </Field>

              <Field label="Blood group">
                <FormSelect {...register('bloodGroup')}>
                  <option value="">—</option>
                  {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                </FormSelect>
              </Field>
            </div>
          </div>

          {/* B. Employment */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="Employment" subtitle="Category, status and dates" />
            <div className="space-y-4">
              <Field label="Employee category" required>
                <PillSelect value={empCategory} options={EMP_CATEGORIES}
                  onChange={v => setValue('employeeCategory', v, { shouldValidate: true })} />
              </Field>
              <Field label="Status" required>
                <PillSelect value={status} options={EMP_STATUSES}
                  onChange={v => setValue('status', v, { shouldValidate: true })} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Joining date" required error={errors.joiningDate?.message}>
                  <FormInput type="date"
                    className={fieldCls(!!errors.joiningDate, false)}
                    {...register('joiningDate')} />
                </Field>
                <Field label="Confirmation date">
                  <FormInput type="date" {...register('confirmationDate')} />
                </Field>
                {showResignationDates && (
                  <>
                    <Field label="Resignation date">
                      <FormInput type="date" {...register('resignationDate')} />
                    </Field>
                    <Field label="Last working date">
                      <FormInput type="date" {...register('lastWorkingDate')} />
                    </Field>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* C. Organisation */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Organisation" subtitle="Entity, department, designation, location, and reporting" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entity" required error={errors.entityId?.message}>
                <ApiSelect endpoint="/api/masters/entities" queryKey={['entities-lookup']}
                  value={String(useWatch({ control, name: 'entityId' }) ?? '')}
                  onChange={v => setValue('entityId', v, { shouldValidate: true })}
                  placeholder="Select entity…"
                  className={errors.entityId ? 'border-destructive' : ''} />
              </Field>
              <Field label="Department" required error={errors.departmentId?.message}>
                <ApiSelect endpoint="/api/masters/departments" queryKey={['departments-lookup']}
                  value={String(useWatch({ control, name: 'departmentId' }) ?? '')}
                  onChange={v => setValue('departmentId', v, { shouldValidate: true })}
                  placeholder="Select department…"
                  className={errors.departmentId ? 'border-destructive' : ''} />
              </Field>
              <Field label="Designation" required error={errors.designationId?.message}>
                <ApiSelect endpoint="/api/masters/designations" queryKey={['designations-lookup']}
                  value={String(useWatch({ control, name: 'designationId' }) ?? '')}
                  onChange={v => setValue('designationId', v, { shouldValidate: true })}
                  placeholder="Select designation…"
                  className={errors.designationId ? 'border-destructive' : ''} />
              </Field>
              <Field label="Location" required error={errors.locationId?.message}>
                <ApiSelect endpoint="/api/masters/locations" queryKey={['locations-lookup']}
                  value={String(useWatch({ control, name: 'locationId' }) ?? '')}
                  onChange={v => setValue('locationId', v, { shouldValidate: true })}
                  placeholder="Select location…"
                  className={errors.locationId ? 'border-destructive' : ''} />
              </Field>
              <Field label="Reporting manager"
                hint="Required for manager-based approval routing (MANAGER_OF approver type)">
                <ApiSelect endpoint="/api/masters/employees" queryKey={['employees-lookup']}
                  value={String(useWatch({ control, name: 'managerId' }) ?? '')}
                  onChange={v => setValue('managerId', v)}
                  placeholder="Select manager…" />
              </Field>
              <Field label="Cost centre">
                <ApiSelect endpoint="/api/masters/cost-centres" queryKey={['cost-centres-lookup']}
                  value={String(useWatch({ control, name: 'costCentreId' }) ?? '')}
                  onChange={v => setValue('costCentreId', v)}
                  placeholder="Select cost centre…" />
              </Field>
            </div>
          </div>

          {/* D. System Access */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="D" title="System Access & Role"
              subtitle="Determines approval routing — Finance Manager, CFO, MD must be set for workflows to route correctly" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="System role"
                hint="Drives workflow engine's ROLE-based approver resolution">
                <FormSelect {...register('systemRole')}>
                  {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Linked user ID"
                hint="Existing User row id, if the employee has system login (optional)">
                <FormInput placeholder="user-xxx-001" {...register('userId')} />
              </Field>
            </div>
          </div>

          {/* E. Statutory */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="E" title="Statutory" subtitle="PAN, Aadhaar, PF and ESI — all optional" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="PAN" error={errors.pan?.message}>
                <FormInput placeholder="ABCDE1234F" maxLength={10}
                  className={cn('uppercase', fieldCls(!!errors.pan, !!pan && !errors.pan && PAN_REGEX.test(pan)))}
                  {...register('pan')} />
              </Field>
              <Field label="Aadhaar number">
                <FormInput placeholder="XXXX-XXXX-XXXX" maxLength={14} {...register('aadhaarNo')} />
              </Field>
              <Field label="PF account no.">
                <FormInput {...register('pfAccountNo')} />
              </Field>
              <Field label="ESI no.">
                <FormInput {...register('esiNo')} />
              </Field>
            </div>
          </div>

          {/* F. Bank Details */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="F" title="Bank Details" subtitle="For reimbursements — optional. Bank name auto-fills from IFSC." />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Account number">
                <FormInput {...register('bankAccountNo')} />
              </Field>
              <Field label="IFSC" hint="11 chars — bank name auto-fills on blur">
                <FormInput placeholder="HDFC0000001" maxLength={11}
                  className="uppercase"
                  {...register('ifsc')} />
              </Field>
              <Field label="Bank name" span>
                <FormInput readOnly placeholder="Auto-filled from IFSC" {...register('bankName')} />
              </Field>
            </div>
          </div>

          {/* G. Emergency Contact */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="G" title="Emergency Contact" subtitle="Optional" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name">
                <FormInput {...register('emergencyName')} />
              </Field>
              <Field label="Phone">
                <FormInput type="tel" {...register('emergencyPhone')} />
              </Field>
              <Field label="Relation" hint="e.g. Spouse, Parent, Sibling">
                <FormInput {...register('emergencyRelation')} />
              </Field>
            </div>
          </div>

          {/* Footer status note */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span>Fields marked * are required. Save as draft to come back later, or submit for approval to begin the workflow.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
