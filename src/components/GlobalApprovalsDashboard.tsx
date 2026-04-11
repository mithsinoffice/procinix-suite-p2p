import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  Clock, 
  FileText, 
  Package, 
  Users, 
  Database,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  TrendingUp,
  Calendar,
  Award,
  Activity,
  Timer,
  Target,
  ThumbsDown,
  Receipt,
  DollarSign,
  CreditCard,
  UserCheck,
  ShoppingCart,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAPData } from '../contexts/APDataContext';
import { useProcurementData } from '../contexts/ProcurementDataContext';
import {
  fetchPendingMasterApprovals,
  type MasterApprovalItem,
  updateMasterApprovalStatus,
} from '../lib/masters/masterApproval';
import { PremiumActionButton } from './ui/premium-register';

/**
 * GLOBAL APPROVALS DASHBOARD
 * 
 * Consolidates approvals from ALL modules:
 * - Procurement: Purchase Requisitions (PRs), Purchase Orders
 * - Accounts Payable: PO Invoices, Non-PO Invoices
 * - Payments: Payment Batches
 * - Vendor Advances: Advance Requests
 * - Vendor Onboarding: New Vendor Approvals
 * - Masters: Vendor/Item/Entity/Tax/Cost Centre updates
 * - GRN: Location Acceptances
 */

interface ApprovalItem {
  id: string;
  category: ApprovalTabKey;
  type: 'PR' | 'PO' | 'Invoice' | 'NonPOInvoice' | 'PaymentBatch' | 'VendorAdvance' | 'VendorOnboarding' | 'Master' | 'Location';
  module: string; // Source module
  title: string;
  submittedBy: string;
  submittedDate: string;
  submittedTime: string;
  value?: string;
  priority: 'High' | 'Medium' | 'Low';
  daysWaiting: number;
  details: any;
  changes?: Array<{
    field: string;
    oldValue: string;
    newValue: string;
  }>;
  route?: string; // Navigation route for approval action
}

type ApprovalTabKey =
  | 'All'
  | 'PR'
  | 'PO'
  | 'AP_INVOICES'
  | 'DEBIT_NOTES'
  | 'PAYMENTS'
  | 'VENDOR_ADVANCES'
  | 'VENDOR_ONBOARDING'
  | 'MASTER'
  | 'LOCATION';

