# 🏗️ BUDGET MODULE - ARCHITECTURE OVERVIEW

## 📐 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
├─────────────────────────────────────────────────────────────────┤
│  Navigation → AP Automation → Budgeting                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Dashboard   │  │   Planning   │  │   Phasing    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Approval    │  │ Consumption  │  │  Revisions   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Transfers   │  │  What-If     │  │  Policies    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET DATA CONTEXT                          │
├─────────────────────────────────────────────────────────────────┤
│  State Management:                                              │
│  • budgets[]          • revisions[]                             │
│  • transfers[]        • scenarios[]                             │
│  • policies[]                                                   │
│                                                                  │
│  CRUD Operations:                                               │
│  • addBudget()        • updateBudget()                          │
│  • addRevision()      • addTransfer()                           │
│  • addScenario()      • addPolicy()                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      INTEGRATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Procurement  │  │  AP Invoices │  │   Advances   │         │
│  │  PO Check    │  │  Posting     │  │  Requests    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Approval   │  │     RBAC     │  │   Reports    │         │
│  │   Workflow   │  │ Permissions  │  │  Analytics   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 BUDGET LIFECYCLE FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│                      BUDGET LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────┘

1. PLANNING PHASE (Jan-Feb)
   ┌──────────────┐
   │ Budget Owner │
   │   Creates    │
   │   Budget     │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │ Auto-Distrib │  → Monthly/Quarterly allocation
   │   + Manual   │
   │  Adjustments │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │   Submit for │
   │   Approval   │
   └──────┬───────┘
          │
          ↓
2. APPROVAL PHASE (Feb-Mar)
   ┌──────────────────────────────────────┐
   │    Multi-Level Approval Workflow     │
   ├──────────────────────────────────────┤
   │ Level 1: Dept Head (48hr SLA)        │
   │            ↓                          │
   │ Level 2: Finance Manager (72hr SLA)  │
   │            ↓                          │
   │ Level 3: CFO (96hr SLA)              │
   └──────────────┬───────────────────────┘
                  ↓
   ┌──────────────┐
   │   Budget     │
   │  APPROVED    │  → Status: Active
   └──────┬───────┘
          │
          ↓
3. EXECUTION PHASE (Apr-Mar Next Year)
   ┌────────────────────────────────────────┐
   │        Real-Time Consumption           │
   ├────────────────────────────────────────┤
   │ PO Created   → Committed ↑             │
   │ PO Approved  → Committed ↑↑            │
   │ Invoice Post → Actual ↑, Committed ↓   │
   │ Payment Made → Actual stays            │
   └────────────┬───────────────────────────┘
                ↓
   ┌────────────────────────────────────────┐
   │        Budget Control Policies         │
   ├────────────────────────────────────────┤
   │ 0-84%:   🟢 Normal (No restrictions)   │
   │ 85-94%:  🟡 Soft Warning (Alerts)      │
   │ 95-100%: 🔴 Hard Stop (Blocked)        │
   └────────────┬───────────────────────────┘
                ↓
4. MID-YEAR ADJUSTMENTS (As Needed)
   ┌──────────────┐         ┌──────────────┐
   │   Revision   │    OR   │   Transfer   │
   │  (Inc/Dec    │         │  (Reallocate │
   │   Total)     │         │  Between)    │
   └──────┬───────┘         └──────┬───────┘
          └────────┬───────────────┘
                   ↓
          ┌────────────────┐
          │ Approval Flow  │
          └────────┬───────┘
                   ↓
          ┌────────────────┐
          │ Budget Updated │
          └────────────────┘
          
5. YEAR-END PLANNING (Dec-Jan)
   ┌──────────────┐
   │   What-If    │  → Test scenarios (-10%, 0%, +10%)
   │  Scenarios   │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │   Analyze    │  → Breach risk, dept impact
   │   Impact     │
   └──────┬───────┘
          ↓
   ┌──────────────┐
   │   Finalize   │  → FY2026 budget proposals
   │  Next Year   │
   └──────────────┘
```

---

## 💰 BUDGET CONSUMPTION FLOW

```
┌─────────────────────────────────────────────────────────────────┐
│              PROCUREMENT → BUDGET CONSUMPTION                   │
└─────────────────────────────────────────────────────────────────┘

USER ACTION                  BUDGET IMPACT                CONTROL
────────────────────────────────────────────────────────────────

