import {
  LayoutDashboard,
  ShoppingCart,
  CreditCard,
  Users,
  Package,
  Search,
  PieChart,
  Building2,
  FileText,
  FolderTree,
  BarChart3,
  Wallet,
  Receipt,
  DollarSign,
  FileX,
  TrendingUp,
  BookOpen,
  Calendar,
  FileSpreadsheet,
  Layers,
  Banknote,
  GitCompare,
  CheckCircle,
  ListTodo,
  History,
  Settings,
  Clock,
  Activity,
  PackageCheck,
  FilePlus,
  Sparkles,
  FileEdit,
  Briefcase,
  UserPlus,
  Shield,
  LockKeyhole,
  Zap,
  ArrowUpCircle,
  HandCoins,
  TrendingDown,
  Eye,
  GitBranch,
  ClipboardCheck,
  ArrowRightCircle,
  Wallet as WalletIcon,
  LineChart,
  AlertTriangle,
  Target,
  Calculator,
  Repeat,
  FileBarChart,
  UserCheck,
  FileInput,
  Phone,
  FileMinus,
  TrendingUpDown,
  Database,
  Workflow,
  ArrowLeftRight,
} from 'lucide-react';

export interface FinanceNavModule {
  key: string;
  label: string;
  route: string;
  icon: any;
  requiredPerm: string[]; // Must have at least one of these permissions
  submodules?: FinanceNavModule[]; // Optional submodules
}

export interface FinanceNavPillar {
  key: string;
  label: string;
  icon: any;
  modules: FinanceNavModule[];
}

export interface GlobalNavItem {
  key: string;
  label: string;
  route: string;
  icon: any;
  requiredPerm: string[];
  badge?: number;
}

