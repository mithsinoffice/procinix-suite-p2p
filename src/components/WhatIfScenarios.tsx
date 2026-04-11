import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Play, Save, Trash2, Copy, AlertTriangle, TrendingUp, TrendingDown
} from 'lucide-react';
import { useBudgetData, ScenarioType } from '../contexts/BudgetDataContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function WhatIfScenarios() {
  const navigate = useNavigate();
  const { budgets, scenarios, addScenario } = useBudgetData();

  const [scenarioName, setScenarioName] = useState('');
  const [scenarioType, setScenarioType] = useState<ScenarioType>('Custom');
  const [adjustmentPercent, setAdjustmentPercent] = useState(0);
  const [timeHorizon, setTimeHorizon] = useState('FY2025');

  const activeBudgets = budgets.filter(b => b.status === 'Approved');
  const totalBudget = activeBudgets.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCommitted = activeBudgets.reduce((sum, b) => sum + b.committed, 0);
  const totalActual = activeBudgets.reduce((sum, b) => sum + b.actual, 0);

  // Calculate scenario projections
  const projectedBudget = totalBudget * (1 + adjustmentPercent / 100);
  const projectedCommitted = totalCommitted * (1 + adjustmentPercent / 100);
  const projectedActual = totalActual * (1 + adjustmentPercent / 100);
  const projectedAvailable = projectedBudget - projectedCommitted - projectedActual;
  const utilizationPercent = projectedBudget > 0 ? ((projectedCommitted + projectedActual) / projectedBudget * 100) : 0;

  const breachRisk = utilizationPercent >= 95 ? 'High' : utilizationPercent >= 85 ? 'Medium' : 'Low';

  // Scenario comparison data
  const comparisonData = [
    {
      name: 'Current',
      Budget: totalBudget / 1000000,
      Committed: totalCommitted / 1000000,
      Actual: totalActual / 1000000,
      Available: (totalBudget - totalCommitted - totalActual) / 1000000
    },
    {
      name: 'Projected',
      Budget: projectedBudget / 1000000,
      Committed: projectedCommitted / 1000000,
      Actual: projectedActual / 1000000,
      Available: projectedAvailable / 1000000
    }
  ];

  // Budget burn projection
  const months = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const burnProjection = months.map((month, index) => {
    const progress = (index + 1) / 12;
    return {
      month,
      current: (totalActual / totalBudget * 100) * progress,
      projected: (projectedActual / projectedBudget * 100) * progress
    };
  });

  const handleRunScenario = () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    const newScenario = {
      id: `SCN-${String(scenarios.length + 1).padStart(3, '0')}`,
      scenarioName,
      scenarioType,
      adjustmentPercent,
      timeHorizon,
      projectedBudget,
      projectedCommitted,
      projectedActual,
      projectedAvailable,
      breachRisk: breachRisk as 'Low' | 'Medium' | 'High',
      createdBy: 'Current User',
      createdDate: new Date().toISOString().split('T')[0]
    };

    addScenario(newScenario);
    alert('Scenario saved successfully!');
  };

  const presetScenarios = [
    { name: 'Conservative (-10%)', type: 'Conservative' as ScenarioType, adjustment: -10 },
    { name: 'Base (0%)', type: 'Base' as ScenarioType, adjustment: 0 },
    { name: 'Optimistic (+15%)', type: 'Optimistic' as ScenarioType, adjustment: 15 },
    { name: 'Growth (+25%)', type: 'Custom' as ScenarioType, adjustment: 25 }
  ];

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div>
            <h1 className="text-[var(--color-ink)]">What-If & Scenario Analysis</h1>
            <p className="text-[var(--color-mercury-grey)] text-sm">Model budget scenarios with adjustable parameters and impact analysis</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Scenario Configuration */}
          <div className="lg:col-span-1 space-y-6">
            {/* Current State */}
            <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
              <h2 className="text-[var(--color-ink)] mb-4">Current Budget State</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Total Budget</p>
                  <p className="text-xl text-[var(--color-ink)]">₹{(totalBudget / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Committed</p>
                  <p className="text-lg text-blue-600">₹{(totalCommitted / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Actual</p>
                  <p className="text-lg text-px-teal-dark">₹{(totalActual / 1000000).toFixed(2)}M</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Available</p>
                  <p className="text-lg text-green-600">₹{((totalBudget - totalCommitted - totalActual) / 1000000).toFixed(2)}M</p>
                </div>
              </div>
            </div>

            {/* Scenario Builder */}
            <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
              <h2 className="text-[var(--color-ink)] mb-4">Scenario Builder</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--color-ink)] mb-2">Scenario Name</label>
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
                    placeholder="e.g., Q4 Growth Scenario"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-ink)] mb-2">Scenario Type</label>
                  <select
                    value={scenarioType}
                    onChange={(e) => setScenarioType(e.target.value as ScenarioType)}
                    className="w-full px-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
                  >
                    <option value="Base">Base</option>
                    <option value="Optimistic">Optimistic</option>
                    <option value="Conservative">Conservative</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-ink)] mb-2">Time Horizon</label>
                  <select
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--color-silver)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
                  >
                    <option value="FY2024">FY2024</option>
                    <option value="FY2025">FY2025</option>
                    <option value="FY2026">FY2026</option>
                    <option value="Q1 FY2025">Q1 FY2025</option>
                    <option value="Q2 FY2025">Q2 FY2025</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-[var(--color-ink)] mb-2">
                    Budget Adjustment: {adjustmentPercent > 0 ? '+' : ''}{adjustmentPercent}%
                  </label>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="5"
                    value={adjustmentPercent}
                    onChange={(e) => setAdjustmentPercent(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-[var(--color-mercury-grey)] mt-1">
                    <span>-50%</span>
                    <span>0%</span>
                    <span>+50%</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <p className="text-sm text-[var(--color-ink)] mb-2">Quick Presets</p>
                  <div className="grid grid-cols-2 gap-2">
                    {presetScenarios.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => {
                          setScenarioType(preset.type);
                          setAdjustmentPercent(preset.adjustment);
                          setScenarioName(preset.name);
                        }}
                        className="px-3 py-2 text-sm border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors"
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleRunScenario}
                  className="w-full px-4 py-2 bg-[var(--color-teal)] text-white rounded-lg hover:bg-[var(--color-teal-dark)] transition-colors flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Run Scenario
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Scenario Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Projected KPIs */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
                <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Projected Budget</p>
                <p className="text-2xl text-[var(--color-ink)]">₹{(projectedBudget / 1000000).toFixed(2)}M</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${adjustmentPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {adjustmentPercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {adjustmentPercent > 0 ? '+' : ''}{adjustmentPercent}%
                </p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
                <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Projected Committed</p>
                <p className="text-2xl text-blue-600">₹{(projectedCommitted / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-[var(--color-mercury-grey)] mt-1">
                  {((projectedCommitted / projectedBudget) * 100).toFixed(1)}% of budget
                </p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
                <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Projected Available</p>
                <p className="text-2xl text-green-600">₹{(projectedAvailable / 1000000).toFixed(2)}M</p>
                <p className="text-xs text-[var(--color-mercury-grey)] mt-1">
                  {((projectedAvailable / projectedBudget) * 100).toFixed(1)}% remaining
                </p>
              </div>

              <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
                <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Breach Risk</p>
                <p className={`text-2xl ${
                  breachRisk === 'High' ? 'text-red-600' :
                  breachRisk === 'Medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {breachRisk}
                </p>
                <p className="text-xs text-[var(--color-mercury-grey)] mt-1">{utilizationPercent.toFixed(1)}% utilized</p>
              </div>
            </div>

            {/* Scenario Comparison Chart */}
            <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
              <h2 className="text-[var(--color-ink)] mb-4">Scenario Comparison - Current vs Projected</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={comparisonData}>
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
                  <Bar dataKey="Available" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Budget Burn Projection */}
            <div className="bg-white rounded-lg border border-[var(--color-silver)] p-6">
              <h2 className="text-[var(--color-ink)] mb-4">Budget Burn Projection - Cumulative %</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={burnProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
                  <XAxis dataKey="month" stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--color-mercury-grey)" style={{ fontSize: '12px' }} domain={[0, 100]} label={{ value: 'Utilization %', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fill: 'var(--color-mercury-grey)' } }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid var(--color-silver)', borderRadius: '8px' }}
                    formatter={(value: number) => `${value.toFixed(1)}%`}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="current" stroke="var(--color-teal)" strokeWidth={2} dot={{ fill: 'var(--color-teal)', r: 4 }} name="Current Burn" />
                  <Line type="monotone" dataKey="projected" stroke="#3B82F6" strokeWidth={2} strokeDasharray="5 5" dot={{ fill: '#3B82F6', r: 4 }} name="Projected Burn" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Impact Analysis */}
            <div className={`rounded-lg border p-6 ${
              breachRisk === 'High' ? 'bg-red-50 border-red-200' :
              breachRisk === 'Medium' ? 'bg-yellow-50 border-yellow-200' :
              'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  breachRisk === 'High' ? 'text-red-600' :
                  breachRisk === 'Medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`} />
                <div className="flex-1">
                  <h3 className={
                    breachRisk === 'High' ? 'text-red-900' :
                    breachRisk === 'Medium' ? 'text-yellow-900' :
                    'text-green-900'
                  }>Impact Analysis</h3>
                  <div className={`mt-2 space-y-2 text-sm ${
                    breachRisk === 'High' ? 'text-red-700' :
                    breachRisk === 'Medium' ? 'text-yellow-700' :
                    'text-green-700'
                  }`}>
                    <p>
                      • <strong>Budget Change:</strong> {adjustmentPercent > 0 ? 'Increase' : adjustmentPercent < 0 ? 'Decrease' : 'No change'} of {Math.abs(adjustmentPercent)}% 
                      (₹{(Math.abs(projectedBudget - totalBudget) / 1000000).toFixed(2)}M)
                    </p>
                    <p>
                      • <strong>Available Budget:</strong> ₹{(projectedAvailable / 1000000).toFixed(2)}M 
                      ({((projectedAvailable / projectedBudget) * 100).toFixed(1)}% of total)
                    </p>
                    <p>
                      • <strong>Procurement Capacity:</strong> {projectedAvailable > 0 
                        ? `Can accommodate additional POs up to ₹${(projectedAvailable / 1000000).toFixed(2)}M` 
                        : 'Budget fully utilized or exceeded'}
                    </p>
                    <p>
                      • <strong>Risk Assessment:</strong> {breachRisk} risk of budget breach based on current trajectory
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Saved Scenarios */}
            <div className="bg-white rounded-lg border border-[var(--color-silver)]">
              <div className="px-6 py-4 border-b border-[var(--color-silver)]">
                <h2 className="text-[var(--color-ink)]">Saved Scenarios</h2>
              </div>
              <div className="divide-y divide-[var(--color-silver)]">
                {scenarios.map(scenario => (
                  <div key={scenario.id} className="px-6 py-4 hover:bg-[var(--color-cloud)]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-[var(--color-ink)]">{scenario.scenarioName}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            scenario.scenarioType === 'Optimistic' ? 'bg-green-100 text-green-700' :
                            scenario.scenarioType === 'Conservative' ? 'bg-red-100 text-red-700' :
                            scenario.scenarioType === 'Base' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {scenario.scenarioType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            scenario.breachRisk === 'High' ? 'bg-red-100 text-red-700' :
                            scenario.breachRisk === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {scenario.breachRisk} Risk
                          </span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-[var(--color-mercury-grey)]">
                          <span>Adjustment: {scenario.adjustmentPercent > 0 ? '+' : ''}{scenario.adjustmentPercent}%</span>
                          <span>•</span>
                          <span>Budget: ₹{(scenario.projectedBudget / 1000000).toFixed(2)}M</span>
                          <span>•</span>
                          <span>Available: ₹{(scenario.projectedAvailable / 1000000).toFixed(2)}M</span>
                          <span>•</span>
                          <span>{scenario.createdDate}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-white rounded transition-colors">
                          <Copy className="w-4 h-4 text-[var(--color-mercury-grey)]" />
                        </button>
                        <button className="p-2 hover:bg-white rounded transition-colors">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}