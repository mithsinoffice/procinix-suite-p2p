# AP AUTOMATION - MASTER DATA GOVERNANCE

## System of Record - Enforced

This document defines the **master data governance rules** for all modules under **AP Automation**. 
These rules ensure data consistency, prevent duplication, and maintain a single source of truth.

---

## 📋 SCOPE

### IN SCOPE (AP AUTOMATION MODULES):
- ✅ Procurement
- ✅ Accounts Payable
- ✅ Payments
- ✅ Vendor Advances
- ✅ Vendor Onboarding
- ✅ Budgeting
- ✅ Masters

### OUT OF SCOPE (DO NOT TOUCH):
- ❌ AR Automation
- ❌ R2R Automation

---

## 🔐 MASTER DATA - SYSTEM OF RECORD

The following masters are **AUTHORITATIVE** and **IMMUTABLE** at the transaction level:

| Master | Location | Owner Module | Consumers |
|--------|----------|--------------|-----------|
| **Vendor Master** | `/contexts/MasterDataContext.tsx` | Vendor Onboarding | Procurement, AP, Payments, Advances |
| **Item Master** | `/contexts/MasterDataContext.tsx` | Masters | Procurement, AP, GRN |
| **PO Master** | Procurement Module | Procurement | AP, GRN, Payments |
| **Account Code Master** | `/contexts/MasterDataContext.tsx` | Masters | AP, Payments, Budgeting |
| **Tax Master (GST/TDS)** | `/contexts/MasterDataContext.tsx` | Masters | Procurement, AP |
| **Entity Master** | `/contexts/MasterDataContext.tsx` | Masters | Procurement, AP, Payments, Budgeting |
| **Cost Centre Master** | `/contexts/MasterDataContext.tsx` | Masters | Procurement, AP, Budgeting |
| **Profit Centre Master** | `/contexts/MasterDataContext.tsx` | Masters | AP, Budgeting |
| **Project Master** | `/contexts/MasterDataContext.tsx` | Masters | Procurement, AP, Budgeting |
| **Bank Master** | `/contexts/MasterDataContext.tsx` | Masters | Payments |
| **User/Role Master** | `/contexts/AuthContext.tsx` | Admin | All Modules |

---

## 🚫 PROHIBITED PRACTICES

### ❌ DO NOT:
1. Create local arrays or hardcoded dropdowns for master data
2. Duplicate vendor, item, or other master definitions in components
3. Create standalone master data in individual screens
4. Use mock data for masters outside of `MasterDataContext`
5. Create custom dropdowns without using shared selector components

### ❌ WRONG APPROACH:
```tsx
// ❌ BAD - Local vendor array
const vendors = [
  { id: '1', name: 'Vendor A' },
  { id: '2', name: 'Vendor B' }
];

// ❌ BAD - Hardcoded dropdown
<select>
  <option value="VEN-001">Tech Solutions</option>
  <option value="VEN-002">Office Supplies</option>
</select>
```

---

## ✅ APPROVED APPROACH

### ✅ DO:
1. Use `useMasterData()` hook to access master data
2. Use shared selector components from `/components/shared/`
3. Reference masters read-only at transaction level
4. Ensure all dashboards pull from master-linked transactional data

### ✅ CORRECT APPROACH:
```tsx
// ✅ GOOD - Using shared component
import { VendorSelector } from './components/shared';
import { useMasterData } from './contexts/MasterDataContext';

function InvoiceForm() {
  const [vendorId, setVendorId] = useState('');
  const { getVendorById } = useMasterData();
  
  const selectedVendor = vendorId ? getVendorById(vendorId) : null;
  
  return (
    <VendorSelector
      value={vendorId}
      onChange={setVendorId}
      required
      showMSMEBadge
    />
  );
}
```

---

## 🔧 SHARED SELECTOR COMPONENTS

All modules MUST use these components for master data selection:

### 1. VendorSelector
**File:** `/components/shared/VendorSelector.tsx`  
**Usage:** Procurement, AP Invoices, Payments, Advances  
**Props:**
- `value`: string (Vendor ID)
- `onChange`: (vendorId: string) => void
- `label`: string
- `required`: boolean
- `showMSMEBadge`: boolean

