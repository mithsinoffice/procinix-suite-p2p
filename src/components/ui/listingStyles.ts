/**
 * Option B compact listing layout — applied across every listing page in the
 * app (masters, procurement, payments, vendors, invoices). One source of
 * truth for the dimensions / typography / colours; each page imports these
 * style constants and the chrome stays visually consistent.
 *
 * Design contract (do not eyeball — match these values):
 * - Page header: title 15px/500 + subtitle 12px muted; padding 16px 24px.
 * - Metric cards: bg secondary, radius md, padding 12px 20px;
 *   label 11px muted uppercase 0.04em (mb 4px), value 22px/500.
 * - Toolbar: 32px control height, padding 8px 24px, bg secondary.
 * - Table header: 11px uppercase 0.05em muted, padding 8px 24px,
 *   bg secondary, border-bottom 0.5px tertiary.
 * - Table rows: padding 12px 24px, min-height 52px,
 *   border-bottom 0.5px tertiary, primary text 13px/500, secondary 12px.
 * - Status badges: 11px font, 3px 10px padding, radius 20px.
 * - Action buttons in rows: 30px height, 0 12px padding, 12px font,
 *   border 0.5px solid, radius md.
 *
 * If a token here changes, every listing inherits the new look.
 */
import type { CSSProperties } from 'react';

const BORDER = '0.5px solid var(--color-border-tertiary)';
const BG_SECONDARY = 'var(--color-background-secondary)';
const RADIUS_MD = 'var(--border-radius-md)';
const RADIUS_PILL = '20px';
const TEXT_INK = 'var(--color-text-primary)';
const TEXT_MUTED = 'var(--color-text-secondary)';

// ── Page header ─────────────────────────────────────────────────────────────
export const listingHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 24px',
  borderBottom: BORDER,
  background: '#FFFFFF',
};
export const listingTitle: CSSProperties = {
  fontSize: 15,
  fontWeight: 500,
  color: TEXT_INK,
  margin: 0,
  lineHeight: 1.3,
};
export const listingSubtitle: CSSProperties = {
  fontSize: 12,
  color: TEXT_MUTED,
  margin: '2px 0 0 0',
  lineHeight: 1.3,
};
export const listingPrimaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 32,
  padding: '0 14px',
  background: 'var(--color-teal)',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: RADIUS_MD,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

// ── Metric strip ────────────────────────────────────────────────────────────
export const metricStrip: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
  padding: '12px 24px',
  borderBottom: BORDER,
  background: '#FFFFFF',
};
export const metricCard: CSSProperties = {
  background: BG_SECONDARY,
  borderRadius: RADIUS_MD,
  padding: '12px 20px',
};
export const metricLabel: CSSProperties = {
  fontSize: 11,
  color: TEXT_MUTED,
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};
export const metricValue: CSSProperties = {
  fontSize: 22,
  fontWeight: 500,
  color: TEXT_INK,
  lineHeight: 1.1,
};
export const metricSubLabel: CSSProperties = {
  fontSize: 11,
  color: TEXT_MUTED,
  marginTop: 2,
};
export const metricValueWarning: CSSProperties = {
  ...metricValue,
  color: '#A36A00',
};
export const metricValueSuccess: CSSProperties = {
  ...metricValue,
  color: '#0F8A5F',
};
export const metricValueDanger: CSSProperties = {
  ...metricValue,
  color: '#C62828',
};

// ── Toolbar (search + filters) ──────────────────────────────────────────────
export const listingToolbar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 24px',
  background: BG_SECONDARY,
  borderBottom: BORDER,
};
export const toolbarSearch: CSSProperties = {
  flex: 1,
  height: 32,
  padding: '0 12px',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: RADIUS_MD,
  fontSize: 12,
  background: '#FFFFFF',
  color: TEXT_INK,
};
export const toolbarBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 32,
  padding: '0 12px',
  border: '0.5px solid var(--color-border-tertiary)',
  borderRadius: RADIUS_MD,
  background: '#FFFFFF',
  color: TEXT_INK,
  fontSize: 12,
  cursor: 'pointer',
};

