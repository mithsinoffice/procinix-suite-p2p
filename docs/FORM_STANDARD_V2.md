# Procinix S2P — Master UI Standard V2

**Status:** Living spec. Last updated 2026-05-11.
Companion to `CLAUDE.md` (change log) and `ARCHITECTURE.md` (system map).
This file documents the visual + behavioural contract for every master
data screen in the application.

The reference implementation is `src/components/masters/SimpleMasterScreenV2.tsx`.
Every master wrapper in `src/components/*Master.tsx` is config-driven and
delegates rendering to that one component. If a master needs anything not
expressible through the config, **extend V2 — do not fork a bespoke
component**.

---

## 1. When to use V2

A master qualifies for V2 if:

- It is a flat reference table (rows of code + name + a handful of attribute
  fields).
- Persistence is via `useIncrementalMasterRecords` → `PUT /api/masters/<key>`.
- Optional: approval workflow (`requiresApproval`) and/or entity scoping
  (`entityScoped`).

Out of scope for V2 (use a bespoke component): transactional masters where
rows are not edited in isolation — e.g. tax-section thresholds keyed by
multiple dimensions, payment-method matrices with per-currency rates.

## 2. Visual contract

### 2.1 Listing page

- **Page header:** white background, 16px 24px padding, 3px teal left border
  accent. Icon chip (36×36, teal-tint background, teal-dark icon). Title at
  15px/500; subtitle at 12px muted shows the live record count.
- **Toolbar:** background-secondary, padding 8px 24px. Left: search input
  (32px height, fog border). Middle: status filter (`All / Active /
Inactive`); optional entity filter when `entityScoped`. Right: Export CSV.
- **Table header:** teal (`#1D9E75`) background, white text, 11px uppercase,
  letter-spacing 0.05em, padding 10px 16px.
- **Row hover:** background `#F4FBF8` (teal soft).
- **Row cells:** 12px 16px padding, 13px primary text, monospace 12px for
  the code column.
- **Per-row actions:** three icon buttons — `View` (teal hover), `Edit`
  (blue hover), `Audit` (amber hover). Each is 26×26 with a 0.5px border
  and a tinted background on hover.
- **Pagination strip:** white background, 10/25/50 rows per page selector +
  prev/next chevrons + "Page n of m" label.

### 2.2 Full-page form (Add / Edit / View)

- **NOT a drawer or modal.** Mounts in place of the listing within the same
  route, via internal V2 state.
- **Sticky topbar (z-index 20):** Back button + breadcrumb (`Masters ›
  <Title> › New | Edit | View`) on the left; auto-save pill on the right.
- **Auto-save pill states:**
  - `Auto-save enabled` (teal-tint / teal-dark) when idle in edit mode
  - `Saving…` (amber-tint / amber) during the 1.5s debounced write
  - `Saved just now` (teal-tint / teal-dark) for ~1.2s after each write
- **Form hero:** 44×44 icon chip, title (17px/500), subtitle (12px muted),
  status badge on the right.
- **Single card container:** background white, border-radius 14, 0.5px fog
  border, overflow hidden. **Internal sections are separated by
  `border-top: 0.5px solid fog` only — never as separate cards.**
- **Section header:** 3px coloured left stripe (`teal` / `blue` / `amber`),
  section title (13px/600), optional subtitle (11px muted).
- **Form grid:** `display: grid; grid-template-columns: 1fr 1fr; gap: 16` —
  exactly 2 columns inside each section.
- **Sticky footer (z-index 10):** white background, 0.5px fog top border,
  light shadow. Left: `Last saved …` relative timestamp. Right (in order):
  optional `Deactivate` (ghost-red, edit-mode + Active records only) →
  `Cancel` → `Save draft` → `Save & activate` OR `Save & submit for
approval` (when `requiresApproval`). View-mode shows Approve / Reject in
  this slot when the record's `approvalStatus` is `Pending Approval`.

### 2.3 Audit trail page

- Same sticky topbar pattern as the form, breadcrumb ends in `Audit trail`.
- Hero matches the form hero but with the record's display name + apiPath +
  code in the subtitle.
- Single card body with a vertical change log: 30×30 tinted icon chip
  (teal/blue/amber/grey by event type) + action line + user + relative
  timestamp.

## 3. Field behaviour

### 3.1 Validation

