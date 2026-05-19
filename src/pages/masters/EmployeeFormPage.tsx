import { useEffect, useState } from 'react'
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

const GENDERS = [
  { value: 'MALE',   label: 'Male'   },
  { value: 'FEMALE', label: 'Female' },
  { value: 'OTHER',  label: 'Other'  },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]
const EMP_CATEGORIES = [
  { value: 'ON_ROLL',     label: 'On roll'     },
  { value: 'CONTRACTUAL', label: 'Contractual' },
  { value: 'CONSULTANT',  label: 'Consultant'  },
  { value: 'INTERN',      label: 'Intern'      },
  { value: 'PART_TIME',   label: 'Part time'   },
]
const EMP_STATUSES = [
  { value: 'ACTIVE',     label: 'Active'     },
  { value: 'INACTIVE',   label: 'Inactive'   },
  { value: 'ON_LEAVE',   label: 'On leave'   },
  { value: 'RESIGNED',   label: 'Resigned'   },
  { value: 'TERMINATED', label: 'Terminated' },
]
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
  { value: 'TENANT_ADMIN',     label: 'Tenant Admin'     },
  { value: 'USER',             label: 'Standard User'    },
]

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
  employeeCategory: z.string().min(1, 'Employee category is required'),
  status:           z.string().min(1, 'Status is required'),
  joiningDate:      z.string().min(1, 'Joining date is required'),
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

