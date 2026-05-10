/**
 * Option B compact listing layout — applied across every listing page in the
 * app (masters, procurement, payments, vendors, invoices). One source of
 * truth for the dimensions / typography / colours; each page imports these
 * style constants and the chrome stays visually consistent.
 *
 * Design contract (do not eyeball — match these values):
 * - Page header: title 15px/500 + subtitle 11px muted; padding 14px 20px.
 * - Metric cards: bg secondary, radius md, padding 10px 12px;
 *   label 10px muted (mb 3px), value 18px/500.
 * - Toolbar: 28px control height, padding 8px 20px, bg secondary.
 * - Table header: 10px uppercase muted, padding 6px 20px, bg secondary.
 * - Table rows: padding 8px 20px, font 12px, primary 500.
 * - Status badges: 10px font, 2px 8px padding, radius 20px.
 *
 * If a token here changes, every listing inherits the new look.
 */
import type { CSSProperties } from 'react';

const BORDER = '1px solid var(--color-fog)';
const BG_SECONDARY = 'var(--color-background-secondary)';
const RADIUS_MD = 'var(--border-radius-md)';
const RADIUS_PILL = '20px';
const TEXT_INK = 'var(--color-ink)';
const TEXT_MUTED = 'var(--color-mercury-grey)';

// ── Page header ─────────────────────────────────────────────────────────────
export const listingHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 20px',
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
  fontSize: 11,
  color: TEXT_MUTED,
  margin: '2px 0 0 0',
  lineHeight: 1.3,
};
export const listingPrimaryBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 28,
  padding: '0 12px',
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: 10,
  padding: '10px 20px',
  borderBottom: BORDER,
  background: '#FFFFFF',
};
export const metricCard: CSSProperties = {
  background: BG_SECONDARY,
  borderRadius: RADIUS_MD,
  padding: '10px 12px',
};
export const metricLabel: CSSProperties = {
  fontSize: 10,
  color: TEXT_MUTED,
  marginBottom: 3,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
};
export const metricValue: CSSProperties = {
  fontSize: 18,
  fontWeight: 500,
  color: TEXT_INK,
  lineHeight: 1.1,
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
  padding: '8px 20px',
  background: BG_SECONDARY,
  borderBottom: BORDER,
};
export const toolbarSearch: CSSProperties = {
  flex: 1,
  height: 28,
  padding: '0 10px',
  border: '1px solid var(--color-silver)',
  borderRadius: RADIUS_MD,
  fontSize: 12,
  background: '#FFFFFF',
  color: TEXT_INK,
};
export const toolbarBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 28,
  padding: '0 10px',
  border: '1px solid var(--color-silver)',
  borderRadius: RADIUS_MD,
  background: '#FFFFFF',
  color: TEXT_INK,
  fontSize: 12,
  cursor: 'pointer',
};

// ── Table ───────────────────────────────────────────────────────────────────
export const listingTable: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 12,
};
export const listingThead: CSSProperties = {
  background: BG_SECONDARY,
  borderBottom: BORDER,
};
export const listingTh: CSSProperties = {
  padding: '6px 20px',
  textAlign: 'left',
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: TEXT_MUTED,
  whiteSpace: 'nowrap',
};
export const listingTd: CSSProperties = {
  padding: '8px 20px',
  fontSize: 12,
  color: TEXT_INK,
  verticalAlign: 'middle',
  borderBottom: BORDER,
};
export const listingTdPrimary: CSSProperties = {
  ...listingTd,
  fontWeight: 500,
};
export const listingTdMuted: CSSProperties = {
  ...listingTd,
  color: TEXT_MUTED,
};

// ── Status / approval badges ────────────────────────────────────────────────
export const badgeBase: CSSProperties = {
  display: 'inline-block',
  padding: '2px 8px',
  borderRadius: RADIUS_PILL,
  fontSize: 10,
  fontWeight: 600,
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
  border: '1px solid #CBD5E1',
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
