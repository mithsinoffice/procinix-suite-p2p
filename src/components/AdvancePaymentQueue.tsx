import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign,
  Calendar,
  Search,
  CheckSquare,
  Square,
  Send,
  Download,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';

export function AdvancePaymentQueue() {
  const navigate = useNavigate();
  const { advanceRequests } = useAPData();

  // Filter only approved advances ready for payment
  const approvedAdvances = advanceRequests.filter(
    (request) =>
      request.status === 'Approved' &&
      (request.paymentStatus === 'Pending' || request.paymentStatus === 'In Queue')
  );

  const [selectedAdvances, setSelectedAdvances] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMode, setPaymentMode] = useState<'NEFT' | 'RTGS' | 'IMPS' | 'Cheque'>('NEFT');

  // Filter advances
  const filteredAdvances = approvedAdvances.filter(
    (advance) =>
      advance.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      advance.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle advance selection
  const toggleAdvanceSelection = (id: string) => {
    setSelectedAdvances((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Toggle all
  const toggleAll = () => {
    if (selectedAdvances.length === filteredAdvances.length) {
      setSelectedAdvances([]);
    } else {
      setSelectedAdvances(filteredAdvances.map((a) => a.id));
    }
  };

  // Calculate totals
  const selectedTotal = advanceRequests
    .filter((a) => selectedAdvances.includes(a.id))
    .reduce((sum, a) => sum + a.netPayable, 0);

  const handleProcessPayment = () => {
    if (selectedAdvances.length === 0) {
      alert('Please select at least one advance to process');
      return;
    }
    alert(
      `Processing ${selectedAdvances.length} advance payment(s) totaling ₹${selectedTotal.toLocaleString()} via ${paymentMode}`
    );
  };

  // Summary statistics
  const stats = {
    totalAdvances: approvedAdvances.length,
    totalValue: approvedAdvances.reduce((sum, a) => sum + a.netPayable, 0),
    pending: approvedAdvances.filter((a) => a.paymentStatus === 'Pending').length,
    inQueue: approvedAdvances.filter((a) => a.paymentStatus === 'In Queue').length,
  };

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--color-ink)]">Advance Payment Queue</h1>
              <p className="text-[var(--color-mercury-grey)] text-sm">
                Process approved vendor advance payments - centralized payment processing
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/ap/payments')}
                className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors"
              >
                Back to Payments
              </button>
              <button className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Queue
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Total Advances</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.totalAdvances}</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Total Value</span>
              <DollarSign className="w-4 h-4 text-[var(--color-teal)]" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">
              ₹{stats.totalValue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Pending</span>
              <Clock className="w-4 h-4 text-yellow-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.pending}</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">In Queue</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">{stats.inQueue}</div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6 mb-4">
          <h2 className="text-[var(--color-ink)] mb-4">Payment Configuration</h2>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm text-[var(--color-ink)] mb-2">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full px-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              >
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="IMPS">IMPS</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-[var(--color-ink)] mb-2">Payment Date</label>
              <input
                type="date"
                defaultValue={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={handleProcessPayment}
                disabled={selectedAdvances.length === 0}
                className="w-full px-4 py-2 bg-[var(--color-teal)] text-white rounded-lg hover:bg-[var(--color-teal-dark)] transition-colors disabled:bg-[var(--color-silver)] disabled:text-[var(--color-mercury-grey)] disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Process {selectedAdvances.length > 0 && `(${selectedAdvances.length})`} Payment
                {selectedAdvances.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>

          {selectedAdvances.length > 0 && (
            <div className="mt-4 p-4 bg-[var(--color-cloud)] rounded-lg border border-[var(--color-silver)]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--color-ink)]">Selected Payment Total:</span>
                <span className="text-[var(--color-teal)]">₹{selectedTotal.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4 mb-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--color-mercury-grey)]" />
            <input
              type="text"
              placeholder="Search by advance ID or vendor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
            />
          </div>
        </div>

        {/* Payment Queue Table */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-cloud)]">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button onClick={toggleAll} className="flex items-center gap-2">
                      {selectedAdvances.length === filteredAdvances.length &&
                      filteredAdvances.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[var(--color-teal)]" />
                      ) : (
                        <Square className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Advance ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    PO Reference
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">
                    Net Payable
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Approved Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Payment Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-silver)]">
                {filteredAdvances.length > 0 ? (
                  filteredAdvances.map((advance) => (
                    <tr
                      key={advance.id}
                      className={`hover:bg-[var(--color-cloud)] cursor-pointer ${
                        selectedAdvances.includes(advance.id) ? 'bg-[var(--color-teal)]/5' : ''
                      }`}
                      onClick={() => toggleAdvanceSelection(advance.id)}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAdvanceSelection(advance.id);
                          }}
                        >
                          {selectedAdvances.includes(advance.id) ? (
                            <CheckSquare className="w-4 h-4 text-[var(--color-teal)]" />
                          ) : (
                            <Square className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[var(--color-teal)]">{advance.requestNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                          <div>
                            <div className="text-[var(--color-ink)]">{advance.vendor}</div>
                            <div className="text-xs text-[var(--color-mercury-grey)]">
                              {advance.vendorCode}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            advance.advanceType === 'PO-based'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-px-teal-light text-px-teal-dark'
                          }`}
                        >
                          {advance.advanceType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {advance.poNumber ? (
                          <div>
                            <div className="text-[var(--color-ink)]">{advance.poNumber}</div>
                            {advance.milestoneName && (
                              <div className="text-xs text-[var(--color-mercury-grey)]">
                                {advance.milestoneName}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--color-mercury-grey)]">On-Account</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-[var(--color-ink)]">
                          {advance.currency} {advance.netPayable.toLocaleString()}
                        </div>
                        {advance.tdsAmount > 0 && (
                          <div className="text-xs text-[var(--color-mercury-grey)]">
                            TDS: {advance.currency} {advance.tdsAmount.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-[var(--color-mercury-grey)]">
                          <Calendar className="w-4 h-4" />
                          {advance.approvedDate || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            advance.paymentStatus === 'Pending'
                              ? 'bg-yellow-100 text-yellow-700'
                              : advance.paymentStatus === 'In Queue'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {advance.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 text-[var(--color-mercury-grey)] opacity-50" />
                      <p className="text-[var(--color-mercury-grey)]">
                        No advances ready for payment
                      </p>
                      <p className="text-sm text-[var(--color-mercury-grey)] mt-1">
                        {searchTerm
                          ? 'Try adjusting your search'
                          : 'Approved advances will appear here for payment processing'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Processing Info */}
        <div className="mt-4 bg-white rounded-lg border border-[var(--color-silver)] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[var(--color-teal)] mt-0.5" />
            <div className="flex-1">
              <h4 className="text-[var(--color-ink)] mb-1">Payment Processing</h4>
              <p className="text-sm text-[var(--color-mercury-grey)]">
                Selected advances will be included in the payment run. Payments will be processed
                via {paymentMode} and accounting entries will be automatically posted. TDS will be
                deducted as applicable.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