const mockApprovalData: Array<Omit<ApprovalItem, 'category'>> = [
  // ========== PROCUREMENT: PURCHASE REQUISITIONS (PRs) ==========
  {
    id: 'PR-2024-002',
    type: 'PR',
    module: 'Procurement',
    title: 'Purchase Requisition #PR-2024-002 - Raw Materials',
    submittedBy: 'Priya Sharma',
    submittedDate: '2024-12-12',
    submittedTime: '09:30:00',
    value: '₹12,50,000',
    priority: 'High',
    daysWaiting: 3,
    details: {
      prType: 'Regular',
      entity: 'India HQ',
      department: 'Operations',
      costCentre: 'CC-OPS-002',
      itemCount: 8,
      needByDate: '2024-12-25',
      justification: 'Raw material procurement for Q1 production schedule',
      aiRiskLevel: 'Medium',
      policyFlags: ['Price Variance']
    },
    route: '/procurement/pr-detail/PR-2024-002'
  },
  {
    id: 'PR-2024-003',
    type: 'PR',
    module: 'Procurement',
    title: 'Purchase Requisition #PR-2024-003 - Cloud Services',
    submittedBy: 'Amit Patel',
    submittedDate: '2024-12-13',
    submittedTime: '11:15:00',
    value: '₹8,50,000',
    priority: 'Medium',
    daysWaiting: 2,
    details: {
      prType: 'Service',
      entity: 'India Manufacturing',
      department: 'IT',
      costCentre: 'CC-IT-MFG',
      itemCount: 1,
      needByDate: '2025-01-05',
      justification: 'Cloud infrastructure upgrade for scalability',
      aiRiskLevel: 'Low',
      policyFlags: ['Missing Docs']
    },
    route: '/procurement/pr-detail/PR-2024-003'
  },
  {
    id: 'PR-2024-006',
    type: 'PR',
    module: 'Procurement',
    title: 'Purchase Requisition #PR-2024-006 - Industrial Equipment',
    submittedBy: 'Ramesh Gupta',
    submittedDate: '2024-12-08',
    submittedTime: '14:00:00',
    value: '₹55,00,000',
    priority: 'High',
    daysWaiting: 7,
    details: {
      prType: 'Asset/CAPEX',
      entity: 'India HQ',
      department: 'Operations',
      costCentre: 'CC-OPS-001',
      itemCount: 1,
      needByDate: '2025-01-15',
      justification: 'Industrial equipment for capacity expansion',
      aiRiskLevel: 'Medium',
      policyFlags: []
    },
    route: '/procurement/pr-detail/PR-2024-006'
  },
  {
    id: 'PR-2024-009',
    type: 'PR',
    module: 'Procurement',
    title: 'Purchase Requisition #PR-2024-009 - Networking Equipment',
    submittedBy: 'Deepak Verma',
    submittedDate: '2024-12-13',
    submittedTime: '10:00:00',
    value: '₹9,20,000',
    priority: 'Medium',
    daysWaiting: 2,
    details: {
      prType: 'Regular',
      entity: 'India HQ',
      department: 'IT',
      costCentre: 'CC-IT-002',
      itemCount: 6,
      needByDate: '2024-12-30',
      justification: 'Networking equipment upgrade',
      aiRiskLevel: 'Medium',
      policyFlags: ['Vendor Risk']
    },
    route: '/procurement/pr-detail/PR-2024-009'
  },
  {
    id: 'PR-2024-010',
    type: 'PR',
    module: 'Procurement',
    title: 'Purchase Requisition #PR-2024-010 - Office Supplies',
    submittedBy: 'Sanjay Kumar',
    submittedDate: '2024-12-14',
    submittedTime: '15:30:00',
    value: '₹1,85,000',
    priority: 'Low',
    daysWaiting: 1,
    details: {
      prType: 'Catalogue',
      entity: 'India HQ',
      department: 'IT',
      costCentre: 'CC-IT-003',
      itemCount: 15,
      needByDate: '2024-12-28',
      justification: 'Standard office supplies replenishment',
      aiRiskLevel: 'Low',
      policyFlags: []
    },
    route: '/procurement/pr-detail/PR-2024-010'
  },

  // ========== ACCOUNTS PAYABLE: PO-BASED INVOICES ==========
  {
    id: 'INV-2024-001',
    type: 'Invoice',
    module: 'Accounts Payable',
    title: 'Invoice #INV-2024-001 - Tech Solutions Pvt Ltd',
    submittedBy: 'John Doe',
    submittedDate: '2024-12-10',
    submittedTime: '10:30:00',
    value: '₹1,25,000',
    priority: 'High',
    daysWaiting: 2,
    details: {
      invoiceNumber: 'INV-2024-001',
      vendor: 'Tech Solutions Pvt Ltd',
      poNumber: 'PO-2024-001',
      grnNumber: 'GRN-2024-045',
      amount: 125000,
      dueDate: '2025-01-09'
    },
    route: '/ap/invoice-approval/INV-2024-001'
  },
  {
    id: 'INV-2024-002',
    type: 'Invoice',
    module: 'Accounts Payable',
    title: 'Invoice #INV-2024-002 - ABC Manufacturing Ltd',
    submittedBy: 'John Doe',
    submittedDate: '2024-12-11',
    submittedTime: '14:45:00',
    value: '₹3,50,000',
    priority: 'High',
    daysWaiting: 1,
    details: {
      invoiceNumber: 'INV-2024-002',
      vendor: 'ABC Manufacturing Ltd',
      poNumber: 'PO-2024-002',
      grnNumber: 'GRN-2024-046',
      amount: 350000,
      dueDate: '2025-01-10'
    },
    route: '/ap/invoice-approval/INV-2024-002'
  },

  // ========== ACCOUNTS PAYABLE: NON-PO INVOICES ==========
  {
    id: 'NPOINV-001',
    type: 'NonPOInvoice',
    module: 'Accounts Payable',
    title: 'Non-PO Invoice #INV-VENDOR-2024-456 - Tech Consulting Services',
    submittedBy: 'Jane Smith',
    submittedDate: '2024-12-11',
    submittedTime: '11:00:00',
    value: '₹65,000',
    priority: 'Medium',
    daysWaiting: 1,
    details: {
      invoiceNumber: 'INV-VENDOR-2024-456',
      vendor: 'Tech Consulting Services Pvt Ltd',
      expenseCategory: 'Professional Services',
      netPayable: 65000,
      gstRetained: 18000,
      advanceAdjusted: 25000
    },
    route: '/ap/non-po-invoice-approval/NPOINV-001'
  },
  {
    id: 'NPOINV-002',
    type: 'NonPOInvoice',
    module: 'Accounts Payable',
    title: 'Non-PO Invoice #INV-VENDOR-2024-457 - Legal Services',
    submittedBy: 'Jane Smith',
    submittedDate: '2024-12-09',
    submittedTime: '15:20:00',
    value: '₹1,50,000',
    priority: 'High',
    daysWaiting: 3,
    details: {
      invoiceNumber: 'INV-VENDOR-2024-457',
      vendor: 'Corporate Legal Advisors LLP',
      expenseCategory: 'Legal Services',
      netPayable: 150000,
      gstRetained: 0,
      advanceAdjusted: 0
    },
    route: '/ap/non-po-invoice-approval/NPOINV-002'
  },

  // ========== PROCUREMENT: PURCHASE ORDERS ==========
  {
    id: 'PO-2024-0156',
    type: 'PO',
    module: 'Procurement',
    title: 'Purchase Order #PO-2024-0156 - Tata Steel Ltd',
    submittedBy: 'Priya Sharma',
    submittedDate: '2024-12-10',
    submittedTime: '10:30:00',
    value: '₹2,45,000',
    priority: 'High',
    daysWaiting: 2,
    details: {
      vendor: 'Tata Steel Ltd.',
      items: 5,
      deliveryDate: '2024-12-20',
      department: 'Manufacturing'
    },
    route: '/procurement/po-approval/PO-2024-0156'
  },
  {
    id: 'PO-2024-0157',
    type: 'PO',
    module: 'Procurement',
    title: 'Purchase Order #PO-2024-0157 - Hindustan Unilever',
    submittedBy: 'Priya Sharma',
    submittedDate: '2024-12-11',
    submittedTime: '14:45:00',
    value: '₹89,500',
    priority: 'Medium',
    daysWaiting: 1,
    details: {
      vendor: 'Hindustan Unilever Ltd.',
      items: 3,
      deliveryDate: '2024-12-18',
      department: 'Procurement'
    },
    route: '/procurement/po-approval/PO-2024-0157'
  },

  // ========== PAYMENTS: PAYMENT BATCHES ==========
  {
    id: 'PAY-BATCH-001',
    type: 'PaymentBatch',
    module: 'Payments',
    title: 'Payment Batch #PAY-BATCH-001 - 15 Invoices',
    submittedBy: 'Finance Team',
    submittedDate: '2024-12-12',
    submittedTime: '09:00:00',
    value: '₹12,45,000',
    priority: 'High',
    daysWaiting: 0,
    details: {
      batchId: 'PAY-BATCH-001',
      invoiceCount: 15,
      vendorCount: 8,
      paymentDate: '2024-12-15',
      paymentMethod: 'NEFT'
    },
    route: '/payments/batch-approval/PAY-BATCH-001'
  },
  {
    id: 'PAY-BATCH-002',
    type: 'PaymentBatch',
    module: 'Payments',
    title: 'Payment Batch #PAY-BATCH-002 - MSME Priority',
    submittedBy: 'Finance Team',
    submittedDate: '2024-12-11',
    submittedTime: '16:00:00',
    value: '₹5,67,800',
    priority: 'High',
    daysWaiting: 1,
    details: {
      batchId: 'PAY-BATCH-002',
      invoiceCount: 8,
      vendorCount: 5,
      paymentDate: '2024-12-14',
      paymentMethod: 'RTGS',
      msmeOnly: true
    },
    route: '/payments/batch-approval/PAY-BATCH-002'
  },

  // ========== VENDOR ADVANCES ==========
  {
    id: 'ADV-REQ-001',
    type: 'VendorAdvance',
    module: 'Vendor Advances',
    title: 'Advance Request #ADV-REQ-001 - XYZ Corp',
    submittedBy: 'Procurement Head',
    submittedDate: '2024-12-10',
    submittedTime: '13:30:00',
    value: '₹5,00,000',
    priority: 'Medium',
    daysWaiting: 2,
    details: {
      vendor: 'XYZ Corporation Ltd',
      advanceType: 'On-Account',
      justification: 'Long-term contract requirement',
      repaymentTerms: '6 months'
    },
    route: '/vendor-advances/approval/ADV-REQ-001'
  },
  {
    id: 'ADV-REQ-002',
    type: 'VendorAdvance',
    module: 'Vendor Advances',
    title: 'Advance Request #ADV-REQ-002 - ABC Suppliers',
    submittedBy: 'Procurement Head',
    submittedDate: '2024-12-11',
    submittedTime: '10:15:00',
    value: '₹2,50,000',
    priority: 'Low',
    daysWaiting: 1,
    details: {
      vendor: 'ABC Suppliers Pvt Ltd',
      advanceType: 'Against PO',
      poNumber: 'PO-2024-0145',
      justification: 'Raw material procurement advance'
    },
    route: '/vendor-advances/approval/ADV-REQ-002'
  },

  // ========== VENDOR ONBOARDING ==========
  {
    id: 'VON-001',
    type: 'VendorOnboarding',
    module: 'Vendor Onboarding',
    title: 'New Vendor Onboarding - Global Tech Solutions Inc',
    submittedBy: 'Vendor Onboarding Team',
    submittedDate: '2024-12-09',
    submittedTime: '11:45:00',
    priority: 'Medium',
    daysWaiting: 3,
    details: {
      vendorName: 'Global Tech Solutions Inc',
      category: 'IT Services',
      country: 'USA',
      kycStatus: 'Complete',
      riskRating: 'Low'
    },
    route: '/vendor-onboarding/approval/VON-001'
  },
  {
    id: 'VON-002',
    type: 'VendorOnboarding',
    module: 'Vendor Onboarding',
    title: 'New Vendor Onboarding - Mahindra & Mahindra',
    submittedBy: 'Vendor Onboarding Team',
    submittedDate: '2024-12-11',
    submittedTime: '15:45:00',
    priority: 'High',
    daysWaiting: 1,
    details: {
      vendorName: 'Mahindra & Mahindra Ltd',
      category: 'Automobile Parts',
      country: 'India',
      kycStatus: 'Complete',
      riskRating: 'Low'
    },
    route: '/vendor-onboarding/approval/VON-002'
  },

  // ========== MASTERS: UPDATES ==========
  {
    id: 'VENDOR-UPD-0023',
    type: 'Master',
    module: 'Masters',
    title: 'Vendor Master Update - Reliance Industries',
    submittedBy: 'Rajesh Kumar',
    submittedDate: '2024-12-09',
    submittedTime: '09:15:00',
    priority: 'High',
    daysWaiting: 3,
    details: {
      recordType: 'Vendor',
      recordName: 'Reliance Industries Ltd.'
    },
    changes: [
      { field: 'Payment Terms', oldValue: 'Net 30', newValue: 'Net 45' },
      { field: 'Credit Limit', oldValue: '₹10,00,000', newValue: '₹15,00,000' },
      { field: 'Bank Account', oldValue: 'ICICI-****1234', newValue: 'HDFC-****5678' }
    ],
    route: '/masters/approval/VENDOR-UPD-0023'
  },
  {
    id: 'ITEM-NEW-0089',
    type: 'Master',
    module: 'Masters',
    title: 'New Item Master - Steel Rod 12mm',
    submittedBy: 'Priya Sharma',
    submittedDate: '2024-12-10',
    submittedTime: '10:00:00',
    priority: 'Medium',
    daysWaiting: 2,
    details: {
      recordType: 'Item',
      recordName: 'Steel Rod 12mm'
    },
    changes: [
      { field: 'Item Code', oldValue: '-', newValue: 'SR-12MM-001' },
      { field: 'Category', oldValue: '-', newValue: 'Raw Material' },
      { field: 'Unit of Measure', oldValue: '-', newValue: 'KG' },
      { field: 'Standard Price', oldValue: '-', newValue: '₹65.50' }
    ],
    route: '/masters/approval/ITEM-NEW-0089'
  },

  // ========== GRN LOCATION ACCEPTANCES ==========
  {
    id: 'GRN-LOC-0234',
    type: 'Location',
    module: 'Procurement',
    title: 'GRN Location Acceptance - Mumbai Warehouse',
    submittedBy: 'Sunita Reddy',
    submittedDate: '2024-12-11',
    submittedTime: '12:00:00',
    value: '₹1,24,500',
    priority: 'High',
    daysWaiting: 1,
    details: {
      grnNumber: 'GRN-2024-0234',
      poNumber: 'PO-2024-0145',
      location: 'Mumbai Warehouse',
      allocatedQty: 500,
      items: 2
    },
    route: '/procurement/grn-location-approval/GRN-LOC-0234'
  }
];