┌──────────────┐
│ User Creates │
│   PO Draft   │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────────────┐
│  System Checks Budget Availability   │  ← Budget Policy Check
├──────────────────────────────────────┤
│  GL Account: 61000 (Travel)          │
│  Cost Centre: CC-MKT-001             │
│  Department: Marketing               │
│  Amount: ₹100,000                    │
└──────┬───────────────────────────────┘
       │
       ├──→ [Current Utilization: 51%] ──→ 🟢 Normal
       │                                   Allow PO Creation
       │
       ├──→ [Current Utilization: 87%] ──→ 🟡 Soft Warning
       │                                   Alert + Allow with Override
       │
       └──→ [Current Utilization: 96%] ──→ 🔴 Hard Stop
                                           ❌ BLOCK PO
                                           Require CFO Override
                                           
┌──────────────┐
│  PO Created  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────┐
│  Budget.Committed ↑ ₹100K   │
│  Budget.Available ↓ ₹100K   │
│  Utilization % ↑             │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────┐
│ PO Approved  │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────┐
│  Committed confirmed         │
│  PO added to linkedPOs[]     │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────┐
│ Goods Recv'd │
│ (GRN Posted) │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────┐
│  Invoice Posted              │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────────────────────┐
│  Budget.Actual ↑ ₹100K      │
│  Budget.Committed ↓ ₹100K   │
│  Invoice added to            │
│    linkedInvoices[]          │
└──────┬───────────────────────┘
       │
       ↓
┌──────────────┐
│ Payment Made │
└──────┬───────┘
       │
       ↓
┌──────────────────────────────┐
│  No Budget impact            │
│  (Already in Actual)         │
└──────────────────────────────┘
```

---

## 🔐 APPROVAL WORKFLOW ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                  BUDGET APPROVAL WORKFLOW                       │
└─────────────────────────────────────────────────────────────────┘

BUDGET AMOUNT          APPROVAL LEVELS           SLA
──────────────────────────────────────────────────────────────

< ₹500,000            Level 1: Dept Head         48 hours
                      Level 2: Finance Mgr        72 hours
                      ────────────────────────────────────
                      Total: 2 levels, 120 hours (5 days)

₹500,000 - ₹1M        Level 1: Dept Head         48 hours
                      Level 2: Finance Mgr        72 hours
                      Level 3: CFO                96 hours
                      ────────────────────────────────────
                      Total: 3 levels, 216 hours (9 days)

₹1M - ₹5M             Level 1: Dept Head         48 hours
                      Level 2: Finance Mgr        72 hours
                      Level 3: CFO                96 hours
                      Level 4: CEO               120 hours
                      ────────────────────────────────────
                      Total: 4 levels, 336 hours (14 days)

> ₹5M                 Level 1: Dept Head         48 hours
                      Level 2: Finance Mgr        72 hours
                      Level 3: CFO                96 hours
                      Level 4: CEO               120 hours
                      Level 5: Board            168 hours
                      ────────────────────────────────────
                      Total: 5 levels, 504 hours (21 days)

┌─────────────────────────────────────────────────────────────────┐
│                   WORKFLOW STATE MACHINE                        │
└─────────────────────────────────────────────────────────────────┘

   START
     ↓
┌──────────┐
│  DRAFT   │  ← Budget Owner editing
└────┬─────┘
     │ submit()
     ↓
┌──────────┐
│SUBMITTED │  ← Entered workflow, Level 1 pending
└────┬─────┘
     │ approveLevel1()
     ↓
┌───────────┐
│IN APPROVAL│  ← Level 2+ pending
└────┬──────┘
     │ approveFinal()
     ↓
┌──────────┐
│ APPROVED │  ← All levels approved, now ACTIVE
└────┬─────┘
     │
     ↓
   ACTIVE
   (Budget available for consumption)

   NOTE: At any level, reject() → REJECTED (End)
```

---

## 📊 DATA MODEL

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUDGET ENTITY                            │
└─────────────────────────────────────────────────────────────────┘

