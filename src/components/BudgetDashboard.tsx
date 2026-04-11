import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, DollarSign, AlertTriangle, CheckCircle, BarChart3,
  Download, Calendar, Filter, ArrowRight
} from 'lucide-react';
import { useBudgetData } from '../contexts/BudgetDataContext';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function BudgetDashboard() {
  const navigate = useNavigate();
  const { budgets, policies } = useBudgetData();

  const [timeFilter, setTimeFilter] = useState('FY2025');

  const activeBudgets = budgets.filter(b => b.status === 'Approved');

  // Calculate KPIs for ACIL Metro Station Phase 2
  const kpis = {
    totalBudget: activeBudgets.reduce((sum, b) => sum + b.totalAmount, 0),
    committed: activeBudgets.reduce((sum, b) => sum + b.committed, 0),
    actual: activeBudgets.reduce((sum, b) => sum + b.actual, 0),
    available: activeBudgets.reduce((sum, b) => sum + b.available, 0)
  };

  const utilizationPercent = kpis.totalBudget > 0 
    ? ((kpis.committed + kpis.actual) / kpis.totalBudget * 100).toFixed(1)
    : '0';

  // Forecasted Final Cost (EAC - Estimate at Completion)
  const forecastedFinalCost = kpis.totalBudget + (kpis.actual - (kpis.committed + kpis.actual)) * 0.1; // Simple forecast
  const costOverrun = forecastedFinalCost - kpis.totalBudget;

  // Next 3 months cash impact
  const nextThreeMonthsCash = activeBudgets.reduce((sum, b) => {
    const currentMonth = new Date().getMonth();
    const nextThreeAllocations = b.allocations.slice(currentMonth, currentMonth + 3);
    return sum + nextThreeAllocations.reduce((s, a) => s + a.plannedAmount, 0);
  }, 0);

  // Budget vs Actual by Category (Materials, Subcontract, Services, Site OPEX)
  const categories = ['Materials', 'Subcontract', 'Services', 'Site Operations'];
  const categoryColors = ['var(--color-teal)', '#3B82F6', '#007D87', '#F59E0B'];
  const categoryData = categories.map((cat, idx) => {
    const catBudgets = activeBudgets.filter(b => b.dimensions.expenseCategory === cat);
    const total = catBudgets.reduce((sum, b) => sum + b.totalAmount, 0);
    return {
      name: cat,
      Budget: total / 10000000, // In Cr
      Committed: catBudgets.reduce((sum, b) => sum + b.committed, 0) / 10000000,
      Actual: catBudgets.reduce((sum, b) => sum + b.actual, 0) / 10000000,
      Available: catBudgets.reduce((sum, b) => sum + b.available, 0) / 10000000,
      value: ((total / kpis.totalBudget) * 100).toFixed(0),
      color: categoryColors[idx]
    };
  });

  // Budget at risk (>75% utilization)
  const atRiskBudgets = activeBudgets
    .filter(b => b.utilizationPercent >= 75)
    .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
    .slice(0, 5);

  // Monthly burn rate trend
  const burnRateData = [
    { month: 'Apr', planned: 25, actual: 18, forecast: 19 },
    { month: 'May', planned: 50, actual: 41, forecast: 43 },
    { month: 'Jun', planned: 75, actual: 63, forecast: 67 },
    { month: 'Jul', planned: 104, actual: 89, forecast: 93 },
    { month: 'Aug', planned: 133, actual: 117, forecast: 122 },
    { month: 'Sep', planned: 162, actual: null, forecast: 151 },
    { month: 'Oct', planned: 191, actual: null, forecast: 180 },
    { month: 'Nov', planned: 220, actual: null, forecast: 209 },
    { month: 'Dec', planned: 249, actual: null, forecast: 238 }
  ];

  const getRiskColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-100 text-red-700';
    if (percent >= 75) return 'bg-yellow-100 text-yellow-700';
    return 'bg-green-100 text-green-700';
  };

  const getRiskIcon = (percent: number) => {
    if (percent >= 90) return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (percent >= 75) return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-[var(--color-ink)]">Project Budget Dashboard</h1>
              <p className="text-[var(--color-mercury-grey)] text-sm">ACIL - Metro Station Phase 2 | Apr 2025 - Mar 2026 | Delhi NCR</p>
            </div>
            <div className="flex gap-3">
              <select 
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="px-4 py-2 border border-[var(--color-silver)] rounded-lg text-sm"
              >
                <option value="FY2025">FY 2025-26</option>
                <option value="Q1">Q1 FY2025</option>
                <option value="Q2">Q2 FY2025</option>
                <option value="Q3">Q3 FY2025</option>
                <option value="Q4">Q4 FY2025</option>
              </select>
              <button 
                onClick={() => navigate('/budget-planning-creation')}
                className="px-4 py-2 bg-[var(--color-teal)] text-white rounded-lg hover:bg-[var(--color-teal-dark)] transition-colors flex items-center gap-2"
              >
                Create Budget
              </button>
              <button className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--color-mercury-grey)]">
            <span className="px-2 py-1 bg-[var(--color-cloud)] rounded">WBS: ACIL-METRO-P2</span>
            <span className="px-2 py-1 bg-[var(--color-cloud)] rounded">Cost Centre: ACIL-METRO-P2</span>
            <span className="px-2 py-1 bg-[var(--color-cloud)] rounded">SAP Integration: Active</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Key Performance Indicators */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Total Budget</span>
              <DollarSign className="w-4 h-4 text-[var(--color-mercury-grey)]" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.totalBudget / 10000000).toFixed(0)} Cr</div>
            <div className="text-xs text-[var(--color-mercury-grey)] mt-1">Approved Budget</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Committed</span>
              <BarChart3 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.committed / 10000000).toFixed(1)} Cr</div>
            <div className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.committed / kpis.totalBudget) * 100).toFixed(1)}% of budget</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Actuals</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.actual / 10000000).toFixed(1)} Cr</div>
            <div className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.actual / kpis.totalBudget) * 100).toFixed(1)}% of budget</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Available</span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(kpis.available / 10000000).toFixed(1)} Cr</div>
            <div className="text-xs text-[var(--color-mercury-grey)] mt-1">{((kpis.available / kpis.totalBudget) * 100).toFixed(1)}% remaining</div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Forecasted EAC</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(forecastedFinalCost / 10000000).toFixed(1)} Cr</div>
            <div className={`text-xs mt-1 ${costOverrun > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {costOverrun > 0 ? '+' : ''}₹{(costOverrun / 10000000).toFixed(1)} Cr variance
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[var(--color-mercury-grey)]">Next 3M Cash</span>
              <Calendar className="w-4 h-4 text-px-teal-dark" />
            </div>
            <div className="text-2xl text-[var(--color-ink)]">₹{(nextThreeMonthsCash / 10000000).toFixed(0)} Cr</div>
            <div className="text-xs text-[var(--color-mercury-grey)] mt-1">Jun-Aug 2025</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Budget vs Actual by Category */}
          <div className="col-span-2 bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Budget vs Actual by Category</h2>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="name" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} label={{ value: 'Amount (₹Cr)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: number) => `₹${value.toFixed(2)}Cr`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Budget" fill="var(--color-teal)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Committed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#007D87" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Budget Distribution */}
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Budget Distribution</h2>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={(entry) => `${entry.value}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {categoryData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="text-[var(--color-ink)]">{cat.name}</span>
                  </div>
                  <span className="text-[var(--color-mercury-grey)]">{cat.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Burn Rate Trend */}
          <div className="col-span-2 bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Budget Burn Rate Trend - Cumulative %</h2>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={burnRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                  formatter={(value: number) => `${value.toFixed(1)}%`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="planned" stroke="var(--color-teal)" strokeWidth={2} dot={{ fill: 'var(--color-teal)', r: 4 }} name="Planned Burn" />
                <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6', r: 4 }} name="Actual Burn" />
                <Line type="monotone" dataKey="forecast" stroke="#FF9900" strokeWidth={2} dot={{ fill: '#FF9900', r: 4 }} name="Forecast Burn" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Overruns */}
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
            <h2 className="text-[var(--color-ink)] mb-4">Top Budget Overruns</h2>
            <div className="space-y-3">
              {atRiskBudgets.map((budget, idx) => (
                <div key={budget.id} className="p-3 bg-[var(--color-cloud)] rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm text-[var(--color-ink)] truncate">{budget.budgetName}</p>
                      <p className="text-xs text-[var(--color-mercury-grey)] mt-0.5">{budget.dimensions.department}</p>
                    </div>
                    <span className={`text-sm ${
                      budget.utilizationPercent >= 95 ? 'text-red-600' :
                      budget.utilizationPercent >= 85 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {budget.utilizationPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-[var(--color-silver)] rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        budget.utilizationPercent >= 95 ? 'bg-red-500' :
                        budget.utilizationPercent >= 85 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.utilizationPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/budgeting/consumption')}
              className="w-full mt-4 px-3 py-2 text-sm text-[var(--color-teal)] border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center justify-center gap-2"
            >
              View All Budgets
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts & Budget Breach Warnings */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)]">
          <div className="px-6 py-4 border-b border-[var(--color-silver)]">
            <h2 className="text-[var(--color-ink)]">Alerts & Budget Breach Warnings</h2>
          </div>
          <div className="divide-y divide-[var(--color-silver)]">
            {atRiskBudgets.map((alert, idx) => (
              <div key={idx} className="px-6 py-4 hover:bg-[var(--color-cloud)]">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    alert.utilizationPercent >= 90 ? 'bg-red-100' :
                    alert.utilizationPercent >= 75 ? 'bg-yellow-100' :
                    'bg-green-100'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.utilizationPercent >= 90 ? 'text-red-600' :
                      alert.utilizationPercent >= 75 ? 'text-yellow-600' :
                      'text-green-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-[var(--color-ink)]">{alert.budgetName}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        alert.utilizationPercent >= 90 ? 'bg-red-100 text-red-700' :
                        alert.utilizationPercent >= 75 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {alert.utilizationPercent >= 90 ? 'HIGH' :
                        alert.utilizationPercent >= 75 ? 'MEDIUM' :
                        'LOW'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--color-mercury-grey)] mb-2">Utilization: {alert.utilizationPercent.toFixed(1)}%</p>
                    <div className="flex items-center gap-4 text-xs text-[var(--color-mercury-grey)]">
                      <span>{alert.id}</span>
                      <button className="text-[var(--color-teal)] hover:underline">View Details</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <button
            onClick={() => navigate('/budgeting/create')}
            className="p-4 bg-white border border-[var(--color-silver)] rounded-lg hover:border-[var(--color-teal)] hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 bg-[var(--color-teal)]/10 rounded-lg flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-[var(--color-teal)]" />
            </div>
            <h3 className="text-[var(--color-ink)] mb-1">Create Budget</h3>
            <p className="text-xs text-[var(--color-mercury-grey)]">Plan new budget allocation</p>
          </button>

          <button
            onClick={() => navigate('/budgeting/revisions')}
            className="p-4 bg-white border border-[var(--color-silver)] rounded-lg hover:border-[var(--color-teal)] hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-[var(--color-ink)] mb-1">Revise Budgets</h3>
            <p className="text-xs text-[var(--color-mercury-grey)]">Update approved budgets</p>
          </button>

          <button
            onClick={() => navigate('/budgeting/transfers')}
            className="p-4 bg-white border border-[var(--color-silver)] rounded-lg hover:border-[var(--color-teal)] hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 bg-px-teal-light rounded-lg flex items-center justify-center mb-3">
              <ArrowRight className="w-5 h-5 text-px-teal-dark" />
            </div>
            <h3 className="text-[var(--color-ink)] mb-1">Transfer Budget</h3>
            <p className="text-xs text-[var(--color-mercury-grey)]">Reallocate between budgets</p>
          </button>

          <button
            onClick={() => navigate('/budgeting/scenarios')}
            className="p-4 bg-white border border-[var(--color-silver)] rounded-lg hover:border-[var(--color-teal)] hover:shadow-sm transition-all text-left"
          >
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-[var(--color-ink)] mb-1">What-If Analysis</h3>
            <p className="text-xs text-[var(--color-mercury-grey)]">Run budget scenarios</p>
          </button>
        </div>
      </div>
    </div>
  );
}