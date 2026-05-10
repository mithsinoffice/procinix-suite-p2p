import { useState } from 'react';
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Target,
  Award,
  Activity,
  Timer,
  ThumbsDown,
  Package,
  Database,
  AlertCircle,
  Eye,
  Edit,
  Send,
  IndianRupee,
  Users,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DashboardItem {
  id: string;
  type: 'PO Created' | 'PO To Approve' | 'GRN' | 'Master';
  title: string;
  date: string;
  time: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Pending Approval' | 'Info Requested';
  value?: string;
  priority?: 'High' | 'Medium' | 'Low';
  details: any;
}

const mockCombinedData: DashboardItem[] = [
  // POs I Created
  {
    id: 'PO-2024-0161',
    type: 'PO Created',
    title: 'Purchase Order #PO-2024-0161',
    date: '2024-12-12',
    time: '10:30:00',
    status: 'Draft',
    value: '₹1,45,000',
    details: {
      vendor: 'Tata Motors Ltd.',
      items: 4,
      deliveryDate: '2024-12-25',
    },
  },
  {
    id: 'PO-2024-0160',
    type: 'PO Created',
    title: 'Purchase Order #PO-2024-0160',
    date: '2024-12-11',
    time: '14:45:00',
    status: 'Submitted',
    value: '₹3,45,900',
    details: {
      vendor: 'Bharat Heavy Electricals Ltd.',
      items: 8,
      deliveryDate: '2024-12-28',
      approver: 'Amit Patel',
    },
  },
  {
    id: 'PO-2024-0159',
    type: 'PO Created',
    title: 'Purchase Order #PO-2024-0159',
    date: '2024-12-08',
    time: '09:15:00',
    status: 'Approved',
    value: '₹5,67,800',
    details: {
      vendor: 'Larsen & Toubro Ltd.',
      items: 12,
      deliveryDate: '2024-12-25',
      approver: 'Amit Patel',
    },
  },

  // POs Waiting for My Approval
  {
    id: 'PO-2024-0156',
    type: 'PO To Approve',
    title: 'Purchase Order #PO-2024-0156',
    date: '2024-12-10',
    time: '10:30:00',
    status: 'Pending Approval',
    value: '₹2,45,000',
    priority: 'High',
    details: {
      vendor: 'Tata Steel Ltd.',
      items: 5,
      deliveryDate: '2024-12-20',
      submittedBy: 'Priya Sharma',
    },
  },
  {
    id: 'PO-2024-0157',
    type: 'PO To Approve',
    title: 'Purchase Order #PO-2024-0157',
    date: '2024-12-11',
    time: '14:45:00',
    status: 'Pending Approval',
    value: '₹89,500',
    priority: 'Medium',
    details: {
      vendor: 'Hindustan Unilever Ltd.',
      items: 3,
      deliveryDate: '2024-12-18',
      submittedBy: 'Priya Sharma',
    },
  },

  // GRN Items
  {
    id: 'GRN-2024-0234',
    type: 'GRN',
    title: 'GRN #GRN-2024-0234',
    date: '2024-12-11',
    time: '12:00:00',
    status: 'Submitted',
    value: '₹1,24,500',
    priority: 'High',
    details: {
      poNumber: 'PO-2024-0145',
      vendor: 'Reliance Industries',
      location: 'Mumbai Warehouse',
      allocatedQty: 500,
      items: 2,
    },
  },
  {
    id: 'GRN-2024-0235',
    type: 'GRN',
    title: 'GRN #GRN-2024-0235',
    date: '2024-12-09',
    time: '09:30:00',
    status: 'Approved',
    value: '₹67,800',
    priority: 'Medium',
    details: {
      poNumber: 'PO-2024-0142',
      vendor: 'Wipro Limited',
      location: 'Bangalore Store',
      allocatedQty: 300,
      items: 1,
    },
  },

  // Master Records
  {
    id: 'VENDOR-UPD-0023',
    type: 'Master',
    title: 'Vendor Master Update - Reliance Industries',
    date: '2024-12-09',
    time: '09:15:00',
    status: 'Submitted',
    priority: 'High',
    details: {
      recordType: 'Vendor',
      recordName: 'Reliance Industries Ltd.',
      changes: 3,
    },
  },
];

