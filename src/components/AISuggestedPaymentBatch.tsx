import { useState } from 'react';
import {
  Sparkles,
  Info,
  TrendingDown,
  TrendingUp,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  DollarSign,
  Calendar,
  BarChart3,
  Filter,
  Download,
  Send,
  Eye,
  HelpCircle,
  Building2,
  FileText,
  AlertCircle,
  Ban,
  RefreshCw,
  Zap,
  Target,
  Award,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts';

interface Invoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  dueDate: string;
  amount: number;
  aging: number;
  priorityScore: number;
  reasons: string[];
  recommendedPayDate: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  selected: boolean;
}

interface ExcludedInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  amount: number;
  riskType: string;
  aiRecommendation: string;
  actionRequired: string;
  riskLevel: 'high' | 'medium' | 'low';
}

const mockInvoices: Invoice[] = [
  {
    id: '1',
    vendorName: 'Tech Solutions Pvt Ltd',
    invoiceNumber: 'INV-2024-8901',
    dueDate: '2024-12-15',
    amount: 145000,
    aging: -2,
    priorityScore: 98,
    reasons: ['Due in 2 days', '2% Discount expiring tomorrow', 'Critical Vendor'],
    recommendedPayDate: '2024-12-14',
    urgency: 'critical',
    selected: true,
  },
  {
    id: '2',
    vendorName: 'Global Logistics Inc',
    invoiceNumber: 'INV-2024-8902',
    dueDate: '2024-12-10',
    amount: 89000,
    aging: 3,
    priorityScore: 95,
    reasons: ['Overdue 3 days', 'Penalty clause risk'],
    recommendedPayDate: '2024-12-13',
    urgency: 'critical',
    selected: true,
  },
  {
    id: '3',
    vendorName: 'Office Supplies Co',
    invoiceNumber: 'INV-2024-8903',
    dueDate: '2024-12-18',
    amount: 32000,
    aging: -5,
    priorityScore: 85,
    reasons: ['Critical Vendor', '1% Discount available'],
    recommendedPayDate: '2024-12-16',
    urgency: 'high',
    selected: true,
  },
  {
    id: '4',
    vendorName: 'Manufacturing Partners Ltd',
    invoiceNumber: 'INV-2024-8904',
    dueDate: '2024-12-20',
    amount: 256000,
    aging: -7,
    priorityScore: 82,
    reasons: ['High-value invoice', 'Strategic vendor'],
    recommendedPayDate: '2024-12-18',
    urgency: 'high',
    selected: true,
  },
  {
    id: '5',
    vendorName: 'Marketing Agency Pro',
    invoiceNumber: 'INV-2024-8905',
    dueDate: '2024-12-22',
    amount: 78000,
    aging: -9,
    priorityScore: 75,
    reasons: ['Within terms', 'Regular vendor'],
    recommendedPayDate: '2024-12-20',
    urgency: 'medium',
    selected: true,
  },
  {
    id: '6',
    vendorName: 'Cloud Services Corp',
    invoiceNumber: 'INV-2024-8906',
    dueDate: '2024-12-25',
    amount: 124000,
    aging: -12,
    priorityScore: 70,
    reasons: ['Critical Service', 'Auto-renewal vendor'],
    recommendedPayDate: '2024-12-23',
    urgency: 'medium',
    selected: false,
  },
  {
    id: '7',
    vendorName: 'Consulting Group Asia',
    invoiceNumber: 'INV-2024-8907',
    dueDate: '2024-12-28',
    amount: 195000,
    aging: -15,
    priorityScore: 65,
    reasons: ['Professional services', 'Within credit terms'],
    recommendedPayDate: '2024-12-26',
    urgency: 'low',
    selected: false,
  },
];

