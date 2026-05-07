import { memo, useMemo, useState } from 'react';
import type { ApprovalItem } from '../../types/approvals';

interface Props {
  item: ApprovalItem;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onView: (item: ApprovalItem) => void;
  selected?: boolean;
  onToggleSelect?: (id: string, checked: boolean) => void;
}

const DATE_FORMATTER = new Intl.DateTimeFormat('en-IN');
const currencyFormatters = new Map<string, Intl.NumberFormat>();

function formatCurrency(amount: number, currency = 'INR') {
  if (!currencyFormatters.has(currency)) {
    currencyFormatters.set(
      currency,
      new Intl.NumberFormat('en-IN', { style: 'currency', currency })
    );
  }
  return currencyFormatters.get(currency)?.format(amount || 0) || String(amount || 0);
}

function prettyModule(module: string) {
  const map: Record<string, string> = {
    ap_invoice: 'AP invoice',
    non_po_invoice: 'AP invoice',
    purchase_order: 'Purchase order',
    master_update: 'Master update',
    vendor_onboarding: 'Vendor master',
    vendor_advance: 'Vendor advance',
  };
  return map[module] || module;
}

function parseMasterReference(referenceId?: string) {
  if (!referenceId || !referenceId.includes(':')) return null;
  const [masterKey, ...rest] = referenceId.split(':');
  const recordId = rest.join(':');
  if (!masterKey || !recordId) return null;
  return { masterKey, recordId };
}

