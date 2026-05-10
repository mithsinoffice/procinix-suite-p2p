# Migration Guide: Converting to Production Structure

## Overview

This guide explains how to migrate the existing Figma Make AI project to the production-ready `/src` structure.

## Current State

```
/ (root)
├── App.tsx                    ← Main app
├── routes.ts                  ← Routes config
├── styles/globals.css         ← Styles
├── components/                ← All 100+ components
├── contexts/                  ← Context providers
├── config/                    ← Config files
├── data/                      ← Static data
├── utils/                     ← Utilities
└── pages/                     ← Some organized pages
```

## Target State

```
/
├── src/
│   ├── app/
│   │   ├── App.tsx           ✅ Created
│   │   └── routes.tsx        ✅ Created
│   │
│   ├── styles/
│   │   ├── tokens.ts         ✅ Created
│   │   └── globals.css       ← Move from /styles/
│   │
│   ├── types/
│   │   └── models.ts         ✅ Created
│   │
│   ├── services/
│   │   └── api.ts            ✅ Created
│   │
│   ├── layouts/              ← Organize from /components/
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── RootLayout.tsx
│   │
│   ├── components/           ← Move shared from /components/
│   │   ├── ui/               ← shadcn components
│   │   ├── shared/           ← Domain components
│   │   └── core/             ← Core components
│   │
│   └── pages/                ← Organize from /components/ & /pages/
│       ├── auth/
│       ├── dashboard/
│       ├── procurement/
│       ├── vendors/
│       ├── invoices/
│       ├── debit-notes/
│       ├── payments/
│       ├── advances/
│       ├── budget/
│       ├── masters/
│       ├── reports/
│       ├── audit/
│       ├── cashflow/
│       └── ar/
│
├── contexts/                 ← Keep as is
├── config/                   ← Keep as is
├── data/                     ← Keep as is
└── utils/                    ← Keep as is
```

## Migration Steps

### Step 1: Create Base Structure ✅ DONE

The foundation is already created:
- ✅ `/src/app/App.tsx`
- ✅ `/src/app/routes.tsx`
- ✅ `/src/styles/tokens.ts`
- ✅ `/src/types/models.ts`
- ✅ `/src/services/api.ts`

### Step 2: Move Styles

```bash
# Copy globals.css to new location
cp styles/globals.css src/styles/globals.css
```

Update import in `src/app/App.tsx`:
```typescript
import '../styles/globals.css';
```

### Step 3: Create Layouts Directory

Identify layout components from `/components/`:
- DashboardLayout.tsx
- Sidebar.tsx (if separate)
- Header.tsx
- RootLayout.tsx
- DeskLayoutShell.tsx

```bash
# Create layouts directory
mkdir -p src/layouts

# Move layout components
mv components/DashboardLayout.tsx src/layouts/
mv components/RootLayout.tsx src/layouts/
mv components/Header.tsx src/layouts/
mv components/desk-components/DeskLayoutShell.tsx src/layouts/
```

Update imports in these files to use relative paths to contexts and components.

### Step 4: Organize Components

Keep only truly shared/reusable components in `/src/components/`:

```bash
# Create component directories
mkdir -p src/components/ui
mkdir -p src/components/shared
mkdir -p src/components/core

# Move UI components (shadcn)
mv components/ui/* src/components/ui/

# Move shared components
mv components/shared/* src/components/shared/

# Move core components
mv components/core/* src/components/core/

# Move desk components
mv components/desk-components/* src/components/shared/
```

### Step 5: Organize Pages by Module

Create page directories and move components:

