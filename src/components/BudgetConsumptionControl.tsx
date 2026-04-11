import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Filter, TrendingUp, DollarSign, FileText, Package,
  AlertTriangle, Shield, Eye, Download
} from 'lucide-react';
import { useBudgetData } from '../contexts/BudgetDataContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BudgetConsumptionControl() {
  const navigate = useNavigate();
  const { budgets } = useBudgetData();

  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  // Filter budgets
  const filteredBudgets = budgets.filter(b =>
    b.status === 'Approved' &&
    (departmentFilter === 'all' || b.dimensions.department === departmentFilter) &&
    (b.budgetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
     b.budgetNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Calculate aggregated KPIs
  const kpis = filteredBudgets.reduce((acc, b) => ({
    originalBudget: acc.originalBudget + b.totalAmount,
    committed: acc.committed + b.committed,
    actual: acc.actual + b.actual,
    available: acc.available + b.available
  }), { originalBudget: 0, committed: 0, actual: 0, available: 0 });

  const utilizationPercent = kpis.originalBudget > 0 
    ? ((kpis.committed + kpis.actual) / kpis.originalBudget * 100).toFixed(1)
    : '0';

  // Chart data - Budget vs Committed vs Actual by Department
  const departments = ['IT', 'Marketing', 'HR', 'Finance', 'Operations'];
  const chartData = departments.map(dept => {
    const deptBudgets = budgets.filter(b => b.dimensions.department === dept && b.status === 'Approved');
    return {
      name: dept,
      Budget: deptBudgets.reduce((sum, b) => sum + b.totalAmount, 0) / 1000000,
      Committed: deptBudgets.reduce((sum, b) => sum + b.committed, 0) / 1000000,
      Actual: deptBudgets.reduce((sum, b) => sum + b.actual, 0) / 1000000
    };
  });

  // Budget burn rate data (monthly trend)
  const burnRateData = [
    { month: 'Apr', planned: 8.5, actual: 6.2 },
    { month: 'May', planned: 17.0, actual: 13.8 },
    { month: 'Jun', planned: 25.5, actual: 22.1 },
    { month: 'Jul', planned: 34.0, actual: 28.7 },
    { month: 'Aug', planned: 42.5, actual: 36.9 },
    { month: 'Sep', planned: 51.0, actual: 44.3 },
    { month: 'Oct', planned: 59.5, actual: 51.2 },
    { month: 'Nov', planned: 68.0, actual: 57.8 },
    { month: 'Dec', planned: 76.5, actual: 64.5 }
  ];

  const getUtilizationColor = (percent: number) => {
    if (percent >= 95) return 'text-red-600';
    if (percent >= 85) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getControlStatus = (budget: any) => {
    const utilization = budget.utilizationPercent;
    if (utilization >= 95) return { label: 'Hard Stop', color: 'bg-red-100 text-red-700', icon: Shield };
    if (utilization >= 85) return { label: 'Soft Warning', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle };
    return { label: 'Normal', color: 'bg-green-100 text-green-700', icon: Shield };
  };

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[var(--color-ink)]">Budget Consumption & Control</h1>
              <p className="text-[var(--color-mercury-grey)] text-sm">Real-time budget tracking with procurement control enforcement</p>
            </div>
            <button className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Original Budget</span>
              <DollarSign className="w-4 h-4 text-[var(--color-teal)]" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.originalBudget / 1000000).toFixed(1)}M</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Committed (POs)</span>
              <Package className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.committed / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.committed / kpis.originalBudget) * 100).toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Actual (Invoices)</span>
              <FileText className="w-4 h-4 text-px-teal-dark" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.actual / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.actual / kpis.originalBudget) * 100).toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Available</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-green-600">₹{(kpis.available / 1000000).toFixed(1)}M</div>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.available / kpis.originalBudget) * 100).toFixed(1)}%</p>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Utilization</span>
              <TrendingUp className="w-4 h-4 text-[var(--color-teal)]" />
            </div>
            <div className={`text-2xl ${getUtilizationColor(Number(utilizationPercent))}`}>
              {utilizationPercent}%
            </div>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">Budget consumed</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Budget vs Committed vs Actual */}
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Budget vs Committed vs Actual by Department</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="name" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: 'Amount (₹M)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: number) => `₹${value.toFixed(2)}M`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Budget" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Committed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#007D87" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget Burn Rate */}
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Budget Burn Rate - Cumulative %</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={burnRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="planned" stroke="var(--color-teal)" strokeWidth={2} dot={{ fill: 'var(--color-teal)', r: 4 }} name="Planned" />
                <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} name="Actual" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--color-mercury-grey)]" />
              <input
                type="text"
                placeholder="Search budgets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-3 top-3 text-[var(--color-mercury-grey)]" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
              >
                <option value="all">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Budget Table */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-cloud)]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">Budget</th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Total Budget</th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Committed</th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Actual</th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase">Available</th>
                  <th className="px-4 py-3 text-center text-xs text-[var(--color-mercury-grey)] uppercase">Utilization</th>
                  <th className="px-4 py-3 text-center text-xs text-[var(--color-mercury-grey)] uppercase">Control Status</th>
                  <th className="px-4 py-3 text-center text-xs text-[var(--color-mercury-grey)] uppercase">Linked POs</th>
                  <th className="px-4 py-3 text-center text-xs text-[var(--color-mercury-grey)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-silver)]">
                {filteredBudgets.map(budget => {
                  const controlStatus = getControlStatus(budget);
                  const ControlIcon = controlStatus.icon;

                  return (
                    <tr key={budget.id} className="hover:bg-[var(--color-cloud)]">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-[var(--color-ink)]">{budget.budgetName}</div>
                          <div className="text-xs text-[var(--color-mercury-grey)] mt-1">{budget.budgetNumber} • {budget.dimensions.department}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                        {budget.currency} {budget.totalAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600">
                        {budget.currency} {budget.committed.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-px-teal-dark">
                        {budget.currency} {budget.actual.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {budget.currency} {budget.available.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-24 bg-[var(--color-silver)] rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                budget.utilizationPercent >= 95 ? 'bg-red-500' :
                                budget.utilizationPercent >= 85 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(budget.utilizationPercent, 100)}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm ${getUtilizationColor(budget.utilizationPercent)}`}>
                            {budget.utilizationPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${controlStatus.color}`}>
                          <ControlIcon className="w-3 h-3" />
                          {controlStatus.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[var(--color-teal)] cursor-pointer hover:underline">
                          {budget.linkedPOs.length} POs
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => navigate(`/budgeting/budget/${budget.id}`)}
                          className="p-2 hover:bg-[var(--color-cloud)] rounded transition-colors"
                        >
                          <Eye className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Control Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 mb-2">Budget Control Enforcement</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <p>• <strong>Hard Stop (≥95%):</strong> PO creation blocked automatically</p>
                <p>• <strong>Soft Warning (≥85%):</strong> Warning shown with override option for authorized users</p>
                <p>• <strong>Normal (&lt;85%):</strong> POs can be created without restrictions</p>
                <p>• Budget is committed at PO creation and updated to actual upon invoice posting</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}