**Example:**
```tsx
<VendorSelector
  value={vendorId}
  onChange={setVendorId}
  label="Select Vendor"
  required
  showMSMEBadge
/>
```

---

### 2. ItemSelector
**File:** `/components/shared/ItemSelector.tsx`  
**Usage:** Procurement PO, AP Invoices, GRN  
**Props:**
- `value`: string (Item ID)
- `onChange`: (itemId: string) => void
- `filterByCategory`: string
- `filterByType`: 'Goods' | 'Services'

**Example:**
```tsx
<ItemSelector
  value={itemId}
  onChange={setItemId}
  label="Select Item"
  filterByType="Goods"
  required
/>
```

---

### 3. EntitySelector
**File:** `/components/shared/EntitySelector.tsx`  
**Usage:** Procurement, AP Invoices, Payments, Budgeting  
**Example:**
```tsx
<EntitySelector
  value={entityId}
  onChange={setEntityId}
  label="Company/Entity"
  required
/>
```

---

### 4. CostCentreSelector
**File:** `/components/shared/CostCentreSelector.tsx`  
**Usage:** Procurement, AP Invoices, Budgeting  
**Example:**
```tsx
<CostCentreSelector
  value={costCentreId}
  onChange={setCostCentreId}
  label="Cost Centre"
  required
/>
```

---

### 5. TaxCodeSelector
**File:** `/components/shared/TaxCodeSelector.tsx`  
**Usage:** Procurement, AP Invoices  
**Props:**
- `taxType`: 'GST' | 'TDS' | 'TCS'

**Example:**
```tsx
<TaxCodeSelector
  value={gstCodeId}
  onChange={setGstCodeId}
  label="GST Rate"
  taxType="GST"
  required
/>
```

---

### 6. AccountCodeSelector
**File:** `/components/shared/AccountCodeSelector.tsx`  
**Usage:** AP Invoices, Payments, Budgeting  
**Props:**
- `filterByType`: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense'

**Example:**
```tsx
<AccountCodeSelector
  value={accountCodeId}
  onChange={setAccountCodeId}
  label="GL Account"
  filterByType="Expense"
  required
/>
```

---

## 📊 DATA FLOW HIERARCHY

```
┌─────────────────────────────────────────────────────────────┐
│                    MASTER DATA CONTEXT                       │
│              (Single Source of Record)                       │
│   • Vendor Master    • Item Master     • Entity Master      │
│   • Tax Master       • Account Codes   • Cost Centre        │
│   • Bank Master      • Project Master  • Profit Centre      │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌───▼────┐ ┌───▼────────┐
    │ VENDOR  │ │  ITEM  │ │   ENTITY   │
    │ONBOARDING│ │ MASTER │ │   MASTER   │
    └────┬────┘ └───┬────┘ └───┬────────┘
         │          │           │
         └──────────┼───────────┘
                    │
         ┌──────────▼──────────────────────┐
         │      PROCUREMENT (PO)           │
         │  References: Vendor, Item,      │
         │  Entity, Cost Centre, Tax       │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │   ACCOUNTS PAYABLE (Invoice)    │
         │  References: Vendor, PO, Item,  │
         │  Entity, Tax, Account Code      │
         └──────────┬──────────────────────┘
                    │
         ┌──────────▼──────────────────────┐
         │         PAYMENTS                │
         │  References: Invoice, Vendor,   │
         │  Bank, Entity, Account Code     │
         └─────────────────────────────────┘
```

---

## 🛡️ ENFORCEMENT CHECKLIST

Before creating any NEW screen in AP Automation, ensure:

- [ ] Used `useMasterData()` hook for accessing master data
- [ ] Used shared selector components (VendorSelector, ItemSelector, etc.)
- [ ] No local/hardcoded master data arrays
- [ ] No standalone dropdowns for vendors, items, entities, etc.
- [ ] Dashboards pull from master-linked transactional data
- [ ] Read-only references to masters at transaction level

---

## 🔍 AUDIT & VALIDATION

### How to Check Compliance:

1. **Search for violations:**
   ```bash
   # Search for hardcoded vendor arrays
   grep -r "const vendors = \[" components/
   
   # Search for hardcoded item arrays
   grep -r "const items = \[" components/
   ```

