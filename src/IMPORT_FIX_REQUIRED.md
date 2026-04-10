# React Router Import Fix Required

## Problem
77 files are importing from 'react-router' instead of 'react-router-dom', breaking the Router context.

## Solution
Replace ALL occurrences of:
```typescript
from 'react-router'
```

With:
```typescript
from 'react-router-dom'
```

## Files to Fix (77 total)

### /components directory:
1. /components/Vendors.tsx:3
2. /components/Reports.tsx:2  
3. /components/CreatePurchaseOrder.tsx:3
4. /components/POUpdate.tsx:3
5. /components/CreateVendor.tsx:3
6. /components/CategoryMaster.tsx:2
7. /components/ItemMaster.tsx:2
8. /components/ProductMaster.tsx:2
9. /components/ColorMaster.tsx:2
10. /components/SKUMaster.tsx:2
11. /components/SizeMaster.tsx:2
12. /components/ApprovalWorkflow.tsx:2
13. /components/ContractMaster.tsx:2
14. /components/CountryMaster.tsx:2
15. /components/StateMaster.tsx:2
16. /components/TaxCodeMaster.tsx:2
17. /components/EmployeeMaster.tsx:2
18. /components/DepartmentMaster.tsx:2
19. /components/AuditTrailReport.tsx:3
20. /components/ProcurementHeadDesk.tsx:3
21. /components/CFODesk.tsx:3
22. /components/ManagementDesk.tsx:3
23. /components/CostCentreMaster.tsx:2
24. /components/ProfitCentreMaster.tsx:2
25. /components/OperationalDashboard.tsx:7
26. /components/WorkflowReport.tsx:2
27. /components/InvoiceForm.tsx:2
28. /components/Invoices.tsx:2
29. /components/AIInvoiceCapture.tsx:2
30. /components/InvoiceDetail.tsx:2
31. /components/PaymentsDashboard.tsx:2
32. /components/PaymentApproval.tsx:2
33. /components/PaymentBatches.tsx:2
34. /components/MSMEPaymentDashboard.tsx:2
35. /components/InvoiceFormPO.tsx:2
36. /components/AdvanceRequestForm.tsx:2
37. /components/AdvanceRequests.tsx:2
38. /components/AdvancePaymentQueue.tsx:2
39. /components/AdvanceUtilization.tsx:2
40. /components/AdvancesHub.tsx:1
41. /components/BudgetPlanningCreation.tsx:2
42. /components/BudgetPhasing.tsx:2
43. /components/BudgetApprovalWorkflow.tsx:2
44. /components/BudgetConsumptionControl.tsx:2
45. /components/InterimRevisedBudgets.tsx:2
46. /components/BudgetTransfers.tsx:2
47. /components/WhatIfScenarios.tsx:2
48. /components/BudgetDashboard.tsx:2
49. /components/BudgetPolicies.tsx:2
50. /components/EnterpriseFinanceNavigationV2.tsx:2
51. /components/POInvoicePolicyConfig.tsx:3
52. /components/POInvoiceValidationDemo.tsx:2
53. /components/InvoiceUploadOCR.tsx:2
54. /components/MyInvoices.tsx:2
55. /components/InvoiceWorkflowView.tsx:2
56. /components/InvoicesForApproval.tsx:2
57. /components/InvoiceApprovalScreen.tsx:2
58. /components/ReadyForPayment.tsx:2
59. /components/APDashboard.tsx:2
60. /components/APReports.tsx:2
61. /components/InvoiceApprovalScreenV2.tsx:2
62. /components/NonPOInvoiceForm.tsx:2
63. /components/NonPOInvoiceApprovalScreen.tsx:2
64. /components/GlobalApprovalsDashboard.tsx:2

### /components/procurement directory:
65. /components/procurement/PRTypeSelection.tsx:1
66. /components/procurement/CataloguePRForm.tsx:3
67. /components/procurement/MyPRs.tsx:3
68. /components/procurement/KitBundlePRForm.tsx:3
69. /components/procurement/RegularPRForm.tsx:3
70. /components/procurement/ServicePRForm.tsx:3
71. /components/procurement/AssetCapexPRForm.tsx:3
72. /components/procurement/BlanketPRForm.tsx:3
73. /components/procurement/PRListing.tsx:3
74. /components/procurement/PRDetailView.tsx:2
75. /components/procurement/PRApprovalsInbox.tsx:3
76. /components/procurement/POCreationHub.tsx:2
77. /components/procurement/PRtoPOConversionEnhanced.tsx:2

## Manual Fix Command (Unix/Linux/Mac):
```bash
find ./components -name "*.tsx" -type f -exec sed -i '' "s/from 'react-router'/from 'react-router-dom'/g" {} +
find ./components -name "*.ts" -type f -exec sed -i '' "s/from 'react-router'/from 'react-router-dom'/g" {} +
```

## Manual Fix Command (Windows PowerShell):
```powershell
Get-ChildItem -Path ./components -Filter *.tsx -Recurse | ForEach-Object {
  (Get-Content $_.FullName) -replace "from 'react-router'", "from 'react-router-dom'" | Set-Content $_.FullName
}
Get-ChildItem -Path ./components -Filter *.ts -Recurse | ForEach-Object {
  (Get-Content $_.FullName) -replace "from 'react-router'", "from 'react-router-dom'" | Set-Content $_.FullName
}
```

## Critical Path Files (Fix These First):
These are in the initial render path and must be fixed immediately:
- /components/Login.tsx ✅ FIXED
- /components/DashboardLayout.tsx ✅ FIXED  
- /components/SubkoCoffeeNavigation.tsx ✅ FIXED
- /components/Header.tsx ✅ FIXED
- /components/Dashboard.tsx ✅ NO ROUTER HOOKS
- /components/FinanceNavigation.tsx ✅ FIXED
- /components/RBACNavigation.tsx ✅ FIXED
- /components/PermissionBasedNavigation.tsx ✅ FIXED
- /components/EnterpriseFinanceNavigation.tsx ✅ FIXED
- /components/PurchaseOrders.tsx ✅ FIXED
- /components/Vendors.tsx ✅ FIXED
- /components/Reports.tsx ✅ FIXED

## Why This Error Occurs:
When React loads the component tree, it imports modules. If ANY imported module tries to use a Router hook (like `useNavigate()`) with the wrong import ('react-router' instead of 'react-router-dom'), it creates a module mismatch that breaks the Router context chain, even if the root Router setup is correct.

## Next Steps:
Use the manual fix commands above to batch-fix all remaining files at once.
