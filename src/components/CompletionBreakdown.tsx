import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useDashboardData } from '../contexts/DashboardDataContext';

export function CompletionBreakdown() {
  const { metrics } = useDashboardData();
  
  // Build data from actual dashboard metrics
  const data = [
    { name: 'Draft', value: metrics.poStatusBreakdown.draft, color: 'var(--color-slate)' },
    { name: 'Approved', value: metrics.poStatusBreakdown.approved, color: 'var(--color-teal)' },
    { name: 'Partially Received', value: metrics.poStatusBreakdown.partiallyReceived, color: 'var(--color-teal-dark)' },
    { name: 'Fully Received', value: metrics.poStatusBreakdown.fullyReceived, color: '#2A3A42' },
    { name: 'Closed', value: metrics.poStatusBreakdown.closed, color: 'var(--color-mercury-grey)' },
  ].filter(item => item.value > 0); // Only show non-zero values

  return (
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
      <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>
        PO Status Breakdown {metrics.isConsolidated && <span style={{ color: 'var(--color-mercury-grey)', fontSize: '0.875rem' }}>(All Entities)</span>}
      </h2>
      
      {data.length === 0 ? (
        <div style={{ 
          height: '300px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--color-mercury-grey)'
        }}>
          No PO data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ value }) => `${value}`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}