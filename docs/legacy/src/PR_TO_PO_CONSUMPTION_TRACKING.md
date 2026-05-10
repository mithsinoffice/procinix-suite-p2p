# PR-to-PO Conversion with Consumption Tracking

## Overview

The system now supports two distinct Purchase Order (PO) creation workflows:

### 1. **PO WITH PR** (Recommended)
Convert approved Purchase Requisitions (PRs) into Purchase Orders with full consumption tracking and traceability.

### 2. **PO WITHOUT PR** 
Direct PO creation for urgent, ad-hoc, or emergency procurement needs.

---

## Architecture

### Entry Point
**`POCreationHub`** (`/components/procurement/POCreationHub.tsx`)
- Central landing page for all PO creation
- User selects between "PO with PR" or "PO without PR"
- Displays statistics and guidance

### Routes
```
/procurement/po/creation-hub          → PO Creation Hub (selection screen)
/procurement/pr-to-po-conversion      → Enhanced PR-to-PO Conversion
/procurement/create-po-direct         → Direct PO Creation (without PR)
```

---

## PR Consumption Tracking

### Consumption States

| State | Description | Percentage |
|-------|-------------|------------|
| **Open** | No POs created yet | 0% |
| **Partially Consumed** | Some items/quantities converted to POs | 1-99% |
| **Fully Consumed** | All items/quantities converted to POs | 100% |
| **Closed** | Manually closed/cancelled | N/A |

### Consumption Calculation

```typescript
interface PRLineItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;           // Original PR quantity
  quantityConsumed: number;   // Already converted to PO
  quantityRemaining: number;  // Available for PO conversion
  unitPrice: number;
  totalAmount: number;
}

interface ApprovedPR {
  id: string;
  totalAmount: number;
  amountConsumed: number;     // Total converted to POs
  amountRemaining: number;    // Available for conversion
  consumptionStatus: 'Open' | 'Partially Consumed' | 'Fully Consumed' | 'Closed';
  consumptionPercentage: number;  // (amountConsumed / totalAmount) * 100
  lineItems: PRLineItem[];
  prHistory: PRConsumptionHistory[];
}
```

### PR Consumption History

Each time a PR is consumed (partially or fully), the system records:

```typescript
interface PRConsumptionHistory {
  id: string;
  poNumber: string;           // Which PO consumed this PR
  poDate: string;             // When was the PO created
  amountConsumed: number;     // How much value was consumed
  itemsConsumed: number;      // How many line items
  status: 'Created' | 'Cancelled';
}
```

---

## PR-to-PO Conversion Workflow

### Step 1: PR Selection
**Purpose**: Select which approved PRs to convert into POs

**Features**:
- Filter by Entity
- Display consumption status for each PR
- Show remaining amount/quantity available
- View historical PO conversions for partially consumed PRs
- Multi-select PRs for clubbing
- Validation: Cannot mix PRs from different entities

**Visual Indicators**:
- 🟢 **Open PRs**: Green badge, 0% consumed
- 🟡 **Partially Consumed PRs**: Yellow badge with % consumed, expandable history
- 🔵 **Fully Consumed PRs**: Blue badge, filtered out (not selectable)

### Step 2: Grouping Logic Selection
**Purpose**: Decide how to club multiple PRs into POs

**Grouping Modes**:

| Mode | Logic | Use Case |
|------|-------|----------|
| **Vendor** | One PO per vendor | Vendor consolidation, simplified payments |
| **Ship-To** | One PO per delivery location | Logistics planning, warehouse receiving |
| **Cost Centre** | One PO per cost centre | Budget tracking, departmental accounting |
| **Need-By Date** | One PO per delivery date | Production planning, JIT inventory |

**Intelligent Grouping**:
- System automatically groups PRs based on selected mode
- Validates compatibility (same entity, vendor, etc.)
- Combines only remaining/unconsumed line items

### Step 3: PO Preview & Confirmation
**Purpose**: Review generated PO drafts before creation

