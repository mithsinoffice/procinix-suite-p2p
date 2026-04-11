import type { CSSProperties } from 'react';

/** Canonical palette for master forms — references CSS custom properties in globals.css. */
export const formColors = {
  border: 'var(--color-silver)',
  text: 'var(--color-ink)',
  textMuted: 'var(--color-mercury-grey)',
  required: 'var(--color-error)',
  readOnlyBg: 'var(--color-cloud)',
  tableHeaderBg: 'var(--color-cloud)',
  accent: 'var(--color-teal)',
} as const;

const CONTROL_H = 42;
const CONTROL_H_COMPACT = 38;

/** Shared box for text-style inputs (fixed height matches `<select>`). */
export const inputStyle: CSSProperties = {
  width: '100%',
  height: `${CONTROL_H}px`,
  minHeight: `${CONTROL_H}px`,
  padding: '0 12px',
  border: `1px solid ${formColors.border}`,
  borderRadius: '8px',
  fontSize: '14px',
  lineHeight: '20px',
  fontFamily: 'inherit',
  color: formColors.text,
  backgroundColor: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

/** Chevron for native `<select>` after `appearance: none`. */
const SELECT_CHEVRON_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236E7A82' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E";

/** Same outer dimensions as `inputStyle`; use on all `<select>` for identical shape/size. */
export const selectStyle: CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  paddingRight: '36px',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage: `url("${SELECT_CHEVRON_SVG}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '16px 16px',
};

/** Dense controls inside tables (aligned with universal UI rules). */
export const inputStyleCompact: CSSProperties = {
  ...inputStyle,
  height: `${CONTROL_H_COMPACT}px`,
  minHeight: `${CONTROL_H_COMPACT}px`,
  padding: '0 8px',
  fontSize: '13px',
  lineHeight: '18px',
};

/** Table `<select>` — same as compact input + chevron. */
export const selectStyleCompact: CSSProperties = {
  ...inputStyleCompact,
  cursor: 'pointer',
  paddingRight: '32px',
  appearance: 'none',
  WebkitAppearance: 'none',
  MozAppearance: 'none',
  backgroundImage: `url("${SELECT_CHEVRON_SVG}")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
  backgroundSize: '14px 14px',
};

/** Leading icon slot (~pl-10) for inputs/selects inside `relative` wrappers. */
export const inputStyleIconLeading: CSSProperties = {
  ...inputStyle,
  paddingLeft: '40px',
};

/** `<select>` with leading icon — matches `inputStyleIconLeading` footprint. */
export const selectStyleIconLeading: CSSProperties = {
  ...selectStyle,
  paddingLeft: '40px',
};

export const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: formColors.text,
  marginBottom: '8px',
};

export const sectionTitleStyle: CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: formColors.text,
  margin: '0 0 12px 0',
  paddingBottom: '8px',
  borderBottom: `1px solid ${formColors.border}`,
};

export const readOnlyInputStyle: CSSProperties = {
  ...inputStyle,
  backgroundColor: formColors.readOnlyBg,
  color: formColors.textMuted,
  cursor: 'default',
};

/** Read-only “field-shaped” row (e.g. status placeholder before create). */
export const readOnlyDisplayRowStyle: CSSProperties = {
  ...readOnlyInputStyle,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: '12px',
  paddingRight: '12px',
};

/** Locked entity cell in assigned-entities table (row 1). */
export const tableEntityLockedCellStyle: CSSProperties = {
  ...inputStyleCompact,
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  backgroundColor: formColors.readOnlyBg,
  color: formColors.text,
  cursor: 'default',
};

/** Standard margin under a two-column section block. */
export const formSectionBlockStyle: CSSProperties = {
  marginBottom: '24px',
  width: '100%',
};

/** Two-column grid — dense masters (e.g. User Master). */
export const gridFormTwoColGap4 = 'grid grid-cols-2 gap-4';

/** Two-column grid — roomier forms (e.g. Country Master). */
export const gridFormTwoColGap6 = 'grid grid-cols-2 gap-6';

/** Optional: cap form width (e.g. `className={formFieldsMaxWidthClass}`). Full-width masters omit this. */
export const formFieldsMaxWidthClass = 'max-w-2xl w-full';

export function mergeInputStyle(override: CSSProperties): CSSProperties {
  return { ...inputStyle, ...override };
}