// ── Filter chips (height 32, radius 20) ─────────────────────────────────────
export const filterChip: CSSProperties = {
  height: 32,
  padding: '0 14px',
  borderRadius: RADIUS_PILL,
  fontSize: 12,
  fontWeight: 500,
  border: '0.5px solid var(--color-border-tertiary)',
  background: '#FFFFFF',
  color: TEXT_MUTED,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
export const filterChipActive: CSSProperties = {
  ...filterChip,
  background: '#0F6E56',
  color: '#FFFFFF',
  borderColor: '#0F6E56',
};

// ── Action buttons in rows ──────────────────────────────────────────────────
export const rowActionBtn: CSSProperties = {
  height: 30,
  padding: '0 12px',
  fontSize: 12,
  borderRadius: RADIUS_MD,
  border: '0.5px solid var(--color-border-tertiary)',
  background: '#FFFFFF',
  color: TEXT_INK,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
};
export const rowActionPrimaryBtn: CSSProperties = {
  ...rowActionBtn,
  background: '#0F6E56',
  color: '#FFFFFF',
  borderColor: '#0F6E56',
};

// ── Table ───────────────────────────────────────────────────────────────────
export const listingTable: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 13,
};
export const listingThead: CSSProperties = {
  background: BG_SECONDARY,
  borderBottom: BORDER,
};
export const listingTh: CSSProperties = {
  padding: '8px 24px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: TEXT_MUTED,
  whiteSpace: 'nowrap',
};
export const listingTd: CSSProperties = {
  padding: '12px 24px',
  fontSize: 13,
  color: TEXT_INK,
  verticalAlign: 'middle',
  borderBottom: BORDER,
  minHeight: 52,
};
export const listingTdPrimary: CSSProperties = {
  ...listingTd,
  fontWeight: 500,
};
export const listingTdMuted: CSSProperties = {
  ...listingTd,
  color: TEXT_MUTED,
};
export const listingRow: CSSProperties = {
  padding: '12px 24px',
  minHeight: 52,
  borderBottom: BORDER,
  background: '#FFFFFF',
  alignItems: 'center',
};

// Row text styles (for inline text inside grid rows)
export const rowTextPrimary: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: TEXT_INK,
};
export const rowTextSecondary: CSSProperties = {
  fontSize: 12,
  color: TEXT_MUTED,
  marginTop: 2,
};
export const rowTextMuted: CSSProperties = {
  fontSize: 11,
  color: TEXT_MUTED,
};

// ── Status / approval badges ────────────────────────────────────────────────
export const badgeBase: CSSProperties = {
  display: 'inline-block',
  padding: '3px 10px',
  borderRadius: RADIUS_PILL,
  fontSize: 11,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};
export const badgeApproved: CSSProperties = {
  ...badgeBase,
  background: '#E7F8EC',
  color: '#0F8A5F',
};
export const badgePending: CSSProperties = {
  ...badgeBase,
  background: '#FFF7E8',
  color: '#A36A00',
};
export const badgeRejected: CSSProperties = {
  ...badgeBase,
  background: '#FFEBEE',
  color: '#C62828',
};
export const badgeDraft: CSSProperties = {
  ...badgeBase,
  background: '#F4F7FB',
  color: '#516173',
};
export const badgeViaUpload: CSSProperties = {
  ...badgeBase,
  background: '#E2E8F0',
  border: '0.5px solid #CBD5E1',
  color: '#475569',
};

export function badgeForStatus(status: string): CSSProperties {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('approve') || s === 'active' || s === 'paid' || s === 'completed') {
    return badgeApproved;
  }
  if (
    s.includes('pending') ||
    s.includes('progress') ||
    s.includes('hold') ||
    s.includes('queued')
  ) {
    return badgePending;
  }
  if (s.includes('reject') || s.includes('fail') || s.includes('exception')) {
    return badgeRejected;
  }
  return badgeDraft;
}

// Human-readable status label (snake_case → "Title Case With Spaces")
export function formatStatusLabel(status: string): string {
  return String(status ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/, (c) => c.toUpperCase());
}

// ── Layout wrappers ─────────────────────────────────────────────────────────
export const listingPage: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  background: '#FFFFFF',
  minHeight: '100%',
};
export const tableWrapper: CSSProperties = {
  overflowX: 'auto',
  overflowY: 'visible',
};
export const rowHover = 'listing-row-hover'; // class name; consumers add it on <tr>
