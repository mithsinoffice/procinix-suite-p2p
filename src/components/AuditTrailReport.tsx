import { useState, useMemo } from 'react';
import { ArrowLeft, Download, Eye, FileText, Search, Calendar, User, Activity, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auditLogService, AuditLog } from '../utils/auditLog';
import { AdvancedFilter, FilterConfig } from './AdvancedFilter';
import { applyFilters } from '../utils/filterUtils';

export function AuditTrailReport() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>(auditLogService.getAllLogs());
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [filterConfig, setFilterConfig] = useState<FilterConfig | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter configuration for audit logs
  const filterFields = [
    { key: 'timestamp', label: 'Date/Time', type: 'date' as const },
    { key: 'userName', label: 'User Name', type: 'text' as const },
    { key: 'userEmail', label: 'User Email', type: 'text' as const },
    { key: 'userRole', label: 'User Role', type: 'text' as const },
    { key: 'action', label: 'Action', type: 'select' as const, options: [
      { value: 'CREATE', label: 'Create' },
      { value: 'UPDATE', label: 'Update' },
      { value: 'DELETE', label: 'Delete' },
      { value: 'APPROVE', label: 'Approve' },
      { value: 'REJECT', label: 'Reject' },
      { value: 'SUBMIT', label: 'Submit' },
      { value: 'REQUEST_INFO', label: 'Request Info' },
      { value: 'VIEW', label: 'View' },
      { value: 'EXPORT', label: 'Export' },
      { value: 'LOGIN', label: 'Login' },
      { value: 'LOGOUT', label: 'Logout' }
    ]},
    { key: 'module', label: 'Module', type: 'text' as const },
    { key: 'recordType', label: 'Record Type', type: 'text' as const },
    { key: 'recordId', label: 'Record ID', type: 'text' as const },
    { key: 'status', label: 'Status', type: 'select' as const, options: [
      { value: 'SUCCESS', label: 'Success' },
      { value: 'FAILED', label: 'Failed' }
    ]},
    { key: 'ipAddress', label: 'IP Address', type: 'text' as const },
    { key: 'description', label: 'Description', type: 'text' as const }
  ];

  // Apply filters and search
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply advanced filters
    if (filterConfig) {
      result = applyFilters(result, filterConfig);
    }

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.userName.toLowerCase().includes(term) ||
        log.userEmail.toLowerCase().includes(term) ||
        log.description.toLowerCase().includes(term) ||
        log.recordId.toLowerCase().includes(term) ||
        log.module.toLowerCase().includes(term) ||
        log.recordType.toLowerCase().includes(term)
      );
    }

    return result;
  }, [logs, filterConfig, searchTerm]);

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleExportCSV = () => {
    const csv = auditLogService.exportLogsAsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const json = auditLogService.exportLogsAsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE': return '➕';
      case 'UPDATE': return '✏️';
      case 'DELETE': return '🗑️';
      case 'APPROVE': return '✅';
      case 'REJECT': return '❌';
      case 'SUBMIT': return '📤';
      case 'REQUEST_INFO': return '❓';
      case 'VIEW': return '👁️';
      case 'EXPORT': return '📥';
      case 'LOGIN': return '🔓';
      case 'LOGOUT': return '🔒';
      default: return '•';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return '#00A9B7';
      case 'UPDATE': return '#D97706';
      case 'DELETE': return '#FF4E5B';
      case 'APPROVE': return '#10B981';
      case 'REJECT': return '#EF4444';
      case 'SUBMIT': return '#8B5CF6';
      case 'REQUEST_INFO': return '#F59E0B';
      case 'VIEW': return '#6B7280';
      case 'EXPORT': return '#3B82F6';
      case 'LOGIN': return '#10B981';
      case 'LOGOUT': return '#6B7280';
      default: return '#6E7A82';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayLogs = logs.filter(log => new Date(log.timestamp) >= today);
    const failedLogs = logs.filter(log => log.status === 'FAILED');
    const uniqueUsers = new Set(logs.map(log => log.userId)).size;
    const modules = new Set(logs.map(log => log.module)).size;

    return {
      total: logs.length,
      today: todayLogs.length,
      failed: failedLogs.length,
      users: uniqueUsers,
      modules
    };
  }, [logs]);

  return (
    <div className="p-8" style={{ backgroundColor: '#F6F9FC', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/reports')} 
            className="p-2 rounded-lg transition-colors" 
            style={{ color: '#6E7A82' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl" style={{ color: '#0A0F14' }}>Audit Trail Report</h1>
            <p style={{ color: '#6E7A82' }}>Complete audit log of all system activities</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'white', border: '1px solid #E1E6EA', color: '#6E7A82' }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: 'white', border: '1px solid #E1E6EA', color: '#6E7A82' }}
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: '#6E7A82' }}>Total Logs</span>
            <Activity className="w-5 h-5" style={{ color: '#00A9B7' }} />
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>{stats.total.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: '#6E7A82' }}>Today's Activity</span>
            <Calendar className="w-5 h-5" style={{ color: '#00A9B7' }} />
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>{stats.today.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: '#6E7A82' }}>Failed Actions</span>
            <Shield className="w-5 h-5" style={{ color: '#FF4E5B' }} />
          </div>
          <div className="text-2xl" style={{ color: stats.failed > 0 ? '#FF4E5B' : '#0A0F14' }}>
            {stats.failed.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: '#6E7A82' }}>Active Users</span>
            <User className="w-5 h-5" style={{ color: '#00A9B7' }} />
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>{stats.users.toLocaleString()}</div>
        </div>

        <div className="bg-white p-6 rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: '#6E7A82' }}>Modules Tracked</span>
            <FileText className="w-5 h-5" style={{ color: '#00A9B7' }} />
          </div>
          <div className="text-2xl" style={{ color: '#0A0F14' }}>{stats.modules.toLocaleString()}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style={{ color: '#6E7A82' }} />
          <input
            type="text"
            placeholder="Search by user, email, description, record ID, module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg"
            style={{ border: '1px solid #E1E6EA', color: '#0A0F14' }}
          />
        </div>
        <AdvancedFilter
          fields={filterFields}
          onApplyFilter={setFilterConfig}
          onClearFilter={() => setFilterConfig(null)}
        />
        <div className="text-sm" style={{ color: '#6E7A82' }}>
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg" style={{ border: '1px solid #E1E6EA' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F6F9FC' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Timestamp</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>User</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Action</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Module</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Record ID</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Description</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Status</th>
                <th className="px-6 py-4 text-left text-sm" style={{ color: '#6E7A82' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center" style={{ color: '#6E7A82' }}>
                    No audit logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const { date, time } = formatTimestamp(log.timestamp);
                  return (
                    <tr key={log.id} style={{ borderTop: index === 0 ? 'none' : '1px solid #E1E6EA' }}>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm" style={{ color: '#0A0F14' }}>{date}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{time}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm" style={{ color: '#0A0F14' }}>{log.userName}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{log.userEmail}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{log.userRole}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getActionIcon(log.action)}</span>
                          <span 
                            className="px-2 py-1 rounded text-xs"
                            style={{ 
                              backgroundColor: `${getActionColor(log.action)}15`,
                              color: getActionColor(log.action)
                            }}
                          >
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm" style={{ color: '#0A0F14' }}>{log.module}</div>
                          <div className="text-xs" style={{ color: '#6E7A82' }}>{log.recordType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#F6F9FC', color: '#00A9B7' }}>
                          {log.recordId}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm max-w-md truncate" style={{ color: '#6E7A82' }}>
                          {log.description}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span 
                          className="px-3 py-1 rounded-full text-xs"
                          style={{
                            backgroundColor: log.status === 'SUCCESS' ? '#E8F7F8' : '#FFE8EA',
                            color: log.status === 'SUCCESS' ? '#00A9B7' : '#FF4E5B'
                          }}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewDetails(log)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: '#00A9B7' }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            style={{ border: '1px solid #E1E6EA' }}
          >
            {/* Modal Header */}
            <div 
              className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0"
              style={{ borderColor: '#E1E6EA' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${getActionColor(selectedLog.action)}15` }}
                >
                  {getActionIcon(selectedLog.action)}
                </div>
                <div>
                  <h2 className="text-xl" style={{ color: '#0A0F14' }}>Audit Log Details</h2>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>{selectedLog.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="p-2 rounded-lg transition-colors" 
                style={{ color: '#6E7A82' }}
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>BASIC INFORMATION</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Timestamp</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>
                      {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Status</label>
                    <p className="text-sm mt-1">
                      <span 
                        className="px-3 py-1 rounded-full text-xs"
                        style={{
                          backgroundColor: selectedLog.status === 'SUCCESS' ? '#E8F7F8' : '#FFE8EA',
                          color: selectedLog.status === 'SUCCESS' ? '#00A9B7' : '#FF4E5B'
                        }}
                      >
                        {selectedLog.status}
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Action</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.action}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Module</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.module}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Record Type</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.recordType}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Record ID</label>
                    <p className="text-sm mt-1">
                      <code className="px-2 py-1 rounded text-xs" style={{ backgroundColor: '#F6F9FC', color: '#00A9B7' }}>
                        {selectedLog.recordId}
                      </code>
                    </p>
                  </div>
                </div>
              </div>

              {/* User Information */}
              <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>USER INFORMATION</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>User ID</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.userId}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>User Name</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.userName}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>User Email</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.userEmail}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>User Role</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.userRole}</p>
                  </div>
                </div>
              </div>

              {/* System Information */}
              <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>SYSTEM INFORMATION</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>IP Address</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.ipAddress || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Location</label>
                    <p className="text-sm mt-1" style={{ color: '#0A0F14' }}>{selectedLog.location || 'N/A'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs" style={{ color: '#6E7A82' }}>Device Info</label>
                    <p className="text-xs mt-1 break-all" style={{ color: '#6E7A82' }}>
                      {selectedLog.deviceInfo || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>DESCRIPTION</h3>
                <p className="text-sm" style={{ color: '#0A0F14' }}>{selectedLog.description}</p>
              </div>

              {/* Changes */}
              {selectedLog.changes && selectedLog.changes.length > 0 && (
                <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>FIELD CHANGES ({selectedLog.changes.length})</h3>
                  <div className="space-y-3">
                    {selectedLog.changes.map((change, index) => (
                      <div 
                        key={index} 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{
                              backgroundColor: change.changeType === 'ADDED' ? '#E8F7F8' : 
                                             change.changeType === 'REMOVED' ? '#FFE8EA' : '#FFF9E6',
                              color: change.changeType === 'ADDED' ? '#00A9B7' : 
                                     change.changeType === 'REMOVED' ? '#FF4E5B' : '#D97706'
                            }}
                          >
                            {change.changeType}
                          </span>
                          <span className="text-sm" style={{ color: '#0A0F14' }}>{change.fieldLabel}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span style={{ color: '#6E7A82' }}>Old Value:</span>
                            <div 
                              className="mt-1 px-2 py-1 rounded"
                              style={{ backgroundColor: 'white', color: '#FF4E5B' }}
                            >
                              {change.oldValue || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: '#6E7A82' }}>New Value:</span>
                            <div 
                              className="mt-1 px-2 py-1 rounded"
                              style={{ backgroundColor: 'white', color: '#00A9B7' }}
                            >
                              {change.newValue || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Message */}
              {selectedLog.errorMessage && (
                <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>ERROR MESSAGE</h3>
                  <div 
                    className="p-3 rounded-lg text-sm"
                    style={{ backgroundColor: '#FFE8EA', color: '#FF4E5B' }}
                  >
                    {selectedLog.errorMessage}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div className="pt-4" style={{ borderTop: '1px solid #E1E6EA' }}>
                  <h3 className="text-sm mb-3" style={{ color: '#6E7A82' }}>ADDITIONAL METADATA</h3>
                  <pre 
                    className="p-3 rounded-lg text-xs overflow-auto"
                    style={{ backgroundColor: '#F6F9FC', color: '#0A0F14' }}
                  >
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div 
              className="border-t px-6 py-4 flex justify-end gap-3 flex-shrink-0"
              style={{ borderColor: '#E1E6EA' }}
            >
              <button 
                onClick={() => setShowDetailModal(false)} 
                className="px-4 py-2 rounded-lg transition-colors" 
                style={{ 
                  border: '1px solid #E1E6EA', 
                  color: '#6E7A82', 
                  backgroundColor: 'white' 
                }}
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