export function GlobalApprovalsDashboard() {
  const { user } = useAuth();
  const {
    invoices,
    advanceRequests,
    grns,
    debitNotes,
    updateInvoice,
    updateDebitNote,
    updateAdvanceRequest,
    updateGRN,
  } = useAPData();
  const {
    purchaseRequests,
    updatePurchaseRequestStatus,
  } = useProcurementData();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState<ApprovalTabKey>('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [comments, setComments] = useState('');
  const [masterApprovals, setMasterApprovals] = useState<MasterApprovalItem[]>([]);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    let isMounted = true;

    fetchPendingMasterApprovals()
      .then((items) => {
        if (isMounted) {
          setMasterApprovals(items);
        }
      })
      .catch((error) => {
        console.warn('Failed to load pending master approvals', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 60_000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const getApprovalTimestamp = (submittedDate: string, submittedTime?: string) => {
    if (submittedDate.includes('T')) {
      const parsed = new Date(submittedDate);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    const parsed = new Date(submittedTime ? `${submittedDate} ${submittedTime}` : submittedDate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }

    const fallback = new Date(submittedDate.split('T')[0]);
    return Number.isNaN(fallback.getTime()) ? new Date(nowTick) : fallback;
  };

  // Calculate ETA (Elapsed Time for Approval)
  const calculateETA = (submittedDate: string, submittedTime?: string) => {
    const submitted = getApprovalTimestamp(submittedDate, submittedTime);
    const diffMs = Math.max(0, nowTick - submitted.getTime());
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes, totalHours: Math.floor(diffMs / (1000 * 60 * 60)) };
  };

  // Get ETA color based on elapsed time
  const getETAColor = (totalHours: number) => {
    if (totalHours >= 48) {
      return { bg: 'var(--color-error-light)', color: 'var(--color-error-dark)', border: '#FCA5A5' };
    } else if (totalHours >= 24) {
      return { bg: '#FED7AA', color: '#EA580C', border: '#FB923C' };
    } else if (totalHours >= 8) {
      return { bg: '#FEF3C7', color: '#D97706', border: '#FCD34D' };
    } else {
      return { bg: '#D1FAE5', color: '#059669', border: '#6EE7B7' };
    }
  };

  // Format ETA display
  const formatETA = (eta: { days: number; hours: number; minutes: number }) => {
    if (eta.days > 0) {
      return `${eta.days}d ${eta.hours}h`;
    } else if (eta.hours > 0) {
      return `${eta.hours}h ${eta.minutes}m`;
    } else {
      return `${eta.minutes}m`;
    }
  };

  const getDaysWaiting = (submittedDate: string, submittedTime?: string) => {
    const submitted = getApprovalTimestamp(submittedDate, submittedTime);
    const diffMs = Math.max(0, nowTick - submitted.getTime());
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  const formatSubmittedDate = (submittedDate: string, submittedTime?: string) => {
    const submitted = getApprovalTimestamp(submittedDate, submittedTime);
    return {
      date: submitted.toLocaleDateString('en-IN'),
      time: submitted.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    };
  };

  const liveOperationalApprovals: ApprovalItem[] = [
    ...purchaseRequests
      .filter((request) => ['Submitted', 'Pending Approval', 'In Review'].includes(request.status))
      .map((request) => ({
        id: request.prNumber,
        category: 'PR' as const,
        type: 'PR' as const,
        module: 'Procurement',
        title: `Purchase Requisition #${request.prNumber}`,
        submittedBy: request.requestor,
        submittedDate: request.submittedDate ?? request.createdDate,
        submittedTime: undefined,
        value: `₹${request.totalAmount.toLocaleString('en-IN')}`,
        priority: (request.aiRiskLevel === 'High' ? 'High' : request.aiRiskLevel === 'Medium' ? 'Medium' : 'Low') as ApprovalItem['priority'],
        daysWaiting: request.agingDays ?? getDaysWaiting(request.submittedDate ?? request.createdDate),
        details: {
          entity: request.entity,
          department: request.department,
          costCentre: request.costCentre,
          needByDate: request.needByDate,
          itemCount: request.itemCount,
          nextApprover: request.nextApprover,
        },
        route: `/procurement/pr/detail/${request.prNumber}`,
      })),
    ...invoices
      .filter((invoice) => ['Pending Approval', 'Under Review'].includes(invoice.status))
      .map((invoice) => ({
        id: invoice.id,
        category: 'AP_INVOICES' as const,
        type: (invoice.invoiceType === 'Non-PO' ? 'NonPOInvoice' : 'Invoice') as ApprovalItem['type'],
        module: 'Accounts Payable',
        title: `${invoice.invoiceType === 'Non-PO' ? 'Non-PO ' : ''}Invoice #${invoice.invoiceNumber} - ${invoice.vendorName}`,
        submittedBy: invoice.approver ?? 'AP Team',
        submittedDate: invoice.invoiceDate,
        submittedTime: undefined,
        value: `₹${invoice.totalAmount.toLocaleString('en-IN')}`,
        priority: invoice.totalAmount >= 1000000 ? 'High' : invoice.totalAmount >= 250000 ? 'Medium' : 'Low',
        daysWaiting: getDaysWaiting(invoice.invoiceDate),
        details: {
          vendor: invoice.vendorName,
          invoiceNumber: invoice.invoiceNumber,
          invoiceType: invoice.invoiceType,
          poNumber: invoice.poNumber ?? 'Direct',
          matchStatus: invoice.matchStatus ?? 'Unmatched',
          paymentStatus: invoice.paymentStatus,
        },
        route: invoice.invoiceType === 'Non-PO'
          ? `/ap/non-po-invoice-approval/${invoice.id}`
          : `/ap/invoice-approval/${invoice.id}`,
      })),
    ...advanceRequests
      .filter((request) => request.status === 'Submitted')
      .map((request) => ({
        id: request.id,
        category: 'VENDOR_ADVANCES' as const,
        type: 'VendorAdvance' as const,
        module: 'Vendor Advances',
        title: `Advance Request #${request.requestNumber} - ${request.vendor}`,
        submittedBy: request.createdBy,
        submittedDate: request.submittedDate ?? request.createdDate,
        submittedTime: undefined,
        value: `₹${request.netPayable.toLocaleString('en-IN')}`,
        priority: request.priority === 'Critical' ? 'High' : request.priority === 'High' ? 'High' : request.priority === 'Medium' ? 'Medium' : 'Low',
        daysWaiting: getDaysWaiting(request.submittedDate ?? request.createdDate),
        details: {
          vendor: request.vendor,
          vendorCode: request.vendorCode,
          advanceType: request.advanceType,
          poNumber: request.poNumber ?? 'On-Account',
          purpose: request.purpose,
          paymentStatus: request.paymentStatus,
        },
        route: `/vendor-advances/approval/${request.id}`,
      })),
    ...grns
      .filter((grn) => ['Not Allocated', 'Partially Allocated'].includes(grn.allocationStatus))
      .map((grn) => ({
        id: grn.id,
        category: 'LOCATION' as const,
        type: 'Location' as const,
        module: 'Procurement',
        title: `GRN Location Acceptance - ${grn.grnNumber}`,
        submittedBy: grn.vendor,
        submittedDate: grn.receiptDate,
        submittedTime: undefined,
        value: `₹${grn.amount.toLocaleString('en-IN')}`,
        priority: grn.amount >= 1000000 ? 'High' : grn.amount >= 250000 ? 'Medium' : 'Low',
        daysWaiting: getDaysWaiting(grn.receiptDate),
        details: {
          grnNumber: grn.grnNumber,
          poNumber: grn.poNumber,
          vendor: grn.vendor,
          allocationStatus: grn.allocationStatus,
          qtyReceived: grn.qtyReceived,
        },
        route: `/procurement/grn-location-approval/${grn.id}`,
      })),
    ...debitNotes
      .filter((debitNote) => ['Pending Approval'].includes(debitNote.status))
      .map((debitNote) => ({
        id: debitNote.id,
        category: 'DEBIT_NOTES' as const,
        type: 'NonPOInvoice' as const,
        module: 'Debit Notes',
        title: `Debit Note #${debitNote.debitNoteNumber} - ${debitNote.vendorName}`,
        submittedBy: debitNote.createdBy,
        submittedDate: debitNote.createdDate || debitNote.debitNoteDate,
        submittedTime: undefined,
        value: `₹${debitNote.debitAmount.toLocaleString('en-IN')}`,
        priority: debitNote.debitAmount >= 500000 ? 'High' : debitNote.debitAmount >= 100000 ? 'Medium' : 'Low',
        daysWaiting: getDaysWaiting(debitNote.createdDate || debitNote.debitNoteDate),
        details: {
          vendor: debitNote.vendorName,
          referenceType: debitNote.referenceType,
          referenceNumber: debitNote.referenceNumber,
          reason: debitNote.reasonName,
          currency: debitNote.currency,
        },
        route: `/ap/debit-notes/detail/${debitNote.id}`,
      })),
  ];

  // Filter approvals
  const matchesTab = (item: ApprovalItem, tab: ApprovalTabKey) => {
    switch (tab) {
      case 'All':
        return true;
      default:
        return item.category === tab;
    }
  };

  const normalizedMasterApprovals = useMemo(
    () =>
      masterApprovals.map((item) => ({
        ...item,
        category: 'MASTER' as const,
      })),
    [masterApprovals]
  );

  const allApprovals = [...liveOperationalApprovals, ...normalizedMasterApprovals];
  const approvals = allApprovals.filter((item) => matchesTab(item, selectedTab));

  const getCountByType = (type: ApprovalTabKey) => {
    return allApprovals.filter((item) => matchesTab(item, type)).length;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return { bg: 'var(--color-error-light)', text: 'var(--color-error-dark)', border: '#FCA5A5' };
      case 'Medium': return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'Low': return { bg: '#E0F2FE', text: '#0284C7', border: '#7DD3FC' };
      default: return { bg: 'var(--color-cloud)', text: 'var(--color-mercury-grey)', border: 'var(--color-silver)' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PR': return ShoppingCart;
      case 'PO': return FileText;
      case 'Invoice': return Receipt;
      case 'NonPOInvoice': return Receipt;
      case 'PaymentBatch': return CreditCard;
      case 'VendorAdvance': return DollarSign;
      case 'VendorOnboarding': return UserCheck;
      case 'Master': return Database;
      case 'Location': return Package;
      default: return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PR': return 'Purchase Requisition';
      case 'Invoice': return 'PO Invoice';
      case 'NonPOInvoice': return 'Non-PO Invoice';
      case 'PaymentBatch': return 'Payment Batch';
      case 'VendorAdvance': return 'Vendor Advance';
      case 'VendorOnboarding': return 'Vendor Onboarding';
      case 'Location': return 'Location Accept';
      default: return type;
    }
  };

  const handleApprovalAction = (item: ApprovalItem) => {
    if (item.type === 'Master') {
      setExpandedItem(expandedItem === item.id ? null : item.id);
      return;
    }

    if (item.route) {
      navigate(item.route);
    } else {
      alert(`Opening approval screen for ${item.id}`);
    }
  };

  const handleOperationalAction = (
    item: ApprovalItem,
    action: 'approve' | 'reject' | 'request_info',
  ) => {
    if (item.type === 'PR') {
      const request = purchaseRequests.find((entry) => entry.prNumber === item.id);
      if (!request) return;
      if (action === 'approve') {
        updatePurchaseRequestStatus(request.id, 'Approved', { nextApprover: '—' });
      } else if (action === 'reject') {
        updatePurchaseRequestStatus(request.id, 'Rejected', { nextApprover: '—' });
      } else {
        updatePurchaseRequestStatus(request.id, 'In Review', { nextApprover: request.requestor });
      }
      setExpandedItem(null);
      return;
    }

    if (item.type === 'Invoice' || item.type === 'NonPOInvoice') {
      if (action === 'approve') {
        updateInvoice(item.id, { status: 'Approved' });
      } else if (action === 'reject') {
        updateInvoice(item.id, { status: 'Rejected' });
      } else {
        updateInvoice(item.id, { status: 'Under Review' });
      }
      setExpandedItem(null);
      return;
    }

    if (item.type === 'VendorAdvance') {
      if (action === 'approve') {
        updateAdvanceRequest(item.id, { status: 'Approved', paymentStatus: 'Pending' });
      } else if (action === 'reject') {
        updateAdvanceRequest(item.id, { status: 'Rejected' });
      } else {
        updateAdvanceRequest(item.id, { approvalWorkflow: 'Manual' });
      }
      setExpandedItem(null);
      return;
    }

    if (item.module === 'Debit Notes') {
      if (action === 'approve') {
        updateDebitNote(item.id, {
          status: 'Issued',
          issuedBy: user?.name ?? 'Approver',
          issuedDate: new Date().toISOString(),
        });
      } else if (action === 'reject') {
        updateDebitNote(item.id, { status: 'Rejected' });
      } else {
        updateDebitNote(item.id, { status: 'Draft' });
      }
      setExpandedItem(null);
      return;
    }

    if (item.type === 'Location') {
      if (action === 'approve') {
        updateGRN(item.id, { allocationStatus: 'Accepted' });
      } else if (action === 'request_info') {
        updateGRN(item.id, { allocationStatus: 'Partially Allocated' });
      }
      setExpandedItem(null);
    }
  };

  const refreshMasterApprovals = async () => {
    const items = await fetchPendingMasterApprovals();
    setMasterApprovals(items);
  };

  const handleMasterAction = async (
    item: ApprovalItem,
    action: 'approve' | 'reject' | 'request_info',
  ) => {
    const masterItem = item as MasterApprovalItem;

    const nextComments =
      action === 'request_info'
        ? window.prompt('Enter comments for the request:', comments) ?? ''
        : '';
    if (action === 'request_info' && !nextComments) {
      return;
    }
    await updateMasterApprovalStatus(masterItem.masterKey, masterItem.recordId, action, {
      actor: user?.name ?? 'Approver',
      comments: nextComments,
    });
    await refreshMasterApprovals();
    setExpandedItem(null);
    if (action === 'request_info') {
      setComments('');
    }
  };

  const getTotalValue = () => {
    return approvals
      .filter(item => item.value)
      .reduce((sum, item) => {
        const value = parseFloat(item.value!.replace(/[₹,]/g, ''));
        return sum + value;
      }, 0);
  };

  // Tab configuration
  const tabs = [
    { key: 'All', label: 'All Approvals', icon: Target },
    { key: 'PR', label: 'Purchase Requisitions', icon: ShoppingCart },
    { key: 'PO', label: 'Purchase Orders', icon: FileText },
    { key: 'AP_INVOICES', label: 'AP Invoices', icon: Receipt },
    { key: 'DEBIT_NOTES', label: 'Debit Notes', icon: Receipt },
    { key: 'PAYMENTS', label: 'Payment Batches', icon: CreditCard },
    { key: 'VENDOR_ADVANCES', label: 'Vendor Advances', icon: DollarSign },
    { key: 'VENDOR_ONBOARDING', label: 'Vendor Onboarding', icon: UserCheck },
    { key: 'MASTER', label: 'Master Updates', icon: Database },
    { key: 'LOCATION', label: 'Location Accepts', icon: Package }
  ] as const;

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }} className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
          Global Approvals
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
          Consolidated approvals from all modules - Accounts Payable, Procurement, Payments, Vendor Advances, Vendor Onboarding, Masters
        </p>
      </div>

      {/* User Performance Metrics - YTD */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
            My Approval Performance (YTD 2024)
          </h2>
          <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }}>
            As of Dec 14, 2024
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Approvals YTD */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal-tint)' }}>
                <Target className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>342</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Approvals YTD</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>+15%</span>
            </div>
          </div>

          {/* On-Time Approvals */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-light)' }}>
                <Award className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>96%</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>On-Time Approvals</p>
            <div>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>328 of 342</span>
            </div>
          </div>

          {/* Avg Approvals Per Month */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Activity className="w-5 h-5" style={{ color: '#D97706' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>31</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Avg Approvals/Month</p>
            <div>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>11 months</span>
            </div>
          </div>

          {/* Avg Time Per Approval */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F2FE' }}>
                <Timer className="w-5 h-5" style={{ color: '#0284C7' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>3.8h</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Avg Time/Approval</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>22% faster</span>
            </div>
          </div>

          {/* Total Rejections YTD */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-light)' }}>
                <ThumbsDown className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>18</p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Total Rejections YTD</p>
            <div>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>5.3% rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal-tint)' }}>
              <AlertCircle className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>{allApprovals.length}</p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Pending Approvals</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-light)' }}>
              <Clock className="w-6 h-6" style={{ color: 'var(--color-error-dark)' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {allApprovals.filter(a => a.daysWaiting > 2).length}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Aging (&gt;2 days)</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#D97706' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            ₹{(getTotalValue() / 100000).toFixed(2)}L
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Total Value</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-success-light)' }}>
              <Calendar className="w-6 h-6" style={{ color: 'var(--color-success-dark)' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {allApprovals.filter(a => a.daysWaiting <= 1).length}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Recent (Today)</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div 
        className="bg-white rounded-lg mb-6"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-center gap-2 p-2 flex-wrap">
          {tabs.map((tab) => {
            const count = getCountByType(tab.key);
            if (count === 0 && tab.key !== 'All') return null;
            
            const isActive = selectedTab === tab.key;
            const TabIcon = tab.icon;

            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--color-teal-tint)' : 'transparent',
                  color: isActive ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  border: isActive ? '1px solid var(--color-teal)' : '1px solid transparent'
                }}
              >
                <TabIcon className="w-4 h-4" />
                <span className="text-sm">{tab.label}</span>
                {count > 0 && (
                  <span 
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: isActive ? 'var(--color-teal)' : 'var(--color-silver)',
                      color: isActive ? '#FFFFFF' : 'var(--color-mercury-grey)'
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Approvals List */}
      <div className="space-y-3">
        {approvals.length === 0 ? (
          <div 
            className="bg-white p-12 rounded-lg text-center"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-silver)' }} />
            <p className="text-lg mb-2" style={{ color: 'var(--color-ink)' }}>All Caught Up!</p>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              No pending approvals for this category
            </p>
          </div>
        ) : (
          approvals.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            const priorityColor = getPriorityColor(item.priority);
            const isExpanded = expandedItem === item.id;
            const eta = calculateETA(item.submittedDate, item.submittedTime);
            const etaColor = getETAColor(eta.totalHours);
            const submittedDisplay = formatSubmittedDate(item.submittedDate, item.submittedTime);

            return (
              <div
                key={item.id}
                className="bg-white rounded-[20px]"
                style={{ border: '1px solid var(--color-fog)', boxShadow: '0 14px 32px rgba(15, 23, 42, 0.05)' }}
              >
                <div className="grid gap-4 px-5 py-4" style={{ gridTemplateColumns: '2.7fr 1.1fr 1.1fr 1fr 1fr 0.9fr' }}>
                    <div className="flex items-start gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, #EAFBFE 0%, #DFF6FB 100%)' }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-sm" style={{ color: 'var(--color-ink)', fontWeight: 700 }}>
                            {item.title}
                          </h3>
                          <span
                            className="px-2.5 py-1 rounded-full text-[11px]"
                            style={{
                              backgroundColor: 'var(--color-cloud)',
                              color: 'var(--color-mercury-grey)',
                              fontWeight: 700,
                            }}
                          >
                            {getTypeLabel(item.type)}
                          </span>
                          <span
                            className="px-2.5 py-1 rounded-full text-[11px]"
                            style={{
                              backgroundColor: priorityColor.bg,
                              color: priorityColor.text,
                              border: `1px solid ${priorityColor.border}`,
                              fontWeight: 700,
                            }}
                          >
                            {item.priority}
                          </span>

                          {item.daysWaiting > 2 && (
                            <span
                              className="px-2.5 py-1 rounded-full text-[11px] flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--color-error-light)',
                                color: 'var(--color-error-dark)',
                                fontWeight: 700,
                              }}
                            >
                              <AlertCircle className="w-3 h-3" />
                              Aging
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>{item.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#F5F8FB', color: '#334155', fontWeight: 700 }}>
                        {item.module}
                      </span>
                    </div>
                    <div className="flex items-center" style={{ color: 'var(--color-ink)' }}>{item.submittedBy}</div>
                    <div className="flex flex-col justify-center">
                      <span style={{ color: 'var(--color-mercury-grey)' }}>{submittedDisplay.date}</span>
                      <span className="text-xs" style={{ color: '#94A3B8' }}>{submittedDisplay.time}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5" style={{ backgroundColor: etaColor.bg, color: etaColor.color, border: `1px solid ${etaColor.border}`, fontWeight: 700 }}>
                        <Clock className="w-3 h-3" />
                        {formatETA(eta)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <PremiumActionButton label={item.type === 'Master' ? 'Review changes' : 'Review approval'} icon={<Eye className="w-4 h-4" />} tone="teal" onClick={() => handleApprovalAction(item)} />
                      <PremiumActionButton label="Open approval" icon={<ArrowUpRight className="w-4 h-4" />} tone="blue" onClick={() => item.route ? navigate(item.route) : handleApprovalAction(item)} />
                      <PremiumActionButton label={isExpanded ? 'Collapse details' : 'Expand details'} icon={isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} tone="slate" onClick={() => setExpandedItem(isExpanded ? null : item.id)} />
                    </div>
                  </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div 
                    className="px-5 pb-5 pt-3"
                    style={{ borderTop: '1px solid #EAF0F4', backgroundColor: '#FBFEFF' }}
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {Object.entries(item.details).map(([key, value]) => (
                        <div key={key}>
                          <p style={{ color: 'var(--color-mercury-grey)' }} className="text-xs mb-1">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p style={{ color: 'var(--color-ink)' }} className="text-sm">
                            {String(value)}
                          </p>
                        </div>
                      ))}
                    </div>

                    {item.changes && item.changes.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                          Changes:
                        </p>
                        <div className="space-y-2">
                          {item.changes.map((change, idx) => (
                            <div 
                              key={idx}
                              className="p-3 rounded-lg"
                              style={{ backgroundColor: 'var(--color-cloud)' }}
                            >
                              <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>{change.field}</p>
                              <div className="flex items-center gap-2 text-sm">
                                <span style={{ color: 'var(--color-error-dark)' }}>{change.oldValue}</span>
                                <span style={{ color: 'var(--color-mercury-grey)' }}>→</span>
                                <span style={{ color: '#059669' }}>{change.newValue}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {item.type === 'Master' ? (
                      <div className="mt-4 flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleMasterAction(item, 'request_info')}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                          style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', backgroundColor: 'white' }}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Request Info
                        </button>
                        <button
                          onClick={() => handleMasterAction(item, 'reject')}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: 'var(--color-error)' }}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </button>
                        <button
                          onClick={() => handleMasterAction(item, 'approve')}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Approve
                        </button>
                      </div>
                    ) : (
                      <div className="mt-4 flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleOperationalAction(item, 'request_info')}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                          style={{ border: '1px solid var(--color-silver)', color: 'var(--color-mercury-grey)', backgroundColor: 'white' }}
                        >
                          <MessageSquare className="w-4 h-4" />
                          Request Info
                        </button>
                        {item.type !== 'Location' && (
                          <button
                            onClick={() => handleOperationalAction(item, 'reject')}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: 'var(--color-error)' }}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => handleOperationalAction(item, 'approve')}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
                          style={{ backgroundColor: 'var(--color-teal)' }}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {item.type === 'Location' ? 'Accept' : 'Approve'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