const mockExcludedInvoices: ExcludedInvoice[] = [
  {
    id: 'EX-1',
    vendorName: 'Suspicious Trading Co',
    invoiceNumber: 'INV-2024-8908',
    amount: 234000,
    riskType: 'Bank Details Changed Recently',
    aiRecommendation: 'Hold – bank details changed 2 days ago',
    actionRequired: 'Verify with vendor via registered contact',
    riskLevel: 'high',
  },
  {
    id: 'EX-2',
    vendorName: 'Tech Solutions Pvt Ltd',
    invoiceNumber: 'INV-2024-8909',
    amount: 145000,
    riskType: 'Possible Duplicate',
    aiRecommendation: 'Review – possible duplicate of INV-2024-8901',
    actionRequired: 'Manual review required',
    riskLevel: 'medium',
  },
  {
    id: 'EX-3',
    vendorName: 'Import Export LLC',
    invoiceNumber: 'INV-2024-8910',
    amount: 567000,
    riskType: 'High Price Variance',
    aiRecommendation: 'Review – 45% higher than average invoice value',
    actionRequired: 'PO and GRN validation needed',
    riskLevel: 'medium',
  },
  {
    id: 'EX-4',
    vendorName: 'Construction Services Inc',
    invoiceNumber: 'INV-2024-8911',
    amount: 890000,
    riskType: 'Missing Compliance Documents',
    aiRecommendation: 'Block – missing mandatory TDS certificate',
    actionRequired: 'Obtain compliance documents',
    riskLevel: 'high',
  },
];

const cashflowData = [
  { day: 'Mon 9', balance: 8500000, outflow: 0 },
  { day: 'Tue 10', balance: 8500000, outflow: 0 },
  { day: 'Wed 11', balance: 8500000, outflow: 0 },
  { day: 'Thu 12', balance: 8500000, outflow: 0 },
  { day: 'Fri 13', balance: 7776000, outflow: 724000 }, // After suggested payment
  { day: 'Sat 14', balance: 7776000, outflow: 0 },
  { day: 'Sun 15', balance: 7776000, outflow: 0 },
];

const outflowData = [
  { day: 'Mon', amount: 0, label: 'Mon 9 Dec' },
  { day: 'Tue', amount: 0, label: 'Tue 10 Dec' },
  { day: 'Wed', amount: 0, label: 'Wed 11 Dec' },
  { day: 'Thu', amount: 0, label: 'Thu 12 Dec' },
  { day: 'Fri', amount: 724000, label: 'Fri 13 Dec' },
  { day: 'Sat', amount: 0, label: 'Sat 14 Dec' },
  { day: 'Sun', amount: 0, label: 'Sun 15 Dec' },
];

