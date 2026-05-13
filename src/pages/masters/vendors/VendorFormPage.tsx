import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { vendorFormSchema, type VendorFormInput } from '../../../../shared/schemas/vendor.schema'
import { useCreateVendor, useUpdateVendor, useVendor } from '../../../lib/api/vendors.api'
import { cn } from '../../../lib/utils'

interface Props { mode: 'create' | 'edit' }

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn('w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground', className)} {...props} />
  )
}

function Section({ letter, title, subtitle, children }: { letter: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2 border-b border-border pb-2">
        <span className="text-sm font-semibold text-muted-foreground">{letter}.</span>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

export default function VendorFormPage({ mode }: Props) {
  const navigate         = useNavigate()
  const { id }           = useParams<{ id: string }>()
  const createVendor     = useCreateVendor()
  const updateVendor     = useUpdateVendor(id ?? '')
  const { data: vendor } = useVendor(mode === 'edit' ? (id ?? '') : '')

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } =
    useForm<VendorFormInput>({ resolver: zodResolver(vendorFormSchema) })

  useEffect(() => {
    if (vendor && mode === 'edit') reset(vendor as any)
  }, [vendor, mode, reset])

  async function onSubmit(data: VendorFormInput) {
    try {
      if (mode === 'create') {
        const res = await createVendor.mutateAsync(data)
        navigate(`/masters/vendors/${res.id}`)
      } else {
        await updateVendor.mutateAsync(data)
        navigate(`/masters/vendors/${id}`)
      }
    } catch { /* handled by query client */ }
  }

  const err = (field: keyof VendorFormInput) => errors[field]?.message as string | undefined

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{mode === 'create' ? 'New vendor' : 'Edit vendor'}</h1>
          <p className="text-xs text-muted-foreground">KYC checks run automatically after save</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => navigate(-1)} className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
          <button
            form="vendor-form"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {isSubmitting ? 'Saving…' : 'Save vendor'}
          </button>
        </div>
      </div>

      <form id="vendor-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* A. Basic details */}
        <Section letter="A" title="Basic details" subtitle="Name, type and contact">
          <Field label="Legal name *" error={err('legalName')}>
            <Input placeholder="As per PAN / MCA records" {...register('legalName')} />
          </Field>
          <Field label="Trade name" error={err('tradeName')}>
            <Input placeholder="Operating / brand name" {...register('tradeName')} />
          </Field>
          <Field label="Vendor type *" error={err('vendorType')}>
            <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" {...register('vendorType')}>
              <option value="">Select type</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="SERVICE_PROVIDER">Service provider</option>
              <option value="CONTRACTOR">Contractor</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="INTERCOMPANY">Intercompany</option>
            </select>
          </Field>
          <Field label="Payment terms (days)" error={err('paymentTerms')}>
            <Input type="number" placeholder="30" {...register('paymentTerms')} />
          </Field>
          <Field label="Email" error={err('email')}>
            <Input type="email" placeholder="accounts@vendor.com" {...register('email')} />
          </Field>
          <Field label="Mobile" error={err('mobile')}>
            <Input type="tel" placeholder="9800000000" {...register('mobile')} />
          </Field>
        </Section>

        {/* B. Tax & compliance */}
        <Section letter="B" title="Tax & compliance" subtitle="PAN, GSTIN, CIN, MSME">
          <Field label="PAN *" error={err('pan')}>
            <Input placeholder="ABCDE1234F" className="uppercase" {...register('pan')} />
          </Field>
          <Field label="GSTIN" error={err('gstin')}>
            <Input placeholder="27AABCU9603R1ZV" className="uppercase" {...register('gstin')} />
          </Field>
          <Field label="CIN" error={err('cin')}>
            <Input placeholder="U12345MH2010PTC123456" className="uppercase" {...register('cin')} />
          </Field>
          <Field label="Udyam / MSME number" error={err('udyamNumber')}>
            <Input placeholder="UDYAM-MH-00-0012345" className="uppercase" {...register('udyamNumber')} />
          </Field>
          <Field label="TDS section code" error={err('tdsSectionCode')}>
            <Input placeholder="194C / 194J / 194Q…" {...register('tdsSectionCode')} />
          </Field>
          <Field label="TDS applicable" error={err('tdsApplicable')}>
            <div className="flex items-center gap-2 pt-1">
              <input type="checkbox" id="tds" {...register('tdsApplicable')} className="h-4 w-4 rounded border-input accent-primary" />
              <label htmlFor="tds" className="text-sm text-muted-foreground">Apply TDS on invoices</label>
            </div>
          </Field>
        </Section>

        {/* C. Bank details */}
        <Section letter="C" title="Bank details" subtitle="Penny drop verification runs on save">
          <Field label="Account number" error={err('bankAccountNo')}>
            <Input placeholder="12-18 digit account number" {...register('bankAccountNo')} />
          </Field>
          <Field label="IFSC code" error={err('ifscCode')}>
            <Input placeholder="HDFC0001234" className="uppercase" {...register('ifscCode')} />
          </Field>
          <Field label="Bank name" error={err('bankName')}>
            <Input placeholder="HDFC Bank" {...register('bankName')} />
          </Field>
        </Section>

        {/* D. Address */}
        <Section letter="D" title="Address" subtitle="Registered business address">
          <Field label="City" error={err('city')}>
            <Input placeholder="Mumbai" {...register('city')} />
          </Field>
          <Field label="State" error={err('state')}>
            <Input placeholder="Maharashtra" {...register('state')} />
          </Field>
          <Field label="PIN code" error={err('pincode')}>
            <Input placeholder="400001" {...register('pincode')} />
          </Field>
        </Section>

      </form>
    </div>
  )
}