// Red on error, green when populated, neutral otherwise
function fieldCls(error?: string, value?: string): string {
  if (error) return 'border-destructive ring-1 ring-destructive/20'
  if (value) return 'border-primary/50'
  return ''
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

  const status            = useWatch({ control, name: 'status' })            ?? 'ACTIVE'
  const empCategory       = useWatch({ control, name: 'employeeCategory' })  ?? 'ON_ROLL'
  const firstName         = useWatch({ control, name: 'firstName' })         ?? ''
  const lastName          = useWatch({ control, name: 'lastName' })          ?? ''
  const email             = useWatch({ control, name: 'email' })             ?? ''
  const mobile            = useWatch({ control, name: 'mobile' })            ?? ''
  const gender            = useWatch({ control, name: 'gender' })            ?? ''
  const dateOfBirth       = useWatch({ control, name: 'dateOfBirth' })       ?? ''
  const joiningDate       = useWatch({ control, name: 'joiningDate' })       ?? ''
  const resignationDate   = useWatch({ control, name: 'resignationDate' })   ?? ''
  const lastWorkingDate   = useWatch({ control, name: 'lastWorkingDate' })   ?? ''
  const entityId          = useWatch({ control, name: 'entityId' })          ?? ''
  const departmentId      = useWatch({ control, name: 'departmentId' })      ?? ''
  const designationId     = useWatch({ control, name: 'designationId' })     ?? ''
  const locationId        = useWatch({ control, name: 'locationId' })        ?? ''
  const managerId         = useWatch({ control, name: 'managerId' })         ?? ''
  const costCentreId      = useWatch({ control, name: 'costCentreId' })      ?? ''
  const systemRole        = useWatch({ control, name: 'systemRole' })        ?? ''
  const userId            = useWatch({ control, name: 'userId' })            ?? ''

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
        employeeCategory: existing.employeeCategory ?? 'ON_ROLL',
        status:           existing.status    ?? 'ACTIVE',
        joiningDate:      existing.joiningDate ? String(existing.joiningDate).slice(0, 10) : '',
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
      })
    }
  }, [existing, reset])

  // ── Mutation ──
  const save = useMutation({
    mutationFn: async ({ data, submitForApproval }: { data: EmployeeForm; submitForApproval: boolean }) => {
      const payload: any = {
        ...data,
        name: `${data.firstName} ${data.lastName}`.trim(),
        submitForApproval,
        dateOfBirth:     data.dateOfBirth     || undefined,
        joiningDate:     data.joiningDate     || undefined,
        resignationDate: data.resignationDate || undefined,
        lastWorkingDate: data.lastWorkingDate || undefined,
      }
      // Drop empty strings so PUT doesn't overwrite existing nulls
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
      if (err instanceof HttpError)  setApiError(err.error.message || `Save failed (${err.error.status})`)
      else if (err instanceof Error) setApiError(err.message)
      else                           setApiError('Save failed — please retry')
    },
  })

  if (isEdit && loadingExisting) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  }

  const isPending            = save.isPending
  const showResignationDates = status === 'RESIGNED' || status === 'TERMINATED'

  // Email/mobile "valid + filled" state for green border
  const emailGreen  = !!email  && !errors.email  && EMAIL_REGEX.test(email)
  const mobileGreen = !!mobile && !errors.mobile && MOBILE_REGEX.test(mobile.replace(/\s/g, ''))

  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title={isEdit ? `Edit ${existing?.name ?? 'Employee'}` : 'New Employee'}
        description="Identity, employment, organisation, system access and status"
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

      {existing?.status === 'PENDING_APPROVAL' && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 sm:px-6 text-xs text-amber-800">
          Approval pending — current values remain active until approved.
        </div>
      )}

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
            <SectionHeader letter="A" title="Identity" subtitle="Name and contact" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee code">
                <AutoCodeField value={existing?.code} />
              </Field>
              <div />

              <Field label="First name" required error={errors.firstName?.message}>
                <FormInput placeholder="Rahul"
                  className={fieldCls(errors.firstName?.message, firstName)}
                  {...register('firstName')} />
              </Field>
              <Field label="Last name" required error={errors.lastName?.message}>
                <FormInput placeholder="Sharma"
                  className={fieldCls(errors.lastName?.message, lastName)}
                  {...register('lastName')} />
              </Field>

              <Field label="Email" required error={errors.email?.message}>
                <FormInput type="email" placeholder="rahul@company.com"
                  className={fieldCls(errors.email?.message, emailGreen ? email : '')}
                  {...register('email')} />
              </Field>
              <Field label="Mobile" error={errors.mobile?.message} hint="10 digits or +91 9XXXXXXXXX">
                <FormInput type="tel" placeholder="9800000000"
                  className={fieldCls(errors.mobile?.message, mobileGreen ? mobile : '')}
                  {...register('mobile')} />
              </Field>

              <Field label="Gender">
                <FormSelect className={fieldCls(undefined, gender)} {...register('gender')}>
                  <option value="">—</option>
                  {GENDERS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Date of birth">
                <FormInput type="date" max={new Date().toISOString().slice(0, 10)}
                  className={fieldCls(undefined, dateOfBirth)}
                  {...register('dateOfBirth')} />
              </Field>
            </div>
          </div>

          {/* B. Employment */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="B" title="Employment" subtitle="Category and dates" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee category" required error={errors.employeeCategory?.message}>
                <FormSelect className={fieldCls(errors.employeeCategory?.message, empCategory)} {...register('employeeCategory')}>
                  {EMP_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Joining date" required error={errors.joiningDate?.message}>
                <FormInput type="date"
                  className={fieldCls(errors.joiningDate?.message, joiningDate)}
                  {...register('joiningDate')} />
              </Field>

              {showResignationDates && (
                <>
                  <Field label="Resignation date">
                    <FormInput type="date"
                      className={fieldCls(undefined, resignationDate)}
                      {...register('resignationDate')} />
                  </Field>
                  <Field label="Last working date">
                    <FormInput type="date"
                      className={fieldCls(undefined, lastWorkingDate)}
                      {...register('lastWorkingDate')} />
                  </Field>
                </>
              )}
            </div>
          </div>

          {/* C. Organisation */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="C" title="Organisation" subtitle="Entity, department, designation, location and reporting" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Entity" required error={errors.entityId?.message}>
                <ApiSelect endpoint="/api/masters/entities" queryKey={['entities-lookup']}
                  value={String(entityId)}
                  onChange={v => setValue('entityId', v, { shouldValidate: true })}
                  placeholder="Select entity…"
                  className={fieldCls(errors.entityId?.message, entityId)} />
              </Field>
              <Field label="Department" required error={errors.departmentId?.message}>
                <ApiSelect endpoint="/api/masters/departments" queryKey={['departments-lookup']}
                  value={String(departmentId)}
                  onChange={v => setValue('departmentId', v, { shouldValidate: true })}
                  placeholder="Select department…"
                  className={fieldCls(errors.departmentId?.message, departmentId)} />
              </Field>
              <Field label="Designation" required error={errors.designationId?.message}>
                <ApiSelect endpoint="/api/masters/designations" queryKey={['designations-lookup']}
                  value={String(designationId)}
                  onChange={v => setValue('designationId', v, { shouldValidate: true })}
                  placeholder="Select designation…"
                  className={fieldCls(errors.designationId?.message, designationId)} />
              </Field>
              <Field label="Location" required error={errors.locationId?.message}>
                <ApiSelect endpoint="/api/masters/locations" queryKey={['locations-lookup']}
                  value={String(locationId)}
                  onChange={v => setValue('locationId', v, { shouldValidate: true })}
                  placeholder="Select location…"
                  className={fieldCls(errors.locationId?.message, locationId)} />
              </Field>
              <Field label="Reporting manager"
                hint="Required for manager-based approval routing (MANAGER_OF approver type)">
                <ApiSelect endpoint="/api/masters/employees" queryKey={['employees-lookup']}
                  value={String(managerId)}
                  onChange={v => setValue('managerId', v)}
                  placeholder="Select manager…"
                  className={fieldCls(undefined, managerId)} />
              </Field>
              <Field label="Cost centre">
                <ApiSelect endpoint="/api/masters/cost-centres" queryKey={['cost-centres-lookup']}
                  value={String(costCentreId)}
                  onChange={v => setValue('costCentreId', v)}
                  placeholder="Select cost centre…"
                  className={fieldCls(undefined, costCentreId)} />
              </Field>
            </div>
          </div>

          {/* D. System Access */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="D" title="System Access & Role"
              subtitle="Determines approval routing — Finance Manager, CFO and MD must be set for workflows to route correctly" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="System role"
                hint="Drives workflow engine's ROLE-based approver resolution">
                <FormSelect className={fieldCls(undefined, systemRole)} {...register('systemRole')}>
                  {SYSTEM_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </FormSelect>
              </Field>
              <Field label="Linked user ID"
                hint="Existing User row id, if the employee has system login (optional)">
                <FormInput placeholder="user-xxx-001"
                  className={fieldCls(undefined, userId)}
                  {...register('userId')} />
              </Field>
            </div>
          </div>

          {/* E. Status (bottom — full-width card, 2-col grid) */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeader letter="E" title="Status" subtitle="Employment lifecycle state" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employment status" required error={errors.status?.message}>
                <FormSelect className={fieldCls(errors.status?.message, status)} {...register('status')}>
                  {EMP_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </FormSelect>
              </Field>
            </div>
          </div>

          {/* Footer note */}
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            <span>Fields marked * are required. Save as draft to come back later, or submit for approval to begin the workflow.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
