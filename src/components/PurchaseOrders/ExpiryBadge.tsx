interface ExpiryBadgeProps {
  validUntil?: string;
  autoExpired?: boolean;
  forceClosed?: boolean;
}

export function ExpiryBadge({ validUntil, autoExpired, forceClosed }: ExpiryBadgeProps) {
  if (!validUntil && !autoExpired && !forceClosed) return null;

  const pillStyle = (bg: string, fg: string): React.CSSProperties => ({
    display: 'inline-block',
    padding: '2px 10px',
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 600,
    backgroundColor: bg,
    color: fg,
    whiteSpace: 'nowrap',
  });

  if (forceClosed) {
    return <span style={pillStyle('var(--color-error-dark)', '#fff')}>Force Closed</span>;
  }

  if (autoExpired) {
    return <span style={pillStyle('var(--color-slate)', '#fff')}>Auto-expired</span>;
  }

  if (!validUntil) return null;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(validUntil);
  expiry.setHours(0, 0, 0, 0);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return <span style={pillStyle('var(--color-error)', '#fff')}>Expired</span>;
  }

  if (diffDays <= 7) {
    return (
      <span style={pillStyle('var(--color-error)', '#fff')}>
        Expires in {diffDays} day{diffDays !== 1 ? 's' : ''}
      </span>
    );
  }

  if (diffDays <= 14) {
    return (
      <span style={pillStyle('var(--color-warning)', 'var(--color-ink)')}>
        Expires in {diffDays} days
      </span>
    );
  }

  const formatted = expiry.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return (
    <span style={pillStyle('var(--color-success-light)', 'var(--color-success-dark)')}>
      Valid until {formatted}
    </span>
  );
}
