import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from './contexts/AuthContext';
import { FinanceRBACProvider } from './contexts/FinanceRBACContext';
import { MasterDataProvider } from './contexts/MasterDataContext';
import { VendorInvitationProvider } from './contexts/VendorInvitationContext';
import { PortalUsersProvider } from './contexts/PortalUsersContext';
import { APDataProvider } from './contexts/APDataContext';
import { BudgetDataProvider } from './contexts/BudgetDataContext';
import { DashboardDataProvider } from './contexts/DashboardDataContext';
import { ProcurementDataProvider } from './contexts/ProcurementDataContext';

// Layout & Core
import { DashboardLayout } from './components/DashboardLayout';
import { Login } from './components/Login';
import { SuperAdminLogin } from './components/SuperAdminLogin';
import { SuperAdminLayout } from './components/SuperAdminLayout';
import { SuperAdminConsole } from './components/SuperAdminConsole';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFound } from './components/NotFound';

// Procurement
import { PurchaseOrders } from './components/PurchaseOrders';
import { CreatePurchaseOrder } from './components/CreatePurchaseOrder';
import { PRSelectionPage } from './components/PRSelectionPage';
import { POUpdate } from './components/POUpdate';
import { GoodsReceipt } from './components/GoodsReceipt';

// Vendors (legacy imports kept for reference; routes now use VendorMaster)
import { Vendors } from './components/Vendors';
import { CreateVendor } from './components/CreateVendor';

// Invoices
import { Invoices } from './components/Invoices';
import { InvoiceFormPO } from './components/InvoiceFormPO';
import { InvoiceFormDirectV2 } from './components/InvoiceFormDirectV2';
import { AIInvoiceCapture } from './components/AIInvoiceCapture';
import { AIIngestionDashboard } from './components/AIIngestionDashboard';
import { APValidationWorkbench } from './components/APValidationWorkbench';
import { AgentConfigEngine } from './components/AgentConfigEngine';

// Masters
import { ItemMaster } from './components/ItemMaster';

// Approvals & Quick Actions
import { QuickCreate } from './components/QuickCreate';

// Debit Notes
import { DebitNotes } from './components/DebitNotes';
import { DebitNoteFormV2Enhanced } from './components/DebitNoteFormV2Enhanced';
import { DebitNoteDetail } from './components/DebitNoteDetail';

// Audit & RBAC
import { AuditLog } from './components/AuditLog';
import { FinanceRBACDemo } from './components/FinanceRBACDemo';
import { RolePermissionMatrix } from './components/RolePermissionMatrix';

// Advances
import { AdvancesHub } from './components/AdvancesHub';
import { AdvanceRequests } from './components/AdvanceRequests';
import { AdvanceRequestForm } from './components/AdvanceRequestForm';
import { AdvancePaymentQueue } from './components/AdvancePaymentQueue';
import { AdvanceUtilization } from './components/AdvanceUtilization';

// Settings
import { Settings } from './components/Settings';

// Budget
import { POInvoicePolicyConfig } from './components/POInvoicePolicyConfig';
import { POInvoiceValidationDemo } from './components/POInvoiceValidationDemo';

// AP Additional
import { MyInvoices } from './components/MyInvoices';
import { InvoiceWorkflowView } from './components/InvoiceWorkflowView';
import { InvoicesForApproval } from './components/InvoicesForApproval';
import { InvoiceApprovalScreenV2 } from './components/InvoiceApprovalScreenV2';
// ReadyForPayment is deprecated (replaced by /ap/payments/queue) — see
// src/components/ReadyForPayment.tsx for the deprecation notice.
import { NonPOInvoiceForm } from './components/NonPOInvoiceForm';
import { NonPOInvoiceApprovalScreen } from './components/NonPOInvoiceApprovalScreen';

// AR
import { Customers } from './components/ar/Customers';
import { SalesInvoices } from './components/ar/SalesInvoices';
import { Collections } from './components/ar/Collections';
import { CreditNotes } from './components/ar/CreditNotes';
import { RevenueRecognition } from './components/ar/RevenueRecognition';
import { ARMasters } from './components/ar/ARMasters';
import { ARReports } from './components/ar/ARReports';

// Procurement - PR
import { PRTypeSelection } from './components/procurement/PRTypeSelection';
import { CataloguePRForm } from './components/procurement/CataloguePRForm';
import { RegularPRForm } from './components/procurement/RegularPRForm';
import { KitBundlePRForm } from './components/procurement/KitBundlePRForm';
import { ServicePRForm } from './components/procurement/ServicePRForm';
import { AssetCapexPRForm } from './components/procurement/AssetCapexPRForm';
import { BlanketPRForm } from './components/procurement/BlanketPRForm';
import { MyPRs } from './components/procurement/MyPRs';
import { PRApprovals } from './components/procurement/PRApprovals';
import { PRReports } from './components/procurement/PRReports';
import { PRListing } from './components/procurement/PRListing';
import { PRDetailView } from './components/procurement/PRDetailView';
import { PRApprovalsInbox } from './components/procurement/PRApprovalsInbox';
import { PRtoPOConversion } from './components/procurement/PRtoPOConversion';
import { PRtoPOConversionEnhanced } from './components/procurement/PRtoPOConversionEnhanced';
import { POCreationHub } from './components/procurement/POCreationHub';