Budget {
  // Identity
  id: string                    // BDG-2024-001
  budgetNumber: string          // BDG-2024-001
  budgetName: string            // "IT Department Operating Budget"
  budgetOwner: string           // "Sarah Chen"
  financialYear: string         // "FY2024"
  
  // Classification
  budgetType: BudgetType        // Original | Interim | Revised | Forecast
  currency: string              // INR | USD | EUR | GBP
  
  // Amounts
  totalAmount: number           // 12,500,000
  committed: number             // 4,250,000 (from POs)
  actual: number                // 2,150,000 (from Invoices)
  available: number             // 6,100,000 (calculated)
  utilizationPercent: number    // 51.2% (calculated)
  
  // Dimensions (7 tracking dimensions)
  dimensions: {
    department: string          // "IT"
    expenseCategory: string     // "Operating Expenses"
    glAccountCode: string       // "62000"
    location: string            // "Bangalore HQ"
    costCentre: string          // "CC-IT-001"
    profitCentre: string        // "PC-PROD-001"
    project: string             // "PRJ-2025-001"
  }
  
  // Time Allocation
  allocationPeriod: string      // Monthly | Quarterly | Annual
  allocations: [
    {
      period: string            // "Apr 2024"
      plannedAmount: number     // 1,041,667
      revisedAmount: number     // 1,041,667
      comments: string          // Optional notes
    }
  ]
  
  // Workflow
  status: BudgetStatus          // Draft | Submitted | In Approval | 
                                // Approved | Rejected | Active | Closed
  approvalWorkflow: [
    {
      level: number             // 1, 2, 3...
      approverRole: string      // "CFO"
      approver: string          // "Michael Roberts"
      status: string            // Pending | Approved | Rejected
      comments: string          // "Approved with conditions"
      actionDate: string        // "2024-03-15"
      slaHours: number          // 96
      slaDue: string            // "2024-03-19"
      overdue: boolean          // false
    }
  ]
  
  // Audit
  createdBy: string             // "Sarah Chen"
  createdDate: string           // "2024-03-01"
  approvedBy: string            // "Michael Roberts (CFO)"
  approvedDate: string          // "2024-03-15"
  
  // Linkage
  linkedPOs: string[]           // ["PO-2024-045", "PO-2024-089"]
  linkedInvoices: string[]      // ["INV-2024-234", "INV-2024-267"]
  
  // History
  revisionHistory: BudgetRevision[]
}

┌─────────────────────────────────────────────────────────────────┐
│                   BUDGET POLICY ENTITY                          │
└─────────────────────────────────────────────────────────────────┘

BudgetPolicy {
  id: string                    // POL-001
  policyName: string            // "IT Hard Stop at 95%"
  controlType: ControlType      // Hard Stop | Soft Warning | Advisory
  thresholdPercent: number      // 95
  
  // Applicability
  applicableDimensions: {
    department: string          // "IT" (optional)
    costCentre: string          // "CC-IT-001" (optional)
    expenseCategory: string     // "Operating" (optional)
  }
  
  // Actions
  overridePermissions: string[] // ["CFO", "Finance Director"]
  alertRecipients: string[]     // ["cfo@company.com"]
  isActive: boolean             // true
  
  // Audit
  createdBy: string
  createdDate: string
  lastModifiedBy: string
  lastModifiedDate: string
}

┌─────────────────────────────────────────────────────────────────┐
│                  BUDGET REVISION ENTITY                         │
└─────────────────────────────────────────────────────────────────┘

BudgetRevision {
  id: string                    // REV-001
  budgetId: string              // BDG-2024-001
  revisionNumber: number        // 1
  revisionReason: string        // "New cloud infrastructure"
  
  // Amounts
  originalAmount: number        // 12,500,000
  revisedAmount: number         // 14,500,000
  netChange: number             // +2,000,000
  
  // Workflow
  effectiveDate: string         // "2026-01-01"
  requestedBy: string           // "Sarah Chen"
  approvedBy: string            // "Michael Roberts"
  approvedDate: string          // "2025-12-15"
  status: BudgetStatus          // Submitted | Approved | Rejected
}

┌─────────────────────────────────────────────────────────────────┐
│                  BUDGET TRANSFER ENTITY                         │
└─────────────────────────────────────────────────────────────────┘

