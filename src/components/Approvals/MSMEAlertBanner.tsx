interface Props {
  alertCount: number;
  earliestDeadlineDays: number;
  onApproveFirst: () => void;
}

export function MSMEAlertBanner({ alertCount, earliestDeadlineDays, onApproveFirst }: Props) {
  if (alertCount <= 0) return null;
  return (
    <div className="msme-banner mb-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="msme-icon-bg flex h-9 w-9 items-center justify-center rounded text-white">M</div>
          <div>
            <p className="msme-title-color text-sm font-semibold">MSME Payment Deadline Alert</p>
            <p className="msme-sub-color text-xs">{alertCount} MSME vendor invoices approaching 45-day statutory payment deadline</p>
            <p className="msme-legal-pill">⚖ MSMED Act 2006 — late payment attracts 3× bank rate interest</p>
          </div>
        </div>
        <div className="text-right">
          <p className="msme-pill rounded px-2 py-1 text-xs font-semibold">{earliestDeadlineDays} days left</p>
          <button type="button" className="btn-msme mt-2 rounded px-3 py-1 text-xs" onClick={onApproveFirst}>
            Approve MSME first →
          </button>
        </div>
      </div>
    </div>
  );
}
