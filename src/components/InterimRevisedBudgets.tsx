import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, TrendingUp, TrendingDown, Eye, Calendar,
  FileText, AlertCircle, CheckCircle, Edit
} from 'lucide-react';
import { useBudgetData, BudgetRevision } from '../contexts/BudgetDataContext';

export function InterimRevisedBudgets() {
  const navigate = useNavigate();
  const { budgets, revisions, addRevision } = useBudgetData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [selectedBudget, setSelectedBudget] = useState('');
  const [revisionReason, setRevisionReason] = useState('');
  const [revisedAmount, setRevisedAmount] = useState<number>(0);
  const [effectiveDate, setEffectiveDate] = useState('');

  const filteredRevisions = revisions.filter(r =>
    (statusFilter === 'all' || r.status === statusFilter) &&
    (r.revisionReason.toLowerCase().includes(searchTerm.toLowerCase()) ||
     r.budgetId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    totalRevisions: revisions.length,
    pending: revisions.filter(r => r.status === 'Submitted' || r.status === 'In Approval').length,
    approved: revisions.filter(r => r.status === 'Approved').length,
    totalIncrease: revisions.filter(r => r.status === 'Approved' && r.netChange > 0).reduce((sum, r) => sum + r.netChange, 0),
    totalDecrease: Math.abs(revisions.filter(r => r.status === 'Approved' && r.netChange < 0).reduce((sum, r) => sum + r.netChange, 0))
  };

  const handleCreateRevision = () => {
    if (!selectedBudget || !revisionReason || revisedAmount <= 0 || !effectiveDate) {
      alert('Please fill all required fields');
      return;
    }

    const budget = budgets.find(b => b.id === selectedBudget);
    if (!budget) return;

    const newRevision: BudgetRevision = {
      id: `REV-${String(revisions.length + 1).padStart(3, '0')}`,
      budgetId: selectedBudget,
      revisionNumber: revisions.filter(r => r.budgetId === selectedBudget).length + 1,
      revisionReason,
      originalAmount: budget.totalAmount,
      revisedAmount,
      netChange: revisedAmount - budget.totalAmount,
      effectiveDate,
      requestedBy: budget.budgetOwner,
      status: 'Submitted'
    };

    addRevision(newRevision);
    setShowCreateModal(false);
    alert('Budget revision submitted for approval');

    // Reset form
    setSelectedBudget('');
    setRevisionReason('');
    setRevisedAmount(0);
    setEffectiveDate('');
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A0F14]">Interim & Revised Budgets</h1>
              <p className="text-[#6E7A82] text-sm">Manage budget revisions with full version history and audit trail</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Revision
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Revisions</span>
              <FileText className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.totalRevisions}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Pending Approval</span>
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.pending}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Increase</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-green-600">₹{(stats.totalIncrease / 1000000).toFixed(1)}M</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Decrease</span>
              <TrendingDown className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl text-red-600">₹{(stats.totalDecrease / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
              <input
                type="text"
                placeholder="Search revisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="In Approval">In Approval</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Revisions Table */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Revision ID</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Budget</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Revision Reason</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Original Amount</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Revised Amount</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Net Change</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Effective Date</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EA]">
                {filteredRevisions.map(revision => {
                  const budget = budgets.find(b => b.id === revision.budgetId);
                  const changePercent = ((revision.netChange / revision.originalAmount) * 100).toFixed(1);

                  return (
                    <tr key={revision.id} className="hover:bg-[#F6F9FC]">
                      <td className="px-4 py-3">
                        <span className="text-[#00A9B7]">{revision.id}</span>
                        <div className="text-xs text-[#6E7A82] mt-1">Rev #{revision.revisionNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[#0A0F14]">{budget?.budgetName || 'N/A'}</div>
                        <div className="text-xs text-[#6E7A82] mt-1">{revision.budgetId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[#0A0F14]">{revision.revisionReason}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-[#6E7A82]">
                        INR {revision.originalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-[#0A0F14]">
                        INR {revision.revisedAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className={`flex items-center justify-end gap-1 ${
                          revision.netChange > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {revision.netChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          <span>
                            {revision.netChange > 0 ? '+' : ''}
                            INR {Math.abs(revision.netChange).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-xs text-[#6E7A82] mt-1">
                          ({changePercent}%)
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[#0A0F14]">
                          <Calendar className="w-4 h-4 text-[#6E7A82]" />
                          {revision.effectiveDate}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${
                          revision.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          revision.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {revision.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="p-2 hover:bg-[#F6F9FC] rounded transition-colors">
                          <Eye className="w-4 h-4 text-[#6E7A82]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Revision Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#E1E6EA]">
                <h2 className="text-[#0A0F14]">Create Budget Revision</h2>
                <p className="text-sm text-[#6E7A82] mt-1">Submit a budget revision request for approval</p>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Select Budget <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={selectedBudget}
                    onChange={(e) => {
                      setSelectedBudget(e.target.value);
                      const budget = budgets.find(b => b.id === e.target.value);
                      if (budget) setRevisedAmount(budget.totalAmount);
                    }}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select a budget</option>
                    {budgets.filter(b => b.status === 'Approved').map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.budgetNumber} - {budget.budgetName}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedBudget && (
                  <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E1E6EA]">
                    <p className="text-sm text-[#6E7A82] mb-1">Current Budget Amount</p>
                    <p className="text-xl text-[#0A0F14]">
                      INR {budgets.find(b => b.id === selectedBudget)?.totalAmount.toLocaleString()}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Revised Amount <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="number"
                    value={revisedAmount || ''}
                    onChange={(e) => setRevisedAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="0"
                  />
                  {selectedBudget && revisedAmount > 0 && (
                    <p className={`text-sm mt-1 ${
                      revisedAmount > (budgets.find(b => b.id === selectedBudget)?.totalAmount || 0)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      Net Change: {revisedAmount > (budgets.find(b => b.id === selectedBudget)?.totalAmount || 0) ? '+' : ''}
                      INR {(revisedAmount - (budgets.find(b => b.id === selectedBudget)?.totalAmount || 0)).toLocaleString()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Effective Date <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Revision Reason <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <textarea
                    value={revisionReason}
                    onChange={(e) => setRevisionReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="Provide detailed justification for budget revision..."
                  />
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-900 mb-1">Approval Required</h4>
                      <p className="text-sm text-yellow-700">
                        This revision will require approval from Department Head, Finance Manager, and CFO before becoming effective.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-[#E1E6EA] flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRevision}
                  className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors"
                >
                  Submit for Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Edit className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 mb-2">Budget Revision Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Budget revisions can increase or decrease approved budgets</li>
                <li>• All revisions require multi-level approval before becoming effective</li>
                <li>• Complete version history is maintained for audit purposes</li>
                <li>• Revised budgets immediately update available amounts for PO control</li>
                <li>• Effective date determines when the revised budget comes into effect</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}