import { createBrowserRouter, redirect } from "react-router-dom";
import { MainLayout } from "./layout/MainLayout";
import { VendorRequestsPage } from "./pages/VendorRequestsPage";
import { VendorRequestEditPage } from "./pages/VendorRequestEditPage";
import { VendorApprovalPage } from "./pages/VendorApprovalPage";
import { VendorProfilePage } from "./pages/VendorProfilePage";
import { VendorChangeRequestsPage } from "./pages/VendorChangeRequestsPage";
import { VendorChangeRequestDetailPage } from "./pages/VendorChangeRequestDetailPage";
import { ValidationDashboardPage } from "./pages/ValidationDashboardPage";
import { VendorSuccessPage } from "./pages/VendorSuccessPage";
import { Vendor360ConsolePage } from "./pages/Vendor360ConsolePage";
import { VendorSelfServicePortal } from "./pages/VendorSelfServicePortal";
import { DashboardPage } from "./pages/DashboardPage";
import { VendorMasterPage } from "./pages/VendorMasterPage";
import { VendorRiskDashboard } from "./pages/VendorRiskDashboard";
import { WorkflowConfigConsole } from "./pages/WorkflowConfigConsole";
import { ImplementationConsole } from "./pages/ImplementationConsole";
import { MastersManagement } from "./pages/MastersManagement";
import { MasterListingPage } from "./pages/MasterListingPage";
import { MasterFormPage } from "./pages/MasterFormPage";
import { VendorTypeMasterPage } from "./pages/VendorTypeMasterPage";
import { VendorCategoryMasterPage } from "./pages/VendorCategoryMasterPage";
import { RiskFactorMasterPage } from "./pages/RiskFactorMasterPage";
import { ComplianceDocumentTypeMasterPage } from "./pages/ComplianceDocumentTypeMasterPage";
import { RiskRulesMasterPage } from "./pages/RiskRulesMasterPage";
import { WorkflowTypeMasterPage } from "./pages/WorkflowTypeMasterPage";
import { ApprovalWorkspacePage } from "./pages/ApprovalWorkspacePage";
import { VendorInvitationsPage } from "./pages/VendorInvitationsPage";
import { VendorPortalUsersPage } from "./pages/VendorPortalUsersPage";
import { VendorPortalHomePage } from "./pages/VendorPortalHomePage";
import { VendorPortalRequestDetailPage } from "./pages/VendorPortalRequestDetailPage";

