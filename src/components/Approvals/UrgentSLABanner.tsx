interface Props {
  breachedCount: number;
  onReview: () => void;
}

export function UrgentSLABanner({ breachedCount, onReview }: Props) {
  if (breachedCount <= 0) return null;

  return (
    <div className="sla-banner mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-error-dark)]">
            ⚡ SLA Breach Warning <span className="sla-overdue-badge badge-pulse">OVERDUE</span>
          </p>
          <p className="text-xs text-[var(--color-error-dark)]">
            {breachedCount} approvals crossed SLA and are eligible for escalation
          </p>
        </div>
        <button type="button" className="sla-review-btn" onClick={onReview}>
          Review now →
        </button>
      </div>
    </div>
  );
}