export function AISuggestedPaymentBatch() {
  const [activeTab, setActiveTab] = useState<'suggested' | 'review'>('suggested');
  const [showCashflowPanel, setShowCashflowPanel] = useState(false);
  const [cashBufferValue, setCashBufferValue] = useState(5000000);
  const [maxBatchAmount, setMaxBatchAmount] = useState(1000000);
  const [priorityMode, setPriorityMode] = useState<'risk' | 'discount'>('risk');
  const [autoExcludeRisk, setAutoExcludeRisk] = useState(true);
  const [paymentDate, setPaymentDate] = useState('today');
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [scenarioTab, setScenarioTab] = useState<'recommended' | 'delayed' | 'maximize'>(
    'recommended'
  );

  const selectedInvoices = invoices.filter((inv) => inv.selected);
  const totalAmount = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const cashBalanceBefore = 8500000;
  const cashBalanceAfter = cashBalanceBefore - totalAmount;
  const discountsCaptured = 2900 + 890;
  const penaltiesAvoided = 4500 + 2200;
  const criticalVendors = selectedInvoices.filter(
    (inv) => inv.reasons.includes('Critical Vendor') || inv.reasons.includes('Strategic vendor')
  ).length;

  const toggleInvoiceSelection = (id: string) => {
    setInvoices(invoices.map((inv) => (inv.id === id ? { ...inv, selected: !inv.selected } : inv)));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'var(--color-error)';
      case 'high':
        return '#F59E0B';
      case 'medium':
        return 'var(--color-teal)';
      case 'low':
        return 'var(--color-mercury-grey)';
      default:
        return 'var(--color-mercury-grey)';
    }
  };

  const getReasonChipColor = (reason: string) => {
    if (reason.includes('Overdue') || reason.includes('Penalty'))
      return { bg: 'var(--color-error-light)', text: 'var(--color-error-dark)' };
    if (reason.includes('Due in') || reason.includes('expiring'))
      return { bg: '#FEF3C7', text: '#D97706' };
    if (reason.includes('Discount')) return { bg: '#D1FAE5', text: '#059669' };
    if (reason.includes('Critical')) return { bg: '#E0F2FE', text: '#0284C7' };
    return { bg: '#F3F4F6', text: '#6B7280' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh', padding: '24px' }}>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1
              style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}
            >
              AI Suggested Payment Batch
            </h1>
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full"
              style={{ backgroundColor: '#E0F2FE', border: '1px solid var(--color-teal)' }}
            >
              <Sparkles style={{ width: '14px', height: '14px', color: 'var(--color-teal)' }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-teal)' }}>
                AI Recommended
              </span>
            </div>
            <div className="relative group">
              <Info
                style={{
                  width: '16px',
                  height: '16px',
                  color: 'var(--color-mercury-grey)',
                  cursor: 'help',
                }}
              />
              <div
                className="absolute left-0 top-full mt-2 w-72 p-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
                style={{
                  backgroundColor: 'var(--color-ink)',
                  color: '#FFFFFF',
                  fontSize: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}
              >
                Based on due dates, vendor criticality, discount opportunities, penalty risks, and
                current cash constraints
              </div>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: 0 }}>
            Intelligently prioritized invoices ready for payment approval
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCashflowPanel(!showCashflowPanel)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: showCashflowPanel ? 'var(--color-teal)' : '#FFFFFF',
              color: showCashflowPanel ? '#FFFFFF' : 'var(--color-ink)',
              border: '1px solid var(--color-silver)',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <BarChart3 style={{ width: '16px', height: '16px' }} />
            Cashflow Impact
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: '#FFFFFF',
              color: 'var(--color-ink)',
              border: '1px solid var(--color-silver)',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            <Download style={{ width: '16px', height: '16px' }} />
            Export
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor: 'var(--color-teal)',
              color: '#FFFFFF',
              border: 'none',
              fontSize: '14px',
              fontWeight: '500',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
          >
            <Send style={{ width: '16px', height: '16px' }} />
            Create Payment Batch
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-7 gap-4 mb-6">
        {/* AI Recommended Amount */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              AI Recommended Amount
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            {formatCurrency(totalAmount)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown style={{ width: '12px', height: '12px', color: '#059669' }} />
            <span style={{ fontSize: '11px', color: '#059669' }}>Optimized</span>
          </div>
        </div>

        {/* Invoices Selected */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <FileText
              style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
            />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Invoices Selected
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            {selectedInvoices.length} / {invoices.length}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>invoices</span>
        </div>

        {/* Cash Before */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign
              style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
            />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Cash Before
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            {formatCurrency(cashBalanceBefore)}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
            Available balance
          </span>
        </div>

        {/* Cash After */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign
              style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
            />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Cash After
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: 'var(--color-teal)', margin: 0 }}>
            {formatCurrency(cashBalanceAfter)}
          </p>
          <div className="flex items-center gap-1 mt-1">
            <CheckCircle style={{ width: '12px', height: '12px', color: '#059669' }} />
            <span style={{ fontSize: '11px', color: '#059669' }}>Above buffer</span>
          </div>
        </div>

        {/* Discounts Captured */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Award style={{ width: '16px', height: '16px', color: '#059669' }} />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Discounts Captured
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: '#059669', margin: 0 }}>
            {formatCurrency(discountsCaptured)}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
            Savings earned
          </span>
        </div>

        {/* Penalties Avoided */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield style={{ width: '16px', height: '16px', color: '#F59E0B' }} />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Penalties Avoided
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: '#F59E0B', margin: 0 }}>
            {formatCurrency(penaltiesAvoided)}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
            Risk mitigated
          </span>
        </div>

        {/* Critical Vendors */}
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Users style={{ width: '16px', height: '16px', color: '#0284C7' }} />
            <span
              style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', fontWeight: '500' }}
            >
              Critical Vendors
            </span>
          </div>
          <p style={{ fontSize: '20px', fontWeight: '600', color: '#0284C7', margin: 0 }}>
            {criticalVendors}
          </p>
          <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
            vendors covered
          </span>
        </div>
      </div>

      {/* Interactive Control Panel */}
      <div
        className="p-5 rounded-lg mb-6"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Target style={{ width: '18px', height: '18px', color: 'var(--color-teal)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
            Optimization Controls
          </h3>
          <div
            className="px-2 py-0.5 rounded text-xs"
            style={{
              backgroundColor: 'var(--color-teal-tint)',
              color: 'var(--color-teal)',
              fontSize: '11px',
              fontWeight: '500',
            }}
          >
            Real-time adjustment
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Column 1 - Sliders */}
          <div className="space-y-5">
            {/* Min Cash Buffer */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                  Minimum Cash Buffer
                </label>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-teal)' }}>
                  {formatCurrency(cashBufferValue)}
                </span>
              </div>
              <input
                type="range"
                min="1000000"
                max="10000000"
                step="100000"
                value={cashBufferValue}
                onChange={(e) => setCashBufferValue(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
                Ensures minimum cash reserve after payment
              </p>
            </div>

            {/* Max Batch Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                  Max Payment Batch Amount
                </label>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-teal)' }}>
                  {formatCurrency(maxBatchAmount)}
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="2000000"
                step="50000"
                value={maxBatchAmount}
                onChange={(e) => setMaxBatchAmount(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--color-teal)' }}
              />
              <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
                Limits total payment amount in this batch
              </p>
            </div>
          </div>

          {/* Column 2 - Toggles */}
          <div className="space-y-5">
            {/* Priority Mode Toggle */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--color-ink)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Optimization Priority
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPriorityMode('risk')}
                  className="flex-1 px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor:
                      priorityMode === 'risk' ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: priorityMode === 'risk' ? '#FFFFFF' : 'var(--color-mercury-grey)',
                    border: `1px solid ${priorityMode === 'risk' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  <Shield
                    style={{ width: '14px', height: '14px', display: 'inline', marginRight: '6px' }}
                  />
                  Risk Avoidance
                </button>
                <button
                  onClick={() => setPriorityMode('discount')}
                  className="flex-1 px-4 py-2 rounded-lg transition-all"
                  style={{
                    backgroundColor:
                      priorityMode === 'discount' ? 'var(--color-teal)' : 'var(--color-cloud)',
                    color: priorityMode === 'discount' ? '#FFFFFF' : 'var(--color-mercury-grey)',
                    border: `1px solid ${priorityMode === 'discount' ? 'var(--color-teal)' : 'var(--color-silver)'}`,
                    fontSize: '13px',
                    fontWeight: '500',
                  }}
                >
                  <Award
                    style={{ width: '14px', height: '14px', display: 'inline', marginRight: '6px' }}
                  />
                  Maximize Discounts
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
                Choose AI optimization strategy
              </p>
            </div>

            {/* Auto Exclude Risk */}
            <div>
              <div className="flex items-center justify-between">
                <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}>
                  Auto-exclude High-Risk Invoices
                </label>
                <button
                  onClick={() => setAutoExcludeRisk(!autoExcludeRisk)}
                  className="relative rounded-full transition-all"
                  style={{
                    width: '44px',
                    height: '24px',
                    backgroundColor: autoExcludeRisk ? 'var(--color-teal)' : 'var(--color-silver)',
                  }}
                >
                  <span
                    className="absolute top-1 rounded-full transition-all"
                    style={{
                      width: '16px',
                      height: '16px',
                      backgroundColor: '#FFFFFF',
                      left: autoExcludeRisk ? '26px' : '2px',
                    }}
                  />
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
                Automatically moves suspicious invoices to review queue
              </p>
            </div>
          </div>

          {/* Column 3 - Payment Date & Impact */}
          <div className="space-y-5">
            {/* Payment Date */}
            <div>
              <label
                style={{
                  fontSize: '13px',
                  fontWeight: '500',
                  color: 'var(--color-ink)',
                  display: 'block',
                  marginBottom: '8px',
                }}
              >
                Payment Date
              </label>
              <select
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                  fontSize: '13px',
                }}
              >
                <option value="today">Today (Dec 13, 2024)</option>
                <option value="next">Next Working Day (Dec 16, 2024)</option>
                <option value="custom">Custom Date</option>
              </select>
              <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
                When to execute this payment batch
              </p>
            </div>

            {/* Real-time Impact */}
            <div
              className="p-3 rounded-lg"
              style={{
                backgroundColor: 'var(--color-teal-tint)',
                border: '1px solid var(--color-teal)',
              }}
            >
              <div className="flex items-start gap-2">
                <Info
                  style={{
                    width: '14px',
                    height: '14px',
                    color: 'var(--color-teal)',
                    marginTop: '2px',
                    flexShrink: 0,
                  }}
                />
                <div>
                  <p
                    style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    Impact Preview
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-mercury-grey)',
                      margin: '4px 0 0 0',
                      lineHeight: '1.5',
                    }}
                  >
                    Adjusting controls will change invoice selection and cash balance in real-time
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => setActiveTab('suggested')}
          className="relative px-4 py-2 transition-all"
          style={{
            color: activeTab === 'suggested' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: 'transparent',
            border: 'none',
          }}
        >
          Suggested Payments ({selectedInvoices.length})
          {activeTab === 'suggested' && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: 'var(--color-teal)',
              }}
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('review')}
          className="relative px-4 py-2 transition-all"
          style={{
            color: activeTab === 'review' ? '#F59E0B' : 'var(--color-mercury-grey)',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: 'transparent',
            border: 'none',
          }}
        >
          <div className="flex items-center gap-2">
            Review Queue ({mockExcludedInvoices.length})
            <div
              className="px-1.5 py-0.5 rounded-full"
              style={{
                backgroundColor: '#FEF3C7',
                fontSize: '10px',
                fontWeight: '600',
                color: '#D97706',
              }}
            >
              Action Required
            </div>
          </div>
          {activeTab === 'review' && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#F59E0B',
              }}
            />
          )}
        </button>
      </div>

      {/* Suggested Payments Table */}
      {activeTab === 'suggested' && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    borderBottom: '1px solid var(--color-silver)',
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                      width: '40px',
                    }}
                  >
                    <input type="checkbox" style={{ accentColor: 'var(--color-teal)' }} />
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Vendor Name
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Invoice Number
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Due Date
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Aging
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Priority Score
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    AI Reasoning
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Recommended Pay Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="group transition-all"
                    style={{
                      borderBottom: '1px solid var(--color-silver)',
                      backgroundColor: invoice.selected ? '#F0FDFF' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!invoice.selected)
                        e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
                    }}
                    onMouseLeave={(e) => {
                      if (!invoice.selected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px' }}>
                      <input
                        type="checkbox"
                        checked={invoice.selected}
                        onChange={() => toggleInvoiceSelection(invoice.id)}
                        style={{ accentColor: 'var(--color-teal)' }}
                      />
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            width: '4px',
                            height: '32px',
                            backgroundColor: getUrgencyColor(invoice.urgency),
                            borderRadius: '2px',
                          }}
                        />
                        <span
                          style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}
                        >
                          {invoice.vendorName}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '16px',
                        fontSize: '13px',
                        color: 'var(--color-mercury-grey)',
                      }}
                    >
                      {invoice.invoiceNumber}
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-ink)' }}>
                      {new Date(invoice.dueDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td
                      style={{
                        padding: '16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--color-ink)',
                        textAlign: 'right',
                      }}
                    >
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span
                        className="px-2 py-1 rounded-full"
                        style={{
                          backgroundColor:
                            invoice.aging > 0
                              ? 'var(--color-error-light)'
                              : 'var(--color-teal-tint)',
                          color:
                            invoice.aging > 0 ? 'var(--color-error-dark)' : 'var(--color-teal)',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {invoice.aging > 0 ? `+${invoice.aging}` : invoice.aging} days
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div className="flex items-center justify-center gap-2">
                        <div className="relative" style={{ width: '32px', height: '32px' }}>
                          <svg
                            style={{ width: '32px', height: '32px', transform: 'rotate(-90deg)' }}
                          >
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="var(--color-silver)"
                              strokeWidth="3"
                              fill="none"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke={getUrgencyColor(invoice.urgency)}
                              strokeWidth="3"
                              fill="none"
                              strokeDasharray={`${(invoice.priorityScore / 100) * 88} 88`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: '10px',
                              fontWeight: '600',
                              color: getUrgencyColor(invoice.urgency),
                            }}
                          >
                            {invoice.priorityScore}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="flex flex-wrap gap-1.5">
                        {invoice.reasons.map((reason, idx) => {
                          const colors = getReasonChipColor(reason);
                          return (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded"
                              style={{
                                backgroundColor: colors.bg,
                                color: colors.text,
                                fontSize: '11px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {reason}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '13px', color: 'var(--color-ink)' }}>
                      <div className="flex items-center gap-2">
                        <Calendar
                          style={{
                            width: '14px',
                            height: '14px',
                            color: 'var(--color-mercury-grey)',
                          }}
                        />
                        {new Date(invoice.recommendedPayDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Queue Table */}
      {activeTab === 'review' && (
        <div
          className="rounded-lg overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
        >
          {/* Warning Banner */}
          <div
            className="p-4 flex items-start gap-3"
            style={{ backgroundColor: '#FEF3C7', borderBottom: '1px solid #F59E0B' }}
          >
            <AlertTriangle
              style={{ width: '20px', height: '20px', color: '#D97706', marginTop: '2px' }}
            />
            <div>
              <p
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  margin: 0,
                }}
              >
                AI-Flagged Invoices Requiring Review
              </p>
              <p
                style={{
                  fontSize: '13px',
                  color: 'var(--color-mercury-grey)',
                  margin: '4px 0 0 0',
                }}
              >
                These invoices have been automatically excluded from the payment batch due to
                detected risks. Manual verification required before payment.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    borderBottom: '1px solid var(--color-silver)',
                  }}
                >
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Vendor
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Invoice Number
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Amount
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Risk Type
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    AI Recommendation
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Action Required
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockExcludedInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="transition-all"
                    style={{ borderBottom: '1px solid var(--color-silver)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FEF3C7')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-ink)' }}
                      >
                        {invoice.vendorName}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '16px',
                        fontSize: '13px',
                        color: 'var(--color-mercury-grey)',
                      }}
                    >
                      {invoice.invoiceNumber}
                    </td>
                    <td
                      style={{
                        padding: '16px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: 'var(--color-ink)',
                        textAlign: 'right',
                      }}
                    >
                      {formatCurrency(invoice.amount)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="flex items-center gap-2">
                        {invoice.riskLevel === 'high' && (
                          <Ban
                            style={{
                              width: '14px',
                              height: '14px',
                              color: 'var(--color-error-dark)',
                            }}
                          />
                        )}
                        {invoice.riskLevel === 'medium' && (
                          <AlertCircle
                            style={{ width: '14px', height: '14px', color: '#F59E0B' }}
                          />
                        )}
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: '500',
                            color:
                              invoice.riskLevel === 'high' ? 'var(--color-error-dark)' : '#F59E0B',
                          }}
                        >
                          {invoice.riskType}
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div
                        className="px-3 py-2 rounded-lg inline-flex items-center gap-2"
                        style={{
                          backgroundColor:
                            invoice.riskLevel === 'high' ? 'var(--color-error-light)' : '#FEF3C7',
                          border: `1px solid ${invoice.riskLevel === 'high' ? '#FCA5A5' : '#FCD34D'}`,
                        }}
                      >
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '500',
                            color:
                              invoice.riskLevel === 'high' ? 'var(--color-error-dark)' : '#D97706',
                          }}
                        >
                          {invoice.aiRecommendation}
                        </span>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: '16px',
                        fontSize: '13px',
                        color: 'var(--color-mercury-grey)',
                      }}
                    >
                      {invoice.actionRequired}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)',
                          }}
                          title="View Details"
                        >
                          <Eye
                            style={{
                              width: '16px',
                              height: '16px',
                              color: 'var(--color-mercury-grey)',
                            }}
                          />
                        </button>
                        <button
                          className="p-2 rounded-lg transition-all"
                          style={{
                            backgroundColor: 'var(--color-cloud)',
                            border: '1px solid var(--color-silver)',
                          }}
                          title="Override & Approve"
                        >
                          <CheckCircle
                            style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cashflow Impact Panel */}
      {showCashflowPanel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
          onClick={() => setShowCashflowPanel(false)}
        >
          <div
            className="bg-white h-full overflow-y-auto"
            style={{ width: '700px', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div
              className="sticky top-0 flex items-center justify-between p-6"
              style={{
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid var(--color-silver)',
                zIndex: 10,
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    margin: 0,
                  }}
                >
                  Cashflow Impact Analysis
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--color-mercury-grey)',
                    margin: '4px 0 0 0',
                  }}
                >
                  Treasury-grade scenario modeling
                </p>
              </div>
              <button
                onClick={() => setShowCashflowPanel(false)}
                className="p-2 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--color-cloud)' }}
              >
                <X style={{ width: '20px', height: '20px', color: 'var(--color-mercury-grey)' }} />
              </button>
            </div>

            {/* Scenario Tabs */}
            <div
              className="flex items-center gap-2 px-6 pt-4"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <button
                onClick={() => setScenarioTab('recommended')}
                className="px-4 py-2 transition-all relative"
                style={{
                  color:
                    scenarioTab === 'recommended'
                      ? 'var(--color-teal)'
                      : 'var(--color-mercury-grey)',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: 'transparent',
                  border: 'none',
                }}
              >
                Pay as Recommended
                {scenarioTab === 'recommended' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: 'var(--color-teal)',
                    }}
                  />
                )}
              </button>
              <button
                onClick={() => setScenarioTab('delayed')}
                className="px-4 py-2 transition-all relative"
                style={{
                  color:
                    scenarioTab === 'delayed' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: 'transparent',
                  border: 'none',
                }}
              >
                Delay Non-Critical
                {scenarioTab === 'delayed' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: 'var(--color-teal)',
                    }}
                  />
                )}
              </button>
              <button
                onClick={() => setScenarioTab('maximize')}
                className="px-4 py-2 transition-all relative"
                style={{
                  color:
                    scenarioTab === 'maximize' ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: 'transparent',
                  border: 'none',
                }}
              >
                Maximize Discounts
                {scenarioTab === 'maximize' && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '2px',
                      backgroundColor: 'var(--color-teal)',
                    }}
                  />
                )}
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-6 space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
                    Opening Balance
                  </p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: 'var(--color-ink)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {formatCurrency(8500000)}
                  </p>
                </div>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-teal-tint)',
                    border: '1px solid var(--color-teal)',
                  }}
                >
                  <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
                    Closing Balance
                  </p>
                  <p
                    style={{
                      fontSize: '20px',
                      fontWeight: '600',
                      color: 'var(--color-teal)',
                      margin: '4px 0 0 0',
                    }}
                  >
                    {formatCurrency(7776000)}
                  </p>
                </div>
              </div>

              {/* Threshold Indicator */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#D1FAE5', border: '1px solid #059669' }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle style={{ width: '20px', height: '20px', color: '#059669' }} />
                  <div>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--color-ink)',
                        margin: 0,
                      }}
                    >
                      Minimum Cash Threshold: Safe
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-mercury-grey)',
                        margin: '4px 0 0 0',
                      }}
                    >
                      Closing balance ₹77.8L exceeds minimum buffer of ₹50L by ₹27.8L
                    </p>
                  </div>
                </div>
              </div>

              {/* Cash Balance Trend */}
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    marginBottom: '12px',
                  }}
                >
                  Cash Balance Trend (Next 7 Days)
                </h3>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={cashflowData}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-teal)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--color-teal)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                      <XAxis
                        dataKey="day"
                        stroke="var(--color-mercury-grey)"
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis
                        stroke="var(--color-mercury-grey)"
                        style={{ fontSize: '11px' }}
                        tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-silver)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                      />
                      <Area
                        type="monotone"
                        dataKey="balance"
                        stroke="var(--color-teal)"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalance)"
                      />
                      {/* Minimum threshold line */}
                      <Line
                        type="monotone"
                        dataKey={() => 5000000}
                        stroke="var(--color-error-dark)"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-3">
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          backgroundColor: 'var(--color-teal)',
                          borderRadius: '2px',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
                        Cash Balance
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: '12px',
                          height: '2px',
                          backgroundColor: 'var(--color-error-dark)',
                          borderRadius: '2px',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}>
                        Min Buffer (₹50L)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Cash Outflow */}
              <div>
                <h3
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    marginBottom: '12px',
                  }}
                >
                  Daily Cash Outflow
                </h3>
                <div
                  className="p-4 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                  }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={outflowData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                      <XAxis
                        dataKey="day"
                        stroke="var(--color-mercury-grey)"
                        style={{ fontSize: '11px' }}
                      />
                      <YAxis
                        stroke="var(--color-mercury-grey)"
                        style={{ fontSize: '11px' }}
                        tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid var(--color-silver)',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => formatCurrency(value)}
                        labelFormatter={(label: any, payload: any) => {
                          if (payload && payload[0]) {
                            return payload[0].payload.label;
                          }
                          return label;
                        }}
                      />
                      <Bar dataKey="amount" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Scenario Summary */}
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--color-silver)' }}
              >
                <h4
                  style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    marginBottom: '12px',
                  }}
                >
                  Scenario Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                      Total Payment Amount
                    </span>
                    <span
                      style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}
                    >
                      {formatCurrency(724000)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                      Number of Invoices
                    </span>
                    <span
                      style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}
                    >
                      5 invoices
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                      Discounts Captured
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                      {formatCurrency(3790)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                      Penalties Avoided
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#F59E0B' }}>
                      {formatCurrency(6700)}
                    </span>
                  </div>
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: 'var(--color-silver)',
                      margin: '8px 0',
                    }}
                  />
                  <div className="flex items-center justify-between">
                    <span
                      style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-ink)' }}
                    >
                      Net Financial Impact
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: '#059669' }}>
                      +{formatCurrency(10490)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  className="flex-1 px-4 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: 'var(--color-teal)',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal)')
                  }
                >
                  <CheckCircle
                    style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px' }}
                  />
                  Approve Scenario
                </button>
                <button
                  className="px-4 py-3 rounded-lg transition-all"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: 'var(--color-mercury-grey)',
                    border: '1px solid var(--color-silver)',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  <Download
                    style={{ width: '16px', height: '16px', display: 'inline', marginRight: '8px' }}
                  />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
