/**
 * CORE COMPONENT - METRIC + TREND CARD
 * 
 * Purpose: Reusable metric card with trend visualization
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface MetricTrendCardProps {
  title?: string;
  value?: string;
  change?: string;
}

export const MetricTrendCard: React.FC<MetricTrendCardProps> = ({ 
  title = 'Metric Title', 
  value = '0',
  change = '+0%'
}) => {
  return (
    <div 
      style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
        borderRadius: '8px', 
        padding: '20px'
      }}
    >
      <h3 style={{ fontSize: '14px', color: '#6E7A82', margin: '0 0 12px 0' }}>{title}</h3>
      <div style={{ 
        padding: '24px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '28px', color: '#0A0F14', margin: '0 0 8px 0' }}>{value}</p>
        <p style={{ fontSize: '13px', color: '#6E7A82', margin: 0 }}>{change}</p>
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#FFFFFF', borderRadius: '4px' }}>
          <span style={{ fontSize: '11px', color: '#6E7A82' }}>Trend Chart Placeholder</span>
        </div>
      </div>
    </div>
  );
};
