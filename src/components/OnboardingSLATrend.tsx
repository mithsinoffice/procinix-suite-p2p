import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useDashboardData } from '../contexts/DashboardDataContext';

export function OnboardingSLATrend() {
  const { metrics } = useDashboardData();

  // Use PO volume trend from dashboard metrics
  const data = metrics.poVolumeTrend.map((item) => ({
    month: item.month,
    count: item.count,
    value: item.value,
  }));

  // Format currency for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: metrics.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg p-6" style={{ border: '1px solid var(--color-silver)' }}>
      <h2 className="text-lg mb-6" style={{ color: 'var(--color-ink)' }}>
        PO Volume Trend{' '}
        {metrics.isConsolidated && (
          <span style={{ color: 'var(--color-mercury-grey)', fontSize: '0.875rem' }}>
            (All Entities)
          </span>
        )}
      </h2>

      {data.length === 0 ? (
        <div
          style={{
            height: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-mercury-grey)',
          }}
        >
          No trend data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-silver)" />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-mercury-grey)' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--color-mercury-grey)' }}
              label={{
                value: 'PO Count',
                angle: -90,
                position: 'insideLeft',
                fill: 'var(--color-mercury-grey)',
              }}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'count') return [`${value} POs`, 'Count'];
                if (name === 'value') return [formatCurrency(value), 'Value'];
                return [value, name];
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-teal)"
              strokeWidth={2}
              dot={{ fill: 'var(--color-teal-dark)', r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
