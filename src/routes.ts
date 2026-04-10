import { createBrowserRouter, redirect, Navigate } from "react-router-dom";
import { Login } from "./components/Login";
import { Dashboard } from "./components/Dashboard";
import { DashboardLayout } from "./components/DashboardLayout";
import { PurchaseOrders } from "./components/PurchaseOrders";
import { CreatePurchaseOrder } from "./components/CreatePurchaseOrder";
import { PRtoPOConversion } from "./components/procurement/PRtoPOConversion";
import { POUpdate } from "./components/POUpdate";
import { GoodsReceipt } from "./components/GoodsReceipt";
import { Vendors } from "./components/Vendors";
import { CreateVendor } from "./components/CreateVendor";
import { VendorManagement } from "./components/VendorManagement";
import { InviteVendors } from "./components/InviteVendors";
import { VendorReview } from "./components/VendorReview";
import { Reports } from "./components/Reports";
import { Masters } from "./components/Masters";
import { WorkflowManagement } from "./components/WorkflowManagement";
import { CategoryMaster } from "./components/CategoryMaster";
import { ItemMaster } from "./components/ItemMaster";
import { ProductMaster } from "./components/ProductMaster";
import { ColorMaster } from "./components/ColorMaster";
import { SizeMaster } from "./components/SizeMaster";
import { SKUMaster } from "./components/SKUMaster";
import { ContractMaster } from "./components/ContractMaster";
import { CountryMaster } from "./components/CountryMaster";
import { StateMaster } from "./components/StateMaster";
import { TaxCodeMaster } from "./components/TaxCodeMaster";
import { EmployeeMaster } from "./components/EmployeeMaster";
import { DepartmentMaster } from "./components/DepartmentMaster";
import { CostCentreMaster } from "./components/CostCentreMaster";
import { ProfitCentreMaster } from "./components/ProfitCentreMaster";
import { UserMaster } from "./components/UserMaster";
import { RolesMaster } from "./components/RolesMaster";
import { AccessPrivilege } from "./components/AccessPrivilege";
import { WorkflowConfigurator } from "./components/WorkflowConfigurator";
import { AuditTrailReport } from "./components/AuditTrailReport";
import { OperationalDashboard } from "./components/OperationalDashboard";
import { ProcurementHeadDesk } from "./components/ProcurementHeadDesk";
import { CFODesk } from "./components/CFODesk";
import { ManagementDesk } from "./components/ManagementDesk";
import { WorkflowReport } from "./components/WorkflowReport";
import { Invoices } from "./components/Invoices";
import { InvoiceFormPO } from "./components/InvoiceFormPO";
import { AIInvoiceCapture } from "./components/AIInvoiceCapture";
import { InvoiceDetail } from "./components/InvoiceDetail";
import { GlobalApprovalsDashboard } from "./components/GlobalApprovalsDashboard";
import { QuickCreate } from "./components/QuickCreate";
import { AuditLog } from "./components/AuditLog";
import { FinanceRBACDemo } from "./components/FinanceRBACDemo";
import { RolePermissionMatrix } from "./components/RolePermissionMatrix";
import { PaymentsDashboard } from "./components/PaymentsDashboard";
import { PaymentProposal } from "./components/PaymentProposal";
import { PaymentBatches } from "./components/PaymentBatches";
import { PaymentApproval } from "./components/PaymentApproval";
import { PaymentAgingDashboard } from "./components/PaymentAgingDashboard";
import { BankIntegrationManagement } from "./components/BankIntegrationManagement";
import { PaymentAuditTrail } from "./components/PaymentAuditTrail";
import { AISuggestedPaymentBatch } from "./components/AISuggestedPaymentBatch";
import { MSMEPaymentDashboard } from "./components/MSMEPaymentDashboard";
import { AdvancesHub } from "./components/AdvancesHub";
import { AdvanceRequests } from "./components/AdvanceRequests";
import { AdvanceRequestForm } from "./components/AdvanceRequestForm";
import { AdvancePaymentQueue } from "./components/AdvancePaymentQueue";
import { AdvanceUtilization } from "./components/AdvanceUtilization";
import { Settings } from "./components/Settings";
import { BudgetDashboard } from "./components/BudgetDashboard";
import { BudgetPlanningCreation } from "./components/BudgetPlanningCreation";
import { BudgetPhasing } from "./components/BudgetPhasing";
import { BudgetApprovalWorkflow } from "./components/BudgetApprovalWorkflow";
import { BudgetConsumptionControl } from "./components/BudgetConsumptionControl";
import { InterimRevisedBudgets } from "./components/InterimRevisedBudgets";
import { BudgetTransfers } from "./components/BudgetTransfers";
import { WhatIfScenarios } from "./components/WhatIfScenarios";
import { BudgetPolicies } from "./components/BudgetPolicies";
import { POInvoicePolicyConfig } from "./components/POInvoicePolicyConfig";
import { POInvoiceValidationDemo } from "./components/POInvoiceValidationDemo";
import { MyInvoices } from "./components/MyInvoices";
import { InvoiceWorkflowView } from "./components/InvoiceWorkflowView";
import { InvoicesForApproval } from "./components/InvoicesForApproval";
import { InvoiceApprovalScreenV2 } from "./components/InvoiceApprovalScreenV2";
import { ReadyForPayment } from "./components/ReadyForPayment";
import { APDashboard } from "./components/APDashboard";
import { APReports } from "./components/APReports";
import { NonPOInvoiceForm } from "./components/NonPOInvoiceForm";
import { NonPOInvoiceApprovalScreen } from "./components/NonPOInvoiceApprovalScreen";
import { CashPosition } from "./components/cashflow/CashPosition";
import { WeekForecast13 } from "./components/cashflow/WeekForecast13";
import { MonthlyAnnualForecast } from "./components/cashflow/MonthlyAnnualForecast";
import { HybridReconciliation } from "./components/cashflow/HybridReconciliation";
import { ScenarioBuilder } from "./components/cashflow/ScenarioBuilder";
import { AIActions } from "./components/cashflow/AIActions";
import { VarianceExplainability } from "./components/cashflow/VarianceExplainability";
import { CashFlowReports } from "./components/cashflow/CashFlowReports";
import { CashFlowSettings } from "./components/cashflow/CashFlowSettings";
import { Customers } from "./components/ar/Customers";
import { SalesInvoices } from "./components/ar/SalesInvoices";
import { Collections } from "./components/ar/Collections";
import { CreditNotes } from "./components/ar/CreditNotes";
import { RevenueRecognition } from "./components/ar/RevenueRecognition";
import { ARMasters } from "./components/ar/ARMasters";
import { ARReports } from "./components/ar/ARReports";
import { PRTypeSelection } from "./components/procurement/PRTypeSelection";
import { CataloguePRForm } from "./components/procurement/CataloguePRForm";
import { RegularPRForm } from "./components/procurement/RegularPRForm";
import { KitBundlePRForm } from "./components/procurement/KitBundlePRForm";
import { ServicePRForm } from "./components/procurement/ServicePRForm";
import { AssetCapexPRForm } from "./components/procurement/AssetCapexPRForm";
import { BlanketPRForm } from "./components/procurement/BlanketPRForm";
import { MyPRs } from "./components/procurement/MyPRs";
import { PRApprovals } from "./components/procurement/PRApprovals";
import { PRReports } from "./components/procurement/PRReports";
import { PRListing } from "./components/procurement/PRListing";
import { PRDetailView } from "./components/procurement/PRDetailView";
import { PRApprovalsInbox } from "./components/procurement/PRApprovalsInbox";
import { PRtoPOConversionEnhanced } from "./components/procurement/PRtoPOConversionEnhanced";
import { POCreationHub } from "./components/procurement/POCreationHub";
import { UOMMaster } from "./components/UOMMaster";
import { DebitNoteReasonMaster } from "./components/DebitNoteReasonMaster";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "dashboards", element: <Dashboard /> },
      { path: "purchase-orders", element: <PurchaseOrders /> },
      { path: "purchase-orders/create", element: <CreatePurchaseOrder /> },
      { path: "purchase-orders/create-from-prs", element: <PRtoPOConversion /> },
      { path: "purchase-orders/update/:id", element: <POUpdate /> },
      { path: "goods-receipt", element: <GoodsReceipt /> },
      {
        path: "vendor-management",
        element: <VendorManagement />,
        children: [
          { index: true, element: <Navigate to="invite-vendors" replace /> },
          { path: "invite-vendors", element: <InviteVendors /> },
          { path: "review", element: <VendorReview /> },
          { path: "master", element: <Vendors /> },
        ],
      },
      { path: "vendors", element: <Vendors /> },
      { path: "add-vendor", element: <CreateVendor /> },
      { path: "reports", element: <Reports /> },
      { path: "masters", element: <Masters /> },
      { path: "masters/approval-workflow", element: <Navigate to="/workflow-engine" replace /> },
      { path: "masters/category-master", element: <CategoryMaster /> },
      { path: "masters/item-master", element: <ItemMaster /> },
      { path: "masters/product-master", element: <ProductMaster /> },
      { path: "masters/color-master", element: <ColorMaster /> },
      { path: "masters/size-master", element: <SizeMaster /> },
      { path: "masters/sku-master", element: <SKUMaster /> },
      { path: "masters/contract-master", element: <ContractMaster /> },
      { path: "masters/country-master", element: <CountryMaster /> },
      { path: "masters/state-master", element: <StateMaster /> },
      { path: "masters/tax-code-master", element: <TaxCodeMaster /> },
      { path: "masters/employee-master", element: <EmployeeMaster /> },
      { path: "masters/department-master", element: <DepartmentMaster /> },
      { path: "masters/cost-centre-master", element: <CostCentreMaster /> },
      { path: "masters/profit-centre-master", element: <ProfitCentreMaster /> },
      { path: "masters/user-master", element: <UserMaster /> },
      { path: "masters/roles-master", element: <RolesMaster /> },
      { path: "masters/access-privilege", element: <AccessPrivilege /> },
      { path: "masters/workflow-configurator", element: <Navigate to="/workflow-engine/designer" replace /> },
      { path: "workflow-engine", element: <WorkflowManagement /> },
      { path: "workflow-engine/approval-levels", element: <Navigate to="/workflow-engine" replace /> },
      { path: "workflow-engine/designer", element: <WorkflowConfigurator /> },
      { path: "reports/audit-trail", element: <AuditTrailReport /> },
      { path: "reports/operational-dashboard", element: <OperationalDashboard /> },
      { path: "reports/procurement-head-desk", element: <ProcurementHeadDesk /> },
      { path: "reports/cfo-desk", element: <CFODesk /> },
      { path: "reports/management-desk", element: <ManagementDesk /> },
      { path: "reports/workflow-report", element: <WorkflowReport /> },
      { path: "invoices", element: <Invoices /> },
      { path: "invoices/create", element: <InvoiceFormPO /> },
      { path: "invoices/create-po", element: <InvoiceFormPO /> },
      { path: "invoices/ai-capture", element: <AIInvoiceCapture /> },
      { path: "invoices/detail/:id", element: <InvoiceDetail /> },
      { path: "invoices/edit/:id", element: <InvoiceFormPO /> },
      { path: "approval-dashboard", element: <GlobalApprovalsDashboard /> },
      { path: "approvals", element: <GlobalApprovalsDashboard /> },
      { path: "create", element: <QuickCreate /> },
      { path: "tasks", loader: () => redirect("/create") },
      { path: "my-tasks", loader: () => redirect("/create") },
      
      // Subko Coffee Navigation Routes
      { path: "procurement/pr", loader: () => redirect("/procurement/pr/listing") },
      { path: "procurement/po", loader: () => redirect("/purchase-orders") },
      { path: "procurement/grn", loader: () => redirect("/goods-receipt") },
      { path: "ap/invoices", loader: () => redirect("/invoices") },
      { path: "ap/debit-notes", element: <QuickCreate /> },
      
      { path: "audit-log", element: <AuditLog /> },
      { path: "audit-logs", element: <AuditLog /> },
      { path: "rbac-demo", element: <FinanceRBACDemo /> },
      { path: "role-permission-matrix", element: <RolePermissionMatrix /> },
      { path: "payments-dashboard", element: <PaymentsDashboard /> },
      { path: "ap/payments", element: <PaymentsDashboard /> },
      { path: "ap/payment-proposal", element: <PaymentProposal /> },
      { path: "ap/payment-batches", element: <PaymentBatches /> },
      { path: "ap/payment-batches/:id", element: <PaymentApproval /> },
      { path: "ap/payment-aging-dashboard", element: <PaymentAgingDashboard /> },
      { path: "ap/bank-integration-management", element: <BankIntegrationManagement /> },
      { path: "ap/payment-audit-trail", element: <PaymentAuditTrail /> },
      { path: "ap/ai-suggested-payment-batch", element: <AISuggestedPaymentBatch /> },
      { path: "ap/msme-payment-dashboard", element: <MSMEPaymentDashboard /> },
      { path: "ap/advances", element: <AdvanceRequests /> },
      { path: "ap/advance-requests", element: <AdvanceRequests /> },
      { path: "ap/advances/hub", element: <AdvancesHub /> },
      { path: "ap/advance-request-form", element: <AdvanceRequestForm /> },
      { path: "ap/advance-payment-queue", element: <AdvancePaymentQueue /> },
      { path: "ap/advance-utilization", element: <AdvanceUtilization /> },
      { path: "settings", element: <Settings /> },
      // Redirect old routes
      { path: "dashboards", loader: () => redirect("/") },
      // Redirect old advance routes to new AP paths
      { path: "advances", loader: () => redirect("/ap/advances") },
      { path: "advances/create", loader: () => redirect("/ap/advance-request-form") },
      { path: "advances/requests", loader: () => redirect("/ap/advance-requests") },
      { path: "advances/payment-queue", loader: () => redirect("/ap/advance-payment-queue") },
      { path: "advances/utilization", loader: () => redirect("/ap/advance-utilization") },
      { path: "advances/hub", loader: () => redirect("/ap/advances/hub") },
      { path: "advances/edit/:id", loader: () => redirect("/ap/advance-request-form") },
      // Budget routes
      { path: "budget-dashboard", element: <BudgetDashboard /> },
      { path: "budget-planning-creation", element: <BudgetPlanningCreation /> },
      { path: "budget-phasing", element: <BudgetPhasing /> },
      { path: "budget-approval-workflow", element: <BudgetApprovalWorkflow /> },
      { path: "budget-consumption-control", element: <BudgetConsumptionControl /> },
      { path: "interim-revised-budgets", element: <InterimRevisedBudgets /> },
      { path: "budget-transfers", element: <BudgetTransfers /> },
      { path: "what-if-scenarios", element: <WhatIfScenarios /> },
      { path: "budget-policies", element: <BudgetPolicies /> },
      { path: "po-invoice-policy-config", element: <POInvoicePolicyConfig /> },
      { path: "po-invoice-validation-demo", element: <POInvoiceValidationDemo /> },
      // Budgeting routes with /budgeting prefix
      { path: "budgeting/budgets", element: <BudgetDashboard /> },
      { path: "budgeting/create", element: <BudgetPlanningCreation /> },
      { path: "budgeting/phasing", element: <BudgetPhasing /> },
      { path: "budgeting/approval-workflow", element: <BudgetApprovalWorkflow /> },
      { path: "budgeting/consumption", element: <BudgetConsumptionControl /> },
      { path: "budgeting/revisions", element: <InterimRevisedBudgets /> },
      { path: "budgeting/transfers", element: <BudgetTransfers /> },
      { path: "budgeting/scenarios", element: <WhatIfScenarios /> },
      { path: "budgeting/policies", element: <BudgetPolicies /> },
      { path: "budgeting/budget/:id", element: <BudgetConsumptionControl /> },
      // AP routes
      { path: "ap/my-invoices", element: <MyInvoices /> },
      { path: "ap/invoice-workflow/:id", element: <InvoiceWorkflowView /> },
      { path: "ap/invoices-for-approval", element: <InvoicesForApproval /> },
      { path: "ap/invoice-approval/:id", element: <InvoiceApprovalScreenV2 /> },
      { path: "ap/ready-for-payment", element: <ReadyForPayment /> },
      { path: "ap/dashboard", element: <APDashboard /> },
      { path: "ap/reports", element: <APReports /> },
      { path: "ap/payments", element: <PaymentsDashboard /> },
      // Non-PO Invoice routes
      { path: "ap/non-po-invoice-form", element: <NonPOInvoiceForm /> },
      { path: "ap/non-po-invoice-approval/:id", element: <NonPOInvoiceApprovalScreen /> },
      // R2R - Cash Flow AI (Hybrid) routes
      { path: "r2r/cash-flow", loader: () => redirect("/r2r/cash-flow/position") },
      { path: "r2r/cash-flow/position", element: <CashPosition /> },
      { path: "r2r/cash-flow/13-week-forecast", element: <WeekForecast13 /> },
      { path: "r2r/cash-flow/monthly-annual-forecast", element: <MonthlyAnnualForecast /> },
      { path: "r2r/cash-flow/hybrid-reconciliation", element: <HybridReconciliation /> },
      { path: "r2r/cash-flow/scenario-builder", element: <ScenarioBuilder /> },
      { path: "r2r/cash-flow/ai-actions", element: <AIActions /> },
      { path: "r2r/cash-flow/variance-explainability", element: <VarianceExplainability /> },
      { path: "r2r/cash-flow/reports", element: <CashFlowReports /> },
      { path: "r2r/cash-flow/settings", element: <CashFlowSettings /> },
      // AR routes
      { path: "ar/customers", element: <Customers /> },
      { path: "ar/sales-invoices", element: <SalesInvoices /> },
      { path: "ar/collections", element: <Collections /> },
      { path: "ar/credit-notes", element: <CreditNotes /> },
      { path: "ar/revenue-recognition", element: <RevenueRecognition /> },
      { path: "ar/masters", element: <ARMasters /> },
      { path: "ar/reports", element: <ARReports /> },
      // Procurement Intake (PR) routes
      { path: "procurement/intake", loader: () => redirect("/procurement/pr/create") },
      { path: "procurement/pr/create", element: <PRTypeSelection /> },
      { path: "procurement/pr/create/catalogue", element: <CataloguePRForm /> },
      { path: "procurement/pr/create/regular", element: <RegularPRForm /> },
      { path: "procurement/pr/create/kit-bundle", element: <KitBundlePRForm /> },
      { path: "procurement/pr/create/service", element: <ServicePRForm /> },
      { path: "procurement/pr/create/asset-capex", element: <AssetCapexPRForm /> },
      { path: "procurement/pr/create/blanket", element: <BlanketPRForm /> },
      { path: "procurement/pr/my-prs", element: <MyPRs /> },
      { path: "procurement/pr/approvals", element: <PRApprovals /> },
      { path: "procurement/pr/reports", element: <PRReports /> },
      { path: "procurement/pr/listing", element: <PRListing /> },
      { path: "procurement/pr/detail/:id", element: <PRDetailView /> },
      { path: "procurement/pr/approvals-inbox", element: <PRApprovalsInbox /> },
      { path: "procurement/pr/to-po-conversion", element: <PRtoPOConversion /> },
      { path: "procurement/pr/to-po-conversion-enhanced", element: <PRtoPOConversionEnhanced /> },
      { path: "procurement/po/creation-hub", element: <POCreationHub /> },
      { path: "quick-create", element: <QuickCreate /> },
      { path: "masters/uom-master", element: <UOMMaster /> },
      { path: "masters/debit-note-reason-master", element: <DebitNoteReasonMaster /> },
    ],
  },
]);