```bash
# Create page directories
mkdir -p src/pages/auth
mkdir -p src/pages/dashboard
mkdir -p src/pages/procurement
mkdir -p src/pages/vendors
mkdir -p src/pages/invoices
mkdir -p src/pages/debit-notes
mkdir -p src/pages/payments
mkdir -p src/pages/advances
mkdir -p src/pages/budget
mkdir -p src/pages/masters
mkdir -p src/pages/reports
mkdir -p src/pages/audit
mkdir -p src/pages/cashflow
mkdir -p src/pages/ar
mkdir -p src/pages/desks
mkdir -p src/pages/modules

# Move auth pages
mv components/Login.tsx src/pages/auth/

# Move dashboard pages
mv components/Dashboard.tsx src/pages/dashboard/
mv components/DashboardsHub.tsx src/pages/dashboard/
mv components/GlobalApprovalsDashboard.tsx src/pages/dashboard/

# Move procurement pages
mv components/PurchaseOrders.tsx src/pages/procurement/
mv components/CreatePurchaseOrder.tsx src/pages/procurement/
mv components/PRSelectionPage.tsx src/pages/procurement/
mv components/POUpdate.tsx src/pages/procurement/
mv components/GoodsReceipt.tsx src/pages/procurement/

# Move procurement/PR components
mv components/procurement/*.tsx src/pages/procurement/

# Move vendor pages
mv components/Vendors.tsx src/pages/vendors/
mv components/CreateVendor.tsx src/pages/vendors/
mv components/VendorManagement.tsx src/pages/vendors/

# Move invoice pages
mv components/Invoices.tsx src/pages/invoices/
mv components/InvoiceFormPO.tsx src/pages/invoices/
mv components/InvoiceFormDirect.tsx src/pages/invoices/
mv components/AIInvoiceCapture.tsx src/pages/invoices/
mv components/InvoiceDetail.tsx src/pages/invoices/
mv components/MyInvoices.tsx src/pages/invoices/
mv components/InvoiceWorkflowView.tsx src/pages/invoices/
mv components/InvoicesForApproval.tsx src/pages/invoices/
mv components/InvoiceApprovalScreenV2.tsx src/pages/invoices/
mv components/ReadyForPayment.tsx src/pages/invoices/
mv components/NonPOInvoiceForm.tsx src/pages/invoices/
mv components/NonPOInvoiceApprovalScreen.tsx src/pages/invoices/

# Move debit note pages
mv components/DebitNotes.tsx src/pages/debit-notes/
mv components/DebitNoteFormV2Enhanced.tsx src/pages/debit-notes/
mv components/DebitNoteDetail.tsx src/pages/debit-notes/

# Move payment pages
mv components/PaymentsDashboard.tsx src/pages/payments/
mv components/PaymentProposal.tsx src/pages/payments/
mv components/PaymentBatches.tsx src/pages/payments/
mv components/PaymentApproval.tsx src/pages/payments/
mv components/PaymentAgingDashboard.tsx src/pages/payments/
mv components/BankIntegrationManagement.tsx src/pages/payments/
mv components/PaymentAuditTrail.tsx src/pages/payments/
mv components/AISuggestedPaymentBatch.tsx src/pages/payments/
mv components/MSMEPaymentDashboard.tsx src/pages/payments/

# Move advance pages
mv components/AdvancesHub.tsx src/pages/advances/
mv components/AdvanceRequests.tsx src/pages/advances/
mv components/AdvanceRequestForm.tsx src/pages/advances/
mv components/AdvancePaymentQueue.tsx src/pages/advances/
mv components/AdvanceUtilization.tsx src/pages/advances/

# Move budget pages
mv components/BudgetDashboard.tsx src/pages/budget/
mv components/BudgetPlanningCreation.tsx src/pages/budget/
mv components/BudgetPhasing.tsx src/pages/budget/
mv components/BudgetApprovalWorkflow.tsx src/pages/budget/
mv components/BudgetConsumptionControl.tsx src/pages/budget/
mv components/InterimRevisedBudgets.tsx src/pages/budget/
mv components/BudgetTransfers.tsx src/pages/budget/
mv components/WhatIfScenarios.tsx src/pages/budget/
mv components/BudgetPolicies.tsx src/pages/budget/
mv components/POInvoicePolicyConfig.tsx src/pages/budget/
mv components/POInvoiceValidationDemo.tsx src/pages/budget/

# Move master pages
mv components/Masters.tsx src/pages/masters/
mv components/ApprovalWorkflow.tsx src/pages/masters/
mv components/CategoryMaster.tsx src/pages/masters/
mv components/ItemMaster.tsx src/pages/masters/
mv components/ProductMaster.tsx src/pages/masters/
mv components/ColorMaster.tsx src/pages/masters/
mv components/SizeMaster.tsx src/pages/masters/
mv components/SKUMaster.tsx src/pages/masters/
mv components/ContractMaster.tsx src/pages/masters/
mv components/CountryMaster.tsx src/pages/masters/
mv components/StateMaster.tsx src/pages/masters/
mv components/TaxCodeMaster.tsx src/pages/masters/
mv components/EmployeeMaster.tsx src/pages/masters/
mv components/DepartmentMaster.tsx src/pages/masters/
mv components/CostCentreMaster.tsx src/pages/masters/
mv components/ProfitCentreMaster.tsx src/pages/masters/
mv components/EntityMaster.tsx src/pages/masters/
mv components/CurrencyMaster.tsx src/pages/masters/
mv components/ExchangeRateMaster.tsx src/pages/masters/
mv components/UserMaster.tsx src/pages/masters/
mv components/RolesMaster.tsx src/pages/masters/
mv components/AccessPrivilege.tsx src/pages/masters/
mv components/WorkflowConfigurator.tsx src/pages/masters/
mv components/UOMMaster.tsx src/pages/masters/
mv components/DebitNoteReasonMaster.tsx src/pages/masters/
mv components/ItemCategoryMaster.tsx src/pages/masters/
mv components/VendorPaymentTermsMaster.tsx src/pages/masters/

# Move report pages
mv components/Reports.tsx src/pages/reports/
mv components/AuditTrailReport.tsx src/pages/reports/
mv components/OperationalDashboard.tsx src/pages/reports/
mv components/ProcurementHeadDesk.tsx src/pages/reports/
mv components/CFODesk.tsx src/pages/reports/
mv components/ManagementDesk.tsx src/pages/reports/
mv components/WorkflowReport.tsx src/pages/reports/
mv components/APDashboard.tsx src/pages/reports/
mv components/APReports.tsx src/pages/reports/

# Move audit pages
mv components/AuditLog.tsx src/pages/audit/
mv components/FinanceRBACDemo.tsx src/pages/audit/
mv components/RolePermissionMatrix.tsx src/pages/audit/

# Move cashflow pages
mv components/cashflow/*.tsx src/pages/cashflow/

# Move AR pages
mv components/ar/*.tsx src/pages/ar/

# Move existing organized pages
mv pages/desks/* src/pages/desks/
mv pages/modules/* src/pages/modules/
mv pages/masters/* src/pages/masters/
mv pages/reports/* src/pages/reports/

# Move remaining top-level pages
mv components/QuickCreate.tsx src/pages/
mv components/Settings.tsx src/pages/
```

