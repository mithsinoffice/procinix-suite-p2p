import { useNavigate } from 'react-router-dom';
import { 
  Plus, FileText, CreditCard, TrendingUp, DollarSign, 
  Clock, CheckCircle, AlertCircle, ArrowRight
} from 'lucide-react';
import { useAPData } from '../contexts/APDataContext';

export function AdvancesHub() {
  const navigate = useNavigate();
  const { advanceRequests, advanceUtilizations } = useAPData();

  // Calculate statistics
  const stats = {
    totalRequests: advanceRequests.length,
    pending: advanceRequests.filter(r => r.status === 'Submitted').length,
    approved: advanceRequests.filter(r => r.status === 'Approved').length,
    readyForPayment: advanceRequests.filter(r => 
      r.status === 'Approved' && 
      (r.paymentStatus === 'Pending' || r.paymentStatus === 'In Queue')
    ).length,
    totalValue: advanceRequests.reduce((sum, r) => sum + r.requestedAmount, 0),
    utilizationOpen: advanceUtilizations.filter(u => u.status !== 'Fully Adjusted').length
  };

  const features = [
    {
      title: 'Create Advance',
      description: 'Raise new vendor advance request',
      icon: Plus,
      color: 'bg-[#00A9B7]',
      textColor: 'text-white',
      path: '/ap/advance-request-form',
      stats: null
    },
    {
      title: 'Advance Requests',
      description: 'View and manage all advance requests',
      icon: FileText,
      color: 'bg-white',
      textColor: 'text-[#0A0F14]',
      path: '/ap/advance-requests',
      stats: [
        { label: 'Total', value: stats.totalRequests },
        { label: 'Pending', value: stats.pending },
        { label: 'Approved', value: stats.approved }
      ]
    },
    {
      title: 'Utilization Tracker',
      description: 'Track advance utilization and recovery',
      icon: TrendingUp,
      color: 'bg-white',
      textColor: 'text-[#0A0F14]',
      path: '/ap/advance-utilization',
      stats: [
        { label: 'Open Balances', value: stats.utilizationOpen }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-[#0A0F14]">Advance Management</h1>
            <p className="text-[#6E7A82] text-sm">Comprehensive vendor advance request and payment management</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-[1400px] mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Requests</span>
              <FileText className="w-4 h-4 text-[#6E7A82]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.totalRequests}</div>
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
              <span className="text-sm text-[#6E7A82]">Ready for Payment</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[#0A0F14]">{stats.readyForPayment}</div>
          </div>
          
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#6E7A82]">Total Value</span>
              <DollarSign className="w-4 h-4 text-[#00A9B7]" />
            </div>
            <div className="text-2xl text-[#0A0F14]">₹{stats.totalValue.toLocaleString()}</div>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-3 gap-6">
          {features.map((module, index) => (
            <div
              key={index}
              onClick={() => navigate(module.path)}
              className={`${module.color} rounded-lg border border-[#E1E6EA] p-6 cursor-pointer transition-all hover:shadow-lg group`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 ${
                    module.color === 'bg-white' ? 'bg-[#00A9B7]/10' : 'bg-white/20'
                  } rounded-lg flex items-center justify-center`}>
                    <module.icon className={`w-6 h-6 ${
                      module.color === 'bg-white' ? 'text-[#00A9B7]' : 'text-white'
                    }`} />
                  </div>
                  <div>
                    <h2 className={module.textColor}>{module.title}</h2>
                    <p className={`text-sm mt-1 ${
                      module.color === 'bg-white' ? 'text-[#6E7A82]' : 'text-white/80'
                    }`}>
                      {module.description}
                    </p>
                  </div>
                </div>
                <ArrowRight className={`w-5 h-5 ${
                  module.color === 'bg-white' ? 'text-[#00A9B7]' : 'text-white'
                } group-hover:translate-x-1 transition-transform`} />
              </div>

              {module.stats && (
                <div className={`pt-4 border-t ${
                  module.color === 'bg-white' ? 'border-[#E1E6EA]' : 'border-white/20'
                }`}>
                  <div className="flex items-center gap-6">
                    {module.stats.map((stat, idx) => (
                      <div key={idx}>
                        <div className={`text-xs ${
                          module.color === 'bg-white' ? 'text-[#6E7A82]' : 'text-white/70'
                        } mb-1`}>
                          {stat.label}
                        </div>
                        <div className={`${module.textColor}`}>
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Information Panel */}
        <div className="mt-8 bg-white rounded-lg border border-[#E1E6EA] p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#00A9B7] mt-0.5" />
            <div>
              <h3 className="text-[#0A0F14] mb-2">About Advance Management</h3>
              <p className="text-sm text-[#6E7A82] mb-3">
                The Advance Management module enables comprehensive handling of vendor advances with the following capabilities:
              </p>
              <ul className="space-y-2 text-sm text-[#6E7A82]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>PO-based Advances:</strong> Request advances against specific PO milestones with automatic eligibility validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>On-Account Advances:</strong> Raise general vendor advances without PO linkage</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>TDS Calculation:</strong> Automatic TDS computation with section-wise rate application</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>Approval Workflow:</strong> Configurable approval chains with SLA tracking and escalation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>Payment Integration:</strong> Seamless flow into payment processing with accounting entry automation</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#00A9B7] mt-0.5 flex-shrink-0" />
                  <span><strong>Utilization Tracking:</strong> Real-time tracking of advance adjustments against invoices with audit trail</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}