- **On blur**, each field runs:
  1. `required` check (when the field is required + value is empty or only
     whitespace) → `"<Label> is required"`.
  2. Custom `validate(value, form)` callback → any string.
- **Valid state**: border `1.5px solid #1D9E75` + a green `CheckCircle2`
  icon flush-right (only after the field has been touched).
- **Invalid state**: border `1.5px solid #E24B4A` + a red `AlertCircle`
  icon + 11px helper text below.
- **Untouched**: border `0.5px solid fog`, no icon.

### 3.2 Universal Master Rule (mandatory)

**Every system-generated field renders read-only on every form, every
time.** No exceptions.

- The `Code` field at the top of every form is **always** read-only.
- On `add`: shows placeholder `Auto-generated on save` and an `Auto` pill
  badge.
- On `edit` / `view`: shows the real value (still not editable) and the
  `Auto` pill.
- Custom fields can also opt in via `autoGenerated: true` on a field
  descriptor. Same behaviour: read-only input, placeholder, Auto pill, no
  validation.
- The same rule applies across the app to: `invoiceNumber`,
  `debitNoteNumber`, `prRef`, `poRef`, `grnRef`, `srnRef`, `advanceRef`.
  See `docs/ARCHITECTURE.md §12.9`.

### 3.3 Auto-save

- Only fires in **edit mode** (no auto-save for adds — that path commits
  via the footer Save buttons).
- 1.5s debounce after the **last field blur**.
- Skipped while validation errors exist on the form.
- Pill transitions `idle → Saving… (amber) → Saved just now (teal)`; resets
  to `idle` after 1.2s.

### 3.4 Toast banners

- Rendered at the top of the form body, stacked, **max 3 visible** (oldest
  dropped beyond that).
- `success` (teal-tint / teal-dark) auto-dismisses after 3 seconds.
- `warning` (amber-tint / amber-dark) and `error` (red-tint / red-dark)
  stay until dismissed by the user via the close button.
- Use cases: `success` after submit, `warning` after deactivate / reject,
  `error` on validation failure or backend rejection.

## 4. MasterConfig prop shape

```ts
interface MasterV2Config {
  title: string; // "Department Master"
  subtitle?: string; // Listing subtitle + form hero
  icon: LucideIcon; // Header chip + form hero chip
  masterKey: MasterKey; // Drives useIncrementalMasterRecords
  apiPath?: string; // Defaults to `/masters/${masterKey}`
  codeKey?: string; // Default 'recordCode'; override for
  //   heavy masters with custom row keys
  nameKey?: string; // Default 'recordName'
  entityScoped?: boolean; // Mount <EntityMappingSelector>
  requiresApproval?: boolean; // Approve/Reject + status flips
  columns: MasterV2Column[]; // Extra listing columns after code/name
  formSections: MasterV2Section[]; // Editable form sections
}
```

### 4.1 Column descriptor

```ts
interface MasterV2Column {
  key: string; // Row key OR payload key
  label: string;
  fromPayload?: boolean; // Read from record.payload[key]
  format?: (v: unknown) => string; // Custom cell renderer
  width?: string; // e.g. "120px"
}
```

### 4.2 Field descriptor

```ts
interface MasterV2Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'currency' | 'select' | 'textarea' | 'date';
  required?: boolean;
  autoGenerated?: boolean; // Universal Master Rule
  fromPayload?: boolean;
  options?: string[]; // For select
  placeholder?: string;
  helper?: string;
  validate?: (v, form) => string | null;
}
```

### 4.3 Section descriptor

```ts
interface MasterV2Section {
  id: string;
  title: string;
  subtitle?: string;
  stripe?: 'teal' | 'blue' | 'amber'; // 3px left stripe colour
  fields: MasterV2Field[];
}
```

## 5. Entity scoping (`entityScoped: true`)

When this flag is on, V2 mounts the existing
`src/components/shared/EntityMappingSelector.tsx` as a dedicated section
between the configured form sections and the Status section. The selector
reads `useMasterData().entities`, lets the user pick a subset (or none for
global scope), and writes back to `record.entityMappings: EntityScopeMapping[]`.

`EntityScopeMapping` lives in `src/lib/masters/entityMapping.ts` and is the
same shape every other entity-scoped master uses — no new types
introduced.

## 6. Approval workflow (`requiresApproval: true`)

- The footer's primary action becomes `Save & submit for approval` instead
  of `Save & activate`. Submitting flips `approvalStatus` from `Draft` to
  `Pending Approval`.
