# Quick Start Guide - Production Conversion

## 🚀 Get Started in 5 Minutes

This guide helps you immediately start using the production-ready conversion.

## What You Have Now

✅ **Design Tokens** - `/src/styles/tokens.ts`  
✅ **Type Definitions** - `/src/types/models.ts`  
✅ **API Services** - `/src/services/api.ts`  
✅ **App Structure** - `/src/app/App.tsx`  
✅ **Routing Config** - `/src/app/routes.tsx`  
✅ **Documentation** - 4 comprehensive guides  

## Using Design Tokens

### Import and Use
```typescript
// Import specific tokens
import { colors, typography, spacing } from './src/styles/tokens';

// Use in your components
const MyComponent = () => (
  <div style={{
    backgroundColor: colors.background.opalWhite,
    color: colors.text.techBlack,
    fontSize: typography.fontSize.base,
    padding: spacing[4]
  }}>
    Enterprise Content
  </div>
);

// Or with Tailwind (after migration)
<button className="bg-teal-primary text-white">
  Action Button
</button>
```

### Common Patterns
```typescript
// Card styling
backgroundColor: colors.background.white
border: `1px solid ${colors.border.light}`
boxShadow: shadows.card
borderRadius: borders.radius.md

// Button styling
backgroundColor: colors.teal.primary
color: colors.background.white
padding: `${spacing[2]} ${spacing[4]}`

// Text styling
color: colors.text.techBlack
fontSize: typography.fontSize.base
fontWeight: typography.fontWeight.medium
```

## Using Type Definitions

### Import Types
```typescript
import type { 
  Vendor, 
  Invoice, 
  PurchaseOrder,
  WorkflowStatus,
  UUID 
} from './src/types/models';
```

### Type Components
```typescript
interface VendorListProps {
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
  loading?: boolean;
}

export const VendorList: React.FC<VendorListProps> = ({ 
  vendors, 
  onSelect,
  loading = false 
}) => {
  // Fully typed component
  return (
    <div>
      {vendors.map((vendor: Vendor) => (
        <div key={vendor.id} onClick={() => onSelect(vendor)}>
          {vendor.vendorName}
        </div>
      ))}
    </div>
  );
};
```

### Type State
```typescript
import { useState } from 'react';
import type { Invoice } from './src/types/models';

const [invoices, setInvoices] = useState<Invoice[]>([]);
const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
const [loading, setLoading] = useState<boolean>(false);
```

## Using API Services

### Import Services
```typescript
import { 
  vendorService, 
  invoiceService,
  poService 
} from './src/services/api';
```

### Fetch Data
```typescript
import { useEffect, useState } from 'react';
import { vendorService } from './src/services/api';
import type { Vendor } from './src/types/models';

const VendorPage = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchVendors = async () => {
      const response = await vendorService.getAll({
        page: 1,
        pageSize: 20,
        sortBy: 'name',
        sortOrder: 'asc'
      });
      
      if (response.success && response.data) {
        setVendors(response.data.data);
      }
      setLoading(false);
    };
    
    fetchVendors();
  }, []);
  
  return <div>{/* Render vendors */}</div>;
};
```

### Create/Update
```typescript
// Create
const handleCreate = async (data: Omit<Vendor, 'id'>) => {
  const response = await vendorService.create(data);
  if (response.success) {
    // Handle success
  }
};

// Update
const handleUpdate = async (id: string, data: Partial<Vendor>) => {
  const response = await vendorService.update(id, data);
  if (response.success) {
    // Handle success
  }
};
```

### Workflow Actions
```typescript
// Approve invoice
const handleApprove = async (invoiceId: string) => {
  const response = await invoiceService.approve(
    invoiceId, 
    'Approved - all checks passed'
  );
  
  if (response.success) {
    // Show success message
    toast.success('Invoice approved');
  }
};

// Reject
const handleReject = async (invoiceId: string, reason: string) => {
  const response = await invoiceService.reject(invoiceId, reason);
  // Handle response
};
```

## Common Component Patterns

### Page Component Template
```typescript
import React, { useEffect, useState } from 'react';
import type { Entity } from './src/types/models';
import { entityService } from './src/services/api';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

export const MyPage: React.FC = () => {
  const [data, setData] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      const response = await entityService.getAll();
      if (response.success && response.data) {
        setData(response.data.data);
      } else {
        setError('Failed to load data');
      }
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div className="p-6">
      <h1>My Page</h1>
      {/* Render data */}
    </div>
  );
};
```

### Form Component Template
```typescript
import React from 'react';
import { useForm } from 'react-hook-form@7.55.0';
import type { Vendor } from './src/types/models';
import { vendorService } from './src/services/api';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';

interface VendorFormData {
  vendorName: string;
  email: string;
  phone: string;
}

export const VendorForm: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<VendorFormData>();
  
  const onSubmit = async (data: VendorFormData) => {
    const response = await vendorService.create({
      ...data,
      vendorCode: generateCode(),
      // ... other required fields
    });
    
    if (response.success) {
      // Handle success
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Input
        {...register('vendorName', { required: true })}
        placeholder="Vendor Name"
      />
      {errors.vendorName && <span>This field is required</span>}
      
      <Button type="submit">Create Vendor</Button>
    </form>
  );
};
```