// Dashboards

const Dashboard = lazy(() =>
  import('./components/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const DashboardsHub = lazy(() =>
  import('./components/DashboardsHub').then((module) => ({ default: module.DashboardsHub }))
);
const Masters = lazy(() =>
  import('./components/Masters').then((module) => ({ default: module.Masters }))
);
const VendorManagement = lazy(() =>
  import('./components/VendorManagement').then((module) => ({ default: module.VendorManagement }))
);
const InviteVendors = lazy(() =>
  import('./components/InviteVendors').then((module) => ({ default: module.InviteVendors }))
);
const VendorReview = lazy(() =>
  import('./components/VendorReview').then((module) => ({ default: module.VendorReview }))
);
const VendorInvitationPortal = lazy(() =>
  import('./components/VendorInvitationPortal').then((module) => ({
    default: module.VendorInvitationPortal,
  }))
);
const VendorInvitationReviewDetail = lazy(() =>
  import('./components/VendorInvitationReviewDetail').then((module) => ({
    default: module.VendorInvitationReviewDetail,
  }))
);
const PortalUsers = lazy(() =>
  import('./components/PortalUsers').then((module) => ({ default: module.PortalUsers }))
);
const VendorGovernanceDesk = lazy(() =>
  import('./components/VendorGovernanceDesk').then((module) => ({
    default: module.VendorGovernanceDesk,
  }))
);
const WorkflowManagement = lazy(() =>
  import('./components/WorkflowManagement').then((module) => ({
    default: module.WorkflowManagement,
  }))
);
const MasterBulkUpload = lazy(() =>
  import('./components/MasterBulkUpload').then((module) => ({ default: module.MasterBulkUpload }))
);
const CategoryMaster = lazy(() =>
  import('./components/CategoryMaster').then((module) => ({ default: module.CategoryMaster }))
);
const ProductMaster = lazy(() =>
  import('./components/ProductMaster').then((module) => ({ default: module.ProductMaster }))
);
const ColorMaster = lazy(() =>
  import('./components/ColorMaster').then((module) => ({ default: module.ColorMaster }))
);
const SizeMaster = lazy(() =>
  import('./components/SizeMaster').then((module) => ({ default: module.SizeMaster }))
);
const SKUMaster = lazy(() =>
  import('./components/SKUMaster').then((module) => ({ default: module.SKUMaster }))
);
const ContractMaster = lazy(() =>
  import('./components/ContractMaster').then((module) => ({ default: module.ContractMaster }))
);
const CountryMaster = lazy(() =>
  import('./components/CountryMaster').then((module) => ({ default: module.CountryMaster }))
);
const StateMaster = lazy(() =>
  import('./components/StateMaster').then((module) => ({ default: module.StateMaster }))
);
const TaxCodeMaster = lazy(() =>
  import('./components/TaxCodeMaster').then((module) => ({ default: module.TaxCodeMaster }))
);
const EmployeeMaster = lazy(() =>
  import('./components/EmployeeMaster').then((module) => ({ default: module.EmployeeMaster }))
);
const DepartmentMaster = lazy(() =>
  import('./components/DepartmentMaster').then((module) => ({ default: module.DepartmentMaster }))
);
const CostCentreMaster = lazy(() =>
  import('./components/CostCentreMaster').then((module) => ({ default: module.CostCentreMaster }))
);
const ProfitCentreMaster = lazy(() =>
  import('./components/ProfitCentreMaster').then((module) => ({
    default: module.ProfitCentreMaster,
  }))
);
const EntityMaster = lazy(() =>
  import('./components/EntityMaster').then((module) => ({ default: module.EntityMaster }))
);
const CurrencyMaster = lazy(() =>
  import('./components/CurrencyMaster').then((module) => ({ default: module.CurrencyMaster }))
);
const ExchangeRateMaster = lazy(() =>
  import('./components/ExchangeRateMaster').then((module) => ({
    default: module.ExchangeRateMaster,
  }))
);
const UserMaster = lazy(() =>
  import('./components/UserMaster').then((module) => ({ default: module.UserMaster }))
);
const RolesMaster = lazy(() =>
  import('./components/RolesMaster').then((module) => ({ default: module.RolesMaster }))
);
const AccessPrivilege = lazy(() =>
  import('./components/AccessPrivilege').then((module) => ({ default: module.AccessPrivilege }))
);
const WorkflowConfigurator = lazy(() =>
  import('./components/WorkflowConfigurator').then((module) => ({
    default: module.WorkflowConfigurator,
  }))
);
const AgentConfiguratorList = lazy(() =>
  import('./components/agents/AgentConfiguratorList').then((m) => ({
    default: m.AgentConfiguratorList,
  }))
);
const AgentConfiguratorCreate = lazy(() =>
  import('./components/agents/AgentConfiguratorCreate').then((m) => ({
    default: m.AgentConfiguratorCreate,
  }))
);
const AgentConfigurationMaster = lazy(() =>
  import('./components/agents/AgentConfigurationMaster').then((m) => ({
    default: m.AgentConfigurationMaster,
  }))
);
const AgentLogs = lazy(() =>
  import('./components/agents/AgentLogs').then((m) => ({ default: m.AgentLogs }))
);
const MyApprovalsPage = lazy(() => import('./pages/Approvals'));
const InvoiceDetail = lazy(() =>
  import('./pages/InvoiceDetail').then((m) => ({ default: m.InvoiceDetail }))
);
const PaymentMethodMaster = lazy(() =>
  import('./components/PaymentMethodMaster').then((m) => ({ default: m.PaymentMethodMaster }))
);
const TDSSectionMaster = lazy(() =>
  import('./components/TDSSectionMaster').then((m) => ({ default: m.TDSSectionMaster }))
);
const LocationMaster = lazy(() =>
  import('./components/LocationMaster').then((m) => ({ default: m.LocationMaster }))
);
const GLCodeMaster = lazy(() =>
  import('./components/GLCodeMaster').then((m) => ({ default: m.GLCodeMaster }))
);
const VendorGroupMaster = lazy(() =>
  import('./components/VendorGroupMaster').then((m) => ({ default: m.VendorGroupMaster }))
);
const UOMMaster = lazy(() =>
  import('./components/UOMMaster').then((module) => ({ default: module.UOMMaster }))
);
const DebitNoteReasonMaster = lazy(() =>
  import('./components/DebitNoteReasonMaster').then((module) => ({
    default: module.DebitNoteReasonMaster,
  }))
);
const ItemCategoryMaster = lazy(() =>
  import('./components/ItemCategoryMaster').then((module) => ({
    default: module.ItemCategoryMaster,
  }))
);
const VendorPaymentTermsMaster = lazy(() =>
  import('./components/VendorPaymentTermsMaster').then((module) => ({
    default: module.VendorPaymentTermsMaster,
  }))
);
const VendorMasterPage = lazy(() =>
  import('./components/VendorMaster').then((module) => ({ default: module.VendorMaster }))
);
const VendorMasterCreate = lazy(() =>
  import('./components/VendorMasterCreate').then((m) => ({ default: m.VendorMasterCreate }))
);
const SettingsIntegrations = lazy(() =>
  import('./components/SettingsIntegrations').then((m) => ({ default: m.SettingsIntegrations }))
);
const Reports = lazy(() =>
  import('./components/Reports').then((module) => ({ default: module.Reports }))
);
const AuditTrailReport = lazy(() =>
  import('./components/AuditTrailReport').then((module) => ({ default: module.AuditTrailReport }))
);
const OperationalDashboard = lazy(() =>
  import('./components/OperationalDashboard').then((module) => ({
    default: module.OperationalDashboard,
  }))
);
const ProcurementHeadDesk = lazy(() =>
  import('./components/ProcurementHeadDesk').then((module) => ({
    default: module.ProcurementHeadDesk,
  }))
);
const CFODesk = lazy(() =>
  import('./components/CFODesk').then((module) => ({ default: module.CFODesk }))
);
const ManagementDesk = lazy(() =>
  import('./components/ManagementDesk').then((module) => ({ default: module.ManagementDesk }))
);
const WorkflowReport = lazy(() =>
  import('./components/WorkflowReport').then((module) => ({ default: module.WorkflowReport }))
);
const PaymentsDashboard = lazy(() =>
  import('./components/PaymentsDashboard').then((module) => ({ default: module.PaymentsDashboard }))
);
const PaymentsLayout = lazy(() =>
  import('./components/payments/PaymentsLayout').then((module) => ({
    default: module.PaymentsLayout,
  }))
);
const PaymentQueue = lazy(() =>
  import('./components/payments/PaymentQueue').then((module) => ({ default: module.PaymentQueue }))
);
const PaymentForecast = lazy(() =>
  import('./components/payments/PaymentForecast').then((module) => ({
    default: module.PaymentForecast,
  }))
);
const PaymentBanking = lazy(() =>
  import('./components/payments/PaymentBanking').then((module) => ({
    default: module.PaymentBanking,
  }))
);
const PaymentSettings = lazy(() =>
  import('./components/payments/PaymentSettings').then((module) => ({
    default: module.PaymentSettings,
  }))
);
const ComingSoon = lazy(() =>
  import('./components/ComingSoon').then((module) => ({ default: module.ComingSoon }))
);
const PaymentProposal = lazy(() =>
  import('./components/PaymentProposal').then((module) => ({ default: module.PaymentProposal }))
);
const PaymentBatches = lazy(() =>
  import('./components/PaymentBatches').then((module) => ({ default: module.PaymentBatches }))
);
const PaymentApproval = lazy(() =>
  import('./components/PaymentApproval').then((module) => ({ default: module.PaymentApproval }))
);
const PaymentAgingDashboard = lazy(() =>
  import('./components/PaymentAgingDashboard').then((module) => ({
    default: module.PaymentAgingDashboard,
  }))
);
const BankIntegrationManagement = lazy(() =>
  import('./components/BankIntegrationManagement').then((module) => ({
    default: module.BankIntegrationManagement,
  }))
);
const PaymentAuditTrail = lazy(() =>
  import('./components/PaymentAuditTrail').then((module) => ({ default: module.PaymentAuditTrail }))
);
const AISuggestedPaymentBatch = lazy(() =>
  import('./components/AISuggestedPaymentBatch').then((module) => ({
    default: module.AISuggestedPaymentBatch,
  }))
);
const MSMEPaymentDashboard = lazy(() =>
  import('./components/MSMEPaymentDashboard').then((module) => ({
    default: module.MSMEPaymentDashboard,
  }))
);
const BudgetDashboard = lazy(() =>
  import('./components/BudgetDashboard').then((module) => ({ default: module.BudgetDashboard }))
);
const BudgetPlanningCreation = lazy(() =>
  import('./components/BudgetPlanningCreation').then((module) => ({
    default: module.BudgetPlanningCreation,
  }))
);
const BudgetPhasing = lazy(() =>
  import('./components/BudgetPhasing').then((module) => ({ default: module.BudgetPhasing }))
);
const BudgetApprovalWorkflow = lazy(() =>
  import('./components/BudgetApprovalWorkflow').then((module) => ({
    default: module.BudgetApprovalWorkflow,
  }))
);
const BudgetConsumptionControl = lazy(() =>
  import('./components/BudgetConsumptionControl').then((module) => ({
    default: module.BudgetConsumptionControl,
  }))
);
const InterimRevisedBudgets = lazy(() =>
  import('./components/InterimRevisedBudgets').then((module) => ({
    default: module.InterimRevisedBudgets,
  }))
);
const BudgetTransfers = lazy(() =>
  import('./components/BudgetTransfers').then((module) => ({ default: module.BudgetTransfers }))
);
const WhatIfScenarios = lazy(() =>
  import('./components/WhatIfScenarios').then((module) => ({ default: module.WhatIfScenarios }))
);
const BudgetPolicies = lazy(() =>
  import('./components/BudgetPolicies').then((module) => ({ default: module.BudgetPolicies }))
);
const APDashboard = lazy(() =>
  import('./components/APDashboard').then((module) => ({ default: module.APDashboard }))
);
const APReports = lazy(() =>
  import('./components/APReports').then((module) => ({ default: module.APReports }))
);
const CashPosition = lazy(() =>
  import('./components/cashflow/CashPosition').then((module) => ({ default: module.CashPosition }))
);
const WeekForecast13 = lazy(() =>
  import('./components/cashflow/WeekForecast13').then((module) => ({
    default: module.WeekForecast13,
  }))
);
const MonthlyAnnualForecast = lazy(() =>
  import('./components/cashflow/MonthlyAnnualForecast').then((module) => ({
    default: module.MonthlyAnnualForecast,
  }))
);
const HybridReconciliation = lazy(() =>
  import('./components/cashflow/HybridReconciliation').then((module) => ({
    default: module.HybridReconciliation,
  }))
);
const ScenarioBuilder = lazy(() =>
  import('./components/cashflow/ScenarioBuilder').then((module) => ({
    default: module.ScenarioBuilder,
  }))
);
const AIActions = lazy(() =>
  import('./components/cashflow/AIActions').then((module) => ({ default: module.AIActions }))
);
const VarianceExplainability = lazy(() =>
  import('./components/cashflow/VarianceExplainability').then((module) => ({
    default: module.VarianceExplainability,
  }))
);
const CashFlowReports = lazy(() =>
  import('./components/cashflow/CashFlowReports').then((module) => ({
    default: module.CashFlowReports,
  }))
);
const CashFlowSettings = lazy(() =>
  import('./components/cashflow/CashFlowSettings').then((module) => ({
    default: module.CashFlowSettings,
  }))
);

function RouteFallback() {
  return <div className="p-6 text-sm text-gray-500">Loading...</div>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FinanceRBACProvider>
          <MasterDataProvider>
            <PortalUsersProvider>
              <VendorInvitationProvider>
                <APDataProvider>
                  <ProcurementDataProvider>
                    <BudgetDataProvider>
                      <DashboardDataProvider>
                        <ErrorBoundary>
                          <Suspense fallback={<RouteFallback />}>
                            <Routes>
                              <Route path="/login" element={<Login />} />
                              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
                              <Route path="/super-admin" element={<SuperAdminLayout />}>
                                <Route index element={<SuperAdminConsole />} />
                              </Route>
                              <Route
                                path="/vendor-invite/:token"
                                element={<VendorInvitationPortal />}
                              />
                              <Route path="/" element={<DashboardLayout />}>
                                <Route index element={<Dashboard />} />
                                <Route path="dashboard" element={<Dashboard />} />
                                <Route path="dashboards" element={<DashboardsHub />} />

                                {/* Purchase Orders */}
                                <Route path="purchase-orders" element={<PurchaseOrders />} />
                                <Route
                                  path="purchase-orders/create"
                                  element={<CreatePurchaseOrder />}
                                />
                                <Route
                                  path="purchase-orders/create-from-pr"
                                  element={<PRSelectionPage />}
                                />
                                <Route path="purchase-orders/update/:id" element={<POUpdate />} />
                                <Route path="goods-receipt" element={<GoodsReceipt />} />

                                {/* Vendor Management */}
                                <Route path="vendor-management" element={<VendorManagement />}>
                                  <Route index element={<Navigate to="invite-vendors" replace />} />
                                  <Route
                                    path="governance-desk"
                                    element={<VendorGovernanceDesk />}
                                  />
                                  <Route path="invite-vendors" element={<InviteVendors />} />
                                  <Route path="review" element={<VendorReview />} />
                                  <Route
                                    path="review/:invitationId"
                                    element={<VendorInvitationReviewDetail />}
                                  />
                                  <Route path="master" element={<VendorMasterPage />} />
                                  <Route path="portal-users" element={<PortalUsers />} />
                                </Route>
                                <Route path="vendors" element={<VendorMasterPage />} />
                                <Route path="vendors/create" element={<VendorMasterCreate />} />
                                <Route
                                  path="vendors/edit/:vendorId"
                                  element={<VendorMasterCreate />}
                                />
                                <Route path="add-vendor/:vendorId" element={<VendorMasterPage />} />
                                <Route path="add-vendor" element={<VendorMasterPage />} />
                                <Route
                                  path="masters/vendor-master"
                                  element={<VendorMasterPage />}
                                />

                                {/* Reports */}
                                <Route path="reports" element={<Reports />} />
                                <Route path="reports/audit-trail" element={<AuditTrailReport />} />
                                <Route
                                  path="reports/operational-dashboard"
                                  element={<OperationalDashboard />}
                                />
                                <Route
                                  path="reports/procurement-head-desk"
                                  element={<ProcurementHeadDesk />}
                                />
                                <Route path="reports/cfo-desk" element={<CFODesk />} />
                                <Route
                                  path="reports/management-desk"
                                  element={<ManagementDesk />}
                                />
                                <Route
                                  path="reports/workflow-report"
                                  element={<WorkflowReport />}
                                />

                                {/* Masters */}
                                <Route path="masters" element={<Masters />} />
                                <Route path="masters/bulk-upload" element={<MasterBulkUpload />} />
                                <Route
                                  path="masters/approval-workflow"
                                  element={<Navigate to="/workflow-engine" replace />}
                                />
                                <Route
                                  path="masters/category-master"
                                  element={<CategoryMaster />}
                                />
                                <Route path="masters/item-master" element={<ItemMaster />} />
                                <Route path="masters/product-master" element={<ProductMaster />} />
                                <Route path="masters/color-master" element={<ColorMaster />} />
                                <Route path="masters/size-master" element={<SizeMaster />} />
                                <Route path="masters/sku-master" element={<SKUMaster />} />
                                <Route
                                  path="masters/contract-master"
                                  element={<ContractMaster />}
                                />
                                <Route path="masters/country-master" element={<CountryMaster />} />
                                <Route path="masters/state-master" element={<StateMaster />} />
                                <Route path="masters/tax-code-master" element={<TaxCodeMaster />} />
                                <Route
                                  path="masters/employee-master"
                                  element={<EmployeeMaster />}
                                />
                                <Route
                                  path="masters/department-master"
                                  element={<DepartmentMaster />}
                                />
                                <Route
                                  path="masters/cost-centre-master"
                                  element={<CostCentreMaster />}
                                />
                                <Route
                                  path="masters/profit-centre-master"
                                  element={<ProfitCentreMaster />}
                                />
                                <Route path="masters/entity-master" element={<EntityMaster />} />
                                <Route
                                  path="masters/currency-master"
                                  element={<CurrencyMaster />}
                                />
                                <Route
                                  path="masters/exchange-rate-master"
                                  element={<ExchangeRateMaster />}
                                />
                                <Route path="masters/user-master" element={<UserMaster />} />
                                <Route path="masters/roles-master" element={<RolesMaster />} />
                                <Route
                                  path="masters/access-privilege"
                                  element={<AccessPrivilege />}
                                />
                                <Route
                                  path="masters/workflow-configurator"
                                  element={<Navigate to="/workflow-engine/designer" replace />}
                                />

                                {/* Workflow Engine */}
                                <Route
                                  path="agent-configurator"
                                  element={<AgentConfiguratorList />}
                                />
                                <Route
                                  path="agent-configurator/new"
                                  element={<AgentConfiguratorCreate />}
                                />
                                <Route
                                  path="agent-configurator/edit/:id"
                                  element={<AgentConfiguratorCreate />}
                                />
                                <Route
                                  path="agent-configurator/master"
                                  element={<AgentConfigurationMaster />}
                                />
                                <Route path="agent-configurator/logs" element={<AgentLogs />} />
                                <Route path="workflow-engine" element={<WorkflowManagement />} />
                                <Route
                                  path="workflow-engine/approval-levels"
                                  element={<Navigate to="/workflow-engine" replace />}
                                />
                                <Route
                                  path="workflow-engine/designer"
                                  element={<WorkflowConfigurator />}
                                />
                                <Route path="masters/uom-master" element={<UOMMaster />} />
                                <Route
                                  path="masters/debit-note-reason-master"
                                  element={<DebitNoteReasonMaster />}
                                />
                                <Route
                                  path="masters/item-category-master"
                                  element={<ItemCategoryMaster />}
                                />
                                <Route
                                  path="masters/vendor-payment-terms-master"
                                  element={<VendorPaymentTermsMaster />}
                                />
                                <Route
                                  path="masters/payment-method-master"
                                  element={<PaymentMethodMaster />}
                                />
                                <Route
                                  path="masters/tds-section-master"
                                  element={<TDSSectionMaster />}
                                />
                                <Route
                                  path="masters/location-master"
                                  element={<LocationMaster />}
                                />
                                <Route path="masters/gl-code-master" element={<GLCodeMaster />} />
                                <Route
                                  path="masters/vendor-group-master"
                                  element={<VendorGroupMaster />}
                                />

                                {/* Invoices */}
                                <Route path="invoices" element={<Invoices />} />
                                <Route path="invoices/create" element={<InvoiceFormPO />} />
                                <Route path="invoices/create-po" element={<InvoiceFormPO />} />
                                <Route
                                  path="invoices/create-direct"
                                  element={<InvoiceFormDirectV2 />}
                                />
                                <Route
                                  path="invoices/create-legacy"
                                  element={<Navigate to="/invoices/create-po" replace />}
                                />
                                <Route
                                  path="invoices/create-direct-legacy"
                                  element={<Navigate to="/invoices/create-direct" replace />}
                                />
                                <Route path="invoices/ai-capture" element={<AIInvoiceCapture />} />
                                <Route
                                  path="invoices/ai-ingestion"
                                  element={<APValidationWorkbench />}
                                />
                                <Route
                                  path="invoices/agent-config"
                                  element={<AgentConfigEngine />}
                                />
                                <Route path="invoices/edit/:id" element={<InvoiceFormPO />} />
                                <Route path="invoices/:id" element={<InvoiceDetail />} />

                                {/* Approvals */}
                                <Route path="approval-dashboard" element={<MyApprovalsPage />} />
                                <Route path="approvals" element={<MyApprovalsPage />} />
                                <Route path="create" element={<QuickCreate />} />
                                <Route path="quick-create" element={<QuickCreate />} />
                                <Route path="tasks" element={<Navigate to="/create" replace />} />
                                <Route
                                  path="my-tasks"
                                  element={<Navigate to="/create" replace />}
                                />

                                {/* Navigation Redirects */}
                                <Route
                                  path="procurement/pr"
                                  element={<Navigate to="/procurement/pr/listing" replace />}
                                />
                                <Route
                                  path="procurement/po"
                                  element={<Navigate to="/purchase-orders" replace />}
                                />
                                <Route
                                  path="procurement/grn"
                                  element={<Navigate to="/goods-receipt" replace />}
                                />
                                <Route
                                  path="ap/invoices"
                                  element={<Navigate to="/invoices" replace />}
                                />

                                {/* Debit Notes */}
                                <Route path="ap/debit-notes" element={<DebitNotes />} />
                                <Route
                                  path="ap/debit-notes/create"
                                  element={<DebitNoteFormV2Enhanced />}
                                />
                                <Route
                                  path="ap/debit-notes/edit/:id"
                                  element={<DebitNoteFormV2Enhanced />}
                                />
                                <Route
                                  path="ap/debit-notes/detail/:id"
                                  element={<DebitNoteDetail />}
                                />

                                {/* Audit & RBAC */}
                                <Route path="audit-log" element={<AuditLog />} />
                                <Route path="audit-logs" element={<AuditLog />} />
                                <Route path="rbac-demo" element={<FinanceRBACDemo />} />
                                <Route
                                  path="role-permission-matrix"
                                  element={<RolePermissionMatrix />}
                                />

                                {/* Payments */}
                                <Route path="payments-dashboard" element={<PaymentsDashboard />} />
                                <Route path="ap/payments" element={<PaymentsLayout />}>
                                  <Route index element={<PaymentsDashboard />} />
                                  <Route path="queue" element={<PaymentQueue />} />
                                  <Route path="forecast" element={<PaymentForecast />} />
                                  <Route path="banking" element={<PaymentBanking />} />
                                  <Route path="settings" element={<PaymentSettings />} />
                                </Route>
                                <Route path="ap/payment-proposal" element={<PaymentProposal />} />
                                <Route path="ap/payment-batches" element={<PaymentBatches />} />
                                <Route
                                  path="ap/payment-batches/:id"
                                  element={<PaymentApproval />}
                                />
                                <Route
                                  path="ap/payment-aging-dashboard"
                                  element={<PaymentAgingDashboard />}
                                />
                                <Route
                                  path="ap/bank-integration-management"
                                  element={<BankIntegrationManagement />}
                                />
                                <Route
                                  path="ap/payment-audit-trail"
                                  element={<PaymentAuditTrail />}
                                />
                                <Route
                                  path="ap/ai-suggested-payment-batch"
                                  element={<AISuggestedPaymentBatch />}
                                />
                                <Route
                                  path="ap/msme-payment-dashboard"
                                  element={<MSMEPaymentDashboard />}
                                />

                                {/* Advances */}
                                <Route path="ap/advances" element={<AdvanceRequests />} />
                                <Route path="ap/advance-requests" element={<AdvanceRequests />} />
                                <Route path="ap/advances/hub" element={<AdvancesHub />} />
                                <Route
                                  path="ap/advance-request-form"
                                  element={<AdvanceRequestForm />}
                                />
                                <Route
                                  path="ap/advance-payment-queue"
                                  element={<AdvancePaymentQueue />}
                                />
                                <Route
                                  path="ap/advance-utilization"
                                  element={<AdvanceUtilization />}
                                />
                                <Route
                                  path="advances"
                                  element={<Navigate to="/ap/advances" replace />}
                                />
                                <Route
                                  path="advances/create"
                                  element={<Navigate to="/ap/advance-request-form" replace />}
                                />
                                <Route
                                  path="advances/requests"
                                  element={<Navigate to="/ap/advance-requests" replace />}
                                />
                                <Route
                                  path="advances/payment-queue"
                                  element={<Navigate to="/ap/advance-payment-queue" replace />}
                                />
                                <Route
                                  path="advances/utilization"
                                  element={<Navigate to="/ap/advance-utilization" replace />}
                                />
                                <Route
                                  path="advances/hub"
                                  element={<Navigate to="/ap/advances/hub" replace />}
                                />
                                <Route
                                  path="advances/edit/:id"
                                  element={<Navigate to="/ap/advance-request-form" replace />}
                                />

                                {/* Settings */}
                                <Route path="settings" element={<Settings />} />
                                <Route
                                  path="settings/integrations"
                                  element={<SettingsIntegrations />}
                                />

                                {/* Budget */}
                                <Route path="budget-dashboard" element={<BudgetDashboard />} />
                                <Route
                                  path="budget-planning-creation"
                                  element={<BudgetPlanningCreation />}
                                />
                                <Route path="budget-phasing" element={<BudgetPhasing />} />
                                <Route
                                  path="budget-approval-workflow"
                                  element={<BudgetApprovalWorkflow />}
                                />
                                <Route
                                  path="budget-consumption-control"
                                  element={<BudgetConsumptionControl />}
                                />
                                <Route
                                  path="interim-revised-budgets"
                                  element={<InterimRevisedBudgets />}
                                />
                                <Route path="budget-transfers" element={<BudgetTransfers />} />
                                <Route path="what-if-scenarios" element={<WhatIfScenarios />} />
                                <Route path="budget-policies" element={<BudgetPolicies />} />
                                <Route
                                  path="po-invoice-policy-config"
                                  element={<POInvoicePolicyConfig />}
                                />
                                <Route
                                  path="po-invoice-validation-demo"
                                  element={<POInvoiceValidationDemo />}
                                />
                                <Route path="budgeting/budgets" element={<BudgetDashboard />} />
                                <Route
                                  path="budgeting/create"
                                  element={<BudgetPlanningCreation />}
                                />
                                <Route path="budgeting/phasing" element={<BudgetPhasing />} />
                                <Route
                                  path="budgeting/approval-workflow"
                                  element={<BudgetApprovalWorkflow />}
                                />
                                <Route
                                  path="budgeting/consumption"
                                  element={<BudgetConsumptionControl />}
                                />
                                <Route
                                  path="budgeting/revisions"
                                  element={<InterimRevisedBudgets />}
                                />
                                <Route path="budgeting/transfers" element={<BudgetTransfers />} />
                                <Route path="budgeting/scenarios" element={<WhatIfScenarios />} />
                                <Route path="budgeting/policies" element={<BudgetPolicies />} />
                                <Route
                                  path="budgeting/budget/:id"
                                  element={<BudgetConsumptionControl />}
                                />

                                {/* AP Additional */}
                                <Route path="ap/my-invoices" element={<MyInvoices />} />
                                <Route
                                  path="ap/invoice-workflow/:id"
                                  element={<InvoiceWorkflowView />}
                                />
                                <Route
                                  path="ap/invoices-for-approval"
                                  element={<InvoicesForApproval />}
                                />
                                <Route
                                  path="ap/invoice-approval/:id"
                                  element={<InvoiceApprovalScreenV2 />}
                                />
                                {/* /ap/ready-for-payment removed 2026-05-10 — replaced by /ap/payments/queue */}
                                <Route
                                  path="ap/ready-for-payment"
                                  element={<Navigate to="/ap/payments/queue" replace />}
                                />
                                <Route path="ap/dashboard" element={<APDashboard />} />
                                <Route path="ap/reports" element={<APReports />} />
                                <Route
                                  path="ap/non-po-invoice-form"
                                  element={<NonPOInvoiceForm />}
                                />
                                <Route
                                  path="ap/non-po-invoice-approval/:id"
                                  element={<NonPOInvoiceApprovalScreen />}
                                />

                                {/* Cash Flow */}
                                <Route
                                  path="r2r/cash-flow"
                                  element={<Navigate to="/r2r/cash-flow/position" replace />}
                                />
                                <Route path="r2r/cash-flow/position" element={<CashPosition />} />
                                <Route
                                  path="r2r/cash-flow/13-week-forecast"
                                  element={<WeekForecast13 />}
                                />
                                <Route
                                  path="r2r/cash-flow/monthly-annual-forecast"
                                  element={<MonthlyAnnualForecast />}
                                />
                                <Route
                                  path="r2r/cash-flow/hybrid-reconciliation"
                                  element={<HybridReconciliation />}
                                />
                                <Route
                                  path="r2r/cash-flow/scenario-builder"
                                  element={<ScenarioBuilder />}
                                />
                                <Route path="r2r/cash-flow/ai-actions" element={<AIActions />} />
                                <Route
                                  path="r2r/cash-flow/variance-explainability"
                                  element={<VarianceExplainability />}
                                />
                                <Route path="r2r/cash-flow/reports" element={<CashFlowReports />} />
                                <Route
                                  path="r2r/cash-flow/settings"
                                  element={<CashFlowSettings />}
                                />

                                {/* AR */}
                                <Route path="ar/customers" element={<Customers />} />
                                <Route path="ar/sales-invoices" element={<SalesInvoices />} />
                                <Route path="ar/collections" element={<Collections />} />
                                <Route path="ar/credit-notes" element={<CreditNotes />} />
                                <Route
                                  path="ar/revenue-recognition"
                                  element={<RevenueRecognition />}
                                />
                                <Route path="ar/masters" element={<ARMasters />} />
                                <Route path="ar/reports" element={<ARReports />} />

                                {/* Procurement - PR */}
                                <Route
                                  path="procurement/intake"
                                  element={<Navigate to="/procurement/pr/create" replace />}
                                />
                                <Route path="procurement/pr/create" element={<PRTypeSelection />} />
                                <Route
                                  path="procurement/pr/create/catalogue"
                                  element={<CataloguePRForm />}
                                />
                                <Route
                                  path="procurement/pr/create/regular"
                                  element={<RegularPRForm />}
                                />
                                <Route
                                  path="procurement/pr/create/kit-bundle"
                                  element={<KitBundlePRForm />}
                                />
                                <Route
                                  path="procurement/pr/create/service"
                                  element={<ServicePRForm />}
                                />
                                <Route
                                  path="procurement/pr/create/asset-capex"
                                  element={<AssetCapexPRForm />}
                                />
                                <Route
                                  path="procurement/pr/create/blanket"
                                  element={<BlanketPRForm />}
                                />
                                <Route path="procurement/pr/my-prs" element={<MyPRs />} />
                                <Route path="procurement/pr/approvals" element={<PRApprovals />} />
                                <Route path="procurement/pr/reports" element={<PRReports />} />
                                <Route path="procurement/pr/listing" element={<PRListing />} />
                                <Route
                                  path="procurement/pr/detail/:id"
                                  element={<PRDetailView />}
                                />
                                <Route
                                  path="procurement/pr/approvals-inbox"
                                  element={<PRApprovalsInbox />}
                                />
                                <Route
                                  path="procurement/pr/to-po-conversion"
                                  element={<PRtoPOConversion />}
                                />
                                <Route
                                  path="procurement/pr/to-po-conversion-enhanced"
                                  element={<PRtoPOConversionEnhanced />}
                                />
                                <Route
                                  path="procurement/po/creation-hub"
                                  element={<POCreationHub />}
                                />

                                {/* Catch-all 404 */}
                                <Route path="*" element={<NotFound />} />
                              </Route>

                              {/* Top-level catch-all for paths outside DashboardLayout */}
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </Suspense>
                        </ErrorBoundary>
                      </DashboardDataProvider>
                    </BudgetDataProvider>
                  </ProcurementDataProvider>
                </APDataProvider>
              </VendorInvitationProvider>
            </PortalUsersProvider>
          </MasterDataProvider>
        </FinanceRBACProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
