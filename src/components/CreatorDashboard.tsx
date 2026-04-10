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
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CreatorItem {
  id: string;
  type: 'PO' | 'Master' | 'GRN';
  title: string;
  createdDate: string;
  submittedDate?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Info Requested';
  value?: string;
  approver?: string;
  approvalTime?: string; // Time taken to get approved (in hours)
  rejectionReason?: string;
  details: any;
}

const mockCreatorData: CreatorItem[] = [
  // Recent Drafts
  {
    id: 'PO-2024-0161',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0161',
    createdDate: '2024-12-12',
    status: 'Draft',
    value: '₹1,45,000',
    details: {
      vendor: 'Tata Motors Ltd.',
      items: 4,
      deliveryDate: '2024-12-25'
    }
  },
  {
    id: 'PO-2024-0160',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0160',
    createdDate: '2024-12-11',
    submittedDate: '2024-12-11',
    status: 'Submitted',
    value: '₹3,45,900',
    approver: 'Amit Patel',
    details: {
      vendor: 'Bharat Heavy Electricals Ltd.',
      items: 8,
      deliveryDate: '2024-12-28'
    }
  },
  {
    id: 'PO-2024-0159',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0159',
    createdDate: '2024-12-12',
    submittedDate: '2024-12-12',
    status: 'Submitted',
    value: '₹1,23,450',
    approver: 'Amit Patel',
    details: {
      vendor: 'Asian Paints Ltd.',
      items: 7,
      deliveryDate: '2024-12-22'
    }
  },
  {
    id: 'PO-2024-0158',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0158',
    createdDate: '2024-12-08',
    submittedDate: '2024-12-08',
    status: 'Approved',
    value: '₹5,67,800',
    approver: 'Amit Patel',
    approvalTime: '6.5',
    details: {
      vendor: 'Larsen & Toubro Ltd.',
      items: 12,
      deliveryDate: '2024-12-25'
    }
  },
  {
    id: 'PO-2024-0157',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0157',
    createdDate: '2024-12-11',
    submittedDate: '2024-12-11',
    status: 'Approved',
    value: '₹89,500',
    approver: 'Amit Patel',
    approvalTime: '3.2',
    details: {
      vendor: 'Hindustan Unilever Ltd.',
      items: 3,
      deliveryDate: '2024-12-18'
    }
  },
  {
    id: 'PO-2024-0156',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0156',
    createdDate: '2024-12-10',
    submittedDate: '2024-12-10',
    status: 'Approved',
    value: '₹2,45,000',
    approver: 'Amit Patel',
    approvalTime: '4.8',
    details: {
      vendor: 'Tata Steel Ltd.',
      items: 5,
      deliveryDate: '2024-12-20'
    }
  },
  {
    id: 'PO-2024-0155',
    type: 'PO',
    title: 'Purchase Order #PO-2024-0155',
    createdDate: '2024-12-07',
    submittedDate: '2024-12-07',
    status: 'Rejected',
    value: '₹78,900',
    approver: 'Amit Patel',
    rejectionReason: 'Budget exceeded for this vendor category',
    details: {
      vendor: 'ABC Suppliers',
      items: 2,
      deliveryDate: '2024-12-15'
    }
  },
  {
    id: 'ITEM-NEW-0089',
    type: 'Master',
    title: 'New Item Master - Steel Rod 12mm',
    createdDate: '2024-12-10',
    submittedDate: '2024-12-10',
    status: 'Submitted',
    approver: 'Rajesh Kumar',
    details: {
      recordType: 'Item',
      recordName: 'Steel Rod 12mm'
    }
  },
  {
    id: 'ITEM-NEW-0088',
    type: 'Master',
    title: 'New Item Master - Cement 53 Grade',
    createdDate: '2024-12-05',
    submittedDate: '2024-12-05',
    status: 'Approved',
    approver: 'Rajesh Kumar',
    approvalTime: '12.5',
    details: {
      recordType: 'Item',
      recordName: 'Cement 53 Grade'
    }
  },
  {
    id: 'ITEM-NEW-0087',
    type: 'Master',
    title: 'New Item Master - Paint White',
    createdDate: '2024-12-03',
    submittedDate: '2024-12-03',
    status: 'Rejected',
    approver: 'Rajesh Kumar',
    rejectionReason: 'Duplicate item code - already exists',
    details: {
      recordType: 'Item',
      recordName: 'Paint White'
    }
  }
];

