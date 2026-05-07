# Procinix Suite — Universal UI rules (living document)

**Purpose:** Single place to define layout, form, and action patterns for this repo. **Update this file** when standards change. Cursor loads these via `.cursor/rules/procinix-universal-ui.mdc` — keep both aligned.

---

## 1. Master / full-page forms

- **Shell:** Prefer `MasterFormPage` (`src/components/ui/MasterFormPage.tsx`) for create/edit flows: header, inner card, footer actions.
- **Footer order (left → right):** `Cancel` → optional `Save Draft` (only if `onSaveDraft` is wired) → primary `Submit` (teal `#00A9B7`).
- **Draft vs submit:** Draft = non-final persistence or local save; Submit = validate + primary API / master record action. Do not swap order or hide Cancel.

---

## 2. Two-column field layout

- **Default:** `grid grid-cols-2 gap-4` or `gap-6` — pick one per screen and stay consistent within that screen (`gap-4` for dense masters, `gap-6` for long forms like vendors).
- **Column cells:** Wrap each field in `<div className="min-w-0">` so inputs truncate correctly in grids.
- **Full-width exceptions:** Use `col-span-2` only when the field is genuinely full-width (remarks, tables, password hint, linked reference read-only strip).

---

## 3. Field height, width, and alignment

- **Text inputs & selects:** `width: 100%`, `minHeight: 42px`, `padding: 10px 12px`, `border: 1px solid #E1E6EA`, `borderRadius: 8px`, `fontSize: 14px`, `color: #0A0F14`, `boxSizing: border-box`.
- **Compact rows (e.g. table toolbars):** `minHeight: 38px` is acceptable if used consistently inside that table only.
- **Read-only / disabled:** Background `#F6F9FC`, text `#6E7A82`, `cursor: default` where appropriate.
- **Labels:** Block label above control; `fontSize: 14px`, `fontWeight: 500`, `marginBottom: 8px`, required asterisk `#FF4E5B`.

---

## 4. Section structure

- **Section titles:** Bottom border `1px solid #E1E6EA`, `fontSize: 15px`, `fontWeight: 600`, spacing below ~12px.
- **Between sections:** ~24px vertical margin (`marginBottom: '24px'` or Tailwind `mb-6`).

---

## 5. Tables and row spacing

- **Row separation:** `borderTop: 1px solid #E1E6EA` on body rows; header row background `#F6F9FC`.
- **Cell padding:** ~8px vertical/horizontal for data tables; keep header and body padding consistent.
- **Actions column:** Fixed narrow width; icon buttons aligned center.

---

## 6. Typography and palette (reference)

- **Primary text:** `#0A0F14`
- **Secondary / meta:** `#6E7A82`
- **Accent / links / secondary buttons:** `#00A9B7` / `#0F8A95`
- **Page background:** `#F6F9FC`
- **Cards / panels:** white with `#E1E6EA` or `#D7E3EA` borders (match surrounding screen)

---

## 7. Shared form tokens (code)

- **Module:** `src/components/ui/formTokens.ts` — `formColors`, `inputStyle`, `selectStyle` / `selectStyleCompact` / `selectStyleIconLeading` (native `appearance: none` + chevron, same height as inputs), `inputStyleCompact`, `inputStyleIconLeading`, `labelStyle`, `sectionTitleStyle`, `readOnlyInputStyle`, `readOnlyDisplayRowStyle`, optional `formFieldsMaxWidthClass` (narrow column layouts), `gridFormTwoColGap4`, `gridFormTwoColGap6`, `formSectionBlockStyle`, table helpers, and `mergeInputStyle()`.
- **Prefer importing tokens** for new or refactored master forms instead of duplicating pixel values.
- **Reference implementations:** `UserMaster.tsx` (gap-4 + table compact inputs), `CountryMaster.tsx` (gap-6 + icon-leading fields).

---

## 8. Changelog (edit when you change rules)

| Date       | Change                                                                                        |
| ---------- | --------------------------------------------------------------------------------------------- |
| 2026-04-10 | Initial universal UI rules + Cursor `alwaysApply` rule.                                       |
| 2026-04-10 | Added `src/components/ui/formTokens.ts`; User Master and Country Master import shared tokens. |
