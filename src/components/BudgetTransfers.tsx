import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, ArrowRight, CheckCircle, Clock, XCircle,
  AlertCircle, DollarSign, Eye, Calendar
} from 'lucide-react';
import { useBudgetData, BudgetTransfer } from '../contexts/BudgetDataContext';

export function BudgetTransfers() {
  const navigate = useNavigate();
  const { budgets, transfers, addTransfer } = useBudgetData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [sourceBudget, setSourceBudget] = useState('');
  const [targetBudget, setTargetBudget] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferReason, setTransferReason] = useState('');

  const filteredTransfers = transfers.filter(t =>
    (statusFilter === 'all' || t.status === statusFilter) &&
    (t.transferNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.sourceBudgetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.targetBudgetName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    totalTransfers: transfers.length,
    pending: transfers.filter(t => t.status === 'Pending').length,
    approved: transfers.filter(t => t.status === 'Approved' || t.status === 'Completed').length,
    totalAmount: transfers.filter(t => t.status === 'Completed').reduce((sum, t) => sum + t.transferAmount, 0)
  };

  const handleCreateTransfer = () => {
    if (!sourceBudget || !targetBudget || transferAmount <= 0 || !transferReason) {
      alert('Please fill all required fields');
      return;
    }

    if (sourceBudget === targetBudget) {
      alert('Source and target budgets cannot be the same');
      return;
    }

    const source = budgets.find(b => b.id === sourceBudget);
    const target = budgets.find(b => b.id === targetBudget);

    if (!source || !target) return;

    if (transferAmount > source.available) {
      alert('Transfer amount exceeds available budget in source');
      return;
    }

    const newTransfer: BudgetTransfer = {
      id: `TRF-${String(transfers.length + 1).padStart(3, '0')}`,
      transferNumber: `TRF-2025-${String(transfers.length + 1).padStart(3, '0')}`,
      transferDate: new Date().toISOString().split('T')[0],
      sourceBudget,
      sourceBudgetName: source.budgetName,
      targetBudget,
      targetBudgetName: target.budgetName,
      transferAmount,
      transferReason,
      requestedBy: source.budgetOwner,
      status: 'Pending'
    };

    addTransfer(newTransfer);
    setShowCreateModal(false);
    alert('Budget transfer request submitted for approval');

    // Reset form
    setSourceBudget('');
    setTargetBudget('');
    setTransferAmount(0);
    setTransferReason('');
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A0F14]">Budget Transfers</h1>
              <p className="text-[#6E7A82] text-sm">Transfer budget allocations between departments, cost centres, or expense heads</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Transfer
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Transfers</span>
              <ArrowRight className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.totalTransfers}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Pending Approval</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.pending}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Completed</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.approved}</div>
          </div>

          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Transferred</span>
              <DollarSign className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">₹{(stats.totalAmount / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
              <input
                type="text"
                placeholder="Search transfers..."
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
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-lg border border-[#E1E6EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Transfer ID</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Source Budget</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase w-16"></th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Target Budget</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Reason</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Transfer Date</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EA]">
                {filteredTransfers.map(transfer => (
                  <tr key={transfer.id} className="hover:bg-[#F6F9FC]">
                    <td className="px-4 py-3">
                      <span className="text-[#00A9B7]">{transfer.transferNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#0A0F14]">{transfer.sourceBudgetName}</div>
                      <div className="text-xs text-[#6E7A82] mt-1">{transfer.sourceBudget}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRight className="w-5 h-5 text-[#00A9B7] mx-auto" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#0A0F14]">{transfer.targetBudgetName}</div>
                      <div className="text-xs text-[#6E7A82] mt-1">{transfer.targetBudget}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-[#0A0F14]">
                      INR {transfer.transferAmount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[#0A0F14] text-sm">{transfer.transferReason}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-[#0A0F14]">
                        <Calendar className="w-4 h-4 text-[#6E7A82]" />
                        {transfer.transferDate}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        transfer.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        transfer.status === 'Approved' ? 'bg-blue-100 text-blue-700' :
                        transfer.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {transfer.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button className="p-2 hover:bg-[#F6F9FC] rounded transition-colors">
                        <Eye className="w-4 h-4 text-[#6E7A82]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Transfer Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-[#E1E6EA]">
                <h2 className="text-[#0A0F14]">Create Budget Transfer</h2>
                <p className="text-sm text-[#6E7A82] mt-1">Transfer budget allocation between approved budgets</p>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Source Budget */}
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Source Budget <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={sourceBudget}
                    onChange={(e) => setSourceBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select source budget</option>
                    {budgets.filter(b => b.status === 'Approved' && b.available > 0).map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.budgetNumber} - {budget.budgetName} (Available: INR {budget.available.toLocaleString()})
                      </option>
                    ))}
                  </select>
                  {sourceBudget && (
                    <div className="mt-2 p-3 bg-[#F6F9FC] rounded-lg">
                      <p className="text-sm text-[#6E7A82] mb-1">Available Balance</p>
                      <p className="text-lg text-[#0A0F14]">
                        INR {budgets.find(b => b.id === sourceBudget)?.available.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Visual Flow */}
                {sourceBudget && targetBudget && (
                  <div className="flex items-center justify-center gap-4 py-4">
                    <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <p className="text-xs text-blue-600 mb-1">FROM</p>
                      <p className="text-sm text-blue-900 truncate">
                        {budgets.find(b => b.id === sourceBudget)?.budgetName}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <ArrowRight className="w-8 h-8 text-[#00A9B7]" />
                      {transferAmount > 0 && (
                        <span className="text-sm text-[#00A9B7]">
                          ₹{transferAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <p className="text-xs text-green-600 mb-1">TO</p>
                      <p className="text-sm text-green-900 truncate">
                        {budgets.find(b => b.id === targetBudget)?.budgetName}
                      </p>
                    </div>
                  </div>
                )}

                {/* Target Budget */}
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Target Budget <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <select
                    value={targetBudget}
                    onChange={(e) => setTargetBudget(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                  >
                    <option value="">Select target budget</option>
                    {budgets.filter(b => b.status === 'Approved' && b.id !== sourceBudget).map(budget => (
                      <option key={budget.id} value={budget.id}>
                        {budget.budgetNumber} - {budget.budgetName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Amount */}
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Transfer Amount <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <input
                    type="number"
                    value={transferAmount || ''}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    max={budgets.find(b => b.id === sourceBudget)?.available || 0}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="0"
                  />
                  {sourceBudget && transferAmount > 0 && (
                    <p className={`text-sm mt-1 ${
                      transferAmount <= (budgets.find(b => b.id === sourceBudget)?.available || 0)
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {transferAmount <= (budgets.find(b => b.id === sourceBudget)?.available || 0)
                        ? 'Transfer amount is valid'
                        : 'Transfer amount exceeds available budget'}
                    </p>
                  )}
                </div>

                {/* Transfer Reason */}
                <div>
                  <label className="block text-sm text-[#0A0F14] mb-2">Transfer Reason <span style={{ color: '#FF4E5B' }}>*</span></label>
                  <textarea
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                    placeholder="Provide justification for budget transfer..."
                  />
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-yellow-900 mb-1">Transfer Rules</h4>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>• Transfer amount cannot exceed available budget in source</li>
                        <li>• Requires approval before execution</li>
                        <li>• Both source and target budgets will be updated upon approval</li>
                        <li>• Transfer is permanent and cannot be reversed (new transfer required)</li>
                      </ul>
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
                  onClick={handleCreateTransfer}
                  className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors"
                >
                  Submit Transfer Request
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 mb-2">Budget Transfer Process</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Budget transfers allow reallocation of approved budgets between dimensions</li>
                <li>• Common transfer types: Department-to-Department, Cost Centre-to-Cost Centre, Expense Head-to-Expense Head</li>
                <li>• All transfers require approval workflow before execution</li>
                <li>• Real-time balance updates ensure accuracy and prevent over-allocation</li>
                <li>• Complete audit trail maintained for all transfers</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}