**Displays**:
- Number of POs to be created
- Source PRs for each PO
- Line-by-line item mapping (PR → PO)
- Total values and quantities
- Vendor, Ship-To, delivery dates
- Cost centre allocation

**User Actions**:
- Review all PO drafts
- Go back to change grouping logic
- Confirm and create POs

---

## Database Operations (On PO Creation)

### 1. Create PO Records
```sql
INSERT INTO purchase_orders (
  po_number, vendor_id, total_amount, status, 
  created_from_prs, clubbed_pr_count
) VALUES (...);
```

### 2. Create PO Line Items
```sql
INSERT INTO po_line_items (
  po_id, pr_id, pr_line_item_id, 
  item_code, quantity, unit_price, total_amount
) VALUES (...);
```

### 3. Update PR Consumption Status
```sql
UPDATE purchase_requisitions
SET 
  amount_consumed = amount_consumed + [consumed_amount],
  amount_remaining = total_amount - amount_consumed,
  consumption_percentage = (amount_consumed / total_amount) * 100,
  consumption_status = CASE
    WHEN amount_consumed = 0 THEN 'Open'
    WHEN amount_consumed < total_amount THEN 'Partially Consumed'
    WHEN amount_consumed = total_amount THEN 'Fully Consumed'
  END
WHERE pr_id = [pr_id];
```

### 4. Update PR Line Item Consumption
```sql
UPDATE pr_line_items
SET 
  quantity_consumed = quantity_consumed + [consumed_quantity],
  quantity_remaining = quantity - quantity_consumed
WHERE pr_line_item_id = [line_item_id];
```

### 5. Create PR-PO Linkage Records
```sql
INSERT INTO pr_po_linkage (
  pr_id, po_id, amount_consumed, 
  items_consumed, linkage_date, status
) VALUES (...);
```

### 6. Create PR Consumption History
```sql
INSERT INTO pr_consumption_history (
  pr_id, po_number, po_date, 
  amount_consumed, items_consumed, status
) VALUES (...);
```

### 7. Create Audit Trail
```sql
INSERT INTO audit_trail (
  entity_type, entity_id, action, 
  user_id, timestamp, details
) VALUES (
  'PR_TO_PO_CONVERSION', 
  [pr_id], 
  'PO_CREATED_FROM_PR',
  [user_id],
  NOW(),
  JSON_STRINGIFY({
    pr_id: [pr_id],
    po_id: [po_id],
    consumed_amount: [amount],
    consumption_percentage: [percentage]
  })
);
```

---

## Traceability: PR ↔ PO Linkage

### Forward Traceability (PR → PO)
**From PR Detail View**:
- Display all POs created from this PR
- Show consumption percentage
- List line items converted to each PO
- Status of each PO (Draft, Approved, GRN Done, Invoiced, Paid)

### Backward Traceability (PO → PR)
**From PO Detail View**:
- Display source PR(s) for this PO
- Show original requisitioner
- Link to PR approval trail
- Budget alignment verification

---

## Business Rules & Validations

### PR Selection Rules
1. ✅ **Only Approved PRs** can be converted
2. ✅ **Only Open or Partially Consumed PRs** are selectable
3. ✅ **Cannot mix different entities** in the same batch
4. ✅ **At least one PR must be selected**

### Grouping Rules
1. ✅ **Vendor Grouping**: PRs with same vendor clubbed together
2. ✅ **Ship-To Grouping**: PRs with same delivery location clubbed together
3. ✅ **Cost Centre Grouping**: PRs with same cost centre clubbed together
4. ✅ **Date Grouping**: PRs with same need-by date clubbed together

### Consumption Rules
1. ✅ **Cannot consume more than remaining quantity**
2. ✅ **Partial consumption updates status to "Partially Consumed"**
3. ✅ **Full consumption updates status to "Fully Consumed"**
4. ✅ **Fully consumed PRs cannot be selected for further PO creation**