export const financeNavigationConfig: { pillars: FinanceNavPillar[] } = {
  pillars: [
    {
      key: 'AP',
      label: 'AP Automation',
      icon: ShoppingCart,
      modules: [
        {
          key: 'PROCUREMENT',
          label: 'Procurement',
          route: '/purchase-orders',
          icon: ShoppingCart,
          requiredPerm: ['PROCUREMENT.VIEW', 'PROCUREMENT.CREATE'],
          submodules: [
            {
              key: 'PURCHASE_ORDERS',
              label: 'Purchase Orders',
              route: '/purchase-orders',
              icon: FileText,
              requiredPerm: ['PROCUREMENT.VIEW']
            },
            {
              key: 'CREATE_PO',
              label: 'Create PO',
              route: '/procurement/po/creation-hub',
              icon: FilePlus,
              requiredPerm: ['PROCUREMENT.CREATE'],
              submodules: [
                {
                  key: 'PO_CREATION_HUB',
                  label: 'PO Creation Hub',
                  route: '/procurement/po/creation-hub',
                  icon: Workflow,
                  requiredPerm: ['PROCUREMENT.CREATE']
                },
                {
                  key: 'PO_WITH_PR',
                  label: 'PO with PR',
                  route: '/procurement/pr/to-po-conversion-enhanced',
                  icon: ArrowLeftRight,
                  requiredPerm: ['PROCUREMENT.CREATE']
                },
                {
                  key: 'PO_WITHOUT_PR',
                  label: 'PO without PR',
                  route: '/purchase-orders/create',
                  icon: FileText,
                  requiredPerm: ['PROCUREMENT.CREATE']
                }
              ]
            },
            {
              key: 'GOODS_RECEIPT',
              label: 'Goods Receipt',
              route: '/goods-receipt',
              icon: PackageCheck,
              requiredPerm: ['PROCUREMENT.VIEW', 'PROCUREMENT.APPROVE']
            },
            {
              key: 'INTAKE_PR',
              label: 'Intake (PR)',
              route: '/procurement/pr/create',
              icon: FileInput,
              requiredPerm: ['PROCUREMENT.VIEW', 'PROCUREMENT.CREATE'],
              submodules: [
                {
                  key: 'CREATE_PR',
                  label: 'Create PR',
                  route: '/procurement/pr/create',
                  icon: FilePlus,
                  requiredPerm: ['PROCUREMENT.CREATE']
                },
                {
                  key: 'MY_PRS',
                  label: 'My PRs',
                  route: '/procurement/pr/my-prs',
                  icon: FileText,
                  requiredPerm: ['PROCUREMENT.VIEW']
                },
                {
                  key: 'PR_APPROVALS',
                  label: 'PR Approvals',
                  route: '/procurement/pr/approvals',
                  icon: CheckCircle,
                  requiredPerm: ['PROCUREMENT.APPROVE']
                },
                {
                  key: 'PR_REPORTS',
                  label: 'PR Reports',
                  route: '/procurement/pr/reports',
                  icon: BarChart3,
                  requiredPerm: ['REPORTS.VIEW']
                }
              ]
            },
            {
              key: 'PROCUREMENT_INSIGHTS',
              label: 'Procurement Insights',
              route: '/reports/procurement-head-desk',
              icon: BarChart3,
              requiredPerm: ['REPORTS.VIEW'],
              submodules: [
                {
                  key: 'OPERATIONAL_DASHBOARD',
                  label: 'Operational Dashboard',
                  route: '/reports/operational-dashboard',
                  icon: LayoutDashboard,
                  requiredPerm: ['REPORTS.VIEW']
                },
                {
                  key: 'PROCUREMENT_HEAD_DESK',
                  label: 'Procurement Head Desk',
                  route: '/reports/procurement-head-desk',
                  icon: Briefcase,
                  requiredPerm: ['REPORTS.VIEW']
                },
                {
                  key: 'WORKFLOW_REPORT',
                  label: 'Workflow Report',
                  route: '/reports/workflow-report',
                  icon: Activity,
                  requiredPerm: ['REPORTS.VIEW']
                },
                {
                  key: 'CFO_DESK',
                  label: 'CFO Desk',
                  route: '/reports/cfo-desk',
                  icon: TrendingUp,
                  requiredPerm: ['REPORTS.VIEW']
                },
                {
                  key: 'MANAGEMENT_DESK',
                  label: 'Management Desk',
                  route: '/reports/management-desk',
                  icon: BarChart3,
                  requiredPerm: ['REPORTS.VIEW']
                }
              ]
            }
          ]
        },
        {
          key: 'ACCOUNTS_PAYABLE',
          label: 'Accounts Payable',
          route: '/invoices',
          icon: CreditCard,
          requiredPerm: ['AP_INVOICE.VIEW', 'AP_INVOICE.CREATE'],
          submodules: [
            {
              key: 'AP_DASHBOARD',
              label: 'AP Command Center',
              route: '/ap/dashboard',
              icon: LayoutDashboard,
              requiredPerm: ['AP_INVOICE.VIEW', 'REPORTS.VIEW']
            },
            {
              key: 'INVOICES_LIST',
              label: 'Invoices',
              route: '/invoices',
              icon: Receipt,
              requiredPerm: ['AP_INVOICE.VIEW']
            },
            {
              key: 'MY_INVOICES',
              label: 'My Invoices',
              route: '/ap/my-invoices',
              icon: Eye,
              requiredPerm: ['AP_INVOICE.VIEW']
            },
            {
              key: 'CREATE_INVOICE',
              label: 'Create Invoice',
              route: '/invoices/create',
              icon: FilePlus,
              requiredPerm: ['AP_INVOICE.CREATE']
            },
            {
              key: 'AI_CAPTURE',
              label: 'AI Invoice Capture',
              route: '/invoices/ai-capture',
              icon: Sparkles,
              requiredPerm: ['AP_INVOICE.CREATE']
            },
            {
              key: 'INVOICES_FOR_APPROVAL',
              label: 'Invoices for Approval',
              route: '/ap/invoices-for-approval',
              icon: ClipboardCheck,
              requiredPerm: ['AP_INVOICE.APPROVE']
            },
            {
              key: 'READY_FOR_PAYMENT',
              label: 'Ready for Payment',
              route: '/ap/ready-for-payment',
              icon: ArrowRightCircle,
              requiredPerm: ['AP_INVOICE.VIEW', 'PAYMENT.VIEW']
            },
            {
              key: 'AP_REPORTS',
              label: 'AP Reports',
              route: '/ap/reports',
              icon: BarChart3,
              requiredPerm: ['REPORTS.VIEW']
            }
          ]
        },
        {
          key: 'PAYMENTS',
          label: 'Payments',
          route: '/ap/payments',
          icon: Banknote,
          requiredPerm: ['PAYMENT.VIEW', 'PAYMENT.CREATE'],
          submodules: [
            {
              key: 'PAYMENT_DASHBOARD',
              label: 'Dashboard',
              route: '/ap/payments',
              icon: LayoutDashboard,
              requiredPerm: ['PAYMENT.VIEW']
            },
            {
              key: 'MSME_PAYMENT_DASHBOARD',
              label: 'MSME Payments',
              route: '/ap/msme-payment-dashboard',
              icon: Building2,
              requiredPerm: ['PAYMENT.VIEW', 'REPORTS.VIEW']
            },
            {
              key: 'AI_SUGGESTED_BATCH',
              label: 'AI Suggested Batch',
              route: '/ap/ai-suggested-payment-batch',
              icon: Zap,
              requiredPerm: ['PAYMENT.CREATE']
            },
            {
              key: 'PAYMENT_PROPOSAL',
              label: 'Payment Proposal',
              route: '/ap/payment-proposal',
              icon: ListTodo,
              requiredPerm: ['PAYMENT.CREATE']
            },
            {
              key: 'PAYMENT_BATCHES',
              label: 'Payment Batches',
              route: '/ap/payment-batches',
              icon: CheckCircle,
              requiredPerm: ['PAYMENT.VIEW', 'PAYMENT.APPROVE']
            },
            {
              key: 'AGING_LIABILITY',
              label: 'Aging & Liability',
              route: '/ap/payment-aging-dashboard',
              icon: Clock,
              requiredPerm: ['PAYMENT.VIEW', 'REPORTS.VIEW']
            },
            {
              key: 'BANK_INTEGRATION',
              label: 'Bank Integration',
              route: '/ap/bank-integration-management',
              icon: Building2,
              requiredPerm: ['PAYMENT.VIEW', 'PAYMENT.EXECUTE']
            },
            {
              key: 'PAYMENT_AUDIT',
              label: 'Audit Trail',
              route: '/ap/payment-audit-trail',
              icon: Activity,
              requiredPerm: ['PAYMENT.VIEW', 'AUDIT_LOG.VIEW']
            },
            {
              key: 'ADVANCE_PAYMENT_QUEUE',
              label: 'Advance Payment Queue',
              route: '/ap/advance-payment-queue',
              icon: HandCoins,
              requiredPerm: ['PAYMENT.VIEW', 'ADVANCE.VIEW', 'ADVANCE.APPROVE']
            }
          ]
        },
        {
          key: 'VENDOR_ADVANCES',
          label: 'Vendor Advances',
          route: '/ap/advances',
          icon: ArrowUpCircle,
          requiredPerm: ['ADVANCE.VIEW', 'ADVANCE.CREATE'],
          submodules: [
            {
              key: 'ADVANCES_HUB',
              label: 'Advances Hub',
              route: '/ap/advances',
              icon: LayoutDashboard,
              requiredPerm: ['ADVANCE.VIEW']
            },
            {
              key: 'ADVANCE_REQUESTS',
              label: 'Advance Requests',
              route: '/ap/advance-requests',
              icon: FileText,
              requiredPerm: ['ADVANCE.VIEW']
            },
            {
              key: 'CREATE_ADVANCE',
              label: 'Create Advance',
              route: '/ap/advance-request-form',
              icon: FilePlus,
              requiredPerm: ['ADVANCE.CREATE']
            },
            {
              key: 'UTILIZATION',
              label: 'Utilization',
              route: '/ap/advance-utilization',
              icon: TrendingDown,
              requiredPerm: ['ADVANCE.VIEW']
            }
          ]
        },
        {
          key: 'VENDOR_ONBOARDING',
          label: 'Vendor Onboarding',
          route: '/vendors',
          icon: Users,
          requiredPerm: ['VENDOR.VIEW', 'VENDOR.CREATE'],
          submodules: [
            {
              key: 'VENDORS_LIST',
              label: 'Vendors',
              route: '/vendors',
              icon: Users,
              requiredPerm: ['VENDOR.VIEW']
            },
            {
              key: 'ADD_VENDOR',
              label: 'Add Vendor',
              route: '/add-vendor',
              icon: UserPlus,
              requiredPerm: ['VENDOR.CREATE']
            }
          ]
        },
        {
          key: 'SOURCING',
          label: 'Sourcing',
          route: '/ap/sourcing',
          icon: Search,
          requiredPerm: ['SOURCING.VIEW', 'SOURCING.CREATE']
        },
        {
          key: 'BUDGETING',
          label: 'Budgeting',
          route: '/budget-dashboard',
          icon: PieChart,
          requiredPerm: ['BUDGET.VIEW', 'BUDGET.CREATE'],
          submodules: [
            {
              key: 'BUDGET_DASHBOARD',
              label: 'Budget Dashboard',
              route: '/budget-dashboard',
              icon: LayoutDashboard,
              requiredPerm: ['BUDGET.VIEW']
            },
            {
              key: 'BUDGET_PLANNING',
              label: 'Budget Planning',
              route: '/budget-planning-creation',
              icon: FilePlus,
              requiredPerm: ['BUDGET.CREATE']
            },
            {
              key: 'BUDGET_PHASING',
              label: 'Budget Phasing',
              route: '/budget-phasing',
              icon: Calendar,
              requiredPerm: ['BUDGET.VIEW', 'BUDGET.CREATE']
            },
            {
              key: 'BUDGET_APPROVAL',
              label: 'Approval Workflow',
              route: '/budget-approval-workflow',
              icon: CheckCircle,
              requiredPerm: ['BUDGET.APPROVE']
            },
            {
              key: 'BUDGET_CONSUMPTION',
              label: 'Consumption & Control',
              route: '/budget-consumption-control',
              icon: TrendingUp,
              requiredPerm: ['BUDGET.VIEW']
            },
            {
              key: 'BUDGET_REVISIONS',
              label: 'Revisions',
              route: '/interim-revised-budgets',
              icon: FileEdit,
              requiredPerm: ['BUDGET.VIEW', 'BUDGET.CREATE']
            },
            {
              key: 'BUDGET_TRANSFERS',
              label: 'Transfers',
              route: '/budget-transfers',
              icon: GitCompare,
              requiredPerm: ['BUDGET.CREATE', 'BUDGET.APPROVE']
            },
            {
              key: 'WHAT_IF_SCENARIOS',
              label: 'What-If Scenarios',
              route: '/what-if-scenarios',
              icon: Sparkles,
              requiredPerm: ['BUDGET.VIEW']
            },
            {
              key: 'BUDGET_POLICIES',
              label: 'Policies & Controls',
              route: '/budget-policies',
              icon: Shield,
              requiredPerm: ['BUDGET.VIEW', 'SETTINGS.VIEW']
            }
          ]
        },
        {
          key: 'FIXED_ASSETS',
          label: 'Fixed Assets',
          route: '/ap/fixed-assets',
          icon: Building2,
          requiredPerm: ['FIXED_ASSET.VIEW', 'FIXED_ASSET.CREATE']
        },
        {
          key: 'AP_MASTERS',
          label: 'Masters',
          route: '/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW', 'MASTERS.CREATE']
        },
        {
          key: 'AP_REPORTS',
          label: 'Reports',
          route: '/reports',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW'],
          submodules: [
            {
              key: 'AUDIT_TRAIL',
              label: 'Audit Trail',
              route: '/reports/audit-trail',
              icon: History,
              requiredPerm: ['REPORTS.VIEW', 'AUDIT_LOG.VIEW']
            }
          ]
        }
      ]
    },
    {
      key: 'AR',
      label: 'AR Automation',
      icon: WalletIcon,
      modules: [
        {
          key: 'CUSTOMERS',
          label: 'Customers',
          route: '/ar/customers',
          icon: Users,
          requiredPerm: ['CUSTOMER.VIEW', 'CUSTOMER.CREATE']
        },
        {
          key: 'SALES_INVOICES',
          label: 'Sales Invoices',
          route: '/ar/sales-invoices',
          icon: Receipt,
          requiredPerm: ['AR_INVOICE.VIEW', 'AR_INVOICE.CREATE']
        },
        {
          key: 'COLLECTIONS',
          label: 'Collections',
          route: '/ar/collections',
          icon: DollarSign,
          requiredPerm: ['COLLECTION.VIEW', 'COLLECTION.CREATE']
        },
        {
          key: 'CREDIT_NOTES',
          label: 'Credit Notes',
          route: '/ar/credit-notes',
          icon: FileX,
          requiredPerm: ['CREDIT_NOTE.VIEW', 'CREDIT_NOTE.CREATE']
        },
        {
          key: 'REVENUE_RECOGNITION',
          label: 'Revenue Recognition',
          route: '/ar/revenue-recognition',
          icon: TrendingUp,
          requiredPerm: ['REVENUE.VIEW', 'REVENUE.RECOGNIZE']
        },
        {
          key: 'AR_MASTERS',
          label: 'Masters',
          route: '/ar/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW', 'MASTERS.CREATE']
        },
        {
          key: 'AR_REPORTS',
          label: 'Reports',
          route: '/reports/ar',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW']
        }
      ]
    },
    {
      key: 'R2R',
      label: 'R2R Automation',
      icon: BookOpen,
      modules: [
        {
          key: 'GENERAL_LEDGER',
          label: 'General Ledger',
          route: '/r2r/general-ledger',
          icon: BookOpen,
          requiredPerm: ['GENERAL_LEDGER.VIEW', 'GENERAL_LEDGER.POST']
        },
        {
          key: 'FINANCIAL_CLOSE',
          label: 'Financial Close',
          route: '/r2r/financial-close',
          icon: Calendar,
          requiredPerm: ['FINANCIAL_CLOSE.VIEW', 'FINANCIAL_CLOSE.EXECUTE']
        },
        {
          key: 'FINANCIAL_STATEMENTS',
          label: 'Financial Statements',
          route: '/r2r/financial-statements',
          icon: FileSpreadsheet,
          requiredPerm: ['FINANCIAL_STATEMENT.VIEW', 'FINANCIAL_STATEMENT.GENERATE']
        },
        {
          key: 'CONSOLIDATION',
          label: 'Consolidation',
          route: '/r2r/consolidation',
          icon: Layers,
          requiredPerm: ['CONSOLIDATION.VIEW', 'CONSOLIDATION.EXECUTE']
        },
        {
          key: 'CASH_FLOW',
          label: 'Cash Flow AI (Hybrid)',
          route: '/r2r/cash-flow',
          icon: Sparkles,
          requiredPerm: ['CASHFLOW.VIEW', 'CASHFLOW.FORECAST'],
          submodules: [
            {
              key: 'CASH_POSITION',
              label: 'Cash Position (Direct)',
              route: '/r2r/cash-flow/position',
              icon: Banknote,
              requiredPerm: ['CASHFLOW.VIEW']
            },
            {
              key: 'WEEK_13_FORECAST',
              label: '13-Week Forecast',
              route: '/r2r/cash-flow/13-week-forecast',
              icon: Calendar,
              requiredPerm: ['CASHFLOW.FORECAST']
            },
            {
              key: 'MONTHLY_ANNUAL_FORECAST',
              label: 'Monthly / Annual Forecast',
              route: '/r2r/cash-flow/monthly-annual-forecast',
              icon: LineChart,
              requiredPerm: ['CASHFLOW.FORECAST']
            },
            {
              key: 'HYBRID_RECONCILIATION',
              label: 'Hybrid Reconciliation',
              route: '/r2r/cash-flow/hybrid-reconciliation',
              icon: GitCompare,
              requiredPerm: ['CASHFLOW.VIEW', 'CASHFLOW.FORECAST']
            },
            {
              key: 'SCENARIO_BUILDER',
              label: 'Scenario Builder',
              route: '/r2r/cash-flow/scenario-builder',
              icon: Target,
              requiredPerm: ['CASHFLOW.FORECAST']
            },
            {
              key: 'AI_ACTIONS',
              label: 'AI Actions & Playbooks',
              route: '/r2r/cash-flow/ai-actions',
              icon: Zap,
              requiredPerm: ['CASHFLOW.VIEW', 'CASHFLOW.FORECAST']
            },
            {
              key: 'VARIANCE_EXPLAINABILITY',
              label: 'Variance & Explainability',
              route: '/r2r/cash-flow/variance-explainability',
              icon: AlertTriangle,
              requiredPerm: ['CASHFLOW.VIEW']
            },
            {
              key: 'CASHFLOW_REPORTS',
              label: 'Reports',
              route: '/r2r/cash-flow/reports',
              icon: FileBarChart,
              requiredPerm: ['CASHFLOW.VIEW', 'REPORTS.VIEW']
            },
            {
              key: 'CASHFLOW_SETTINGS',
              label: 'Settings & Governance',
              route: '/r2r/cash-flow/settings',
              icon: Settings,
              requiredPerm: ['CASHFLOW.VIEW', 'SETTINGS.VIEW']
            }
          ]
        },
        {
          key: 'VARIANCE_ANALYSIS',
          label: 'Variance Analysis',
          route: '/r2r/variance-analysis',
          icon: GitCompare,
          requiredPerm: ['VARIANCE.VIEW', 'VARIANCE.ANALYZE']
        },
        {
          key: 'R2R_MASTERS',
          label: 'Masters',
          route: '/r2r/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW', 'MASTERS.CREATE']
        },
        {
          key: 'R2R_REPORTS',
          label: 'Reports',
          route: '/reports/r2r',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW']
        }
      ]
    }
  ]
};

