import { MasterPageHeader } from '../../components/masters/MasterFormLayout'

export default function PaymentListPage() {
  return (
    <div className="flex flex-col h-full">
      <MasterPageHeader
        title="Payments"
        description="Payment runs, TDS challans and remittances"
      />
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Payment management — coming soon</p>
      </div>
    </div>
  )
}