export function CombinedDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<
    'All' | 'Created' | 'Approvals' | 'GRN' | 'Masters'
  >('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const getFilteredItems = () => {
    let filtered = mockCombinedData;

    if (selectedTab === 'Created') {
      filtered = filtered.filter((item) => item.type === 'PO Created');
    } else if (selectedTab === 'Approvals') {
      filtered = filtered.filter((item) => item.type === 'PO To Approve');
    } else if (selectedTab === 'GRN') {
      filtered = filtered.filter((item) => item.type === 'GRN');
    } else if (selectedTab === 'Masters') {
      filtered = filtered.filter((item) => item.type === 'Master');
    }

    return filtered;
  };

  const items = getFilteredItems();

  const getCountByType = (type: string) => {
    if (type === 'All') return mockCombinedData.length;
    if (type === 'Created') return mockCombinedData.filter((i) => i.type === 'PO Created').length;
    if (type === 'Approvals')
      return mockCombinedData.filter((i) => i.type === 'PO To Approve').length;
    if (type === 'GRN') return mockCombinedData.filter((i) => i.type === 'GRN').length;
    if (type === 'Masters') return mockCombinedData.filter((i) => i.type === 'Master').length;
    return 0;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return {
          bg: 'var(--color-cloud)',
          text: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
      case 'Submitted':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'Pending Approval':
        return { bg: '#FED7AA', text: '#EA580C', border: '#FB923C' };
      case 'Approved':
        return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' };
      case 'Rejected':
        return {
          bg: 'var(--color-error-light)',
          text: 'var(--color-error-dark)',
          border: '#FCA5A5',
        };
      case 'Info Requested':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#7DD3FC' };
      default:
        return {
          bg: 'var(--color-cloud)',
          text: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High':
        return {
          bg: 'var(--color-error-light)',
          text: 'var(--color-error-dark)',
          border: '#FCA5A5',
        };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'Low':
        return { bg: '#E0F2FE', text: '#0284C7', border: '#7DD3FC' };
      default:
        return {
          bg: 'var(--color-cloud)',
          text: 'var(--color-mercury-grey)',
          border: 'var(--color-silver)',
        };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PO Created':
        return Edit;
      case 'PO To Approve':
        return CheckCircle;
      case 'GRN':
        return Package;
      case 'Master':
        return Database;
      default:
        return FileText;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'PO Created':
        return 'My PO';
      case 'PO To Approve':
        return 'To Approve';
      case 'GRN':
        return 'GRN';
      case 'Master':
        return 'Master';
      default:
        return type;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
          My Unified Dashboard
        </h1>
        <p className="text-sm mb-4" style={{ color: 'var(--color-mercury-grey)' }}>
          Consolidated view of all your activities and approvals
        </p>

        {/* Role Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
            Active Roles:
          </span>
          {user?.roles?.map((role, idx) => (
            <span
              key={idx}
              className="px-3 py-1 rounded-full text-xs"
              style={{
                backgroundColor: 'var(--color-teal-tint)',
                color: 'var(--color-teal)',
                border: '1px solid var(--color-teal)',
              }}
            >
              {role}
            </span>
          ))}
        </div>
      </div>

      {/* YTD Performance Metrics */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
            My Performance Metrics (YTD 2024)
          </h2>
          <span
            className="text-xs px-3 py-1 rounded-full"
            style={{ backgroundColor: 'var(--color-teal-tint)', color: 'var(--color-teal)' }}
          >
            As of Dec 13, 2024
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* POs Created */}
          <div
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-teal-tint)' }}
              >
                <Edit className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
              142
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              POs Created YTD
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>
                +18%
              </span>
            </div>
          </div>

          {/* POs Approved */}
          <div
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#D1FAE5' }}
              >
                <CheckCircle className="w-5 h-5" style={{ color: '#059669' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
              287
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              POs Approved YTD
            </p>
            <div className="flex items-center gap-1">
              <Award className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>
                94% on-time
              </span>
            </div>
          </div>

          {/* GRNs Processed */}
          <div
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#FEF3C7' }}
              >
                <Package className="w-5 h-5" style={{ color: '#D97706' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
              198
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              GRNs Processed YTD
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>
                +12%
              </span>
            </div>
          </div>

          {/* Avg Approval Time */}
          <div
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: '#E0F2FE' }}
              >
                <Timer className="w-5 h-5" style={{ color: '#0284C7' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
              4.2h
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Avg Approval Time
            </p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>
                18% faster
              </span>
            </div>
          </div>

          {/* Total Value Handled */}
          <div
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-success-light)' }}
              >
                <IndianRupee className="w-5 h-5" style={{ color: 'var(--color-success-dark)' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: 'var(--color-ink)' }}>
              ₹18.4Cr
            </p>
            <p className="text-xs mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
              Total Value YTD
            </p>
            <div>
              <span className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                Combined
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Workload Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-teal-tint)' }}
            >
              <Edit className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {getCountByType('Created')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            POs I Created
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FED7AA' }}
            >
              <AlertCircle className="w-6 h-6" style={{ color: '#EA580C' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {getCountByType('Approvals')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            Awaiting My Approval
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#FEF3C7' }}
            >
              <Package className="w-6 h-6" style={{ color: '#D97706' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {getCountByType('GRN')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            GRN Activities
          </p>
        </div>

        <div
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid var(--color-silver)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#E0F2FE' }}
            >
              <Database className="w-6 h-6" style={{ color: '#0284C7' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>
            {getCountByType('Masters')}
          </p>
          <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            Master Updates
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg mb-6" style={{ border: '1px solid var(--color-silver)' }}>
        <div className="flex items-center gap-2 p-2">
          {['All', 'Created', 'Approvals', 'GRN', 'Masters'].map((tab) => {
            const count = getCountByType(tab);
            const isActive = selectedTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as any)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: isActive ? 'var(--color-teal-tint)' : 'transparent',
                  color: isActive ? 'var(--color-teal)' : 'var(--color-mercury-grey)',
                  border: isActive ? '1px solid var(--color-teal)' : '1px solid transparent',
                }}
              >
                <span className="text-sm">{tab}</span>
                {count > 0 && (
                  <span
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: isActive ? 'var(--color-teal)' : 'var(--color-silver)',
                      color: isActive ? '#FFFFFF' : 'var(--color-mercury-grey)',
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

      {/* Items List */}
      <div className="space-y-4">
        {items.length === 0 ? (
          <div
            className="bg-white p-12 rounded-lg text-center"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            <CheckCircle
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: 'var(--color-silver)' }}
            />
            <p className="text-lg mb-2" style={{ color: 'var(--color-ink)' }}>
              All Clear!
            </p>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
              No items in this category
            </p>
          </div>
        ) : (
          items.map((item) => {
            const TypeIcon = getTypeIcon(item.type);
            const statusColor = getStatusColor(item.status);
            const isExpanded = expandedItem === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-lg"
                style={{ border: '1px solid var(--color-silver)' }}
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left Section */}
                    <div className="flex items-start gap-3 flex-1">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'var(--color-cloud)' }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: 'var(--color-teal)' }} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-sm" style={{ color: 'var(--color-ink)' }}>
                            {item.title}
                          </h3>

                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              border: `1px solid ${statusColor.border}`,
                            }}
                          >
                            {item.status}
                          </span>

                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: 'var(--color-cloud)',
                              color: 'var(--color-mercury-grey)',
                              border: '1px solid var(--color-silver)',
                            }}
                          >
                            {getTypeLabel(item.type)}
                          </span>

                          {item.priority && (
                            <span
                              className="px-2 py-1 rounded text-xs"
                              style={{
                                ...getPriorityColor(item.priority),
                                border: `1px solid ${getPriorityColor(item.priority).border}`,
                              }}
                            >
                              {item.priority}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p
                              style={{ color: 'var(--color-mercury-grey)' }}
                              className="text-xs mb-0.5"
                            >
                              Date
                            </p>
                            <p style={{ color: 'var(--color-ink)' }} className="text-xs">
                              {new Date(item.date).toLocaleDateString('en-IN')}
                            </p>
                          </div>
                          {item.value && (
                            <div>
                              <p
                                style={{ color: 'var(--color-mercury-grey)' }}
                                className="text-xs mb-0.5"
                              >
                                Value
                              </p>
                              <p style={{ color: 'var(--color-ink)' }} className="text-xs">
                                {item.value}
                              </p>
                            </div>
                          )}
                          {item.details.vendor && (
                            <div>
                              <p
                                style={{ color: 'var(--color-mercury-grey)' }}
                                className="text-xs mb-0.5"
                              >
                                Vendor
                              </p>
                              <p style={{ color: 'var(--color-ink)' }} className="text-xs">
                                {item.details.vendor}
                              </p>
                            </div>
                          )}
                          {item.details.items && (
                            <div>
                              <p
                                style={{ color: 'var(--color-mercury-grey)' }}
                                className="text-xs mb-0.5"
                              >
                                Items
                              </p>
                              <p style={{ color: 'var(--color-ink)' }} className="text-xs">
                                {item.details.items}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {item.type === 'PO To Approve' && (
                        <>
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{
                              backgroundColor: 'var(--color-teal)',
                              color: '#FFFFFF',
                              border: '1px solid var(--color-teal)',
                            }}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            className="px-3 py-1.5 rounded-lg text-xs transition-all"
                            style={{
                              backgroundColor: '#FFFFFF',
                              color: 'var(--color-error-dark)',
                              border: '1px solid var(--color-error-dark)',
                            }}
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      {item.type === 'PO Created' && item.status === 'Draft' && (
                        <button
                          className="px-3 py-1.5 rounded-lg text-xs transition-all"
                          style={{
                            backgroundColor: 'var(--color-teal)',
                            color: '#FFFFFF',
                            border: '1px solid var(--color-teal)',
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="px-3 py-1.5 rounded-lg text-xs transition-all"
                        style={{
                          backgroundColor: 'var(--color-cloud)',
                          color: 'var(--color-mercury-grey)',
                          border: '1px solid var(--color-silver)',
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      className="mt-4 pt-4"
                      style={{ borderTop: '1px solid var(--color-silver)' }}
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        {Object.entries(item.details).map(([key, value]) => (
                          <div key={key}>
                            <p
                              style={{ color: 'var(--color-mercury-grey)' }}
                              className="text-xs mb-1 capitalize"
                            >
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p style={{ color: 'var(--color-ink)' }} className="text-xs">
                              {String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