2. **Verify master usage:**
   - All vendor selections should use `<VendorSelector />`
   - All item selections should use `<ItemSelector />`
   - All entity selections should use `<EntitySelector />`

3. **Check imports:**
   - Components should import from `'./components/shared'`
   - Components should use `useMasterData()` hook

---

## 📝 FUTURE DEVELOPMENT RULES

### For New Screens/Components:

1. **ALWAYS** check if master data exists in `MasterDataContext`
2. **NEVER** create local master arrays
3. **USE** shared selector components
4. **LINK** transactional data to masters via IDs
5. **ENSURE** dashboards reflect master-linked data

### Design-Time Annotation:
Add this comment at the top of new components:
```tsx
/**
 * MASTER DATA COMPLIANCE:
 * ✅ Uses shared VendorSelector component
 * ✅ References Vendor Master via useMasterData()
 * ✅ No local/duplicate master data
 */
```

---

## 🚨 VIOLATION EXAMPLES & FIXES

### Example 1: Hardcoded Vendor Dropdown

❌ **BEFORE (Violation):**
```tsx
function InvoiceForm() {
  return (
    <select>
      <option value="VEN-001">Tech Solutions</option>
      <option value="VEN-002">Office Supplies</option>
    </select>
  );
}
```

✅ **AFTER (Compliant):**
```tsx
import { VendorSelector } from './components/shared';

function InvoiceForm() {
  const [vendorId, setVendorId] = useState('');
  
  return (
    <VendorSelector
      value={vendorId}
      onChange={setVendorId}
      required
    />
  );
}
```

---

### Example 2: Local Item Array

❌ **BEFORE (Violation):**
```tsx
function POLineItems() {
  const items = [
    { id: '1', name: 'Laptop' },
    { id: '2', name: 'Chair' }
  ];
  
  return (
    <select>
      {items.map(item => (
        <option key={item.id} value={item.id}>{item.name}</option>
      ))}
    </select>
  );
}
```

✅ **AFTER (Compliant):**
```tsx
import { ItemSelector } from './components/shared';

function POLineItems() {
  const [itemId, setItemId] = useState('');
  
  return (
    <ItemSelector
      value={itemId}
      onChange={setItemId}
      required
    />
  );
}
```

---

## 📚 ADDITIONAL RESOURCES

- **Master Data Context:** `/contexts/MasterDataContext.tsx`
- **Shared Components:** `/components/shared/`
- **Usage Examples:** See existing screens like `InvoiceFormPO.tsx`

---

## ⚙️ TECHNICAL IMPLEMENTATION

### MasterDataContext Structure:
```tsx
interface MasterDataContextType {
  // Vendors
  vendors: VendorMaster[];
  getVendorById: (id: string) => VendorMaster | undefined;
  getActiveVendors: () => VendorMaster[];
  
  // Items
  items: ItemMaster[];
  getItemById: (id: string) => ItemMaster | undefined;
  getActiveItems: () => ItemMaster[];
  
  // ... and more
}
```

### How to Use:
```tsx
import { useMasterData } from './contexts/MasterDataContext';

function MyComponent() {
  const { vendors, getVendorById, getActiveVendors } = useMasterData();
  
  const activeVendors = getActiveVendors();
  const vendor = getVendorById('VEN-001');
  
  return (
    // ... component logic
  );
}
```

---

## 🎯 SUMMARY

**KEY TAKEAWAYS:**

1. ✅ **One Source of Truth**: `MasterDataContext` is the only place for master data
2. ✅ **Shared Components**: Use selector components from `/components/shared/`
3. ✅ **No Duplication**: Never create local master arrays or hardcoded dropdowns
4. ✅ **Linked References**: Transactions reference masters via IDs
5. ✅ **Automatic Updates**: Master changes reflect everywhere automatically

**GOVERNANCE ENFORCED:**
- All AP Automation modules are now master-data compliant
- Future screens must follow these rules
- Non-compliant code will be flagged in reviews

---

**Last Updated:** December 14, 2024  
**Version:** 1.0  
**Status:** ✅ Active & Enforced
