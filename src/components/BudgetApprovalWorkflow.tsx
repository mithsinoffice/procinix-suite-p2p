import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, CheckCircle, XCircle, Clock, AlertCircle,
  Eye, ThumbsUp, ThumbsDown, MessageSquare, Calendar, User
} from 'lucide-react';
import { useBudgetData } from '../contexts/BudgetDataContext';

export function BudgetApprovalWorkflow() {
  const navigate = useNavigate();
  const { budgets } = useBudgetData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);

  // Filter budgets in approval process
  const approvalBudgets = budgets.filter(b => 
    ['Submitted', 'In Approval'].includes(b.status) &&
    (statusFilter === 'all' || b.status === statusFilter) &&
    (b.budgetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.budgetNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const stats = {
    pending: budgets.filter(b => b.status === 'Submitted' || b.status === 'In Approval').length,
    approved: budgets.filter(b => b.status === 'Approved').length,
    rejected: budgets.filter(b => b.status === 'Rejected').length,
    overdue: budgets.filter(b => 
      (b.status === 'Submitted' || b.status === 'In Approval') &&
      b.approvalWorkflow.some(step => step.status === 'Pending' && step.overdue)
    ).length
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      case 'Pending': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-[var(--color-ink)]">Budget Approval Workflow</h1>
            <p className="text-[var(--color-mercury-grey)] text-sm">Multi-level approval tracking with SLA monitoring</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Statistics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Pending Approval</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.pending}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Approved</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.approved}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Rejected</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.rejected}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Overdue SLA</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.overdue}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--color-mercury-grey)]" />
              <input
                type="text"
                placeholder="Search by budget name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-[var(--color-mercury-grey)]" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              >
                <option value="all">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="In Approval">In Approval</option>
              </select>
            </div>
          </div>
        </div>

        {/* Budgets List */}
        <div className="grid grid-cols-1 gap-4 mb-6">
          {approvalBudgets.map(budget => (
            <div key={budget.id} className="bg-white rounded-lg border border-[var(--color-silver)] overflow-hidden">
              {/* Budget Header */}
              <div className="px-6 py-4 border-b border-[var(--color-silver)] bg-[var(--color-cloud)]">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-[var(--color-ink)]">{budget.budgetName}</h3>
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(budget.status)}`}>
                        {budget.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-[var(--color-mercury-grey)]">
                      <span>{budget.budgetNumber}</span>
                      <span>•</span>
                      <span>{budget.financialYear}</span>
                      <span>•</span>
                      <span>{budget.currency} {budget.totalAmount.toLocaleString()}</span>
                      <span>•</span>
                      <span>{budget.dimensions.department}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedBudget(selectedBudget === budget.id ? null : budget.id)}
                    className="px-3 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-white transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {selectedBudget === budget.id ? 'Hide' : 'View'} Workflow
                  </button>
                </div>
              </div>

              {/* Approval Workflow Steps */}
              {selectedBudget === budget.id && (
                <div className="px-6 py-4">
                  <div className="relative">
                    {/* Workflow Line */}
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[var(--color-silver)]"></div>

                    {/* Workflow Steps */}
                    <div className="space-y-6">
                      {budget.approvalWorkflow.map((step, index) => (
                        <div key={index} className="relative flex gap-4">
                          {/* Step Icon */}
                          <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 ${
                            step.status === 'Approved' ? 'bg-green-100 border-green-500' :
                            step.status === 'Rejected' ? 'bg-red-100 border-red-500' :
                            step.overdue ? 'bg-red-100 border-red-500' :
                            'bg-yellow-100 border-yellow-500'
                          }`}>
                            {getStatusIcon(step.status)}
                          </div>

                          {/* Step Content */}
                          <div className="flex-1 bg-[var(--color-cloud)] rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="text-[var(--color-ink)]">Level {step.level}: {step.approverRole}</h4>
                                  {step.overdue && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                                      Overdue
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-[var(--color-mercury-grey)]">
                                  <User className="w-4 h-4" />
                                  <span>{step.approver}</span>
                                </div>
                              </div>
                              <span className={`px-3 py-1 rounded text-sm ${getStatusColor(step.status)}`}>
                                {step.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-[var(--color-mercury-grey)] mb-1">SLA Due</p>
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                                  <span className={step.overdue ? 'text-red-600' : 'text-[var(--color-ink)]'}>
                                    {step.slaDue}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <p className="text-[var(--color-mercury-grey)] mb-1">SLA Hours</p>
                                <span className="text-[var(--color-ink)]">{step.slaHours}h</span>
                              </div>
                              <div>
                                <p className="text-[var(--color-mercury-grey)] mb-1">Action Date</p>
                                <span className="text-[var(--color-ink)]">{step.actionDate || 'Pending'}</span>
                              </div>
                            </div>

                            {step.comments && (
                              <div className="mt-3 pt-3 border-t border-[var(--color-silver)]">
                                <div className="flex items-start gap-2">
                                  <MessageSquare className="w-4 h-4 text-[var(--color-mercury-grey)] mt-0.5" />
                                  <div>
                                    <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Comments</p>
                                    <p className="text-sm text-[var(--color-ink)]">{step.comments}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Action Buttons for Pending Steps */}
                            {step.status === 'Pending' && (
                              <div className="mt-3 pt-3 border-t border-[var(--color-silver)] flex gap-2">
                                <button className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors flex items-center gap-2">
                                  <ThumbsUp className="w-4 h-4" />
                                  Approve
                                </button>
                                <button className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors flex items-center gap-2">
                                  <ThumbsDown className="w-4 h-4" />
                                  Reject
                                </button>
                                <button className="px-3 py-1.5 border border-[var(--color-silver)] rounded text-sm hover:bg-white transition-colors flex items-center gap-2">
                                  <MessageSquare className="w-4 h-4" />
                                  Ask for Info
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Approval Summary */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-blue-900 mb-1">Approval Workflow Summary</h4>
                        <p className="text-sm text-blue-700">
                          This budget requires {budget.approvalWorkflow.length}-level approval. 
                          {' '}Current status: {budget.approvalWorkflow.filter(s => s.status === 'Approved').length} of {budget.approvalWorkflow.length} approvals completed.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {approvalBudgets.length === 0 && (
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-mercury-grey)] opacity-50" />
            <p className="text-[var(--color-mercury-grey)] mb-1">No budgets pending approval</p>
            <p className="text-sm text-[var(--color-mercury-grey)]">
              {searchTerm ? 'Try adjusting your search criteria' : 'All budgets are either approved or in draft status'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}