### Step 6: Update Import Paths

This is the most critical step. Update all imports in moved files.

**Before (in /components/Dashboard.tsx):**
```typescript
import { DashboardLayout } from './DashboardLayout';
import { KPICard } from './core/KPICard';
import { useDashboardData } from '../contexts/DashboardDataContext';
```

**After (in /src/pages/dashboard/Dashboard.tsx):**
```typescript
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { KPICard } from '../../components/core/KPICard';
import { useDashboardData } from '../../../contexts/DashboardDataContext';
```

Use search and replace:
```bash
# Replace component imports
find src/pages -type f -name "*.tsx" -exec sed -i "s|from './components/|from '../../components/|g" {} \;
find src/pages -type f -name "*.tsx" -exec sed -i "s|from '../components/|from '../../components/|g" {} \;

# Replace context imports
find src/pages -type f -name "*.tsx" -exec sed -i "s|from './contexts/|from '../../../contexts/|g" {} \;
find src/pages -type f -name "*.tsx" -exec sed -i "s|from '../contexts/|from '../../../contexts/|g" {} \;

# Replace layout imports
find src/pages -type f -name "*.tsx" -exec sed -i "s|from './DashboardLayout'|from '../../layouts/DashboardLayout'|g" {} \;
```

**Note:** Manual verification is required after bulk replacements.

### Step 7: Update Route Configuration

Update `/src/app/routes.tsx` to import from new locations:

```typescript
// Before
import { Dashboard } from '../components/Dashboard';
import { Vendors } from '../components/Vendors';

// After
import { Dashboard } from '../pages/dashboard/Dashboard';
import { Vendors } from '../pages/vendors/Vendors';
```

Use consistent pattern:
```typescript
import { PageName } from '../pages/module-name/PageName';
```

### Step 8: Update Main App Entry

Ensure `/src/app/App.tsx` has correct imports:

```typescript
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/dashboard/Dashboard';
// ... etc
```

### Step 9: Update Entry Point

Update the root entry file (usually `index.tsx` or `main.tsx`):

```typescript
// Before
import App from './App';

// After
import App from './src/app/App';
```

### Step 10: Verify Build

```bash
# Install dependencies if needed
npm install

# Run development server
npm run dev

# Check for any import errors
# Test navigation to ensure all routes work
```

