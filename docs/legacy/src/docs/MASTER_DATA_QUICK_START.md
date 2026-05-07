# MASTER DATA SYNC - QUICK START GUIDE
## For Developers Working on AP Automation

---

## 🚀 TLDR - What Changed?

We've established a **Single Source of Truth** for all master data in AP Automation:
- ✅ **One place** for vendor, item, entity, tax, cost centre, and account data
- ✅ **Shared components** for all dropdowns and selectors
- ✅ **No more duplicates** or hardcoded lists

---

## 📦 WHAT YOU NEED TO KNOW

### 1. Where is Master Data?
**Location:** `/contexts/MasterDataContext.tsx`

This file contains:
- Vendor Master (with MSME, bank accounts, addresses)
- Item Master (with HSN, GST, category)
- Entity Master (legal entities)
- Cost Centre, Profit Centre, Project
- Account Code (Chart of Accounts)
- Tax Code (GST, TDS, TCS)
- Bank Master

### 2. How to Access Master Data?

```tsx
import { useMasterData } from './contexts/MasterDataContext';

function MyComponent() {
  const { vendors, getVendorById, getActiveVendors } = useMasterData();
  
  // Get all vendors
  const allVendors = vendors;
  
  // Get only active vendors
  const activeVendors = getActiveVendors();
  
  // Get specific vendor by ID
  const vendor = getVendorById('VEN-001');
  
  return (
    // ... component
  );
}
```

### 3. What Components Should I Use?

**NEVER create your own dropdowns for these fields!**

Instead, use these shared components:

| When you need... | Use this component | Import from |
|------------------|-------------------|-------------|
| Vendor selection | `<VendorSelector />` | `./components/shared` |
| Item selection | `<ItemSelector />` | `./components/shared` |
| Entity selection | `<EntitySelector />` | `./components/shared` |
| Cost Centre | `<CostCentreSelector />` | `./components/shared` |
| Tax Code (GST/TDS) | `<TaxCodeSelector />` | `./components/shared` |
| Account Code (GL) | `<AccountCodeSelector />` | `./components/shared` |

---

## ✅ CORRECT USAGE EXAMPLES

### Example 1: Vendor Selection in Invoice Form

```tsx
import { useState } from 'react';
import { VendorSelector } from './components/shared';

function InvoiceForm() {
  const [vendorId, setVendorId] = useState('');
  
  return (
    <div>
      <VendorSelector
        value={vendorId}
        onChange={setVendorId}
        label="Select Vendor"
        required
        showMSMEBadge  // Shows MSME badge if vendor is MSME registered
      />
    </div>
  );
}
```

### Example 2: Item Selection in PO Line Items

```tsx
import { useState } from 'react';
import { ItemSelector } from './components/shared';

function POLineItem() {
  const [itemId, setItemId] = useState('');
  
  return (
    <div>
      <ItemSelector
        value={itemId}
        onChange={setItemId}
        label="Select Item"
        filterByType="Goods"  // Or "Services"
        required
      />
    </div>
  );
}
```

### Example 3: Multiple Selectors Together

```tsx
import { useState } from 'react';
import { 
  VendorSelector, 
  ItemSelector, 
  EntitySelector,
  CostCentreSelector 
} from './components/shared';

function PurchaseOrderForm() {
  const [vendorId, setVendorId] = useState('');
  const [itemId, setItemId] = useState('');
  const [entityId, setEntityId] = useState('');
  const [costCentreId, setCostCentreId] = useState('');
  
  return (
    <div>
      <VendorSelector value={vendorId} onChange={setVendorId} required />
      <ItemSelector value={itemId} onChange={setItemId} required />
      <EntitySelector value={entityId} onChange={setEntityId} required />
      <CostCentreSelector value={costCentreId} onChange={setCostCentreId} required />
    </div>
  );
}
```

### Example 4: Getting Master Data Details

```tsx
import { useMasterData } from './contexts/MasterDataContext';

function InvoiceSummary({ vendorId }: { vendorId: string }) {
  const { getVendorById } = useMasterData();
  const vendor = getVendorById(vendorId);
  
  if (!vendor) return <div>Vendor not found</div>;
  
  return (
    <div>
      <h3>{vendor.name}</h3>
      <p>GSTIN: {vendor.gstin}</p>
      <p>Payment Terms: {vendor.paymentTerms}</p>
      {vendor.msmeRegistered && (
        <span>MSME Registered - {vendor.msmeCategory}</span>
      )}
    </div>
  );
}
```

---

## ❌ WHAT NOT TO DO

### ❌ DON'T create local arrays:
```tsx
// ❌ WRONG
const vendors = [
  { id: '1', name: 'Vendor A' },
  { id: '2', name: 'Vendor B' }
];
```

### ❌ DON'T create hardcoded dropdowns:
```tsx
// ❌ WRONG
<select>
  <option value="VEN-001">Tech Solutions</option>
  <option value="VEN-002">Office Supplies</option>
</select>
```

### ❌ DON'T duplicate master definitions:
```tsx
// ❌ WRONG
const vendorData = {
  'VEN-001': { name: 'Tech Solutions', gstin: '...' },
  'VEN-002': { name: 'Office Supplies', gstin: '...' }
};
```

---

## ✅ WHAT TO DO INSTEAD

### ✅ USE shared components:
```tsx
// ✅ RIGHT
import { VendorSelector } from './components/shared';

<VendorSelector value={vendorId} onChange={setVendorId} />
```

### ✅ USE useMasterData hook:
```tsx
// ✅ RIGHT
const { vendors, getActiveVendors } = useMasterData();
const activeVendors = getActiveVendors();
```

---

## 📋 COMPONENT PROPS REFERENCE