### Budget Alignment
1. ✅ **PO inherits budget allocation from PR**
2. ✅ **Budget consumption = PR consumption**
3. ✅ **Budget blocked at PR approval, released at consumption**

---

## Benefits of PR-to-PO Conversion

### 1. **Full Traceability**
- Every PO linked back to originating PR
- Complete audit trail from requisition to payment
- Compliance with procurement policies

### 2. **Budget Control**
- PRs already approved against budget
- No additional budget validation needed for PO
- Prevents budget overruns

### 3. **Approval Efficiency**
- PR approval = budget authorization
- PO approval focuses on commercial terms
- Reduced approval cycles

### 4. **Procurement Optimization**
- Multi-PR clubbing reduces PO count
- Vendor consolidation for better pricing
- Logistics optimization via Ship-To grouping

### 5. **Data Integrity**
- Single source of truth for procurement needs
- Prevents duplicate orders
- Consumption tracking prevents over-ordering

---

## Reporting & Analytics

### PR Consumption Reports
1. **PR Aging Report**: How long PRs wait before PO conversion
2. **Partially Consumed PRs Report**: PRs stuck in partial state
3. **PR-to-PO Cycle Time**: Average time from PR approval to PO creation
4. **Clubbing Efficiency**: How many PRs clubbed per PO on average

### Procurement Efficiency Metrics
1. **PR Fulfillment Rate**: % of PRs converted to POs
2. **Average PRs per PO**: Clubbing effectiveness
3. **Consumption Velocity**: Speed of PR-to-PO conversion
4. **Budget Utilization**: PR vs PO vs GRN vs Invoice amounts

---

## Direct PO Creation (Without PR)

### When to Use
- ✅ **Emergency Procurement**: Urgent needs that can't wait for PR approval
- ✅ **Ad-hoc Purchases**: One-time, non-recurring purchases
- ✅ **Vendor Advances**: Payments made before delivery
- ✅ **Contract POs**: Against existing rate contracts

### Approval Authority
- ⚠️ Requires **higher approval authority**
- ⚠️ Must provide **justification** for bypassing PR
- ⚠️ Subject to **stricter audit controls**
- ⚠️ May require **CFO approval** above threshold

### Limitations
- ❌ No pre-approved budget allocation
- ❌ Budget validation happens at PO level
- ❌ Longer approval cycles
- ❌ Reduced procurement optimization opportunities

---

## Future Enhancements

### 1. **Partial Line Item Consumption**
Allow converting partial quantities from PR line items:
- PR has 100 units, create PO for 60 units
- Remaining 40 units available for future PO

### 2. **Cross-Entity PR Clubbing**
With appropriate controls:
- Central procurement team creates clubbed POs
- Allocates costs back to originating entities

### 3. **AI-Powered Grouping Recommendations**
- ML model suggests optimal grouping mode
- Based on historical data and vendor relationships
- Predicts cost savings from different grouping strategies

### 4. **Automated PR-to-PO Conversion**
For catalog items with pre-negotiated prices:
- Auto-convert approved PRs to POs
- Email vendor automatically
- Reduce manual intervention

---

## Technical Stack

### Frontend Components
- `POCreationHub.tsx` - PO creation mode selection
- `PRtoPOConversionEnhanced.tsx` - Full conversion workflow
- `CreatePurchaseOrder.tsx` - Direct PO creation (without PR)

### State Management
- React hooks (useState) for UI state
- URL params for pre-selected PRs
- Context API for user/entity info

### Data Flow
```
PR Approval → PR Pool (Open/Partially Consumed)
              ↓
         [User Selects PRs]
              ↓
         [Select Grouping Mode]
              ↓
         [Generate PO Drafts]
              ↓
         [Review & Confirm]
              ↓
         [Create POs + Update PR Consumption]
              ↓
         PO Pool → GRN → Invoice → Payment
```

---

## Integration Points

### 1. **Budget System**
- PR approval reserves budget
- PO consumption releases reserved budget
- Real-time budget availability checks

