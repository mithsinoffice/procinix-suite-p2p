# GLOBAL FIELD STANDARDIZATION - Implementation Guide

## Overview
This document provides the complete specification for standardizing ALL input fields across the entire application to match the "Debit Note Date" field standard.

## Reference Standard
**Debit Note Date Field** (from `/components/DebitNoteFormV2Enhanced.tsx`):
```tsx
<div>
  <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
    Debit Note Date *
  </label>
  <StandardInput
    type="date"
    value={debitNoteDate}
    onChange={(e) => setDebitNoteDate(e.target.value)}
    disabled={debitNoteStatus !== 'Draft'}
    icon={<Calendar className="w-4 h-4" />}
  />
</div>
```

## Implementation Options

### Option 1: Using React Components (Recommended)
Import and use the standardized components:

```tsx
import { StandardInput, StandardSelect, StandardTextarea } from './shared/StandardInput';

// Text Input with Icon
<StandardInput
  type="text"
  value={value}
  onChange={handleChange}
  icon={<Hash className="w-4 h-4" />}
  placeholder="Enter value"
  disabled={false}
/>

// Select/Dropdown with Icon
<StandardSelect
  value={value}
  onChange={handleChange}
  icon={<FileText className="w-4 h-4" />}
  disabled={false}
>
  <option value="">Select...</option>
  <option value="1">Option 1</option>
</StandardSelect>

// Textarea with Icon
<StandardTextarea
  value={value}
  onChange={handleChange}
  icon={<FileText className="w-4 h-4" />}
  rows={3}
  placeholder="Enter description"
/>
```

### Option 2: Using CSS Classes
Use the standardized CSS classes from `/styles/globals.css`:

```tsx
// Input with Icon
<div className="std-input-container">
  <div className="std-input-icon">
    <Hash className="w-4 h-4" />
  </div>
  <input
    type="text"
    value={value}
    onChange={handleChange}
    className="std-input has-icon"
    placeholder="Enter value"
  />
</div>

// Select with Icon
<div className="std-input-container">
  <div className="std-input-icon">
    <FileText className="w-4 h-4" />
  </div>
  <select
    value={value}
    onChange={handleChange}
    className="std-select has-icon"
  >
    <option value="">Select...</option>
    <option value="1">Option 1</option>
  </select>
</div>

// Inline Table Input
<input
  type="number"
  value={value}
  onChange={handleChange}
  className="std-inline-input w-20 text-right"
  min="0"
  step="0.01"
/>
```

## Specification Details

### 1. Field Container
- **Height**: Auto (driven by py-2.5 padding)
- **Border Radius**: `0.5rem` (rounded-lg)
- **Border**: `1px solid #E1E6EA`
- **Background**: `white` (normal), `#F6F9FC` (disabled/readonly)

### 2. Icon Placement
- **Position**: `absolute left-3 top-1/2 transform -translate-y-1/2`
- **Size**: `w-4 h-4` (16px × 16px)
- **Color**: `#6E7A82`
- **Non-overlapping**: Icon NEVER overlaps with text

### 3. Padding (CRITICAL)
- **Without Icon**: `px-3 py-2.5` (12px horizontal, 10px vertical)
- **With Icon (Input)**: `pl-10 pr-3 py-2.5` (40px left, 12px right, 10px vertical)
- **With Icon (Select)**: `pl-10 pr-8 py-2.5` (40px left, 32px right for arrow, 10px vertical)

### 4. Text Properties
- **Font Size**: `1rem` (16px)
- **Line Height**: `1.5`
- **Color**: `#0A0F14` (normal), `#6E7A82` (disabled/readonly)
- **Truncation**: Long text truncates with ellipsis, never wraps

### 5. States
- **Normal**: White background, #0A0F14 text, #E1E6EA border
- **Focus**: #00A9B7 border, subtle shadow
- **Disabled**: #F6F9FC background, #6E7A82 text, not-allowed cursor
- **Read-only**: Same as disabled
- **Error**: #FF4E5B border

## Files Requiring Updates

### Master Forms (Priority 1)
- ✅ `/components/DebitNoteFormV2Enhanced.tsx` - COMPLETED
- ✅ `/components/ColorMaster.tsx` - COMPLETED
- `/components/SizeMaster.tsx`
- `/components/ProductMaster.tsx`
- `/components/SKUMaster.tsx`
- `/components/ContractMaster.tsx`
- `/components/CountryMaster.tsx`
- `/components/StateMaster.tsx`
- `/components/ApprovalWorkflow.tsx`
- `/components/VendorPaymentTermsMaster.tsx`
- `/components/DebitNoteReasonMaster.tsx`
- `/components/CategoryMaster.tsx`
- `/components/CostCentreMaster.tsx`
- `/components/DepartmentMaster.tsx`
- `/components/EmployeeMaster.tsx`
- `/components/ItemCategoryMaster.tsx`
- `/components/ItemMaster.tsx`
- `/components/ProfitCentreMaster.tsx`
- `/components/TaxCodeMaster.tsx`
- `/components/UOMMaster.tsx`
- `/components/UserMaster.tsx`
- `/components/RolesMaster.tsx`

### Transaction Forms (Priority 2)
- `/components/InvoiceForm.tsx`
- `/components/InvoiceFormPO.tsx`
- `/components/NonPOInvoiceForm.tsx`
- `/components/CreatePurchaseOrder.tsx`
- `/components/POUpdate.tsx`
- `/components/GoodsReceipt.tsx`
- `/components/AdvanceRequestForm.tsx`
- `/components/PaymentProposal.tsx`
- `/components/BudgetPlanningCreation.tsx`

### Other Forms (Priority 3)
- `/components/CreateVendor.tsx`
- `/components/Vendors.tsx` (search box)
- `/components/PurchaseOrders.tsx` (search box)
- All AR forms in `/components/ar/`
- All Cash Flow forms in `/components/cashflow/`

## Migration Checklist

For each form:
1. [ ] Import StandardInput, StandardSelect components OR reference CSS classes
2. [ ] Replace all `className="w-full pl-10 pr-3 py-2 rounded-lg"` patterns
3. [ ] Ensure icon is in standardized position
4. [ ] Test icon doesn't overlap with text (especially long dropdown values)
5. [ ] Verify disabled/readonly states work correctly
6. [ ] Check inline table inputs match form inputs
7. [ ] Test focus states and accessibility

## Known Issues Fixed
1. **Icon Overlap**: Icon spacing now ensures no overlap with field values
2. **Inconsistent Heights**: All fields use py-2.5 for uniform height
3. **Select Dropdown**: Custom arrow positioned correctly with pr-8
4. **Long Values**: Text truncates with ellipsis instead of wrapping
5. **Table Inputs**: Inline inputs now match form input styling

## Testing Checklist
- [ ] All master forms load without errors
- [ ] Icons are properly positioned in all fields
- [ ] Long dropdown values don't overlap icons
- [ ] Tab navigation works smoothly
- [ ] Focus states are visible
- [ ] Disabled states are clearly indicated
- [ ] Form submissions work correctly
- [ ] Mobile responsive behavior maintained

## Rollback Plan
If issues arise:
1. Revert to previous field styling by removing `std-*` classes
2. Use inline styles as fallback: `className="w-full pl-10 pr-3 py-2.5 rounded-lg"`
3. Report issues for individual component fixes

## Support
For questions or issues with field standardization:
- Review this guide
- Check `/components/shared/StandardInput.tsx` for component implementation
- Check `/styles/globals.css` for CSS class definitions
- Reference `/components/DebitNoteFormV2Enhanced.tsx` as working example