BudgetTransfer {
  id: string                    // TRF-001
  transferNumber: string        // TRF-2025-001
  transferDate: string          // "2025-10-15"
  
  // Source/Target
  sourceBudget: string          // BDG-2024-005
  sourceBudgetName: string      // "Operations Budget"
  targetBudget: string          // BDG-2024-002
  targetBudgetName: string      // "Marketing Budget"
  
  // Amount
  transferAmount: number        // 500,000
  transferReason: string        // "Q4 campaign expansion"
  
  // Workflow
  requestedBy: string           // "John Doe"
  approvedBy: string            // "Michael Roberts"
  approvedDate: string          // "2025-10-17"
  status: string                // Pending | Approved | Rejected | Completed
}
```

---

## 🎯 INTEGRATION ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUDGET INTEGRATION POINTS                    │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   PROCUREMENT    │────────→│     BUDGET       │
│                  │         │  AVAILABILITY    │
│  • Create PO     │←────────│     CHECK        │
│  • PO Approval   │  Pass/  │                  │
└──────────────────┘  Fail   └──────────────────┘
         │                            ↓
         │                   ┌──────────────────┐
         │                   │ CONSUMPTION      │
         └──────────────────→│   UPDATE         │
           Committed ↑       │ committed ↑      │
                             │ available ↓       │
                             └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   AP INVOICES    │────────→│     BUDGET       │
│                  │         │     CHECK        │
│  • Post Invoice  │←────────│                  │
│  • Invoice Appr  │  Pass/  └──────────────────┘
└──────────────────┘  Fail            ↓
         │                   ┌──────────────────┐
         │                   │ CONSUMPTION      │
         └──────────────────→│   UPDATE         │
           Actual ↑          │ actual ↑         │
           Committed ↓       │ committed ↓      │
                             └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   ADVANCES       │────────→│     BUDGET       │
│                  │         │     CHECK        │
│  • Adv Request   │←────────│                  │
│  • Utilization   │  Pass/  └──────────────────┘
└──────────────────┘  Fail            ↓
         │                   ┌──────────────────┐
         │                   │ CONSUMPTION      │
         └──────────────────→│   UPDATE         │
           Committed/Actual  │ committed/actual │
                             └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  APPROVAL ENGINE │←───────→│  BUDGET WORKFLOW │
│                  │         │                  │
│  • Multi-level   │  Use    │ • Approval Steps │
│  • SLA Track     │  Shared │ • SLA Monitor    │
│  • Notifications │  Engine │ • Status Update  │
└──────────────────┘         └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│      RBAC        │────────→│  BUDGET PERMS    │
│                  │         │                  │
│  • Roles         │  Check  │ • BUDGET.VIEW    │
│  • Permissions   │  Perms  │ • BUDGET.CREATE  │
│  • Users         │         │ • BUDGET.APPROVE │
└──────────────────┘         └──────────────────┘
```

---

## 🔄 STATE TRANSITIONS

```
┌─────────────────────────────────────────────────────────────────┐
│                 BUDGET STATUS STATE MACHINE                     │
└─────────────────────────────────────────────────────────────────┘

           ┌─────────┐
   START───│  DRAFT  │
           └────┬────┘
                │ submit()
                ↓
           ┌──────────┐
           │SUBMITTED │
           └────┬─────┘
                │ startApproval()
                ↓
           ┌────────────┐
           │IN APPROVAL │──┐
           └────┬───────┘  │ reject()
                │ approve()│
                ↓          ↓
           ┌─────────┐ ┌─────────┐
           │APPROVED │ │REJECTED │
           └────┬────┘ └─────────┘
                │ activate()     │
                ↓                │
           ┌────────┐            │
           │ ACTIVE │            │
           └────┬───┘            │
                │ close()        │
                ↓                │
           ┌────────┐            │
           │ CLOSED │←───────────┘
           └────────┘
```

---

## 📈 REPORTING ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                      BUDGET REPORTS                             │
└─────────────────────────────────────────────────────────────────┘

Data Source: BudgetDataContext
                    ↓
        ┌───────────────────────┐
        │   REPORT GENERATORS   │
        └───────────────────────┘
                    ↓
    ┌───────────┬───────────┬───────────┐
    │           │           │           │
    ↓           ↓           ↓           ↓
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Budget  │ │Variance │ │  Burn   │ │ Overrun │
│   vs    │ │Analysis │ │  Rate   │ │Analysis │
│ Actual  │ │         │ │ Trends  │ │         │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

Dimensions Available:
• Department
• Cost Centre
• GL Account
• Location
• Project
• Expense Category