### VendorSelector
```tsx
<VendorSelector
  value={string}              // Vendor ID
  onChange={(id) => void}     // Callback when selection changes
  label="Vendor"              // Label text (optional)
  placeholder="Select..."     // Placeholder (optional)
  required={boolean}          // Show required indicator
  disabled={boolean}          // Disable selector
  showMSMEBadge={boolean}     // Show MSME badge
  error={string}              // Error message
/>
```

### ItemSelector
```tsx
<ItemSelector
  value={string}              // Item ID
  onChange={(id) => void}     // Callback
  label="Item"
  placeholder="Select..."
  required={boolean}
  disabled={boolean}
  filterByCategory={string}   // Filter by category
  filterByType="Goods|Services"  // Filter by type
  error={string}
/>
```

### EntitySelector
```tsx
<EntitySelector
  value={string}              // Entity ID
  onChange={(id) => void}
  label="Entity"
  required={boolean}
  error={string}
/>
```

### CostCentreSelector
```tsx
<CostCentreSelector
  value={string}              // Cost Centre ID
  onChange={(id) => void}
  label="Cost Centre"
  required={boolean}
  error={string}
/>
```

### TaxCodeSelector
```tsx
<TaxCodeSelector
  value={string}              // Tax Code ID
  onChange={(id) => void}
  label="Tax Code"
  taxType="GST|TDS|TCS"       // Filter by tax type
  required={boolean}
  error={string}
/>
```

### AccountCodeSelector
```tsx
<AccountCodeSelector
  value={string}              // Account Code ID
  onChange={(id) => void}
  label="Account Code"
  filterByType="Expense|Asset|Liability|Revenue|Equity"
  required={boolean}
  error={string}
/>
```

---

## 🔍 MASTER DATA AVAILABLE

### Vendors (3 in mock data)
- VEN-001: Tech Solutions Pvt Ltd (MSME - Micro)
- VEN-002: Office Supplies Co
- VEN-003: Engineering Parts Co (MSME - Small)

### Items (4 in mock data)
- ITEM-001: Laptop - Dell Latitude 5420
- ITEM-002: Office Chair - Executive
- ITEM-003: Consulting Services - IT
- ITEM-004: Raw Material - Steel Sheet

### Entities (2 in mock data)
- ENT-001: Bangalore Office
- ENT-002: Mumbai Office

### Cost Centres (4 in mock data)
- CC-IT: IT Department
- CC-HR: HR Department
- CC-FIN: Finance Department
- CC-OPS: Operations

### Tax Codes (5 in mock data)
- GST18: GST @ 18%
- GST12: GST @ 12%
- GST5: GST @ 5%
- TDS194C: TDS u/s 194C - Contractors (2%)
- TDS194J: TDS u/s 194J - Professional Services (10%)

---

## 🛠️ DEBUGGING

### How to see what's in the context?

Add this to your component:
```tsx
const { vendors, items, entities } = useMasterData();

console.log('Vendors:', vendors);
console.log('Items:', items);
console.log('Entities:', entities);
```

### How to verify a selector is working?

```tsx
<VendorSelector
  value={vendorId}
  onChange={(id) => {
    console.log('Selected vendor ID:', id);
    setVendorId(id);
  }}
/>
```

---

## 📝 CHECKLIST FOR NEW SCREENS

When creating a new screen in AP Automation:

- [ ] Need vendor selection? → Use `VendorSelector`
- [ ] Need item selection? → Use `ItemSelector`
- [ ] Need entity selection? → Use `EntitySelector`
- [ ] Need cost centre? → Use `CostCentreSelector`
- [ ] Need tax code? → Use `TaxCodeSelector`
- [ ] Need account code? → Use `AccountCodeSelector`
- [ ] Import from `./components/shared`
- [ ] Use `useMasterData()` hook if you need raw data
- [ ] Add compliance comment at top of file
- [ ] Test with actual master data from context

---

## 🎯 BENEFITS

### Why use this system?

1. **Consistency:** Same vendor list everywhere
2. **Auto-sync:** Change master once, reflects everywhere
3. **MSME Compliance:** Automatic MSME badge and validation
4. **Audit Trail:** All selections reference master IDs
5. **Less Code:** No need to manage local vendor arrays
6. **Validation:** Built-in error handling and required fields

---

## 📚 ADDITIONAL RESOURCES

- **Full Governance Doc:** `/docs/AP_MASTER_DATA_GOVERNANCE.md`
- **Compliance Assessment:** `/docs/MASTER_DATA_COMPLIANCE_ASSESSMENT.md`
- **Master Context:** `/contexts/MasterDataContext.tsx`
- **Shared Components:** `/components/shared/`

---

## ❓ FAQ

### Q: Can I add a new master?
**A:** Yes! Add it to `MasterDataContext.tsx` and create a selector component.

### Q: How do I add more vendors/items to mock data?
**A:** Edit the arrays in `MasterDataContext.tsx` (search for `VENDOR_MASTER_DATA`, `ITEM_MASTER_DATA`, etc.)

### Q: What if I need custom filtering?
**A:** Use the filter props on selectors (e.g., `filterByCategory`, `filterByType`)

### Q: Can I still access raw data?
**A:** Yes! Use `useMasterData()` hook and access the arrays directly.

### Q: What about validation?
**A:** Each selector has built-in `required` and `error` props.

---

## 🚦 QUICK DECISION TREE

```
Need to select something?
├─ Vendor? → VendorSelector
├─ Item? → ItemSelector
├─ Entity? → EntitySelector
├─ Cost Centre? → CostCentreSelector
├─ Tax? → TaxCodeSelector
├─ Account? → AccountCodeSelector
└─ Something else? → Check if master exists, then create selector
```

---

**Last Updated:** December 14, 2024  
**Questions?** Refer to governance docs or ask the team!  
**Status:** ✅ Active & Ready to Use
