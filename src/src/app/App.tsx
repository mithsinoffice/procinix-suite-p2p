/**
 * Main Application Entry Point
 * React + TypeScript Production-Ready Codebase
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Context Providers
import { AuthProvider } from '../contexts/AuthContext';
import { FinanceRBACProvider } from '../contexts/FinanceRBACContext';
import { MasterDataProvider } from '../contexts/MasterDataContext';
import { APDataProvider } from '../contexts/APDataContext';
import { BudgetDataProvider } from '../contexts/BudgetDataContext';
import { DashboardDataProvider } from '../contexts/DashboardDataContext';

// Layouts
import { DashboardLayout } from '../layouts/DashboardLayout';

// Pages
import { Login } from '../pages/auth/Login';
import { Dashboard } from '../pages/dashboard/Dashboard';

// Procurement Pages
import { PurchaseOrders } from '../pages/procurement/PurchaseOrders';
import { CreatePurchaseOrder } from '../pages/procurement/CreatePurchaseOrder';
import { PRSelectionPage } from '../pages/procurement/PRSelectionPage';
import { POUpdate } from '../pages/procurement/POUpdate';
import { GoodsReceipt } from '../pages/procurement/GoodsReceipt';
import { PRTypeSelection } from '../pages/procurement/PRTypeSelection';
import { CataloguePRForm } from '../pages/procurement/CataloguePRForm';
import { RegularPRForm } from '../pages/procurement/RegularPRForm';
import { KitBundlePRForm } from '../pages/procurement/KitBundlePRForm';
import { ServicePRForm } from '../pages/procurement/ServicePRForm';
import { AssetCapexPRForm } from '../pages/procurement/AssetCapexPRForm';
import { BlanketPRForm } from '../pages/procurement/BlanketPRForm';
import { MyPRs } from '../pages/procurement/MyPRs';
import { PRApprovals } from '../pages/procurement/PRApprovals';
import { PRReports } from '../pages/procurement/PRReports';
import { PRListing } from '../pages/procurement/PRListing';
import { PRDetailView } from '../pages/procurement/PRDetailView';
import { PRApprovalsInbox } from '../pages/procurement/PRApprovalsInbox';
import { PRtoPOConversion } from '../pages/procurement/PRtoPOConversion';
import { PRtoPOConversionEnhanced } from '../pages/procurement/PRtoPOConversionEnhanced';
import { POCreationHub } from '../pages/procurement/POCreationHub';

// Vendor Pages
import { Vendors } from '../pages/vendors/Vendors';
import { CreateVendor } from '../pages/vendors/CreateVendor';

// Invoice Pages
import { Invoices } from '../pages/invoices/Invoices';
import { InvoiceFormPO } from '../pages/invoices/InvoiceFormPO';
import { InvoiceFormDirect } from '../pages/invoices/InvoiceFormDirect';
import { AIInvoiceCapture } from '../pages/invoices/AIInvoiceCapture';
import { InvoiceDetail } from '../pages/invoices/InvoiceDetail';
import { MyInvoices } from '../pages/invoices/MyInvoices';
import { InvoiceWorkflowView } from '../pages/invoices/InvoiceWorkflowView';
import { InvoicesForApproval } from '../pages/invoices/InvoicesForApproval';
import { InvoiceApprovalScreenV2 } from '../pages/invoices/InvoiceApprovalScreenV2';
import { ReadyForPayment } from '../pages/invoices/ReadyForPayment';
import { NonPOInvoiceForm } from '../pages/invoices/NonPOInvoiceForm';
import { NonPOInvoiceApprovalScreen } from '../pages/invoices/NonPOInvoiceApprovalScreen';

// Debit Note Pages
import { DebitNotes } from '../pages/debit-notes/DebitNotes';
import { DebitNoteFormV2Enhanced } from '../pages/debit-notes/DebitNoteFormV2Enhanced';
import { DebitNoteDetail } from '../pages/debit-notes/DebitNoteDetail';

// Payment Pages
import { PaymentsDashboard } from '../pages/payments/PaymentsDashboard';
import { PaymentProposal } from '../pages/payments/PaymentProposal';
import { PaymentBatches } from '../pages/payments/PaymentBatches';
import { PaymentApproval } from '../pages/payments/PaymentApproval';
import { PaymentAgingDashboard } from '../pages/payments/PaymentAgingDashboard';
import { BankIntegrationManagement } from '../pages/payments/BankIntegrationManagement';
import { PaymentAuditTrail } from '../pages/payments/PaymentAuditTrail';
import { AISuggestedPaymentBatch } from '../pages/payments/AISuggestedPaymentBatch';
import { MSMEPaymentDashboard } from '../pages/payments/MSMEPaymentDashboard';

// Advance Pages
import { AdvancesHub } from '../pages/advances/AdvancesHub';
import { AdvanceRequests } from '../pages/advances/AdvanceRequests';
import { AdvanceRequestForm } from '../pages/advances/AdvanceRequestForm';
import { AdvancePaymentQueue } from '../pages/advances/AdvancePaymentQueue';
import { AdvanceUtilization } from '../pages/advances/AdvanceUtilization';

// Budget Pages
import { BudgetDashboard } from '../pages/budget/BudgetDashboard';
import { BudgetPlanningCreation } from '../pages/budget/BudgetPlanningCreation';
import { BudgetPhasing } from '../pages/budget/BudgetPhasing';
import { BudgetApprovalWorkflow } from '../pages/budget/BudgetApprovalWorkflow';
import { BudgetConsumptionControl } from '../pages/budget/BudgetConsumptionControl';
import { InterimRevisedBudgets } from '../pages/budget/InterimRevisedBudgets';
import { BudgetTransfers } from '../pages/budget/BudgetTransfers';
import { WhatIfScenarios } from '../pages/budget/WhatIfScenarios';
import { BudgetPolicies } from '../pages/budget/BudgetPolicies';
import { POInvoicePolicyConfig } from '../pages/budget/POInvoicePolicyConfig';
import { POInvoiceValidationDemo } from '../pages/budget/POInvoiceValidationDemo';

// Master Data Pages
import { Masters } from '../pages/masters/Masters';
import { ApprovalWorkflow } from '../pages/masters/ApprovalWorkflow';
import { CategoryMaster } from '../pages/masters/CategoryMaster';
import { ItemMaster } from '../pages/masters/ItemMaster';
import { ProductMaster } from '../pages/masters/ProductMaster';
import { ColorMaster } from '../pages/masters/ColorMaster';
import { SizeMaster } from '../pages/masters/SizeMaster';
import { SKUMaster } from '../pages/masters/SKUMaster';
import { ContractMaster } from '../pages/masters/ContractMaster';
import { CountryMaster } from '../pages/masters/CountryMaster';
import { StateMaster } from '../pages/masters/StateMaster';
import { TaxCodeMaster } from '../pages/masters/TaxCodeMaster';
import { EmployeeMaster } from '../pages/masters/EmployeeMaster';
import { DepartmentMaster } from '../pages/masters/DepartmentMaster';
import { CostCentreMaster } from '../pages/masters/CostCentreMaster';
import { ProfitCentreMaster } from '../pages/masters/ProfitCentreMaster';
import { EntityMaster } from '../pages/masters/EntityMaster';
import { CurrencyMaster } from '../pages/masters/CurrencyMaster';
import { ExchangeRateMaster } from '../pages/masters/ExchangeRateMaster';
import { UserMaster } from '../pages/masters/UserMaster';
import { RolesMaster } from '../pages/masters/RolesMaster';
import { AccessPrivilege } from '../pages/masters/AccessPrivilege';
import { WorkflowConfigurator } from '../pages/masters/WorkflowConfigurator';
import { UOMMaster } from '../pages/masters/UOMMaster';
import { DebitNoteReasonMaster } from '../pages/masters/DebitNoteReasonMaster';
import { ItemCategoryMaster } from '../pages/masters/ItemCategoryMaster';
import { VendorPaymentTermsMaster } from '../pages/masters/VendorPaymentTermsMaster';

// Report Pages
import { Reports } from '../pages/reports/Reports';
import { AuditTrailReport } from '../pages/reports/AuditTrailReport';
import { OperationalDashboard } from '../pages/reports/OperationalDashboard';
import { ProcurementHeadDesk } from '../pages/reports/ProcurementHeadDesk';
import { CFODesk } from '../pages/reports/CFODesk';
import { ManagementDesk } from '../pages/reports/ManagementDesk';
import { WorkflowReport } from '../pages/reports/WorkflowReport';
import { APDashboard } from '../pages/reports/APDashboard';
import { APReports } from '../pages/reports/APReports';

// Dashboard Pages
import { DashboardsHub } from '../pages/dashboard/DashboardsHub';
import { GlobalApprovalsDashboard } from '../pages/dashboard/GlobalApprovalsDashboard';

// Quick Actions
import { QuickCreate } from '../pages/QuickCreate';

// Audit & RBAC
import { AuditLog } from '../pages/audit/AuditLog';
import { FinanceRBACDemo } from '../pages/audit/FinanceRBACDemo';
import { RolePermissionMatrix } from '../pages/audit/RolePermissionMatrix';

// Cash Flow Pages
import { CashPosition } from '../pages/cashflow/CashPosition';
import { WeekForecast13 } from '../pages/cashflow/WeekForecast13';
import { MonthlyAnnualForecast } from '../pages/cashflow/MonthlyAnnualForecast';
import { HybridReconciliation } from '../pages/cashflow/HybridReconciliation';
import { ScenarioBuilder } from '../pages/cashflow/ScenarioBuilder';
import { AIActions } from '../pages/cashflow/AIActions';
import { VarianceExplainability } from '../pages/cashflow/VarianceExplainability';
import { CashFlowReports } from '../pages/cashflow/CashFlowReports';
import { CashFlowSettings } from '../pages/cashflow/CashFlowSettings';

// AR Pages
import { Customers } from '../pages/ar/Customers';
import { SalesInvoices } from '../pages/ar/SalesInvoices';
import { Collections } from '../pages/ar/Collections';
import { CreditNotes } from '../pages/ar/CreditNotes';
import { RevenueRecognition } from '../pages/ar/RevenueRecognition';
import { ARMasters } from '../pages/ar/ARMasters';
import { ARReports } from '../pages/ar/ARReports';

// Settings
import { Settings } from '../pages/Settings';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <FinanceRBACProvider>
          <MasterDataProvider>
            <APDataProvider>
              <BudgetDataProvider>
                <DashboardDataProvider>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<DashboardLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="dashboard" element={<Dashboard />} />
                      <Route path="dashboards" element={<DashboardsHub />} />
                      
                      {/* Purchase Orders */}
                      <Route path="purchase-orders" element={<PurchaseOrders />} />
                      <Route path="purchase-orders/create" element={<CreatePurchaseOrder />} />
                      <Route path="purchase-orders/create-from-pr" element={<PRSelectionPage />} />
                      <Route path="purchase-orders/update/:id" element={<POUpdate />} />
                      <Route path="goods-receipt" element={<GoodsReceipt />} />
                      
                      {/* Vendors */}
                      <Route path="vendors" element={<Vendors />} />
                      <Route path="add-vendor" element={<CreateVendor />} />
                      
                      {/* Reports */}
                      <Route path="reports" element={<Reports />} />
                      <Route path="reports/audit-trail" element={<AuditTrailReport />} />
                      <Route path="reports/operational-dashboard" element={<OperationalDashboard />} />
                      <Route path="reports/procurement-head-desk" element={<ProcurementHeadDesk />} />
                      <Route path="reports/cfo-desk" element={<CFODesk />} />
                      <Route path="reports/management-desk" element={<ManagementDesk />} />
                      <Route path="reports/workflow-report" element={<WorkflowReport />} />
                      
                      {/* Masters */}
                      <Route path="masters" element={<Masters />} />
                      <Route path="masters/approval-workflow" element={<ApprovalWorkflow />} />
                      <Route path="masters/category-master" element={<CategoryMaster />} />
                      <Route path="masters/item-master" element={<ItemMaster />} />
                      <Route path="masters/product-master" element={<ProductMaster />} />
                      <Route path="masters/color-master" element={<ColorMaster />} />
                      <Route path="masters/size-master" element={<SizeMaster />} />
                      <Route path="masters/sku-master" element={<SKUMaster />} />
                      <Route path="masters/contract-master" element={<ContractMaster />} />
                      <Route path="masters/country-master" element={<CountryMaster />} />
                      <Route path="masters/state-master" element={<StateMaster />} />
                      <Route path="masters/tax-code-master" element={<TaxCodeMaster />} />
                      <Route path="masters/employee-master" element={<EmployeeMaster />} />
                      <Route path="masters/department-master" element={<DepartmentMaster />} />
                      <Route path="masters/cost-centre-master" element={<CostCentreMaster />} />
                      <Route path="masters/profit-centre-master" element={<ProfitCentreMaster />} />
                      <Route path="masters/entity-master" element={<EntityMaster />} />
                      <Route path="masters/currency-master" element={<CurrencyMaster />} />
                      <Route path="masters/exchange-rate-master" element={<ExchangeRateMaster />} />
                      <Route path="masters/user-master" element={<UserMaster />} />
                      <Route path="masters/roles-master" element={<RolesMaster />} />
                      <Route path="masters/access-privilege" element={<AccessPrivilege />} />
                      <Route path="masters/workflow-configurator" element={<WorkflowConfigurator />} />
                      <Route path="masters/uom-master" element={<UOMMaster />} />
                      <Route path="masters/debit-note-reason-master" element={<DebitNoteReasonMaster />} />
                      <Route path="masters/item-category-master" element={<ItemCategoryMaster />} />
                      <Route path="masters/vendor-payment-terms-master" element={<VendorPaymentTermsMaster />} />
                      
                      {/* Invoices */}
                      <Route path="invoices" element={<Invoices />} />
                      <Route path="invoices/create" element={<InvoiceFormPO />} />
                      <Route path="invoices/create-po" element={<InvoiceFormPO />} />
                      <Route path="invoices/create-direct" element={<InvoiceFormDirect />} />
                      <Route path="invoices/ai-capture" element={<AIInvoiceCapture />} />
                      <Route path="invoices/detail/:id" element={<InvoiceDetail />} />
                      <Route path="invoices/edit/:id" element={<InvoiceFormPO />} />
                      
                      {/* Approvals */}
                      <Route path="approval-dashboard" element={<GlobalApprovalsDashboard />} />
                      <Route path="approvals" element={<GlobalApprovalsDashboard />} />
                      <Route path="create" element={<QuickCreate />} />
                      <Route path="quick-create" element={<QuickCreate />} />
                      <Route path="tasks" element={<Navigate to="/create" replace />} />
                      <Route path="my-tasks" element={<Navigate to="/create" replace />} />
                      
                      {/* Navigation Redirects */}
                      <Route path="procurement/pr" element={<Navigate to="/procurement/pr/listing" replace />} />
                      <Route path="procurement/po" element={<Navigate to="/purchase-orders" replace />} />
                      <Route path="procurement/grn" element={<Navigate to="/goods-receipt" replace />} />
                      <Route path="ap/invoices" element={<Navigate to="/invoices" replace />} />
                      
                      {/* Debit Notes */}
                      <Route path="ap/debit-notes" element={<DebitNotes />} />
                      <Route path="ap/debit-notes/create" element={<DebitNoteFormV2Enhanced />} />
                      <Route path="ap/debit-notes/edit/:id" element={<DebitNoteFormV2Enhanced />} />
                      <Route path="ap/debit-notes/detail/:id" element={<DebitNoteDetail />} />
                      
                      {/* Audit & RBAC */}
                      <Route path="audit-log" element={<AuditLog />} />
                      <Route path="audit-logs" element={<AuditLog />} />
                      <Route path="rbac-demo" element={<FinanceRBACDemo />} />
                      <Route path="role-permission-matrix" element={<RolePermissionMatrix />} />
                      
                      {/* Payments */}
                      <Route path="payments-dashboard" element={<PaymentsDashboard />} />
                      <Route path="ap/payments" element={<PaymentsDashboard />} />
                      <Route path="ap/payment-proposal" element={<PaymentProposal />} />
                      <Route path="ap/payment-batches" element={<PaymentBatches />} />
                      <Route path="ap/payment-batches/:id" element={<PaymentApproval />} />
                      <Route path="ap/payment-aging-dashboard" element={<PaymentAgingDashboard />} />
                      <Route path="ap/bank-integration-management" element={<BankIntegrationManagement />} />
                      <Route path="ap/payment-audit-trail" element={<PaymentAuditTrail />} />
                      <Route path="ap/ai-suggested-payment-batch" element={<AISuggestedPaymentBatch />} />
                      <Route path="ap/msme-payment-dashboard" element={<MSMEPaymentDashboard />} />
                      
                      {/* Advances */}
                      <Route path="ap/advances" element={<AdvancesHub />} />
                      <Route path="ap/advance-requests" element={<AdvanceRequests />} />
                      <Route path="ap/advance-request-form" element={<AdvanceRequestForm />} />
                      <Route path="ap/advance-payment-queue" element={<AdvancePaymentQueue />} />
                      <Route path="ap/advance-utilization" element={<AdvanceUtilization />} />
                      <Route path="advances" element={<Navigate to="/ap/advances" replace />} />
                      <Route path="advances/create" element={<Navigate to="/ap/advance-request-form" replace />} />
                      <Route path="advances/requests" element={<Navigate to="/ap/advance-requests" replace />} />
                      <Route path="advances/payment-queue" element={<Navigate to="/ap/advance-payment-queue" replace />} />
                      <Route path="advances/utilization" element={<Navigate to="/ap/advance-utilization" replace />} />
                      <Route path="advances/hub" element={<Navigate to="/ap/advances" replace />} />
                      <Route path="advances/edit/:id" element={<Navigate to="/ap/advance-request-form" replace />} />
                      
                      {/* Settings */}
                      <Route path="settings" element={<Settings />} />
                      
                      {/* Budget */}
                      <Route path="budget-dashboard" element={<BudgetDashboard />} />
                      <Route path="budget-planning-creation" element={<BudgetPlanningCreation />} />
                      <Route path="budget-phasing" element={<BudgetPhasing />} />
                      <Route path="budget-approval-workflow" element={<BudgetApprovalWorkflow />} />
                      <Route path="budget-consumption-control" element={<BudgetConsumptionControl />} />
                      <Route path="interim-revised-budgets" element={<InterimRevisedBudgets />} />
                      <Route path="budget-transfers" element={<BudgetTransfers />} />
                      <Route path="what-if-scenarios" element={<WhatIfScenarios />} />
                      <Route path="budget-policies" element={<BudgetPolicies />} />
                      <Route path="po-invoice-policy-config" element={<POInvoicePolicyConfig />} />
                      <Route path="po-invoice-validation-demo" element={<POInvoiceValidationDemo />} />
                      <Route path="budgeting/budgets" element={<BudgetDashboard />} />
                      <Route path="budgeting/create" element={<BudgetPlanningCreation />} />
                      <Route path="budgeting/phasing" element={<BudgetPhasing />} />
                      <Route path="budgeting/approval-workflow" element={<BudgetApprovalWorkflow />} />
                      <Route path="budgeting/consumption" element={<BudgetConsumptionControl />} />
                      <Route path="budgeting/revisions" element={<InterimRevisedBudgets />} />
                      <Route path="budgeting/transfers" element={<BudgetTransfers />} />
                      <Route path="budgeting/scenarios" element={<WhatIfScenarios />} />
                      <Route path="budgeting/policies" element={<BudgetPolicies />} />
                      <Route path="budgeting/budget/:id" element={<BudgetConsumptionControl />} />
                      
                      {/* AP Additional */}
                      <Route path="ap/my-invoices" element={<MyInvoices />} />
                      <Route path="ap/invoice-workflow/:id" element={<InvoiceWorkflowView />} />
                      <Route path="ap/invoices-for-approval" element={<InvoicesForApproval />} />
                      <Route path="ap/invoice-approval/:id" element={<InvoiceApprovalScreenV2 />} />
                      <Route path="ap/ready-for-payment" element={<ReadyForPayment />} />
                      <Route path="ap/dashboard" element={<APDashboard />} />
                      <Route path="ap/reports" element={<APReports />} />
                      <Route path="ap/non-po-invoice-form" element={<NonPOInvoiceForm />} />
                      <Route path="ap/non-po-invoice-approval/:id" element={<NonPOInvoiceApprovalScreen />} />
                      
                      {/* Cash Flow */}
                      <Route path="r2r/cash-flow" element={<Navigate to="/r2r/cash-flow/position" replace />} />
                      <Route path="r2r/cash-flow/position" element={<CashPosition />} />
                      <Route path="r2r/cash-flow/13-week-forecast" element={<WeekForecast13 />} />
                      <Route path="r2r/cash-flow/monthly-annual-forecast" element={<MonthlyAnnualForecast />} />
                      <Route path="r2r/cash-flow/hybrid-reconciliation" element={<HybridReconciliation />} />
                      <Route path="r2r/cash-flow/scenario-builder" element={<ScenarioBuilder />} />
                      <Route path="r2r/cash-flow/ai-actions" element={<AIActions />} />
                      <Route path="r2r/cash-flow/variance-explainability" element={<VarianceExplainability />} />
                      <Route path="r2r/cash-flow/reports" element={<CashFlowReports />} />
                      <Route path="r2r/cash-flow/settings" element={<CashFlowSettings />} />
                      
                      {/* AR */}
                      <Route path="ar/customers" element={<Customers />} />
                      <Route path="ar/sales-invoices" element={<SalesInvoices />} />
                      <Route path="ar/collections" element={<Collections />} />
                      <Route path="ar/credit-notes" element={<CreditNotes />} />
                      <Route path="ar/revenue-recognition" element={<RevenueRecognition />} />
                      <Route path="ar/masters" element={<ARMasters />} />
                      <Route path="ar/reports" element={<ARReports />} />
                      
                      {/* Procurement - PR */}
                      <Route path="procurement/intake" element={<Navigate to="/procurement/pr/create" replace />} />
                      <Route path="procurement/pr/create" element={<PRTypeSelection />} />
                      <Route path="procurement/pr/create/catalogue" element={<CataloguePRForm />} />
                      <Route path="procurement/pr/create/regular" element={<RegularPRForm />} />
                      <Route path="procurement/pr/create/kit-bundle" element={<KitBundlePRForm />} />
                      <Route path="procurement/pr/create/service" element={<ServicePRForm />} />
                      <Route path="procurement/pr/create/asset-capex" element={<AssetCapexPRForm />} />
                      <Route path="procurement/pr/create/blanket" element={<BlanketPRForm />} />
                      <Route path="procurement/pr/my-prs" element={<MyPRs />} />
                      <Route path="procurement/pr/approvals" element={<PRApprovals />} />
                      <Route path="procurement/pr/reports" element={<PRReports />} />
                      <Route path="procurement/pr/listing" element={<PRListing />} />
                      <Route path="procurement/pr/detail/:id" element={<PRDetailView />} />
                      <Route path="procurement/pr/approvals-inbox" element={<PRApprovalsInbox />} />
                      <Route path="procurement/pr/to-po-conversion" element={<PRtoPOConversion />} />
                      <Route path="procurement/pr/to-po-conversion-enhanced" element={<PRtoPOConversionEnhanced />} />
                      <Route path="procurement/po/creation-hub" element={<POCreationHub />} />
                    </Route>
                  </Routes>
                </DashboardDataProvider>
              </BudgetDataProvider>
            </APDataProvider>
          </MasterDataProvider>
        </FinanceRBACProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
