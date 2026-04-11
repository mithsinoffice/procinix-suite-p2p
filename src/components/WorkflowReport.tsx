import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, MessageSquare, Filter, Download, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface WorkflowRecord {
  id: string;
  recordType: string;
  recordCode: string;
  recordName: string;
  submittedBy: string;
  submittedDate: string;
  currentStatus: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'More Info Required';
  currentApprover?: string;
  daysInWorkflow: number;
  workflowHistory: WorkflowHistoryItem[];
}

interface WorkflowHistoryItem {
  date: string;
  time: string;
  action: string;
  performedBy: string;
  role: string;
  comments?: string;
  status: string;
}

export function WorkflowReport() {
  const navigate = useNavigate();
  const [selectedRecord, setSelectedRecord] = useState<WorkflowRecord | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterRecordType, setFilterRecordType] = useState<string>('All');

  // Mock workflow data - in real app, this would come from your backend
  const workflowRecords: WorkflowRecord[] = [
    {
      id: '1',
      recordType: 'Category Master',
      recordCode: 'CAT-005',
      recordName: 'Accessories',
      submittedBy: 'Priya Sharma',
      submittedDate: '2024-12-10',
      currentStatus: 'Pending Approval',
      currentApprover: 'Rajesh Kumar',
      daysInWorkflow: 3,
      workflowHistory: [
        {
          date: '2024-12-10',
          time: '10:30 AM',
          action: 'Created',
          performedBy: 'Priya Sharma',
          role: 'PO Creator',
          status: 'Draft'
        },
        {
          date: '2024-12-10',
          time: '02:15 PM',
          action: 'Submitted for Approval',
          performedBy: 'Priya Sharma',
          role: 'PO Creator',
          status: 'Pending Approval'
        }
      ]
    },
    {
      id: '2',
      recordType: 'Product Master',
      recordCode: 'PRD-108',
      recordName: 'Cotton T-Shirt',
      submittedBy: 'Amit Patel',
      submittedDate: '2024-12-08',
      currentStatus: 'Approved',
      daysInWorkflow: 2,
      workflowHistory: [
        {
          date: '2024-12-08',
          time: '09:00 AM',
          action: 'Created',
          performedBy: 'Amit Patel',
          role: 'Inventory Manager',
          status: 'Draft'
        },
        {
          date: '2024-12-08',
          time: '11:30 AM',
          action: 'Submitted for Approval',
          performedBy: 'Amit Patel',
          role: 'Inventory Manager',
          status: 'Pending Approval'
        },
        {
          date: '2024-12-09',
          time: '03:45 PM',
          action: 'Requested More Information',
          performedBy: 'Rajesh Kumar',
          role: 'PO Approver',
          comments: 'Please provide HSN code details',
          status: 'More Info Required'
        },
        {
          date: '2024-12-10',
          time: '10:00 AM',
          action: 'Resubmitted',
          performedBy: 'Amit Patel',
          role: 'Inventory Manager',
          comments: 'Added HSN code: 6109.10.00',
          status: 'Pending Approval'
        },
        {
          date: '2024-12-10',
          time: '04:30 PM',
          action: 'Approved',
          performedBy: 'Rajesh Kumar',
          role: 'PO Approver',
          comments: 'Approved. All details verified.',
          status: 'Approved'
        }
      ]
    },
    {
      id: '3',
      recordType: 'Vendor Master',
      recordCode: 'VEN-045',
      recordName: 'Textile Solutions Pvt Ltd',
      submittedBy: 'Sneha Verma',
      submittedDate: '2024-12-12',
      currentStatus: 'Rejected',
      daysInWorkflow: 1,
      workflowHistory: [
        {
          date: '2024-12-12',
          time: '11:00 AM',
          action: 'Created',
          performedBy: 'Sneha Verma',
          role: 'Procurement Officer',
          status: 'Draft'
        },
        {
          date: '2024-12-12',
          time: '02:00 PM',
          action: 'Submitted for Approval',
          performedBy: 'Sneha Verma',
          role: 'Procurement Officer',
          status: 'Pending Approval'
        },
        {
          date: '2024-12-13',
          time: '10:15 AM',
          action: 'Rejected',
          performedBy: 'Rajesh Kumar',
          role: 'PO Approver',
          comments: 'GST certificate expired. Please obtain updated certificate before resubmission.',
          status: 'Rejected'
        }
      ]
    },
    {
      id: '4',
      recordType: 'Color Master',
      recordCode: 'COL-023',
      recordName: 'Navy Blue',
      submittedBy: 'Vikram Singh',
      submittedDate: '2024-12-11',
      currentStatus: 'Pending Approval',
      currentApprover: 'Rajesh Kumar',
      daysInWorkflow: 2,
      workflowHistory: [
        {
          date: '2024-12-11',
          time: '09:30 AM',
          action: 'Created',
          performedBy: 'Vikram Singh',
          role: 'Design Team',
          status: 'Draft'
        },
        {
          date: '2024-12-11',
          time: '01:00 PM',
          action: 'Submitted for Approval',
          performedBy: 'Vikram Singh',
          role: 'Design Team',
          status: 'Pending Approval'
        }
      ]
    },
    {
      id: '5',
      recordType: 'Department Master',
      recordCode: 'DEPT-WH',
      recordName: 'Warehouse',
      submittedBy: 'Priya Sharma',
      submittedDate: '2024-12-09',
      currentStatus: 'Pending Approval',
      currentApprover: 'Rajesh Kumar',
      daysInWorkflow: 4,
      workflowHistory: [
        {
          date: '2024-12-09',
          time: '08:00 AM',
          action: 'Record Modified',
          performedBy: 'Priya Sharma',
          role: 'Admin',
          comments: 'Updated Head of Department',
          status: 'Draft'
        },
        {
          date: '2024-12-09',
          time: '10:00 AM',
          action: 'Submitted for Approval',
          performedBy: 'Priya Sharma',
          role: 'Admin',
          status: 'Pending Approval'
        }
      ]
    },
    {
      id: '6',
      recordType: 'Cost Centre Master',
      recordCode: 'CC-MFG-001',
      recordName: 'Manufacturing Unit A',
      submittedBy: 'Amit Patel',
      submittedDate: '2024-12-12',
      currentStatus: 'Pending Approval',
      currentApprover: 'Rajesh Kumar',
      daysInWorkflow: 1,
      workflowHistory: [
        {
          date: '2024-12-12',
          time: '03:00 PM',
          action: 'Created',
          performedBy: 'Amit Patel',
          role: 'Finance Manager',
          status: 'Draft'
        },
        {
          date: '2024-12-12',
          time: '04:30 PM',
          action: 'Submitted for Approval',
          performedBy: 'Amit Patel',
          role: 'Finance Manager',
          status: 'Pending Approval'
        }
      ]
    },
    {
      id: '7',
      recordType: 'Contract Master',
      recordCode: 'CNT-2024-015',
      recordName: 'Raw Material Supply Agreement',
      submittedBy: 'Sneha Verma',
      submittedDate: '2024-12-11',
      currentStatus: 'More Info Required',
      currentApprover: 'Rajesh Kumar',
      daysInWorkflow: 2,
      workflowHistory: [
        {
          date: '2024-12-11',
          time: '11:00 AM',
          action: 'Created',
          performedBy: 'Sneha Verma',
          role: 'Procurement Officer',
          status: 'Draft'
        },
        {
          date: '2024-12-11',
          time: '03:00 PM',
          action: 'Submitted for Approval',
          performedBy: 'Sneha Verma',
          role: 'Procurement Officer',
          status: 'Pending Approval'
        },
        {
          date: '2024-12-13',
          time: '11:00 AM',
          action: 'Requested More Information',
          performedBy: 'Rajesh Kumar',
          role: 'PO Approver',
          comments: 'Please attach signed contract document',
          status: 'More Info Required'
        }
      ]
    },
    {
      id: '8',
      recordType: 'Employee Master',
      recordCode: 'EMP-2024-089',
      recordName: 'Rahul Mehta',
      submittedBy: 'Vikram Singh',
      submittedDate: '2024-12-13',
      currentStatus: 'Draft',
      daysInWorkflow: 0,
      workflowHistory: [
        {
          date: '2024-12-13',
          time: '02:00 PM',
          action: 'Created',
          performedBy: 'Vikram Singh',
          role: 'HR Manager',
          status: 'Draft'
        }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'var(--color-slate)';
      case 'Pending Approval': return '#F59E0B';
      case 'Approved': return 'var(--color-teal)';
      case 'Rejected': return '#EF4444';
      case 'More Info Required': return '#007D87';
      default: return 'var(--color-mercury-grey)';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return CheckCircle;
      case 'Rejected': return XCircle;
      case 'Pending Approval': return Clock;
      case 'More Info Required': return AlertCircle;
      default: return FileText;
    }
  };

  const handleViewHistory = (record: WorkflowRecord) => {
    setSelectedRecord(record);
    setShowHistoryModal(true);
  };

  const handleExport = () => {
    alert('Exporting workflow report to Excel...');
  };

  // Filter records
  const filteredRecords = workflowRecords.filter(record => {
    const statusMatch = filterStatus === 'All' || record.currentStatus === filterStatus;
    const typeMatch = filterRecordType === 'All' || record.recordType === filterRecordType;
    return statusMatch && typeMatch;
  });

  // Get unique record types for filter
  const recordTypes = ['All', ...Array.from(new Set(workflowRecords.map(r => r.recordType)))];
  const statuses = ['All', 'Draft', 'Pending Approval', 'Approved', 'Rejected', 'More Info Required'];

  // Calculate summary stats
  const totalRecords = workflowRecords.length;
  const pendingRecords = workflowRecords.filter(r => r.currentStatus === 'Pending Approval').length;
  const approvedRecords = workflowRecords.filter(r => r.currentStatus === 'Approved').length;
  const rejectedRecords = workflowRecords.filter(r => r.currentStatus === 'Rejected').length;

  return (
    <div className="p-8" style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/reports')} 
            className="p-2 rounded-lg transition-colors hover:bg-white" 
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl mb-1" style={{ color: 'var(--color-ink)' }}>Workflow Report</h1>
            <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Track all transactions and their approval workflow history</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-white transition-colors"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
        >
          <Download className="w-5 h-5" />
          Export Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Total Records</p>
              <p className="text-3xl" style={{ color: 'var(--color-ink)' }}>{totalRecords}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-cloud)' }}>
              <FileText className="w-6 h-6" style={{ color: 'var(--color-mercury-grey)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Pending Approval</p>
              <p className="text-3xl" style={{ color: '#F59E0B' }}>{pendingRecords}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FEF3C7' }}>
              <Clock className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Approved</p>
              <p className="text-3xl" style={{ color: 'var(--color-teal)' }}>{approvedRecords}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-teal)10' }}>
              <CheckCircle className="w-6 h-6" style={{ color: 'var(--color-teal)' }} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6" style={{ border: '2px solid var(--color-silver)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Rejected</p>
              <p className="text-3xl" style={{ color: '#EF4444' }}>{rejectedRecords}</p>
            </div>
            <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--color-error-light)' }}>
              <XCircle className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 mb-6" style={{ border: '2px solid var(--color-silver)' }}>
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                {statuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>Filter by Record Type</label>
              <select
                value={filterRecordType}
                onChange={(e) => setFilterRecordType(e.target.value)}
                className="w-full px-4 py-2 rounded-lg"
                style={{ border: '1px solid var(--color-silver)', color: 'var(--color-ink)' }}
              >
                {recordTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ border: '2px solid var(--color-silver)' }}>
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--color-cloud)' }}>
            <tr>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Record Type
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Record Code
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Record Name
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Submitted By
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Submitted Date
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Status
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Current Approver
              </th>
              <th className="text-left px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Days in Workflow
              </th>
              <th className="text-center px-6 py-4 text-xs" style={{ color: 'var(--color-mercury-grey)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const StatusIcon = getStatusIcon(record.currentStatus);
              return (
                <tr key={record.id} style={{ borderTop: '1px solid var(--color-silver)' }}>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {record.recordType}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {record.recordCode}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {record.recordName}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                      <User className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                      {record.submittedBy}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2" style={{ color: 'var(--color-ink)' }}>
                      <Calendar className="w-4 h-4" style={{ color: 'var(--color-mercury-grey)' }} />
                      {record.submittedDate}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span 
                      className="flex items-center gap-2 px-3 py-1 rounded-full text-xs w-fit"
                      style={{ 
                        backgroundColor: `${getStatusColor(record.currentStatus)}20`,
                        color: getStatusColor(record.currentStatus),
                        fontWeight: '600'
                      }}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {record.currentStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    {record.currentApprover || '-'}
                  </td>
                  <td className="px-6 py-4" style={{ color: 'var(--color-ink)' }}>
                    <span className={record.daysInWorkflow > 3 ? 'text-red-600' : ''}>
                      {record.daysInWorkflow} {record.daysInWorkflow === 1 ? 'day' : 'days'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => handleViewHistory(record)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                        style={{ color: 'var(--color-teal)', backgroundColor: 'var(--color-teal)10' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)20'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)10'}
                      >
                        <Eye className="w-4 h-4" />
                        View History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Workflow History Modal */}
      {showHistoryModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ border: '2px solid var(--color-silver)' }}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl mb-2" style={{ color: 'var(--color-ink)' }}>Workflow History</h2>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  <span><strong>Record:</strong> {selectedRecord.recordCode} - {selectedRecord.recordName}</span>
                  <span><strong>Type:</strong> {selectedRecord.recordType}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedRecord(null);
                }}
                className="p-2 rounded-lg transition-colors"
                style={{ color: 'var(--color-mercury-grey)' }}
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Current Status Banner */}
            <div 
              className="rounded-lg p-4 mb-6"
              style={{ 
                backgroundColor: `${getStatusColor(selectedRecord.currentStatus)}10`,
                border: `2px solid ${getStatusColor(selectedRecord.currentStatus)}30`
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    const StatusIcon = getStatusIcon(selectedRecord.currentStatus);
                    return <StatusIcon className="w-6 h-6" style={{ color: getStatusColor(selectedRecord.currentStatus) }} />;
                  })()}
                  <div>
                    <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Current Status</p>
                    <p className="text-lg" style={{ color: getStatusColor(selectedRecord.currentStatus), fontWeight: '600' }}>
                      {selectedRecord.currentStatus}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>Days in Workflow</p>
                  <p className="text-lg" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                    {selectedRecord.daysInWorkflow} {selectedRecord.daysInWorkflow === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4">
              <h3 className="text-lg mb-4" style={{ color: 'var(--color-ink)' }}>Timeline</h3>
              {selectedRecord.workflowHistory.map((item, index) => {
                const isLast = index === selectedRecord.workflowHistory.length - 1;
                return (
                  <div key={index} className="flex gap-4">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${getStatusColor(item.status)}20` }}
                      >
                        {(() => {
                          const StatusIcon = getStatusIcon(item.status);
                          return <StatusIcon className="w-5 h-5" style={{ color: getStatusColor(item.status) }} />;
                        })()}
                      </div>
                      {!isLast && (
                        <div 
                          className="w-0.5 flex-1 mt-2"
                          style={{ backgroundColor: 'var(--color-silver)', minHeight: '40px' }}
                        />
                      )}
                    </div>

                    {/* Timeline content */}
                    <div className="flex-1 pb-6">
                      <div className="bg-white rounded-lg p-4" style={{ border: '1px solid var(--color-silver)' }}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm mb-1" style={{ color: 'var(--color-ink)', fontWeight: '600' }}>
                              {item.action}
                            </p>
                            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {item.performedBy}
                              </span>
                              <span>•</span>
                              <span>{item.role}</span>
                            </div>
                          </div>
                          <div className="text-right text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {item.date}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              {item.time}
                            </div>
                          </div>
                        </div>

                        {item.comments && (
                          <div 
                            className="mt-3 p-3 rounded-lg"
                            style={{ backgroundColor: 'var(--color-cloud)' }}
                          >
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 mt-0.5" style={{ color: 'var(--color-mercury-grey)' }} />
                              <div>
                                <p className="text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>Comments:</p>
                                <p className="text-sm" style={{ color: 'var(--color-ink)' }}>{item.comments}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <span 
                            className="px-2 py-1 rounded-full text-xs"
                            style={{ 
                              backgroundColor: `${getStatusColor(item.status)}20`,
                              color: getStatusColor(item.status),
                              fontWeight: '600'
                            }}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedRecord(null);
                }}
                className="px-6 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-teal)'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
