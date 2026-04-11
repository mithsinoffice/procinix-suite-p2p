const STATUS_MAP: Record<string, string> = {
  New: 'badge-neutral',
  Draft: 'badge-teal',
  'Pending Approval': 'badge-warning',
  Approved: 'badge-success',
  Rejected: 'badge-error',
  'Changes Requested': 'badge-warning',
};

export function DraftStatusPill({
  status,
}: {
  status: string;
}) {
  const cls = STATUS_MAP[status] ?? 'badge-neutral';
  return <span className={cls}>{status}</span>;
}
