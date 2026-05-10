/**
 * DASHBOARD DATA CONTEXT
 *
 * Reactive context that provides dashboard data based on selected entity.
 * Handles entity-specific filtering and consolidated view with FX conversion.
 */

import { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import { useMasterData } from './MasterDataContext';
import {
  ALL_POS,
  ALL_GRNS,
  ALL_INVOICES,
  ALL_ADVANCES,
  ALL_DEBIT_NOTES,
  POTransaction,
  GRNTransaction,
  InvoiceTransaction,
  VendorAdvanceTransaction,
  DebitNoteTransaction,
} from './EntityTransactionData';

export interface DashboardMetrics {
  // PO Metrics
  totalPOValue: number;
  totalPOValueYTD: number;
  openPOValue: number;
  poCount: number;
  openPOCount: number;
  avgPOProcessingTime: number; // in days

  // GRN Metrics
  pendingGRNs: number;
  grnCount: number;
  totalGRNValue: number;

  // Invoice Metrics
  totalInvoiceValue: number;
  pendingInvoices: number;
  approvedInvoices: number;
  overdueInvoices: number;
  invoiceCount: number;

  // Payment Metrics
  totalPaymentsDue: number;
  upcomingPayments: number;

  // Vendor Advance Metrics
  totalAdvances: number;
  pendingAdvances: number;

  // Debit Note Metrics
  totalDebitNotes: number;
  pendingDebitNotes: number;

  // PO Status Breakdown
  poStatusBreakdown: {
    draft: number;
    approved: number;
    partiallyReceived: number;
    fullyReceived: number;
    closed: number;
  };

  // PO Volume Trend (monthly)
  poVolumeTrend: {
    month: string;
    count: number;
    value: number;
  }[];

  // Invoice Status Breakdown
  invoiceStatusBreakdown: {
    pendingApproval: number;
    approved: number;
    paid: number;
    overdue: number;
  };

  // Entity & Currency Info
  entityId: string | null;
  entityName: string;
  currency: string;
  isConsolidated: boolean;
}

interface DashboardDataContextType {
  metrics: DashboardMetrics;
  pos: POTransaction[];
  grns: GRNTransaction[];
  invoices: InvoiceTransaction[];
  advances: VendorAdvanceTransaction[];
  debitNotes: DebitNoteTransaction[];
  isLoading: boolean;
  refreshData: () => void;
}

const DashboardDataContext = createContext<DashboardDataContextType | undefined>(undefined);

export function DashboardDataProvider({ children }: { children: ReactNode }) {
  const { currentCompany, getExchangeRate } = useMasterData();
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Convert amount to base currency (INR) using exchange rate
  const convertToBaseCurrency = (amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'INR') return amount;

    // Get exchange rate from currency master (only if getExchangeRate is available)
    if (getExchangeRate) {
      const rate = getExchangeRate(fromCurrency, 'INR');
      if (rate) {
        return amount * rate;
      }
    }

    // Fallback rates if not found in master
    const fallbackRates: { [key: string]: number } = {
      AED: 22.68, // 1 AED = 22.68 INR
      USD: 83.25, // 1 USD = 83.25 INR
      EUR: 90.5, // 1 EUR = 90.50 INR
      GBP: 105.2, // 1 GBP = 105.20 INR
    };

    return amount * (fallbackRates[fromCurrency] || 1);
  };

  // Compute dashboard data based on current entity
  const dashboardData = useMemo(() => {
    if (!currentCompany) {
      return {
        metrics: getEmptyMetrics(),
        pos: [],
        grns: [],
        invoices: [],
        advances: [],
        debitNotes: [],
      };
    }

    const isConsolidated = currentCompany.id === 'CONSOLIDATED';

    // Filter transactions by entity (or use all for consolidated)
    const filteredPOs = isConsolidated
      ? ALL_POS
      : ALL_POS.filter((po) => po.entityId === currentCompany.id);

    const filteredGRNs = isConsolidated
      ? ALL_GRNS
      : ALL_GRNS.filter((grn) => grn.entityId === currentCompany.id);

    const filteredInvoices = isConsolidated
      ? ALL_INVOICES
      : ALL_INVOICES.filter((inv) => inv.entityId === currentCompany.id);

    const filteredAdvances = isConsolidated
      ? ALL_ADVANCES
      : ALL_ADVANCES.filter((adv) => adv.entityId === currentCompany.id);

    const filteredDebitNotes = isConsolidated
      ? ALL_DEBIT_NOTES
      : ALL_DEBIT_NOTES.filter((dn) => dn.entityId === currentCompany.id);

    // Calculate metrics
    const metrics = calculateMetrics(
      filteredPOs,
      filteredGRNs,
      filteredInvoices,
      filteredAdvances,
      filteredDebitNotes,
      isConsolidated,
      currentCompany.id,
      currentCompany.name,
      convertToBaseCurrency
    );

    return {
      metrics,
      pos: filteredPOs,
      grns: filteredGRNs,
      invoices: filteredInvoices,
      advances: filteredAdvances,
      debitNotes: filteredDebitNotes,
    };
  }, [currentCompany, refreshTrigger, getExchangeRate]);

  const refreshData = () => {
    setIsLoading(true);
    setTimeout(() => {
      setRefreshTrigger((prev) => prev + 1);
      setIsLoading(false);
    }, 300);
  };

  const value: DashboardDataContextType = {
    ...dashboardData,
    isLoading,
    refreshData,
  };

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (context === undefined) {
    throw new Error('useDashboardData must be used within a DashboardDataProvider');
  }
  return context;
}

