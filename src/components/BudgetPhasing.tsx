import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, ArrowLeft, Download, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBudgetData, BudgetAllocation } from '../contexts/BudgetDataContext';

export function BudgetPhasing() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { budgets, updateBudget } = useBudgetData();

  const budget = budgets.find((b) => b.id === id) || budgets[0];
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
    const remainder = total - evenAmount * periodsCount;

    const distributed = allocations.map((item, index) => ({
      ...item,
      [field]: index === periodsCount - 1 ? evenAmount + remainder : evenAmount,
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
  const revisedMatch =
    budget.budgetType === 'Revised' ? Math.abs(revisedTotal - budget.totalAmount) < 1 : true;

  return (
    <div className="min-h-screen bg-[var(--color-cloud)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-silver)]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => navigate('/budgeting/budgets')}
                  className="p-1 hover:bg-[var(--color-cloud)] rounded transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[var(--color-mercury-grey)]" />
                </button>
                <h1 className="text-[var(--color-ink)]">Budget Phasing & Time Allocation</h1>
              </div>
              <p className="text-[var(--color-mercury-grey)] text-sm ml-11">
                {budget.budgetNumber} - {budget.budgetName}
              </p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Import
              </button>
              <button className="px-4 py-2 border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleSave}
                disabled={!isModified}
                className="px-4 py-2 bg-[var(--color-teal)] text-white rounded-lg hover:bg-[var(--color-teal-dark)] transition-colors disabled:bg-[var(--color-silver)] disabled:text-[var(--color-mercury-grey)] flex items-center gap-2"
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
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Total Budget</p>
            <p className="text-2xl text-[var(--color-ink)]">
              {budget.currency} {budget.totalAmount.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">{budget.financialYear}</p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Planned Allocation</p>
            <p className={`text-2xl ${plannedMatch ? 'text-green-600' : 'text-red-600'}`}>
              {budget.currency} {plannedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">
              {plannedMatch
                ? 'Fully allocated'
                : `${Math.abs(plannedTotal - budget.totalAmount).toLocaleString()} mismatch`}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Revised Allocation</p>
            <p className="text-2xl text-[var(--color-ink)]">
              {budget.currency} {revisedTotal.toLocaleString()}
            </p>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">
              {revisedTotal > 0 ? 'Revised amounts set' : 'No revisions'}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-[var(--color-silver)] p-4">
            <p className="text-xs text-[var(--color-mercury-grey)] mb-1">Allocation Period</p>
            <p className="text-2xl text-[var(--color-ink)]">{budget.allocationPeriod}</p>
            <p className="text-xs text-[var(--color-mercury-grey)] mt-1">
              {allocations.length} periods
            </p>
          </div>
        </div>

        {/* Phasing Grid */}
        <div className="bg-white rounded-lg border border-[var(--color-silver)]">
          <div className="px-6 py-4 border-b border-[var(--color-silver)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[var(--color-ink)]">Period-wise Budget Allocation</h2>
                <p className="text-sm text-[var(--color-mercury-grey)] mt-1">
                  Allocate budget across {budget.allocationPeriod.toLowerCase()} periods with manual
                  overrides
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => autoDistribute('plannedAmount')}
                  className="px-3 py-2 text-sm border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors"
                >
                  Auto-Distribute Planned
                </button>
                {budget.budgetType === 'Revised' && (
                  <button
                    onClick={() => autoDistribute('revisedAmount')}
                    className="px-3 py-2 text-sm border border-[var(--color-silver)] rounded-lg hover:bg-[var(--color-cloud)] transition-colors"
                  >
                    Auto-Distribute Revised
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-cloud)] sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase w-32">
                    Period
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase w-48">
                    Planned Budget ({budget.currency})
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase w-48">
                    Revised Budget ({budget.currency})
                  </th>
                  <th className="px-4 py-3 text-right text-xs text-[var(--color-mercury-grey)] uppercase w-32">
                    Variance
                  </th>
                  <th className="px-4 py-3 text-left text-xs text-[var(--color-mercury-grey)] uppercase">
                    Comments
                  </th>
                  <th className="px-4 py-3 text-center text-xs text-[var(--color-mercury-grey)] uppercase w-24">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-silver)]">
                {allocations.map((item, index) => {
                  const variance = (item.revisedAmount || item.plannedAmount) - item.plannedAmount;
                  const variancePercent =
                    item.plannedAmount > 0
                      ? ((variance / item.plannedAmount) * 100).toFixed(1)
                      : '0';

                  return (
                    <tr key={index} className="hover:bg-[var(--color-cloud)]">
                      <td className="px-4 py-2">
                        <span className="text-sm text-[var(--color-ink)]">{item.period}</span>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.plannedAmount || ''}
                          onChange={(e) =>
                            updateAllocation(index, 'plannedAmount', Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-right border border-[var(--color-silver)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={item.revisedAmount || item.plannedAmount || ''}
                          onChange={(e) =>
                            updateAllocation(index, 'revisedAmount', Number(e.target.value))
                          }
                          className="w-full px-3 py-2 text-right border border-[var(--color-silver)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)] bg-yellow-50"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div
                          className={`text-sm ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : 'text-[var(--color-mercury-grey)]'}`}
                        >
                          {variance !== 0 && (variance > 0 ? '+' : '')}
                          {variance.toLocaleString()}
                          <div className="text-xs">({variancePercent}%)</div>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.comments || ''}
                          onChange={(e) => updateAllocation(index, 'comments', e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--color-silver)] rounded focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]/20 focus:border-[var(--color-teal)]"
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
              <tfoot className="bg-[var(--color-cloud)] border-t-2 border-[var(--color-teal)]">
                <tr>
                  <td className="px-4 py-3 text-[var(--color-ink)]">Total</td>
                  <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                    {budget.currency} {plannedTotal.toLocaleString()}
                    {!plannedMatch && (
                      <div className="text-xs text-red-600">
                        Target: {budget.currency} {budget.totalAmount.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-[var(--color-ink)]">
                    {budget.currency} {revisedTotal.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div
                      className={`${revisedTotal - plannedTotal > 0 ? 'text-green-600' : revisedTotal - plannedTotal < 0 ? 'text-red-600' : 'text-[var(--color-mercury-grey)]'}`}
                    >
                      {revisedTotal - plannedTotal !== 0 &&
                        (revisedTotal - plannedTotal > 0 ? '+' : '')}
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
          <div
            className={`rounded-lg border p-4 ${plannedMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {plannedMatch ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              <h3 className={plannedMatch ? 'text-green-900' : 'text-red-900'}>
                Planned Budget Validation
              </h3>
            </div>
            <p className={`text-sm ${plannedMatch ? 'text-green-700' : 'text-red-700'}`}>
              {plannedMatch
                ? 'Planned amounts are correctly allocated and match the total budget.'
                : `Planned allocation has a mismatch of ${budget.currency} ${Math.abs(plannedTotal - budget.totalAmount).toLocaleString()}.`}
            </p>
          </div>

          <div
            className={`rounded-lg border p-4 ${revisedMatch ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              {revisedMatch ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              )}
              <h3 className={revisedMatch ? 'text-green-900' : 'text-yellow-900'}>
                Revised Budget Status
              </h3>
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
                <li>
                  • <strong>Auto-Distribute:</strong> Evenly split budget across all periods
                </li>
                <li>
                  • <strong>Manual Override:</strong> Enter specific amounts for each period to
                  match seasonal patterns
                </li>
                <li>
                  • <strong>Revised Budget:</strong> Use yellow highlighted column for budget
                  revisions (requires approval)
                </li>
                <li>
                  • <strong>Validation:</strong> Ensure totals match before saving changes
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