export function CreatorDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'All' | 'Draft' | 'Submitted' | 'Approved' | 'Rejected'>('All');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filter items based on selected tab
  const getFilteredItems = () => {
    if (selectedTab === 'All') return mockCreatorData;
    return mockCreatorData.filter(item => item.status === selectedTab);
  };

  const items = getFilteredItems();

  const getCountByStatus = (status: string) => {
    if (status === 'All') return mockCreatorData.length;
    return mockCreatorData.filter(item => item.status === status).length;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return { bg: '#E1E6EA', text: '#6E7A82', border: '#E1E6EA' };
      case 'Submitted': return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
      case 'Approved': return { bg: '#E8F5E9', text: '#2E7D32', border: '#81C784' };
      case 'Rejected': return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'Info Requested': return { bg: '#E0F2FE', text: '#0284C7', border: '#7DD3FC' };
      default: return { bg: '#F6F9FC', text: '#6E7A82', border: '#E1E6EA' };
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PO': return FileText;
      case 'Master': return Database;
      case 'GRN': return Package;
      default: return FileText;
    }
  };

  // Calculate YTD metrics
  const totalSubmissions = mockCreatorData.filter(i => i.status !== 'Draft').length;
  const totalApprovals = mockCreatorData.filter(i => i.status === 'Approved').length;
  const totalRejections = mockCreatorData.filter(i => i.status === 'Rejected').length;
  const approvalRate = totalSubmissions > 0 ? Math.round((totalApprovals / totalSubmissions) * 100) : 0;
  const avgApprovalsPerMonth = Math.round(totalApprovals / 11); // 11 months
  
  // Calculate average time to approval (for approved items only)
  const approvedItems = mockCreatorData.filter(i => i.status === 'Approved' && i.approvalTime);
  const avgTimeToApproval = approvedItems.length > 0 
    ? (approvedItems.reduce((sum, item) => sum + parseFloat(item.approvalTime!), 0) / approvedItems.length).toFixed(1)
    : '0';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>
          My Submissions
        </h1>
        <p className="text-sm" style={{ color: '#6E7A82' }}>
          Track your created purchase orders and master records
        </p>
      </div>

      {/* Creator Performance Metrics - YTD */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg" style={{ color: '#0A0F14' }}>
            My Creation Performance (YTD 2024)
          </h2>
          <span className="text-xs px-3 py-1 rounded-full" style={{ backgroundColor: '#E8F7F8', color: '#00A9B7' }}>
            As of Dec 12, 2024
          </span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Total Submissions YTD */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F7F8' }}>
                <Send className="w-5 h-5" style={{ color: '#00A9B7' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: '#0A0F14' }}>{totalSubmissions + 35}</p>
            <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Total Submissions YTD</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>+18%</span>
            </div>
          </div>

          {/* Approval Rate */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
                <Award className="w-5 h-5" style={{ color: '#2E7D32' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: '#0A0F14' }}>{approvalRate}%</p>
            <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Approval Rate</p>
            <div>
              <span className="text-xs" style={{ color: '#6E7A82' }}>{totalApprovals} of {totalSubmissions} approved</span>
            </div>
          </div>

          {/* Avg Submissions Per Month */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
                <Activity className="w-5 h-5" style={{ color: '#D97706' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: '#0A0F14' }}>{avgApprovalsPerMonth + 3}</p>
            <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Avg Submissions/Month</p>
            <div>
              <span className="text-xs" style={{ color: '#6E7A82' }}>11 months</span>
            </div>
          </div>

          {/* Avg Time to Approval */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E0F2FE' }}>
                <Timer className="w-5 h-5" style={{ color: '#0284C7' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: '#0A0F14' }}>{avgTimeToApproval}h</p>
            <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Avg Time to Approval</p>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" style={{ color: '#059669' }} />
              <span className="text-xs" style={{ color: '#059669' }}>22% faster</span>
            </div>
          </div>

          {/* Total Rejections YTD */}
          <div 
            className="bg-white p-4 rounded-lg"
            style={{ border: '1px solid #E1E6EA' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
                <ThumbsDown className="w-5 h-5" style={{ color: '#DC2626' }} />
              </div>
            </div>
            <p className="text-2xl mb-1" style={{ color: '#0A0F14' }}>{totalRejections + 3}</p>
            <p className="text-xs mb-2" style={{ color: '#6E7A82' }}>Total Rejections YTD</p>
            <div>
              <span className="text-xs" style={{ color: '#6E7A82' }}>{100 - approvalRate}% rejection rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Current Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid #E1E6EA' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E1E6EA' }}>
              <Edit className="w-6 h-6" style={{ color: '#6E7A82' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: '#0A0F14' }}>{getCountByStatus('Draft')}</p>
          <p className="text-sm" style={{ color: '#6E7A82' }}>Drafts</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid #E1E6EA' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <Clock className="w-6 h-6" style={{ color: '#D97706' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: '#0A0F14' }}>{getCountByStatus('Submitted')}</p>
          <p className="text-sm" style={{ color: '#6E7A82' }}>Pending Approval</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid #E1E6EA' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#E8F5E9' }}>
              <CheckCircle className="w-6 h-6" style={{ color: '#2E7D32' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: '#0A0F14' }}>{getCountByStatus('Approved')}</p>
          <p className="text-sm" style={{ color: '#6E7A82' }}>Approved (Recent)</p>
        </div>

        <div 
          className="bg-white p-6 rounded-lg"
          style={{ border: '1px solid #E1E6EA' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEE2E2' }}>
              <XCircle className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
          </div>
          <p className="text-3xl mb-1" style={{ color: '#0A0F14' }}>{getCountByStatus('Rejected')}</p>
          <p className="text-sm" style={{ color: '#6E7A82' }}>Rejected (Recent)</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div 
        className="bg-white rounded-lg mb-6"
        style={{ border: '1px solid #E1E6EA' }}
      >
        <div className="flex items-center gap-2 p-2">
          {['All', 'Draft', 'Submitted', 'Approved', 'Rejected'].map((tab) => {
            const count = getCountByStatus(tab);
            if (count === 0 && tab !== 'All') return null;
            
            const isActive = selectedTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as any)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: isActive ? '#E8F7F8' : 'transparent',
                  color: isActive ? '#00A9B7' : '#6E7A82',
                  border: isActive ? '1px solid #00A9B7' : '1px solid transparent'
                }}
              >
                <span className="text-sm">{tab}</span>
                {count > 0 && (
                  <span 
                    className="ml-2 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: isActive ? '#00A9B7' : '#E1E6EA',
                      color: isActive ? '#FFFFFF' : '#6E7A82'
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
            style={{ border: '1px solid #E1E6EA' }}
          >
            <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: '#E1E6EA' }} />
            <p className="text-lg mb-2" style={{ color: '#0A0F14' }}>No Items Found</p>
            <p className="text-sm" style={{ color: '#6E7A82' }}>
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
                style={{ border: '1px solid #E1E6EA' }}
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    {/* Left Section */}
                    <div className="flex items-start gap-3 flex-1">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: '#F6F9FC' }}
                      >
                        <TypeIcon className="w-5 h-5" style={{ color: '#00A9B7' }} />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <h3 className="text-sm" style={{ color: '#0A0F14' }}>
                            {item.title}
                          </h3>
                          
                          {/* Status Badge */}
                          <span
                            className="px-2 py-1 rounded text-xs"
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              border: `1px solid ${statusColor.border}`
                            }}
                          >
                            {item.status}
                          </span>

                          {/* Approval Time Badge (for approved items) */}
                          {item.status === 'Approved' && item.approvalTime && (
                            <span
                              className="px-2 py-1 rounded text-xs flex items-center gap-1"
                              style={{
                                backgroundColor: '#E8F5E9',
                                color: '#2E7D32',
                                border: '1px solid #81C784'
                              }}
                            >
                              <Clock className="w-3 h-3" />
                              {item.approvalTime}h
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <p style={{ color: '#6E7A82' }} className="text-xs mb-0.5">Created Date</p>
                            <p style={{ color: '#0A0F14' }} className="text-xs">{new Date(item.createdDate).toLocaleDateString('en-IN')}</p>
                          </div>
                          {item.submittedDate && (
                            <div>
                              <p style={{ color: '#6E7A82' }} className="text-xs mb-0.5">Submitted Date</p>
                              <p style={{ color: '#0A0F14' }} className="text-xs">{new Date(item.submittedDate).toLocaleDateString('en-IN')}</p>
                            </div>
                          )}
                          {item.value && (
                            <div>
                              <p style={{ color: '#6E7A82' }} className="text-xs mb-0.5">Value</p>
                              <p style={{ color: '#0A0F14' }} className="text-xs">{item.value}</p>
                            </div>
                          )}
                          {item.approver && (
                            <div>
                              <p style={{ color: '#6E7A82' }} className="text-xs mb-0.5">Approver</p>
                              <p style={{ color: '#0A0F14' }} className="text-xs">{item.approver}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <button
                        onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                        className="p-2 rounded-lg hover:bg-opacity-50 transition-all"
                        style={{ backgroundColor: '#F6F9FC' }}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" style={{ color: '#6E7A82' }} />
                      </button>
                      
                      {item.status === 'Draft' && (
                        <button
                          className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                          style={{ backgroundColor: '#E8F7F8', color: '#00A9B7', border: '1px solid #00A9B7' }}
                        >
                          <Edit className="w-4 h-4" />
                          <span className="text-xs">Edit</span>
                        </button>
                      )}

                      {item.status === 'Draft' && (
                        <button
                          className="px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
                          style={{ backgroundColor: '#E8F5E9', color: '#2E7D32', border: '1px solid #81C784' }}
                        >
                          <Send className="w-4 h-4" />
                          <span className="text-xs">Submit</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div 
                    className="px-4 pb-4"
                    style={{ borderTop: '1px solid #E1E6EA' }}
                  >
                    <div className="pt-4">
                      {item.type === 'PO' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Vendor</p>
                            <p className="text-sm" style={{ color: '#0A0F14' }}>{item.details.vendor}</p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Items</p>
                            <p className="text-sm" style={{ color: '#0A0F14' }}>{item.details.items}</p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Delivery Date</p>
                            <p className="text-sm" style={{ color: '#0A0F14' }}>{item.details.deliveryDate}</p>
                          </div>
                        </div>
                      )}

                      {item.type === 'Master' && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Record Type</p>
                            <p className="text-sm" style={{ color: '#0A0F14' }}>{item.details.recordType}</p>
                          </div>
                          <div>
                            <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Record Name</p>
                            <p className="text-sm" style={{ color: '#0A0F14' }}>{item.details.recordName}</p>
                          </div>
                        </div>
                      )}

                      {/* Rejection Reason */}
                      {item.status === 'Rejected' && item.rejectionReason && (
                        <div 
                          className="mt-4 p-4 rounded-lg"
                          style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5' }}
                        >
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#DC2626' }} />
                            <div>
                              <p className="text-xs mb-1" style={{ color: '#DC2626' }}>Rejection Reason:</p>
                              <p className="text-sm" style={{ color: '#0A0F14' }}>{item.rejectionReason}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
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
