import { useDashboardData } from '../contexts/DashboardDataContext';
import { useMasterData } from '../contexts/MasterDataContext';

interface DepartmentData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

export function SpendByDepartment() {
  const { pos, metrics } = useDashboardData();
  const { costCentres, departments } = useMasterData();
  
  // Calculate cost center/department spend from PO data
  const departmentSpendMap = new Map<string, number>();
  
  pos.forEach(po => {
    const costCenterId = po.costCentre || po.department || 'Unassigned';
    const currentSpend = departmentSpendMap.get(costCenterId) || 0;
    // Convert to base currency if consolidated
    const amount = metrics.isConsolidated 
      ? convertToBaseCurrency(po.totalAmount, po.currency)
      : po.totalAmount;
    departmentSpendMap.set(costCenterId, currentSpend + amount);
  });
  
  // Convert to basic exchange rates for consolidated view
  function convertToBaseCurrency(amount: number, currency: string): number {
    if (currency === 'INR') return amount;
    const rates: { [key: string]: number } = {
      'AED': 22.68,
      'USD': 83.25,
      'EUR': 90.50,
      'GBP': 105.20
    };
    return amount * (rates[currency] || 1);
  }
  
  // Sort and get top 5 departments/cost centers
  const topDepartments = Array.from(departmentSpendMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([deptId, amount]) => {
      // Try to find name from cost centres or departments
      const costCentre = costCentres.find(cc => cc.id === deptId);
      const department = departments.find(d => d.id === deptId);
      const name = costCentre?.name || department?.name || deptId;
      
      return {
        deptId,
        name,
        amount
      };
    });
  
  const maxSpend = topDepartments[0]?.amount || 1;
  
  // Map to chart format with colors
  const colors = ['#2A3A42', 'var(--color-teal)', 'var(--color-teal-dark)', 'var(--color-mercury-grey)', 'var(--color-slate)'];
  const departmentData: DepartmentData[] = topDepartments.map((dept, index) => ({
    name: dept.name,
    amount: dept.amount,
    percentage: Math.round((dept.amount / maxSpend) * 100),
    color: colors[index % colors.length]
  }));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: metrics.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
      <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>
        Spend by Cost Center / Department {metrics.isConsolidated && <span style={{ color: 'var(--color-mercury-grey)', fontSize: '0.875rem' }}>(All Entities)</span>}
      </h2>
      
      <div className="space-y-6">
        {departmentData.length > 0 ? (
          departmentData.map((dept, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{ color: '#2A3A42' }}>{index + 1}. {dept.name}</span>
                <span className="text-sm" style={{ color: 'var(--color-ink)' }}>{formatCurrency(dept.amount)}</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--color-cloud)' }}>
                <div 
                  className="h-2 rounded-full"
                  style={{ 
                    width: `${dept.percentage}%`,
                    background: dept.color
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
            No cost center spend data available
          </div>
        )}
      </div>
    </div>
  );
}