## Import Path Patterns

### From Page Components

**Layouts:**
```typescript
import { DashboardLayout } from '../../layouts/DashboardLayout';
```

**Shared Components:**
```typescript
import { Button } from '../../components/ui/button';
import { VendorSelector } from '../../components/shared/VendorSelector';
import { KPICard } from '../../components/core/KPICard';
```

**Types:**
```typescript
import type { Vendor, Invoice } from '../../types/models';
```

**Services:**
```typescript
import { vendorService } from '../../services/api';
```

**Contexts:**
```typescript
import { useAuth } from '../../../contexts/AuthContext';
```

**Tokens:**
```typescript
import tokens from '../../styles/tokens';
import { colors } from '../../styles/tokens';
```

### From Layout Components

**Contexts:**
```typescript
import { useAuth } from '../../contexts/AuthContext';
```

**Components:**
```typescript
import { Button } from '../components/ui/button';
```

**Types:**
```typescript
import type { User } from '../types/models';
```

### From Shared Components

**UI Components:**
```typescript
import { Button } from '../ui/button';
import { Card } from '../ui/card';
```

**Types:**
```typescript
import type { ComponentProps } from '../../types/models';
```

**Tokens:**
```typescript
import { colors, spacing } from '../../styles/tokens';
```

## Common Issues & Solutions

### Issue 1: Module Not Found

**Error:**
```
Module not found: Can't resolve './components/Dashboard'
```

**Solution:**
- Check file was moved correctly
- Update import path
- Verify file extension (.tsx vs .ts)

### Issue 2: Circular Dependencies

**Error:**
```
Dependency cycle detected
```

**Solution:**
- Review import chains
- Move shared types to `/src/types/`
- Use interface segregation

### Issue 3: Context Not Available

**Error:**
```
useContext must be used within a Provider
```

**Solution:**
- Ensure `<App />` wraps with all providers
- Check provider hierarchy in `/src/app/App.tsx`

### Issue 4: CSS Not Loading

**Error:**
Styles not applied

**Solution:**
- Verify `globals.css` import in `App.tsx`
- Check Tailwind configuration
- Ensure CSS variables are defined

## Verification Checklist

- [ ] All files moved to `/src` structure
- [ ] No broken imports
- [ ] Development server runs without errors
- [ ] All routes accessible
- [ ] Styles render correctly
- [ ] Context providers working
- [ ] Type checking passes (`npm run type-check`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in browser

## Testing After Migration

1. **Test Navigation:**
   - Click through all menu items
   - Verify all pages load
   - Check breadcrumbs

2. **Test Forms:**
   - Open each form
   - Verify validation
   - Test submit/cancel

3. **Test Tables:**
   - Check data loads
   - Test sorting/filtering
   - Verify row clicks

4. **Test Workflows:**
   - Submit for approval
   - Approve/reject
   - View history

5. **Test Context:**
   - Entity switching
   - User permissions
   - Master data loading

## Rollback Plan

If migration fails:

1. Keep backup of original files
2. Restore from git if needed
3. Remove `/src` directory
4. Keep production files as reference

## Timeline Estimate

- **Step 1-2:** 15 minutes (✅ Done)
- **Step 3:** 30 minutes (Moving layouts)
- **Step 4:** 1 hour (Organizing components)
- **Step 5:** 2 hours (Moving pages)
- **Step 6:** 3 hours (Updating imports)
- **Step 7-8:** 30 minutes (Updating config)
- **Step 9-10:** 30 minutes (Testing)

**Total:** ~8 hours (with testing)

## Post-Migration Optimization

After successful migration:

1. **Code Splitting:**
   ```typescript
   const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
   ```

2. **Token Integration:**
   ```typescript
   import { colors } from '../../styles/tokens';
   // Replace hex codes with tokens
   ```

3. **Service Integration:**
   ```typescript
   import { vendorService } from '../../services/api';
   // Replace mock data with service calls
   ```

4. **Type Enforcement:**
   - Enable `strict: true` in `tsconfig.json`
   - Fix any type errors
   - Remove `any` types

## Success Criteria

Migration is successful when:

✅ All files in `/src` structure  
✅ No import errors  
✅ All routes working  
✅ All features functional  
✅ Build passes  
✅ Types checking  
✅ Styles rendering  
✅ Tests passing (if any)  

---

**Ready to deploy to production after migration! 🚀**
