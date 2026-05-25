# Procinix ERP - Current Project Structure
**Last Updated:** February 27, 2026

## 📁 Complete File Tree (Current State)

```
procinix-vendor-governance/
│
├── public/                             # Static assets
│
├── src/
│   ├── app/
│   │   │
│   │   ├── layout/                     # ✅ NEW: Reorganized Layout
│   │   │   ├── MainLayout.tsx          # Main app layout (was Layout.tsx)
│   │   │   ├── Sidebar.tsx             # Left navigation (was EnterpriseSidebar.tsx)
│   │   │   ├── Header.tsx              # Top header (was EnterpriseHeader.tsx)
│   │   │   └── InsightsPanel.tsx       # Right panel (was InsightPanel.tsx)
│   │   │
│   │   ├── components/                 # Shared components only
│   │   │   │
│   │   │   ├── design-system/          # Enterprise design system
│   │   │   │   ├── KPICard.tsx
│   │   │   │   ├── StatusBadge.tsx
│   │   │   │   ├── ActionButton.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   ├── MetricCard.tsx
│   │   │   │   ├── RiskMeter.tsx
│   │   │   │   ├── ProgressStepper.tsx
│   │   │   │   ├── DocumentUploader.tsx
│   │   │   │   ├── ApprovalTimeline.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   └── SearchBar.tsx
│   │   │   │
│   │   │   ├── ui/                     # Base UI components (shadcn)
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── select.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── checkbox.tsx
│   │   │   │   ├── radio-group.tsx
│   │   │   │   ├── switch.tsx
│   │   │   │   ├── textarea.tsx
│   │   │   │   ├── label.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── table.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── toaster.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   └── use-toast.ts
│   │   │   │
│   │   │   ├── figma/                  # Figma integration
│   │   │   │   └── ImageWithFallback.tsx  # ⚠️ PROTECTED FILE
│   │   │   │
│   │   │   └── DocumentPreviewDrawer.tsx
│   │   │
│   │   ├── pages/                      # All page components (current location)
│   │   │   │
│   │   │   # VENDOR GOVERNANCE PAGES
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── VendorRequestsPage.tsx
│   │   │   ├── VendorRequestEditPage.tsx
│   │   │   ├── ApprovalWorkspacePage.tsx
│   │   │   ├── VendorApprovalPage.tsx
│   │   │   ├── ValidationDashboardPage.tsx
│   │   │   ├── VendorChangeRequestsPage.tsx
│   │   │   ├── VendorChangeRequestDetailPage.tsx
│   │   │   ├── VendorMasterPage.tsx
│   │   │   ├── VendorProfilePage.tsx
│   │   │   ├── Vendor360ConsolePage.tsx
│   │   │   ├── VendorSuccessPage.tsx
│   │   │   │
│   │   │   # VENDOR PORTAL PAGES
│   │   │   ├── VendorPortalHomePage.tsx
│   │   │   ├── VendorPortalPage.tsx
│   │   │   ├── VendorPortalRequestDetailPage.tsx
│   │   │   ├── VendorInvitationsPage.tsx
│   │   │   ├── VendorPortalUsersPage.tsx
│   │   │   ├── VendorSelfServicePortal.tsx
│   │   │   │
│   │   │   # RISK & COMPLIANCE PAGES
│   │   │   ├── VendorRiskDashboard.tsx
│   │   │   ├── RiskFactorMasterPage.tsx
│   │   │   ├── RiskRulesMasterPage.tsx
│   │   │   ├── ComplianceDocumentTypeMasterPage.tsx
│   │   │   │
│   │   │   # WORKFLOW & IMPLEMENTATION PAGES
│   │   │   ├── WorkflowConfigConsole.tsx
│   │   │   ├── WorkflowTypeMasterPage.tsx
│   │   │   ├── ImplementationConsole.tsx
│   │   │   │
│   │   │   # CONFIGURATION PAGES
│   │   │   ├── MastersManagement.tsx
│   │   │   ├── MasterListingPage.tsx
│   │   │   ├── MasterFormPage.tsx
│   │   │   ├── VendorCategoryMasterPage.tsx
│   │   │   └── VendorTypeMasterPage.tsx
│   │   │
│   │   ├── data/                       # Mock data & constants
│   │   │   ├── mockVendors.ts
│   │   │   ├── mockRequests.ts
│   │   │   ├── mockApprovals.ts
│   │   │   ├── mockChangeRequests.ts
│   │   │   ├── mockRiskData.ts
│   │   │   └── mockMasterData.ts
│   │   │
│   │   ├── utils/                      # Utility functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── exportHelpers.ts
│   │   │
│   │   ├── routes.tsx                  # ✅ UPDATED: Main routing (uses MainLayout)
│   │   ├── App.tsx                     # Root app component
│   │   ├── constants.ts                # Application constants
│   │   └── ARCHITECTURE.ts             # Architecture docs
│   │
│   ├── styles/                         # Global styles
│   │   ├── theme.css                   # Tailwind v4 theme tokens
│   │   ├── fonts.css                   # Font imports (Inter)
│   │   └── globals.css                 # Global CSS
│   │
│   ├── imports/                        # Figma assets
│   │   ├── figma-make-ai-export.md    # Export instructions
│   │   └── [various SVG and image assets]
│   │
│   └── index.tsx                       # Entry point
│
├── EXPORT_MANIFEST.md                  # ✅ NEW: Complete export documentation
├── PROJECT_STRUCTURE.md                # ✅ NEW: This file
├── package.json                        # Dependencies
├── pnpm-lock.yaml                      # ⚠️ PROTECTED FILE
├── tsconfig.json                       # TypeScript config
├── vite.config.ts                      # Vite config
├── tailwind.config.ts                  # Tailwind v4 config (if exists)
└── README.md                           # Project README

```