- View mode (`/master/:key/view/:id`) shows two extra footer buttons when
  the row is in `Pending Approval`: `Approve` (teal, primary) and `Reject`
  (ghost-red). Both call
  `applyMasterApprovalAction(masterKey, records, recordId, action)` from
  `src/lib/masters/masterScreenApproval.ts`, which hits
  `POST /master-approvals/<masterKey>/<recordId>/actions` and re-fetches
  the master records on success.
- The reject button prompts for an optional comment via `window.prompt`.
  Future iteration: replace with an inline reject-reason field.
- No separate `<ApprovalModal>` — the action is inline in the form footer.

## 7. Examples in the codebase

All 12 masters listed below are wired to V2 via thin ~20–60-line config
wrappers (2026-05-11 migration):

| Master                     | codeKey/nameKey                    | entityScoped | requiresApproval |
| -------------------------- | ---------------------------------- | :----------: | :--------------: |
| `DesignationMaster`        | recordCode/recordName              |      –       |        –         |
| `AssetCategoryMaster`      | recordCode/recordName              |      –       |        –         |
| `DepreciationMethodMaster` | recordCode/recordName              |      –       |        –         |
| `ServiceTypeMaster`        | recordCode/recordName              |      –       |        –         |
| `ExpenseCategoryMaster`    | recordCode/recordName              |      –       |        –         |
| `DepartmentMaster`         | deptCode/deptName                  |      ✓       |        ✓         |
| `LocationMaster`           | locationCode/locationName          |      ✓       |        ✓         |
| `CostCentreMaster`         | costCentreCode/costCentreName      |      ✓       |        ✓         |
| `GLCodeMaster`             | glCode/glDescription               |      ✓       |        ✓         |
| `TaxCodeMaster`            | taxCode/description                |      ✓       |        ✓         |
| `UOMMaster`                | recordCode/recordName              |      ✓       |        ✓         |
| `VendorGroupMaster`        | groupCode/groupName                |      ✓       |        ✓         |
| `ProfitCentreMaster`       | recordCode/recordName              |      ✓       |        ✓         |
| `KitBundleMaster`          | bundleCode/bundleName              |      –       |        –         |
| `EmployeeMaster`           | employeeCode/fullName (suppressed) |      –       |        –         |

## 8. Adding a new master

1. Add the master to `server/masterStorage.mjs::MASTER_STORAGE` and ship a
   migration creating `<key>_master.<key>_master` + audit table (see
   `sql/mysql/migrations/20260510_sprint1_masters.sql` for the template).
2. Hydrate it through `MasterDataContext` if other forms need to read from
   it (`ensureRelationalMasterRecords(<key>, ...)`).
3. Create `src/components/<Name>Master.tsx` as a thin V2 wrapper:

```tsx
import { Icon } from 'lucide-react';
import { SimpleMasterScreenV2, type MasterV2Config } from './masters/SimpleMasterScreenV2';

const config: MasterV2Config = {
  title: 'My Thing Master',
  subtitle: 'One-line description shown in the listing header.',
  icon: Icon,
  masterKey: 'my_thing_master',
  // codeKey: 'myThingCode',           // omit if using recordCode
  // entityScoped: true,
  // requiresApproval: true,
  columns: [{ key: 'someField', label: 'Some Field' }],
  formSections: [
    {
      id: 'details',
      title: 'Details',
      stripe: 'blue',
      fields: [{ key: 'someField', label: 'Some Field', required: true }],
    },
  ],
};

export function MyThingMaster() {
  return <SimpleMasterScreenV2 config={config} />;
}
```

4. Register the component in `App.tsx` at `/masters/<slug>-master`.
5. Add a row to the table in §7 of this file.

## 9. Migration notes

The 2026-05-11 sweep migrated 7 heavy bespoke masters (Department /
Location / CostCentre / GLCode / TaxCode / UOM / VendorGroup) from
600–900 line drawers + `ApprovalModal` + bespoke `EntityMappingSelector`
into 30–60 line V2 configs. Entity-mapping is preserved via
`entityScoped: true`. Approval workflow is preserved via
`requiresApproval: true` — the old modal was replaced with inline
footer Approve/Reject buttons that fire the same
`applyMasterApprovalAction` helper, so the backend approval endpoint
(`POST /master-approvals/<key>/<id>/actions`) is unchanged.