function prettyMasterLabel(masterKey: string) {
  return masterKey
    .replace(/_master$/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function getMasterImpactInsight(masterKey?: string) {
  const map: Record<string, string> = {
    entity_master: 'Impacts company/entity mapping across procurement and AP transactions.',
    vendor_master: 'Impacts vendor onboarding, invoice booking, and payment routing.',
    product_master: 'Impacts item selection, coding, and downstream procurement analytics.',
    tds_section_master: 'Impacts tax deduction rates and compliance checks on invoices.',
    gl_code_master: 'Impacts accounting classification and journal posting accuracy.',
    cost_centre_master: 'Impacts budgeting controls and spend attribution.',
    department_master: 'Impacts reporting hierarchy and approval routing.',
    tax_code_master: 'Impacts GST/TAX treatment in invoice and PO flows.',
  };
  return map[masterKey || ''] || 'Impacts downstream master mapping and transaction data quality.';
}

function getMasterRiskSignal(ageHours: number, breached: boolean) {
  if (breached) {
    return {
      tone: 'High Risk',
      message: 'SLA already breached. Immediate decision recommended to avoid governance backlog.',
    };
  }
  if (ageHours >= 24) {
    return {
      tone: 'Medium Risk',
      message: 'Pending for more than 24h. Delay may block dependent form usage.',
    };
  }
  return {
    tone: 'Low Risk',
    message: 'Fresh submission. Validate key fields and approve/reject with comments.',
  };
}

function getMasterSuggestedAction(
  masterKey: string | undefined,
  ageHours: number,
  breached: boolean
) {
  const criticalMasters = new Set([
    'vendor_master',
    'entity_master',
    'tds_section_master',
    'gl_code_master',
    'tax_code_master',
  ]);

  if (breached || ageHours >= 48) {
    return { label: 'Urgent review', toneClass: 'bg-[#FEE2E2] text-[#B91C1C]' };
  }
  if (criticalMasters.has(masterKey || '') || ageHours >= 24) {
    return { label: 'Needs closer review', toneClass: 'bg-[#FEF3C7] text-[#92400E]' };
  }
  return { label: 'Approve likely', toneClass: 'bg-[#DCFCE7] text-[#166534]' };
}

function ApprovalQueueItemComponent({
  item,
  onApprove,
  onReject,
  onView,
  selected = false,
  onToggleSelect,
}: Props) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const isMasterUpdate = item.module === 'master_update';
  const masterRef = useMemo(
    () => (isMasterUpdate ? parseMasterReference(item.reference_id) : null),
    [isMasterUpdate, item.reference_id]
  );
  const masterDisplay = useMemo(
    () => (masterRef ? `${prettyMasterLabel(masterRef.masterKey)} Master` : 'Master Update'),
    [masterRef]
  );
  const masterRisk = useMemo(
    () =>
      isMasterUpdate
        ? getMasterRiskSignal(item.age_hours || 0, Boolean(item.sla_info?.breached))
        : null,
    [isMasterUpdate, item.age_hours, item.sla_info?.breached]
  );
  const masterImpact = useMemo(
    () => (isMasterUpdate ? getMasterImpactInsight(masterRef?.masterKey) : null),
    [isMasterUpdate, masterRef?.masterKey]
  );
  const masterSuggestedAction = useMemo(
    () =>
      isMasterUpdate
        ? getMasterSuggestedAction(
            masterRef?.masterKey,
            item.age_hours || 0,
            Boolean(item.sla_info?.breached)
          )
        : null,
    [isMasterUpdate, masterRef?.masterKey, item.age_hours, item.sla_info?.breached]
  );
  const createdAtLabel = useMemo(
    () => DATE_FORMATTER.format(new Date(item.created_at)),
    [item.created_at]
  );
  const invoiceDateLabel = useMemo(
    () =>
      item.msme_info?.invoice_date
        ? DATE_FORMATTER.format(new Date(item.msme_info.invoice_date))
        : null,
    [item.msme_info?.invoice_date]
  );
  const deadlineDateLabel = useMemo(
    () =>
      item.msme_info?.deadline_date
        ? DATE_FORMATTER.format(new Date(item.msme_info.deadline_date))
        : null,
    [item.msme_info?.deadline_date]
  );

  const className = isMasterUpdate
    ? 'approval-item-warning'
    : item.priority === 'critical' && item.msme_info
      ? 'approval-item-msme'
      : item.sla_info?.breached
        ? 'approval-item-urgent'
        : item.priority === 'high'
          ? 'approval-item-warning'
          : 'approval-item-normal';

  const barClass = item.msme_info
    ? 'sla-bar-msme'
    : item.sla_info?.breached
      ? 'sla-bar-breach'
      : item.sla_info?.percent_used > 80
        ? 'sla-bar-crit'
        : item.sla_info?.percent_used > 50
          ? 'sla-bar-warn'
          : 'sla-bar-ok';

  return (
    <div className={`rounded-xl p-3 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {onToggleSelect && (
              <label className="mr-1 inline-flex items-center">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={(e) => onToggleSelect(item.id, e.target.checked)}
                />
              </label>
            )}
            {item.msme_info ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${`tag-msme-${item.msme_info.msme_category}`}`}
              >
                M MSME — {item.msme_info.msme_category}
              </span>
            ) : item.sla_info?.breached ? (
              <span className="tag-overdue rounded-full px-2 py-0.5 text-[11px]">🔴 OVERDUE</span>
            ) : item.priority === 'high' ? (
              <span className="tag-sla-risk rounded-full px-2 py-0.5 text-[11px]">
                ⚠ SLA warning
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] ${isMasterUpdate ? 'bg-[#EEF2FF] text-[#4F46E5]' : 'bg-[var(--color-cloud)] text-[var(--color-mercury-grey)]'}`}
            >
              {prettyModule(item.module)}
            </span>
            {isMasterUpdate && masterRef && (
              <span className="rounded-full bg-[#ECFEFF] px-2 py-0.5 text-[11px] text-[#0F766E]">
                {masterDisplay}
              </span>
            )}
            <p className="truncate text-sm font-semibold text-[var(--color-ink)]">
              {isMasterUpdate
                ? `${masterRef?.recordId || item.reference_id}`
                : `${item.invoice_number || item.po_number || item.reference_id} · ${item.vendor_legal_name || 'Unknown vendor'}`}
            </p>
          </div>

          <p className="text-xs text-[var(--color-mercury-grey)]">
            Team · {createdAtLabel} · {isMasterUpdate ? masterDisplay : item.entity_name || '—'}
          </p>

          {isMasterUpdate && masterRisk && (
            <div className="mt-2 rounded-md border border-[#E6EAF0] bg-[#FAFCFF] px-3 py-2">
              <p className="text-[11px] font-semibold text-[#334155]">
                Insight ·{' '}
                <span
                  className={
                    masterRisk.tone === 'High Risk'
                      ? 'text-[#DC2626]'
                      : masterRisk.tone === 'Medium Risk'
                        ? 'text-[#D97706]'
                        : 'text-[#0F766E]'
                  }
                >
                  {masterRisk.tone}
                </span>
              </p>
              {masterSuggestedAction && (
                <p className="mt-1 text-[11px] font-medium text-[#334155]">
                  Suggested action:{' '}
                  <span className={`rounded-full px-2 py-0.5 ${masterSuggestedAction.toneClass}`}>
                    {masterSuggestedAction.label}
                  </span>
                </p>
              )}
              <p className="mt-1 text-[11px] text-[#475569]">{masterRisk.message}</p>
              <p className="mt-1 text-[11px] text-[#64748B]">{masterImpact}</p>
            </div>
          )}

          {item.msme_info && (
            <p className="msme-pill mt-2 inline-flex rounded-full px-2 py-1 text-xs">
              ⚖ MSME 45-day rule: Invoice date {invoiceDateLabel} · Deadline {deadlineDateLabel} ·{' '}
              {item.msme_info.days_remaining} days left
            </p>
          )}

          <div className="approval-item-progress-track">
            <div
              className={`approval-item-progress-fill ${barClass}`}
              style={{
                width: `${Math.min(100, Math.max(0, item.msme_info ? item.msme_info.percent_used : item.sla_info?.percent_used || 0))}%`,
              }}
            />
          </div>
        </div>

        <div className="w-60 text-right">
          <p className="text-base font-semibold text-[var(--color-ink)]">
            {isMasterUpdate
              ? 'Master Approval'
              : formatCurrency(item.display_amount || 0, item.currency || 'INR')}
          </p>
          <p className="mt-1 inline-flex rounded-full bg-[var(--color-cloud)] px-2 py-0.5 text-[11px] text-[var(--color-mercury-grey)]">
            {item.age_hours}h old
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1 text-xs text-[var(--color-ink)]"
              onClick={() => onApprove(item.id)}
            >
              ✓ Approve
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1 text-xs text-[var(--color-ink)]"
              onClick={() => setRejecting((v) => !v)}
            >
              × Reject
            </button>
            <button
              type="button"
              className="rounded-md border border-[var(--color-silver)] bg-white px-3 py-1 text-xs text-[var(--color-ink)]"
              onClick={() => onView(item)}
            >
              View
            </button>
          </div>
          {rejecting && (
            <div className="mt-2 space-y-1">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason is required"
                className="w-full rounded border border-[var(--color-silver)] px-2 py-1 text-xs"
              />
              <button
                type="button"
                className="w-full rounded bg-[var(--color-error-dark)] px-2 py-1 text-xs text-white disabled:opacity-50"
                disabled={!reason.trim()}
                onClick={() => onReject(item.id, reason)}
              >
                Confirm reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ApprovalQueueItem = memo(ApprovalQueueItemComponent);