---

## 🔄 CHANGES MADE IN REORGANIZATION

### ✅ Completed:

1. **Created `/src/app/layout/` folder:**
   - ✅ MainLayout.tsx (renamed from Layout.tsx)
   - ✅ Sidebar.tsx (renamed from EnterpriseSidebar.tsx)
   - ✅ Header.tsx (renamed from EnterpriseHeader.tsx)
   - ✅ InsightsPanel.tsx (renamed from InsightPanel.tsx)

2. **Updated imports:**
   - ✅ routes.tsx now imports `MainLayout` from `./layout/MainLayout`
   - ✅ All layout components import from correct relative paths

3. **Deleted old files:**
   - ✅ /src/app/components/Layout.tsx (deleted)
   - ✅ /src/app/components/EnterpriseSidebar.tsx (deleted)
   - ✅ /src/app/components/EnterpriseHeader.tsx (deleted)
   - ✅ /src/app/components/InsightPanel.tsx (deleted)

4. **Route-aware Insights Panel:**
   - ✅ InsightsPanel only renders on dashboard routes
   - ✅ Main content expands to full width when panel hidden
   - ✅ No layout shift or horizontal scroll

### 📋 Recommended (Optional):

**For full module organization, you can manually organize pages into:**

```
src/app/modules/
├── vendor-governance/
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── VendorRequestsPage.tsx
│   │   ├── VendorRequestEditPage.tsx
│   │   ├── ApprovalWorkspacePage.tsx
│   │   ├── VendorApprovalPage.tsx
│   │   ├── ValidationDashboardPage.tsx
│   │   ├── VendorChangeRequestsPage.tsx
│   │   ├── VendorChangeRequestDetailPage.tsx
│   │   ├── VendorMasterPage.tsx
│   │   ├── VendorProfilePage.tsx
│   │   ├── Vendor360ConsolePage.tsx
│   │   └── VendorSuccessPage.tsx
│   └── index.ts (re-exports)
│
├── vendor-portal/
│   ├── pages/
│   │   ├── VendorPortalHomePage.tsx
│   │   ├── VendorPortalPage.tsx
│   │   ├── VendorPortalRequestDetailPage.tsx
│   │   ├── VendorInvitationsPage.tsx
│   │   ├── VendorPortalUsersPage.tsx
│   │   └── VendorSelfServicePortal.tsx
│   └── index.ts
│
├── risk-compliance/
│   ├── pages/
│   │   ├── VendorRiskDashboard.tsx
│   │   ├── RiskFactorMasterPage.tsx
│   │   ├── RiskRulesMasterPage.tsx
│   │   └── ComplianceDocumentTypeMasterPage.tsx
│   └── index.ts
│
├── workflow-engine/
│   ├── pages/
│   │   ├── WorkflowConfigConsole.tsx
│   │   └── WorkflowTypeMasterPage.tsx
│   └── index.ts
│
├── implementation-console/
│   ├── pages/
│   │   └── ImplementationConsole.tsx
│   └── index.ts
│
└── configuration/
    ├── pages/
    │   ├── MastersManagement.tsx
    │   ├── MasterListingPage.tsx
    │   ├── MasterFormPage.tsx
    │   ├── VendorCategoryMasterPage.tsx
    │   └── VendorTypeMasterPage.tsx
    └── index.ts
```

**Note:** This module organization is optional. The current structure with all pages in `/src/app/pages/` works perfectly fine. Moving to modules would be a future refactor for larger teams or if specific modules need to be independently packaged.

---

## ✅ CURRENT STATE: PRODUCTION READY

The reorganization is **complete and functional**:
- ✅ Layout components moved to `/src/app/layout/`
- ✅ Routes updated to use new paths
- ✅ Old components deleted
- ✅ No import errors
- ✅ Application running without issues
- ✅ InsightsPanel conditionally rendered based on route
- ✅ Full-width content when panel hidden

---

## 🚀 READY FOR EXPORT

The project is now organized following enterprise best practices and ready for export as a standalone React + TypeScript application.

**To export:**
1. Copy the entire project directory
2. Run `npm install` or `pnpm install`
3. Run `npm run dev` to test
4. Run `npm run build` to create production build

---

**Structure Documented:** February 27, 2026  
**Status:** ✅ REORGANIZED & EXPORT READY