### 2. **Approval Workflows**
- PR approval workflow (multi-level)
- PO approval workflow (simplified for PR-based POs)
- Exception handling for direct POs

### 3. **GRN System**
- GRN references PO
- PO references PR
- Full traceability: PR → PO → GRN → Invoice

### 4. **Invoice Matching**
- 3-way match: PO ↔ GRN ↔ Invoice
- 4-way match: PR ↔ PO ↔ GRN ↔ Invoice
- Auto-approval for perfect matches

---

## Testing Scenarios

### Scenario 1: Single PR to Single PO
- Select 1 PR with 5 line items
- Convert to 1 PO
- Verify PR status = "Fully Consumed"
- Verify consumption percentage = 100%

### Scenario 2: Multiple PRs to Single PO (Vendor Grouping)
- Select 3 PRs from same vendor
- Group by vendor
- Verify 1 PO created with all line items
- Verify all 3 PRs = "Fully Consumed"

### Scenario 3: Multiple PRs to Multiple POs (Ship-To Grouping)
- Select 4 PRs (2 ship-to locations)
- Group by Ship-To
- Verify 2 POs created
- Verify correct line items in each PO

### Scenario 4: Partial Consumption
- Select 1 PR
- Manually reduce quantities in PO draft
- Create PO
- Verify PR status = "Partially Consumed"
- Verify remaining quantities accurate

### Scenario 5: Multiple Conversions from Same PR
- Create PO #1 from PR (partial consumption)
- Create PO #2 from same PR (remaining items)
- Verify PR consumption history shows both POs
- Verify final status = "Fully Consumed"

---

## Access Control & Permissions

### Required Permissions

| Action | Permission |
|--------|-----------|
| View PR-to-PO Hub | `PROCUREMENT.VIEW`, `PR_TO_PO.VIEW` |
| Select PRs | `PR.VIEW`, `PR_TO_PO.CREATE` |
| Create PO from PR | `PO.CREATE`, `PR_TO_PO.CREATE` |
| Create Direct PO | `PO.CREATE`, `DIRECT_PO.CREATE` |
| View PR Consumption History | `PR.VIEW`, `PR_CONSUMPTION.VIEW` |

### Role-Based Access

| Role | Can Create PO with PR | Can Create PO without PR |
|------|----------------------|-------------------------|
| Procurement Officer | ✅ Yes | ❌ No |
| Procurement Manager | ✅ Yes | ✅ Yes (up to ₹5L) |
| Procurement Head | ✅ Yes | ✅ Yes (unlimited) |
| CFO | ✅ Yes | ✅ Yes (unlimited) |

---

## Performance Considerations

### Large PR Lists
- **Pagination**: Load PRs in batches of 50
- **Lazy Loading**: Load PR line items on expand
- **Virtual Scrolling**: For 100+ PRs

### Clubbing Performance
- **Grouping Algorithm**: O(n) complexity
- **Max PRs per Batch**: 100 PRs
- **Max Line Items per PO**: 500 items

### Database Optimization
- **Indexes**: pr_id, consumption_status, entity_id
- **Batch Updates**: Update all PRs in single transaction
- **Async Processing**: Large conversions queued for background processing

---

## Monitoring & Alerts

### System Alerts
1. 🔴 **Stuck PRs**: PRs approved >30 days without PO conversion
2. 🟡 **Partially Consumed PRs**: PRs in partial state >14 days
3. 🟠 **Direct PO Spikes**: Unusual increase in direct POs (policy bypass indicator)

### User Notifications
1. ✉️ **PR Consumed**: Email to requisitioner when PR converted to PO
2. ✉️ **Partial Consumption**: Alert when PR partially consumed
3. ✉️ **PO Created**: Notification to approvers when PO generated from PR

---

This comprehensive PR-to-PO conversion system ensures:
✅ Full procurement traceability
✅ Optimized purchasing through intelligent clubbing
✅ Complete consumption tracking
✅ Budget alignment and control
✅ Audit compliance
✅ Operational efficiency