// Helper function to get empty metrics
function getEmptyMetrics(): DashboardMetrics {
  return {
    totalPOValue: 0,
    totalPOValueYTD: 0,
    openPOValue: 0,
    poCount: 0,
    openPOCount: 0,
    avgPOProcessingTime: 0,
    pendingGRNs: 0,
    grnCount: 0,
    totalGRNValue: 0,
    totalInvoiceValue: 0,
    pendingInvoices: 0,
    approvedInvoices: 0,
    overdueInvoices: 0,
    invoiceCount: 0,
    totalPaymentsDue: 0,
    upcomingPayments: 0,
    totalAdvances: 0,
    pendingAdvances: 0,
    totalDebitNotes: 0,
    pendingDebitNotes: 0,
    poStatusBreakdown: {
      draft: 0,
      approved: 0,
      partiallyReceived: 0,
      fullyReceived: 0,
      closed: 0,
    },
    poVolumeTrend: [],
    invoiceStatusBreakdown: {
      pendingApproval: 0,
      approved: 0,
      paid: 0,
      overdue: 0,
    },
    entityId: null,
    entityName: 'No Entity Selected',
    currency: 'INR',
    isConsolidated: false,
  };
}

// Calculate all dashboard metrics
function calculateMetrics(
  pos: POTransaction[],
  grns: GRNTransaction[],
  invoices: InvoiceTransaction[],
  advances: VendorAdvanceTransaction[],
  debitNotes: DebitNoteTransaction[],
  isConsolidated: boolean,
  entityId: string,
  entityName: string,
  convertToBaseCurrency: (amount: number, currency: string) => number
): DashboardMetrics {
  // PO Metrics
  const totalPOValue = pos.reduce((sum, po) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(po.totalAmount, po.currency)
      : po.totalAmount;
    return sum + amountInBase;
  }, 0);

  const totalPOValueYTD = totalPOValue; // Simplified - in real app would filter by date

  const openPOs = pos.filter(
    (po) => po.status === 'Approved' || po.status === 'Partially Received'
  );
  const openPOValue = openPOs.reduce((sum, po) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(po.totalAmount, po.currency)
      : po.totalAmount;
    return sum + amountInBase;
  }, 0);

  const poCount = pos.length;
  const openPOCount = openPOs.length;

  // Calculate avg PO processing time (mock calculation)
  const avgPOProcessingTime =
    pos.length > 0
      ? pos.reduce((sum, po) => {
          if (po.approvedDate && po.poDate) {
            const poDate = new Date(po.poDate);
            const approvedDate = new Date(po.approvedDate);
            const diffTime = Math.abs(approvedDate.getTime() - poDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return sum + diffDays;
          }
          return sum + 2; // default
        }, 0) / pos.length
      : 0;

  // GRN Metrics
  const pendingGRNs = grns.filter((grn) => grn.status === 'Pending QC').length;
  const grnCount = grns.length;
  const totalGRNValue = grns.reduce((sum, grn) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(grn.totalAmount, grn.currency)
      : grn.totalAmount;
    return sum + amountInBase;
  }, 0);

  // Invoice Metrics
  const totalInvoiceValue = invoices.reduce((sum, inv) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(inv.totalAmount, inv.currency)
      : inv.totalAmount;
    return sum + amountInBase;
  }, 0);

  const pendingInvoices = invoices.filter((inv) => inv.status === 'Pending Approval').length;
  const approvedInvoices = invoices.filter((inv) => inv.status === 'Approved').length;
  const overdueInvoices = invoices.filter((inv) => inv.status === 'Overdue').length;
  const invoiceCount = invoices.length;

  // Payment Metrics
  const pendingPaymentInvoices = invoices.filter(
    (inv) => inv.status === 'Approved' || inv.status === 'Overdue'
  );
  const totalPaymentsDue = pendingPaymentInvoices.reduce((sum, inv) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(inv.totalAmount, inv.currency)
      : inv.totalAmount;
    return sum + amountInBase;
  }, 0);
  const upcomingPayments = pendingPaymentInvoices.length;

  // Vendor Advance Metrics
  const totalAdvances = advances.reduce((sum, adv) => {
    const amountInBase = isConsolidated
      ? convertToBaseCurrency(adv.amount, adv.currency)
      : adv.amount;
    return sum + amountInBase;
  }, 0);
  const pendingAdvances = advances.filter((adv) => adv.status === 'Pending Approval').length;

  // Debit Note Metrics
  const totalDebitNotes = debitNotes.reduce((sum, dn) => {
    const amountInBase = isConsolidated ? convertToBaseCurrency(dn.amount, dn.currency) : dn.amount;
    return sum + amountInBase;
  }, 0);
  const pendingDebitNotes = debitNotes.filter(
    (dn) => dn.status === 'Pending Approval' || dn.status === 'Draft'
  ).length;

  // PO Status Breakdown
  const poStatusBreakdown = {
    draft: pos.filter((po) => po.status === 'Draft').length,
    approved: pos.filter((po) => po.status === 'Approved').length,
    partiallyReceived: pos.filter((po) => po.status === 'Partially Received').length,
    fullyReceived: pos.filter((po) => po.status === 'Fully Received').length,
    closed: pos.filter((po) => po.status === 'Closed').length,
  };

  // PO Volume Trend (last 6 months - mock data)
  const poVolumeTrend = generatePOVolumeTrend(pos, isConsolidated, convertToBaseCurrency);

  // Invoice Status Breakdown
  const invoiceStatusBreakdown = {
    pendingApproval: pendingInvoices,
    approved: approvedInvoices,
    paid: invoices.filter((inv) => inv.status === 'Paid' || inv.status === 'Partially Paid').length,
    overdue: overdueInvoices,
  };

  // Determine currency display
  let currency = 'INR';
  if (!isConsolidated && pos.length > 0) {
    currency = pos[0].currency;
  } else if (isConsolidated) {
    currency = 'INR'; // Base currency for consolidated view
  }

  return {
    totalPOValue,
    totalPOValueYTD,
    openPOValue,
    poCount,
    openPOCount,
    avgPOProcessingTime,
    pendingGRNs,
    grnCount,
    totalGRNValue,
    totalInvoiceValue,
    pendingInvoices,
    approvedInvoices,
    overdueInvoices,
    invoiceCount,
    totalPaymentsDue,
    upcomingPayments,
    totalAdvances,
    pendingAdvances,
    totalDebitNotes,
    pendingDebitNotes,
    poStatusBreakdown,
    poVolumeTrend,
    invoiceStatusBreakdown,
    entityId: isConsolidated ? 'CONSOLIDATED' : entityId,
    entityName: isConsolidated ? 'Consolidated View' : entityName,
    currency,
    isConsolidated,
  };
}

// Generate PO volume trend data
function generatePOVolumeTrend(
  pos: POTransaction[],
  isConsolidated: boolean,
  convertToBaseCurrency: (amount: number, currency: string) => number
): { month: string; count: number; value: number }[] {
  const months = ['Nov', 'Dec'];

  return months.map((month) => {
    // Filter POs by month (simplified - just using Nov/Dec 2024)
    const monthNumber = month === 'Nov' ? 11 : 12;
    const monthPOs = pos.filter((po) => {
      const poDate = new Date(po.poDate);
      return poDate.getMonth() + 1 === monthNumber;
    });

    const value = monthPOs.reduce((sum, po) => {
      const amountInBase = isConsolidated
        ? convertToBaseCurrency(po.totalAmount, po.currency)
        : po.totalAmount;
      return sum + amountInBase;
    }, 0);

    return {
      month,
      count: monthPOs.length,
      value,
    };
  });
}