Chart Types:
• Bar Charts (Department comparison)
• Line Charts (Burn rate trends)
• Pie Charts (Budget distribution)
• Waterfall (Variance breakdown)
• Heatmaps (Utilization matrix)
```

---

## 🎯 DEMO ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                  RECOMMENDED DEMO FLOW                          │
└─────────────────────────────────────────────────────────────────┘

ENTRY POINT: AP Automation → Budgeting → Dashboard

Demo Path 1: OVERVIEW (2 min)
    Dashboard → KPIs → Charts → Overruns
                   ↓
Demo Path 2: CREATE (3 min)
    Planning → Create → Auto-Distribute → Submit
                   ↓
Demo Path 3: APPROVE (2 min)
    Approval Workflow → Multi-level → Approve → Progress
                   ↓
Demo Path 4: CONTROL (2 min)
    Consumption Control → Utilization → Hard Stop → Override
                   ↓
Demo Path 5: FLEXIBILITY (4 min)
    Transfers → Create → Validate → Approve
                   ↓
    What-If → Scenario → Adjust → Impact
                   ↓
Demo Path 6: INTEGRATION (2 min)
    Procurement → Create PO → Budget Check → Block/Allow

TOTAL: 15 minutes
```

---

## 🔒 SECURITY ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                  SECURITY & PERMISSIONS                         │
└─────────────────────────────────────────────────────────────────┘

RBAC Integration
        ↓
┌──────────────────┐
│   USER ROLES     │
├──────────────────┤
│ • Budget Owner   │──→ BUDGET.VIEW, BUDGET.CREATE
│ • Finance Mgr    │──→ BUDGET.VIEW, BUDGET.CREATE, BUDGET.APPROVE
│ • CFO            │──→ All BUDGET permissions
│ • Viewer         │──→ BUDGET.VIEW only
└──────────────────┘
        ↓
┌──────────────────────────────┐
│   PERMISSION CHECKS          │
├──────────────────────────────┤
│ Component Render             │
│ ├─ hasPermission(VIEW)?      │──→ Show/Hide navigation
│ └─ hasPermission(CREATE)?    │──→ Show/Hide buttons
│                              │
│ Action Execution             │
│ ├─ hasPermission(CREATE)?    │──→ Allow/Block create
│ └─ hasPermission(APPROVE)?   │──→ Allow/Block approve
└──────────────────────────────┘
        ↓
┌──────────────────────────────┐
│      AUDIT TRAIL             │
├──────────────────────────────┤
│ All actions logged:          │
│ • Who (user)                 │
│ • What (action)              │
│ • When (timestamp)           │
│ • Why (comments/reason)      │
│ • What changed (old→new)     │
└──────────────────────────────┘
```

---

## ✅ VALIDATION CHECKLIST

```
COMPONENT LAYER
├─ [✅] BudgetDashboard renders
├─ [✅] BudgetPlanningCreation renders
├─ [✅] BudgetPhasing renders
├─ [✅] BudgetApprovalWorkflow renders
├─ [✅] BudgetConsumptionControl renders
├─ [✅] InterimRevisedBudgets renders
├─ [✅] BudgetTransfers renders
├─ [✅] WhatIfScenarios renders
└─ [✅] BudgetPolicies renders

CONTEXT LAYER
├─ [✅] BudgetDataContext created
├─ [✅] Provider wraps App
├─ [✅] Sample data loaded
├─ [✅] All CRUD functions present
└─ [✅] useBudgetData hook working

ROUTE LAYER
├─ [✅] All 9 routes configured
├─ [✅] Components imported
├─ [✅] Navigation links working
└─ [✅] No 404 errors

INTEGRATION LAYER
├─ [✅] Procurement check working
├─ [✅] AP Invoice posting working
├─ [✅] Approval workflow integrated
└─ [✅] RBAC permissions enforced

UI/UX LAYER
├─ [✅] Design standards followed
├─ [✅] Charts rendering
├─ [✅] Forms validating
├─ [✅] Responsive design
└─ [✅] No console errors

BUSINESS LOGIC LAYER
├─ [✅] Budget calculations correct
├─ [✅] Control policies enforcing
├─ [✅] Approval routing working
└─ [✅] Audit trail capturing
```

---

**END OF ARCHITECTURE DOCUMENTATION**

This architecture supports:
✅ Enterprise-grade budget management
✅ Real-time consumption tracking
✅ Automated control enforcement
✅ Multi-level approval workflows
✅ Comprehensive audit trail
✅ Seamless integration with procurement & AP
