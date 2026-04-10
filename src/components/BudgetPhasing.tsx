import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save, ArrowLeft, Download, Upload, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useBudgetData, BudgetAllocation } from '../contexts/BudgetDataContext';

export function BudgetPhasing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { budgets, updateBudget } = useBudgetData();

  const budget = budgets.find(b => b.id === id) || budgets[0];
  const [allocations, setAllocations] = useState<BudgetAllocation[]>(budget.allocations);
  const [isModified, setIsModified] = useState(false);

  const updateAllocation = (index: number, field: keyof BudgetAllocation, value: any) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
    setIsModified(true);
  };

  const calculateTotal = (field: 'plannedAmount' | 'revisedAmount') => {
    return allocations.reduce((sum, item) => sum + (item[field] || 0), 0);
  };

  const autoDistribute = (field: 'plannedAmount' | 'revisedAmount') => {
    const total = field === 'plannedAmount' ? budget.totalAmount : calculateTotal('revisedAmount');
    const periodsCount = allocations.length;
    const evenAmount = Math.floor(total / periodsCount);
    const remainder = total - (evenAmount * periodsCount);

    const distributed = allocations.map((item, index) => ({
      ...item,
      [field]: index === periodsCount - 1 ? evenAmount + remainder : evenAmount
    }));

    setAllocations(distributed);
    setIsModified(true);
  };

  const handleSave = () => {
    updateBudget(budget.id, { allocations });
    setIsModified(false);
    alert('Budget phasing saved successfully!');
  };

  const plannedTotal = calculateTotal('plannedAmount');
  const revisedTotal = calculateTotal('revisedAmount');
  const plannedMatch = Math.abs(plannedTotal - budget.totalAmount) < 1;
  const revisedMatch = budget.budgetType === 'Revised' ? Math.abs(revisedTotal - budget.totalAmount) < 1 : true;

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E1E6EA]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/budgeting/budgets')}
                  className="p-1 hover:bg-[#F6F9FC] rounded transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#6E7A82]" />
                </button>
                <h1 className="text-[#0A0F14]">Budget Phasing & Time Allocation</h1>
              </div>
              <p className="text-[#6E7A82] text-sm ml-11">
                {budget.budgetNumber} - {budget.budgetName}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button className="px-4 py-2 border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleSave}
                disabled={!isModified}
                className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg hover:bg-[#007D87] transition-colors disabled:bg-[#E1E6EA] disabled:text-[#6E7A82] flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Budget Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <p className="text-xs text-[#6E7A82] mb-1">Total Budget</p>
            <p className="text-2xl text-[#0A0F14]">{budget.currency} {budget.totalAmount.toLocaleString()}</p>
            <p className="text-xs text-[#6E7A82] mt-1">{budget.financialYear}</p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <p className="text-xs text-[#6E7A82] mb-1">Planned Allocation</p>
            <p className={`text-2xl ${plannedMatch ? 'text-green-600' : 'text-red-600'}`}>
              {budget.currency} {plannedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-[#6E7A82] mt-1">
              {plannedMatch ? 'Fully allocated' : `${Math.abs(plannedTotal - budget.totalAmount).toLocaleString()} mismatch`}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <p className="text-xs text-[#6E7A82] mb-1">Revised Allocation</p>
            <p className="text-2xl text-[#0A0F14]">
              {budget.currency} {revisedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-[#6E7A82] mt-1">
              {revisedTotal > 0 ? 'Revised amounts set' : 'No revisions'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[#E1E6EA] p-4">
            <p className="text-xs text-[#6E7A82] mb-1">Allocation Period</p>
            <p className="text-2xl text-[#0A0F14]">{budget.allocationPeriod}</p>
            <p className="text-xs text-[#6E7A82] mt-1">{allocations.length} periods</p>
          </div>
        </div>

        {/* Phasing Grid */}
        <div className="bg-white rounded-lg border border-[#E1E6EA]">
          <div className="px-6 py-4 border-b border-[#E1E6EA]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[#0A0F14]">Period-wise Budget Allocation</h2>
                <p className="text-sm text-[#6E7A82] mt-1">
                  Allocate budget across {budget.allocationPeriod.toLowerCase()} periods with manual overrides
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => autoDistribute('plannedAmount')}
                  className="px-3 py-2 text-sm border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                >
                  Auto-Distribute Planned
                </button>
                {budget.budgetType === 'Revised' && (
                  <button
                    onClick={() => autoDistribute('revisedAmount')}
                    className="px-3 py-2 text-sm border border-[#E1E6EA] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                  >
                    Auto-Distribute Revised
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase w-32">Period</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase w-48">Planned Budget ({budget.currency})</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase w-48">Revised Budget ({budget.currency})</th>
                  <th className="px-4 py-3 text-right text-xs text-[#6E7A82] uppercase w-32">Variance</th>
                  <th className="px-4 py-3 text-left text-xs text-[#6E7A82] uppercase">Comments</th>
                  <th className="px-4 py-3 text-center text-xs text-[#6E7A82] uppercase w-24">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E1E6EA]">
                {allocations.map((item, index) => {
                  const variance = (item.revisedAmount || item.plannedAmount) - item.plannedAmount;
                  const variancePercent = item.plannedAmount > 0 
                    ? ((variance / item.plannedAmount) * 100).toFixed(1) 
                    : '0';

                  return (
                    <tr key={index} className="hover:bg-[#F6F9FC]">
                      <td className="px-4 py-2">
                        <span className="text-sm text-[#0A0F14]">{item.period}</span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.plannedAmount || ''}
                          onChange={(e) => updateAllocation(index, 'plannedAmount', Number(e.target.value))}
                          className="w-full px-3 py-2 text-right border border-[#E1E6EA] rounded focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.revisedAmount || item.plannedAmount || ''}
                          onChange={(e) => updateAllocation(index, 'revisedAmount', Number(e.target.value))}
                          className="w-full px-3 py-2 text-right border border-[#E1E6EA] rounded focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7] bg-yellow-50"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className={`text-sm ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-[#6E7A82]'}`}>
                          {variance !== 0 && (variance > 0 ? '+' : '')}{variance.toLocaleString()}
                          <div className="text-xs">({variancePercent}%)</div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.comments || ''}
                          onChange={(e) => updateAllocation(index, 'comments', e.target.value)}
                          className="w-full px-3 py-2 border border-[#E1E6EA] rounded focus:outline-none focus:ring-2 focus:ring-[#00A9B7]/20 focus:border-[#00A9B7]"
                          placeholder="Optional notes"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        {variance === 0 ? (
                          <CheckCircle className="w-4 h-4 text-green-600 mx-auto" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-[#F6F9FC] border-t-2 border-[#00A9B7]">
                <tr>
                  <td className="px-4 py-3 text-[#0A0F14]">Total</td>
                  <td className="px-4 py-3 text-right text-[#0A0F14]">
                    {budget.currency} {plannedTotal.toLocaleString()}
                    {!plannedMatch && (
                      <div className="text-xs text-red-600">
                        Target: {budget.currency} {budget.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[#0A0F14]">
                    {budget.currency} {revisedTotal.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className={`${(revisedTotal - plannedTotal) > 0 ? 'text-green-600' : (revisedTotal - plannedTotal) < 0 ? 'text-red-600' : 'text-[#6E7A82]'}`}>
                      {(revisedTotal - plannedTotal) !== 0 && ((revisedTotal - plannedTotal) > 0 ? '+' : '')}
                      {(revisedTotal - plannedTotal).toLocaleString()}
                    </div>
                  </td>
                  <td colSpan={2} className="px-4 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Validation Summary */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className={`rounded-lg border p-4 ${plannedMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {plannedMatch ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <h3 className={plannedMatch ? 'text-green-900' : 'text-red-900'}>Planned Budget Validation</h3>
            </div>
            <p className={`text-sm ${plannedMatch ? 'text-green-700' : 'text-red-700'}`}>
              {plannedMatch 
                ? 'Planned amounts are correctly allocated and match the total budget.'
                : `Planned allocation has a mismatch of ${budget.currency} ${Math.abs(plannedTotal - budget.totalAmount).toLocaleString()}.`}
            </p>
          </div>

          <div className={`rounded-lg border p-4 ${revisedMatch ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {revisedMatch ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <h3 className={revisedMatch ? 'text-green-900' : 'text-yellow-900'}>Revised Budget Status</h3>
            </div>
            <p className={`text-sm ${revisedMatch ? 'text-green-700' : 'text-yellow-700'}`}>
              {revisedTotal > 0 
                ? `Revised allocation is ${budget.currency} ${revisedTotal.toLocaleString()} with variance of ${budget.currency} ${(revisedTotal - plannedTotal).toLocaleString()}.`
                : 'No revised amounts have been set. Planned amounts will be used.'}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-blue-900 mb-1">Budget Phasing Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Auto-Distribute:</strong> Evenly split budget across all periods</li>
                <li>• <strong>Manual Override:</strong> Enter specific amounts for each period to match seasonal patterns</li>
                <li>• <strong>Revised Budget:</strong> Use yellow highlighted column for budget revisions (requires approval)</li>
                <li>• <strong>Validation:</strong> Ensure totals match before saving changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}