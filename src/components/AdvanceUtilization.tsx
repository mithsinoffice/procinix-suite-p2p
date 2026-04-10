import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Eye, Download, TrendingUp, DollarSign, 
  Calendar, FileText, Building2, AlertCircle, CheckCircle,
  ArrowRight, Receipt
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';

export function AdvanceUtilization() {
  const navigate = useNavigate();
  const { advanceUtilizations, advances } = useAPData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAdvance, setSelectedAdvance] = useState<string | null>(null);

  // Filter utilizations
  const filteredUtilizations = advanceUtilizations.filter(util =>
    util.advanceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    util.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected utilization details
  const selectedUtilization = selectedAdvance 
    ? advanceUtilizations.find(u => u.advanceNumber === selectedAdvance)
    : null;

  // Get corresponding advance details
  const getAdvanceDetails = (advanceNumber: string) => {
    return advances.find(a => a.advanceNumber === advanceNumber);
  };

  // Summary statistics
  const stats = {
    totalAdvances: advanceUtilizations.length,
    totalOriginal: advanceUtilizations.reduce((sum, u) => sum + u.originalAmount, 0),
    totalAdjusted: advanceUtilizations.reduce((sum, u) => sum + (u.originalAmount - u.remainingBalance), 0),
    totalRemaining: advanceUtilizations.reduce((sum, u) => sum + u.remainingBalance, 0)
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[#0A0F14]">Advance Utilization</h1>
              <p className="text-[#6E7A82] text-sm">Track advance adjustments and remaining balances</p>
            </div>
            <button className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Advances</span>
              <FileText className="w-4 h-4 text-[#6E7A82]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.totalAdvances}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Original Amount</span>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">₹{stats.totalOriginal.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Adjusted</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">₹{stats.totalAdjusted.toLocaleString()}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Remaining</span>
              <TrendingUp className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">₹{stats.totalRemaining.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left Panel - Advance List */}
          <div className="space-y-4">
            {/* Search */}
            <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#6E7A82]" />
                <input
                  type="text"
                  placeholder="Search by advance number or vendor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-[#E1E6EA] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                />
              </div>
            </div>

            {/* Advance Utilization List */}
            <div className="bg-white rounded-lg border border-[#E1E6EA] overflow-hidden">
              <div className="overflow-y-auto max-h-[600px]">
                {filteredUtilizations.length > 0 ? (
                  <div className="divide-y divide-[#E1E6EA]">
                    {filteredUtilizations.map(util => {
                      const advanceDetails = getAdvanceDetails(util.advanceNumber);
                      const utilizationPercent = ((util.originalAmount - util.remainingBalance) / util.originalAmount) * 100;
                      
                      return (
                        <div
                          key={util.id}
                          onClick={() => setSelectedAdvance(util.advanceNumber)}
                          className={`p-4 cursor-pointer transition-colors ${
                            selectedAdvance === util.advanceNumber ? 'bg-[#00A9B7]/5' : 'hover:bg-[#F6F9FC]'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-[#00A9B7] mb-1">{util.advanceNumber}</div>
                              <div className="flex items-center gap-2 text-[#6E7A82] text-sm">
                                <Building2 className="w-3 h-3" />
                                {util.vendor}
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs ${
                              util.status === 'Open' ? 'bg-green-100 text-green-700' :
                              util.status === 'Partially Adjusted' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {util.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                              <div className="text-xs text-[#6E7A82] mb-0.5">Original Amount</div>
                              <div className="text-[#0A0F14]">₹{util.originalAmount.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#6E7A82] mb-0.5">Remaining Balance</div>
                              <div className="text-[#00A9B7]">₹{util.remainingBalance.toLocaleString()}</div>
                            </div>
                          </div>

                          {/* Utilization Progress Bar */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-[#6E7A82] mb-1">
                              <span>Utilization</span>
                              <span>{utilizationPercent.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-[#E1E6EA] rounded-full h-2">
                              <div
                                className="bg-[#00A9B7] h-2 rounded-full transition-all"
                                style={{ width: `${utilizationPercent}%` }}
                              />
                            </div>
                          </div>

                          {advanceDetails && (
                            <div className="mt-3 pt-3 border-t border-[#E1E6EA] text-xs text-[#6E7A82]">
                              {advanceDetails.type === 'PO-linked' ? (
                                <span>PO: {advanceDetails.reference}</span>
                              ) : (
                                <span>On-Account Advance</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-[#6E7A82] opacity-50" />
                    <p className="text-[#6E7A82]">No advance utilizations found</p>
                    <p className="text-sm text-[#6E7A82] mt-1">
                      {searchTerm ? 'Try adjusting your search' : 'Advance utilizations will appear here'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Utilization Details */}
          <div>
            {selectedUtilization ? (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[#0A0F14]">{selectedUtilization.advanceNumber}</h2>
                    <span className={`px-3 py-1 rounded text-sm ${
                      selectedUtilization.status === 'Open' ? 'bg-green-100 text-green-700' :
                      selectedUtilization.status === 'Partially Adjusted' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedUtilization.status}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-[#6E7A82]">
                      <Building2 className="w-4 h-4" />
                      <div>
                        <div className="text-[#0A0F14]">{selectedUtilization.vendor}</div>
                        <div className="text-xs">{selectedUtilization.vendorCode}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#E1E6EA]">
                      <div>
                        <div className="text-xs text-[#6E7A82] mb-1">Original Amount</div>
                        <div className="text-[#0A0F14]">₹{selectedUtilization.originalAmount.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-xs text-[#6E7A82] mb-1">Adjusted</div>
                        <div className="text-[#0A0F14]">
                          ₹{(selectedUtilization.originalAmount - selectedUtilization.remainingBalance).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-[#6E7A82] mb-1">Remaining Balance</div>
                        <div className="text-[#00A9B7]">₹{selectedUtilization.remainingBalance.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Adjustment Timeline */}
                <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
                  <h3 className="text-[#0A0F14] mb-4">Adjustment Timeline</h3>
                  
                  {selectedUtilization.adjustments.length > 0 ? (
                    <div className="space-y-4">
                      {selectedUtilization.adjustments.map((adjustment, index) => (
                        <div key={adjustment.id} className="relative pl-8">
                          {/* Timeline dot and line */}
                          <div className="absolute left-0 top-1 w-4 h-4 bg-[#00A9B7] rounded-full border-2 border-white" />
                          {index < selectedUtilization.adjustments.length - 1 && (
                            <div className="absolute left-2 top-5 bottom-0 w-0.5 bg-[#E1E6EA]" />
                          )}
                          
                          <div className="bg-[#F6F9FC] rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="text-[#0A0F14] mb-1">
                                  Adjusted against {adjustment.invoiceNumber}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-[#6E7A82]">
                                  <Calendar className="w-3 h-3" />
                                  {adjustment.adjustmentDate}
                                </div>
                              </div>
                              <div className="text-[#00A9B7]">
                                ₹{adjustment.adjustedAmount.toLocaleString()}
                              </div>
                            </div>
                            <div className="text-sm text-[#6E7A82]">{adjustment.narration}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-[#6E7A82]">
                      <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No adjustments made yet</p>
                      <p className="text-sm mt-1">This advance is still open for adjustment</p>
                    </div>
                  )}
                </div>

                {/* Linked PO or On-Account Info */}
                {(() => {
                  const advanceDetails = getAdvanceDetails(selectedUtilization.advanceNumber);
                  return advanceDetails && (
                    <div className="bg-white rounded-lg border border-[#E1E6EA] p-6">
                      <h3 className="text-[#0A0F14] mb-4">Advance Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[#6E7A82]">Advance Type:</span>
                          <span className={`px-2 py-1 rounded text-xs ${
                            advanceDetails.type === 'PO-linked' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {advanceDetails.type}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6E7A82]">Reference:</span>
                          <span className="text-[#0A0F14]">{advanceDetails.reference}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#6E7A82]">Advance Date:</span>
                          <span className="text-[#0A0F14]">{advanceDetails.date}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Reconciliation Status */}
                <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#00A9B7] mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-[#0A0F14] mb-1">Reconciliation Status</h4>
                      <p className="text-sm text-[#6E7A82]">
                        {selectedUtilization.status === 'Fully Adjusted' ? (
                          'This advance has been fully adjusted against invoices and is closed for reconciliation.'
                        ) : selectedUtilization.status === 'Partially Adjusted' ? (
                          `Remaining balance of ₹${selectedUtilization.remainingBalance.toLocaleString()} is available for adjustment against future invoices.`
                        ) : (
                          `Full advance amount of ₹${selectedUtilization.originalAmount.toLocaleString()} is available for adjustment.`
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-[#E1E6EA] p-12 text-center">
                <Eye className="w-12 h-12 mx-auto mb-3 text-[#6E7A82] opacity-50" />
                <p className="text-[#6E7A82]">Select an advance to view details</p>
                <p className="text-sm text-[#6E7A82] mt-1">Click on any advance from the list to see its utilization timeline</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}