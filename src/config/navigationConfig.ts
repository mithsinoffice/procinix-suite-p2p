import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  CreditCard,
  Users,
  DollarSign,
  Receipt,
  Wallet,
  UserCheck,
  BookOpen,
  Calendar,
  Target,
  BarChart3,
  FileText,
  FolderTree,
  TrendingUp,
  Sparkles,
  CheckCircle,
  ListTodo,
  History,
  Settings,
  Banknote,
} from 'lucide-react';

export interface NavItem {
  key: string;
  label: string;
  route: string;
  icon: any;
  requiredPerm: string[];
  badge?: string;
  children?: NavItem[];
}

export interface NavPillar {
  key: string;
  label: string;
  icon: any;
  items: NavItem[];
}

export interface GlobalNavItem {
  key: string;
  label: string;
  route: string;
  icon: any;
  requiredPerm: string[];
  badge?: number;
}

export const navigationConfig: { pillars: NavPillar[] } = {
  pillars: [
    {
      key: 'AP',
      label: 'AP Automation',
      icon: ShoppingCart,
      items: [
        {
          key: 'AP_DASHBOARD',
          label: 'Dashboard',
          route: '/',
          icon: LayoutDashboard,
          requiredPerm: ['DASHBOARD.VIEW'],
        },
        {
          key: 'PURCHASE_ORDERS',
          label: 'Purchase Orders',
          route: '/purchase-orders',
          icon: ShoppingCart,
          requiredPerm: ['PURCHASE_ORDER.VIEW'],
        },
        {
          key: 'GOODS_RECEIPT',
          label: 'Goods Receipt (GRN)',
          route: '/goods-receipt',
          icon: Package,
          requiredPerm: ['GRN.VIEW'],
        },
        {
          key: 'AP_INVOICES',
          label: 'Invoices',
          route: '/invoices',
          icon: CreditCard,
          requiredPerm: ['AP_INVOICE.VIEW'],
          children: [
            {
              key: 'ALL_INVOICES',
              label: 'All Invoices',
              route: '/invoices',
              icon: FileText,
              requiredPerm: ['AP_INVOICE.VIEW'],
            },
            {
              key: 'AI_CAPTURE',
              label: 'AI Capture',
              route: '/invoices/ai-capture',
              icon: Sparkles,
              requiredPerm: ['AI_CAPTURE.VIEW'],
              badge: 'AI',
            },
          ],
        },
        {
          key: 'PAYMENTS',
          label: 'Payments',
          route: '/ap/payments',
          icon: Banknote,
          requiredPerm: ['PAYMENT_RUN.VIEW'],
        },
        {
          key: 'VENDORS',
          label: 'Vendor Management',
          route: '/vendors',
          icon: Users,
          requiredPerm: ['VENDOR.VIEW'],
        },
        {
          key: 'CASHFLOW',
          label: 'Cash Flow Forecasting',
          route: '/ap/cashflow',
          icon: TrendingUp,
          requiredPerm: ['CASHFLOW.VIEW'],
        },
        {
          key: 'AP_MASTERS',
          label: 'Masters',
          route: '/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW'],
          children: [
            {
              key: 'CATEGORY_MASTER',
              label: 'Category Master',
              route: '/masters/category-master',
              icon: FolderTree,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'ITEM_MASTER',
              label: 'Item Master',
              route: '/masters/item-master',
              icon: Package,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'CONTRACT_MASTER',
              label: 'Contract Master',
              route: '/masters/contract-master',
              icon: FileText,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'TAX_CODE_MASTER',
              label: 'Tax Code Master',
              route: '/masters/tax-code-master',
              icon: Receipt,
              requiredPerm: ['MASTERS.VIEW'],
            },
          ],
        },
        {
          key: 'AP_REPORTS',
          label: 'Reports',
          route: '/reports',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW'],
          children: [
            {
              key: 'PROCUREMENT_DASHBOARD',
              label: 'Procurement Dashboard',
              route: '/reports/procurement-head-desk',
              icon: BarChart3,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'OPERATIONAL_DASHBOARD',
              label: 'Operations Dashboard',
              route: '/reports/operational-dashboard',
              icon: TrendingUp,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'WORKFLOW_REPORT',
              label: 'Workflow Report',
              route: '/reports/workflow-report',
              icon: FileText,
              requiredPerm: ['REPORTS.VIEW'],
            },
          ],
        },
      ],
    },
    {
      key: 'AR',
      label: 'AR Automation',
      icon: Wallet,
      items: [
        {
          key: 'AR_DASHBOARD',
          label: 'AR Dashboard',
          route: '/ar/dashboard',
          icon: LayoutDashboard,
          requiredPerm: ['DASHBOARD.VIEW', 'AR_INVOICE.VIEW'],
        },
        {
          key: 'CUSTOMER_INVOICING',
          label: 'Customer Invoicing',
          route: '/ar/customer-invoicing',
          icon: Receipt,
          requiredPerm: ['AR_INVOICE.VIEW'],
        },
        {
          key: 'PAYMENT_COLLECTIONS',
          label: 'Payment Collections',
          route: '/ar/payment-collections',
          icon: DollarSign,
          requiredPerm: ['COLLECTION.VIEW'],
        },
        {
          key: 'CREDIT_MANAGEMENT',
          label: 'Credit Management',
          route: '/ar/credit-management',
          icon: TrendingUp,
          requiredPerm: ['CREDIT_MGMT.VIEW'],
        },
        {
          key: 'CUSTOMER_PORTAL',
          label: 'Customer Portal',
          route: '/ar/customer-portal',
          icon: UserCheck,
          requiredPerm: ['CUSTOMER.VIEW'],
        },
        {
          key: 'AR_MASTERS',
          label: 'Masters',
          route: '/ar/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW'],
          children: [
            {
              key: 'CUSTOMER_MASTER',
              label: 'Customer Master',
              route: '/ar/masters/customer-master',
              icon: Users,
              requiredPerm: ['CUSTOMER.VIEW'],
            },
            {
              key: 'PRICING_MASTER',
              label: 'Pricing Master',
              route: '/ar/masters/pricing-master',
              icon: DollarSign,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'PAYMENT_TERMS',
              label: 'Payment Terms',
              route: '/ar/masters/payment-terms',
              icon: Calendar,
              requiredPerm: ['MASTERS.VIEW'],
            },
          ],
        },
        {
          key: 'AR_REPORTS',
          label: 'Reports',
          route: '/ar/reports',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW'],
          children: [
            {
              key: 'AGING_REPORT',
              label: 'Aging Report',
              route: '/ar/reports/aging-report',
              icon: BarChart3,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'COLLECTION_REPORT',
              label: 'Collection Report',
              route: '/ar/reports/collection-report',
              icon: TrendingUp,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'REVENUE_REPORT',
              label: 'Revenue Report',
              route: '/ar/reports/revenue-report',
              icon: FileText,
              requiredPerm: ['REPORTS.VIEW'],
            },
          ],
        },
      ],
    },
    {
      key: 'R2R',
      label: 'R2R Automation',
      icon: BookOpen,
      items: [
        {
          key: 'R2R_DASHBOARD',
          label: 'R2R Dashboard',
          route: '/r2r/dashboard',
          icon: LayoutDashboard,
          requiredPerm: ['DASHBOARD.VIEW', 'GENERAL_LEDGER.VIEW'],
        },
        {
          key: 'GENERAL_LEDGER',
          label: 'General Ledger',
          route: '/r2r/general-ledger',
          icon: BookOpen,
          requiredPerm: ['GENERAL_LEDGER.VIEW'],
        },
        {
          key: 'FINANCIAL_CLOSE',
          label: 'Financial Close',
          route: '/r2r/financial-close',
          icon: Calendar,
          requiredPerm: ['FINANCIAL_CLOSE.VIEW'],
        },
        {
          key: 'RECONCILIATIONS',
          label: 'Reconciliations',
          route: '/r2r/reconciliations',
          icon: Target,
          requiredPerm: ['RECONCILIATION.VIEW'],
        },
        {
          key: 'CONSOLIDATIONS',
          label: 'Consolidations',
          route: '/r2r/consolidations',
          icon: BarChart3,
          requiredPerm: ['CONSOLIDATION.VIEW'],
        },
        {
          key: 'R2R_MASTERS',
          label: 'Masters',
          route: '/masters',
          icon: FolderTree,
          requiredPerm: ['MASTERS.VIEW'],
          children: [
            {
              key: 'DEPARTMENT_MASTER',
              label: 'Department Master',
              route: '/masters/department-master',
              icon: FolderTree,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'COST_CENTRE_MASTER',
              label: 'Cost Centre Master',
              route: '/masters/cost-centre-master',
              icon: Target,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'PROFIT_CENTRE_MASTER',
              label: 'Profit Centre Master',
              route: '/masters/profit-centre-master',
              icon: TrendingUp,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'EMPLOYEE_MASTER',
              label: 'Employee Master',
              route: '/masters/employee-master',
              icon: Users,
              requiredPerm: ['MASTERS.VIEW'],
            },
            {
              key: 'KIT_BUNDLE_MASTER',
              label: 'Kit / Bundle Master',
              route: '/masters/kit-bundle-master',
              icon: Package,
              requiredPerm: ['MASTERS.VIEW'],
            },
          ],
        },
        {
          key: 'R2R_REPORTS',
          label: 'Reports',
          route: '/reports',
          icon: BarChart3,
          requiredPerm: ['REPORTS.VIEW'],
          children: [
            {
              key: 'CFO_DESK',
              label: 'CFO Dashboard',
              route: '/reports/cfo-desk',
              icon: BarChart3,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'MANAGEMENT_DESK',
              label: 'Management Dashboard',
              route: '/reports/management-desk',
              icon: TrendingUp,
              requiredPerm: ['REPORTS.VIEW'],
            },
            {
              key: 'AUDIT_TRAIL',
              label: 'Audit Trail',
              route: '/reports/audit-trail',
              icon: FileText,
              requiredPerm: ['AUDIT_LOG.VIEW'],
            },
          ],
        },
      ],
    },
  ],
};

export const globalNavigationConfig: GlobalNavItem[] = [
  {
    key: 'DASHBOARDS',
    label: 'Chanakya Desk',
    route: '/',
    icon: LayoutDashboard,
    requiredPerm: ['DASHBOARD.VIEW'],
  },
  {
    key: 'APPROVALS',
    label: 'Approvals',
    route: '/approvals',
    icon: CheckCircle,
    requiredPerm: ['APPROVALS.VIEW'],
    badge: 12,
  },
  {
    key: 'TASKS',
    label: 'My Tasks',
    route: '/tasks',
    icon: ListTodo,
    requiredPerm: ['TASKS.VIEW'],
    badge: 5,
  },
  {
    key: 'AUDIT_LOG',
    label: 'Audit Log',
    route: '/audit-log',
    icon: History,
    requiredPerm: ['AUDIT_LOG.VIEW'],
  },
  {
    key: 'SETTINGS',
    label: 'Settings',
    route: '/settings',
    icon: Settings,
    requiredPerm: ['SETTINGS.VIEW'],
  },
];