## Quick Examples by Module

### Procurement
```typescript
import { poService, prService } from './src/services/api';
import type { PurchaseOrder, PurchaseRequisition } from './src/types/models';

// Get all POs
const pos = await poService.getAll({ page: 1, pageSize: 20 });

// Create PO from PR
const po = await prService.convertToPO(['pr-001', 'pr-002']);

// Approve PO
await poService.approve('po-001', 'Approved by manager');
```

### Invoices
```typescript
import { invoiceService } from './src/services/api';
import type { Invoice, InvoiceType } from './src/types/models';

// Create PO-based invoice
const invoice = await invoiceService.create({
  invoiceType: 'PO_BASED',
  vendorId: 'vendor-001',
  poId: 'po-001',
  invoiceDate: '2024-01-15',
  // ... other fields
});

// Process OCR
const ocrData = await invoiceService.processOCR(file);

// 3-way matching
const matchResult = await invoiceService.match3Way('invoice-001');
```

### Payments
```typescript
import { paymentService } from './src/services/api';
import type { PaymentBatch } from './src/types/models';

// Create payment batch
const batch = await paymentService.createBatch({
  batchDate: '2024-01-15',
  entityId: 'entity-001',
  payments: [...],
  // ... other fields
});

// Process batch
await paymentService.processBatch('batch-001');

// Approve batch
await paymentService.approveBatch('batch-001', 'Approved for payment');
```

### Master Data
```typescript
import { masterDataService } from './src/services/api';
import type { CostCenter, TaxCode } from './src/types/models';

// Get cost centers
const costCenters = await masterDataService.costCenters.getAll();

// Get tax codes
const taxCodes = await masterDataService.taxCodes.getAll({
  filters: { isActive: true }
});

// Get exchange rate
const rate = await masterDataService.exchangeRates.getLatest('USD', 'INR');
```

## Testing the Setup

### 1. Test Type Imports
```typescript
// Create a test file: src/test-types.ts
import type { Vendor, Invoice } from './types/models';

const testVendor: Vendor = {
  // TypeScript should show autocomplete for all fields
};
```

### 2. Test Token Imports
```typescript
// Create a test file: src/test-tokens.ts
import { colors, typography } from './styles/tokens';

console.log(colors.teal.primary); // Should output: #00A9B7
console.log(typography.fontSize.base); // Should output: 1rem
```

### 3. Test Service Imports
```typescript
// Create a test file: src/test-services.ts
import { vendorService } from './services/api';

const testFetch = async () => {
  const response = await vendorService.getAll();
  console.log(response); // Should see mock response
};
```

## Troubleshooting

### Can't resolve module
```
Error: Module not found: Can't resolve './src/types/models'
```

**Solution:** Check you're using the correct path from your file location.

### Type errors
```
Error: Type 'string' is not assignable to type 'WorkflowStatus'
```

**Solution:** Use the exact type values defined in models.ts:
```typescript
const status: WorkflowStatus = 'PENDING_APPROVAL'; // Correct
const status: WorkflowStatus = 'pending'; // Error
```

### Import errors
```
Error: Cannot find module './src/services/api'
```

**Solution:** Use relative paths based on your file location:
```typescript
// From /components/MyComponent.tsx
import { service } from '../src/services/api';

// From /src/pages/MyPage.tsx
import { service } from '../services/api';
```

## Next Steps

1. ✅ **You're Ready!** - Start using tokens, types, and services
2. 📖 **Read Docs** - Review `/README_PRODUCTION.md` for detailed guide
3. 🗺️ **Plan Migration** - Follow `/MIGRATION_GUIDE.md` when ready
4. 🏗️ **Build Features** - Use these patterns in your components
5. 🚀 **Deploy** - Follow deployment guide when ready

## Quick Reference Card

### Import Paths
```typescript
// Design Tokens
import { colors, typography, spacing } from './src/styles/tokens';

// Types
import type { Vendor, Invoice } from './src/types/models';

// Services
import { vendorService, invoiceService } from './src/services/api';

// Components (existing)
import { Button } from './components/ui/button';
import { VendorSelector } from './components/shared/VendorSelector';
```

### Common Colors
```typescript
colors.teal.primary           // #00A9B7 - Primary actions
colors.background.opalWhite   // #F6F9FC - Page background
colors.background.white       // #FFFFFF - Card background
colors.text.techBlack         // #0A0F14 - Primary text
colors.text.mercuryGrey       // #6E7A82 - Secondary text
```

### Common Operations
```typescript
// List
await service.getAll({ page: 1, pageSize: 20 });

// Get
await service.getById('id');

// Create
await service.create(data);

// Update
await service.update('id', data);

// Approve
await service.approve('id', 'comment');
```

## Support

- 📖 Full Documentation: `/README_PRODUCTION.md`
- 🗺️ Migration Guide: `/MIGRATION_GUIDE.md`
- 📋 Project Structure: `/PROJECT_STRUCTURE.md`
- 📊 Master Index: `/PRODUCTION_INDEX.md`

---

**You're all set! Start building with enterprise-grade TypeScript! 🚀**