export const globalNavigationConfig: GlobalNavItem[] = [
  {
    key: 'DASHBOARDS',
    label: 'Chanakya Desk',
    route: '/',
    icon: LayoutDashboard,
    requiredPerm: ['DASHBOARD.VIEW']
  },
  {
    key: 'APPROVALS',
    label: 'Approvals',
    route: '/approvals',
    icon: CheckCircle,
    requiredPerm: ['APPROVALS.VIEW'],
    badge: 12
  },
  {
    key: 'TASKS',
    label: 'My Tasks',
    route: '/tasks',
    icon: ListTodo,
    requiredPerm: ['TASKS.VIEW'],
    badge: 5
  },
  {
    key: 'ROLE_PERMISSION_MATRIX',
    label: 'Role & Permissions',
    route: '/role-permission-matrix',
    icon: Shield,
    requiredPerm: ['SETTINGS.VIEW', 'MASTERS.VIEW']
  },
  {
    key: 'AUDIT_LOGS',
    label: 'Audit Logs',
    route: '/audit-logs',
    icon: History,
    requiredPerm: ['AUDIT_LOG.VIEW']
  },
  {
    key: 'SETTINGS',
    label: 'Settings',
    route: '/settings',
    icon: Settings,
    requiredPerm: ['SETTINGS.VIEW']
  }
];