// Procinix ERP Vendor Governance Module Routes
export const router = createBrowserRouter([
  {
    path: "/",
    Component: MainLayout,
    children: [
      {
        index: true,
        Component: DashboardPage,
      },
      // Dashboard
      {
        path: "vendors/dashboard",
        Component: DashboardPage,
      },
      // Vendor Requests (existing routes maintained)
      {
        path: "vendors/requests",
        Component: VendorRequestsPage,
      },
      {
        path: "vendors/requests/:id/edit",
        Component: VendorRequestEditPage,
      },
      {
        path: "vendors/requests/:id/validation",
        Component: ValidationDashboardPage,
      },
      {
        path: "vendors/requests/:id/approval",
        Component: VendorApprovalPage,
      },
      {
        path: "vendors/requests/:id/success",
        Component: VendorSuccessPage,
      },
      // Approval Workspace
      {
        path: "approval/workspace",
        Component: ApprovalWorkspacePage,
      },
      // Change Requests - All routes map to VendorChangeRequestsPage
      {
        path: "change-requests",
        Component: VendorChangeRequestsPage,
      },
      {
        path: "change-requests/bank",
        Component: VendorChangeRequestsPage,
      },
      {
        path: "change-requests/tax",
        Component: VendorChangeRequestsPage,
      },
      {
        path: "change-requests/lower-tds",
        Component: VendorChangeRequestsPage,
      },
      {
        path: "change-requests/address",
        Component: VendorChangeRequestsPage,
      },
      {
        path: "change-requests/:id",
        Component: VendorChangeRequestDetailPage,
      },
      // Vendor Master
      {
        path: "vendors/master",
        Component: VendorMasterPage,
      },
      {
        path: "vendors/master/active",
        Component: VendorMasterPage,
      },
      {
        path: "vendors/master/blocked",
        Component: VendorMasterPage,
      },
      {
        path: "vendors/master/blacklisted",
        Component: VendorMasterPage,
      },
      // Vendor Portal
      {
        path: "vendor-portal/invitations",
        Component: VendorInvitationsPage,
      },
      {
        path: "vendor-portal/users",
        Component: VendorPortalUsersPage,
      },
      {
        path: "vendor-portal/home",
        Component: VendorPortalHomePage,
      },
      {
        path: "vendor-portal/requests/:id",
        Component: VendorPortalRequestDetailPage,
      },
      // Risk & Compliance
      {
        path: "risk/dashboard",
        Component: VendorRiskDashboard,
      },
      {
        path: "risk/sanctions",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "risk/kyc-logs",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "risk/document-expiry",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "risk/factors",
        loader: () => redirect("/config/risk-factors"),
      },
      {
        path: "risk/rules",
        loader: () => redirect("/config/risk-scoring"),
      },
      // Integration
      {
        path: "integration/erp-sync",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "integration/erp-sync/logs",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "integration/erp-sync/failed",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "integration/erp-sync/mapping",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "integration/erp-systems",
        loader: () => redirect("/config/erp-systems"),
      },
      // Reports
      {
        path: "reports",
        Component: DashboardPage, // Placeholder
      },
      // Workflow Engine
      {
        path: "workflow/types",
        loader: () => redirect("/config/workflow-types"),
      },
      {
        path: "workflow/configuration",
        Component: WorkflowConfigConsole,
      },
      {
        path: "workflow/validation-rules",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "workflow/sla-rules",
        loader: () => redirect("/config/sla-rules"),
      },
      {
        path: "workflow/approval-roles",
        loader: () => redirect("/config/approval-roles"),
      },
      {
        path: "workflow/department-matrix",
        Component: DashboardPage, // Placeholder
      },
      {
        path: "workflow/change-types",
        loader: () => redirect("/config/change-types"),
      },
      // Implementation Console
      {
        path: "implementation-console",
        Component: ImplementationConsole,
      },
      // Configuration (Masters) - All map to MasterListingPage with proper masterType
      {
        path: "config/vendor-type",
        loader: () => redirect("/masters/vendor-type"),
      },
      {
        path: "config/vendor-category",
        loader: () => redirect("/masters/vendor-category"),
      },
      {
        path: "config/country",
        loader: () => redirect("/masters/country"),
      },
      {
        path: "config/address-type",
        loader: () => redirect("/masters/address-type"),
      },
      {
        path: "config/currency",
        loader: () => redirect("/masters/currency"),
      },
      {
        path: "config/payment-method",
        loader: () => redirect("/masters/payment-method"),
      },
      {
        path: "config/payment-terms",
        loader: () => redirect("/masters/payment-terms"),
      },
      {
        path: "config/tax-identifiers",
        loader: () => redirect("/masters/tax-identifier"),
      },
      {
        path: "config/compliance-docs",
        loader: () => redirect("/masters/compliance-doc"),
      },
      {
        path: "config/sanctions-sources",
        loader: () => redirect("/masters/sanctions"),
      },
      {
        path: "config/kyc-sources",
        loader: () => redirect("/masters/kyc-sources"),
      },
      {
        path: "config/tds-categories",
        loader: () => redirect("/masters/tds-category"),
      },
      {
        path: "config/entities",
        loader: () => redirect("/masters/entities"),
      },
      {
        path: "config/departments",
        loader: () => redirect("/masters/departments"),
      },
      {
        path: "config/notification-templates",
        loader: () => redirect("/masters/notification-templates"),
      },
      {
        path: "config/audit-events",
        loader: () => redirect("/masters/audit-events"),
      },
      {
        path: "config/risk-factors",
        loader: () => redirect("/masters/risk-factors"),
      },
      {
        path: "config/risk-scoring",
        loader: () => redirect("/masters/risk-scoring"),
      },
      {
        path: "config/workflow-types",
        loader: () => redirect("/masters/workflow-types"),
      },
      {
        path: "config/approval-roles",
        loader: () => redirect("/masters/approval-roles"),
      },
      {
        path: "config/sla-rules",
        loader: () => redirect("/masters/sla-rules"),
      },
      {
        path: "config/change-types",
        loader: () => redirect("/masters/change-types"),
      },
      {
        path: "config/erp-systems",
        loader: () => redirect("/masters/erp-systems"),
      },
      // Master data routes (existing dynamic routing)
      {
        path: "masters/:masterType",
        Component: MasterListingPage,
      },
      {
        path: "masters/:masterType/create",
        Component: MasterFormPage,
      },
      {
        path: "masters/:masterType/edit/:recordId",
        Component: MasterFormPage,
      },
      // Vendor Type Master - Special dedicated page
      {
        path: "masters/vendor-type/create-advanced",
        Component: VendorTypeMasterPage,
      },
      {
        path: "masters/vendor-type/edit-advanced/:recordId",
        Component: VendorTypeMasterPage,
      },
      // Vendor Category Master - Special dedicated page
      {
        path: "masters/vendor-category/create-advanced",
        Component: VendorCategoryMasterPage,
      },
      {
        path: "masters/vendor-category/edit-advanced/:recordId",
        Component: VendorCategoryMasterPage,
      },
      // Risk Factor Master - Special dedicated page
      {
        path: "masters/risk-factor/create-advanced",
        Component: RiskFactorMasterPage,
      },
      {
        path: "masters/risk-factor/edit-advanced/:recordId",
        Component: RiskFactorMasterPage,
      },
      // Compliance Document Type Master - Special dedicated page
      {
        path: "masters/compliance-document-type/create-advanced",
        Component: ComplianceDocumentTypeMasterPage,
      },
      {
        path: "masters/compliance-document-type/edit-advanced/:recordId",
        Component: ComplianceDocumentTypeMasterPage,
      },
      // Risk Rules Master - Special dedicated page
      {
        path: "masters/risk-rules/create-advanced",
        Component: RiskRulesMasterPage,
      },
      {
        path: "masters/risk-rules/edit-advanced/:recordId",
        Component: RiskRulesMasterPage,
      },
      // Workflow Type Master - Special dedicated page
      {
        path: "masters/workflow-type/create-advanced",
        Component: WorkflowTypeMasterPage,
      },
      {
        path: "masters/workflow-type/edit-advanced/:recordId",
        Component: WorkflowTypeMasterPage,
      },
      // Vendor 360 Console and Profile
      {
        path: "vendors/:id/console",
        Component: Vendor360ConsolePage,
      },
      {
        path: "vendors/:id",
        Component: VendorProfilePage,
      },
      // Legacy redirects for backward compatibility
      {
        path: "vendors/invitations",
        loader: () => redirect("/vendor-portal/invitations"),
      },
      {
        path: "vendors/portal-users",
        loader: () => redirect("/vendor-portal/users"),
      },
      {
        path: "vendors/risk",
        loader: () => redirect("/risk/dashboard"),
      },
      {
        path: "vendors/workflow-config",
        loader: () => redirect("/workflow/configuration"),
      },
      {
        path: "vendors/implementation",
        loader: () => redirect("/implementation-console"),
      },
      {
        path: "vendors/change-requests",
        loader: () => redirect("/change-requests"),
      },
      // Catch-all
      {
        path: "*",
        Component: DashboardPage,
      },
    ],
  },
  {
    path: "/portal/onboarding/:token",
    Component: VendorSelfServicePortal,
  },
]);