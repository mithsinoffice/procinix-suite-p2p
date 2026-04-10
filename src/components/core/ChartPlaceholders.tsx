/**
 * CORE COMPONENTS - CHART PLACEHOLDERS
 * 
 * Purpose: Reusable chart component placeholders
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface ChartProps {
  title?: string;
  height?: number;
}

export const LineChartPlaceholder: React.FC<ChartProps> = ({ 
  title = 'Line Chart',
  height = 240
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
      <h3 style={{ fontSize: '16px', color: '#0A0F14', margin: '0 0 16px 0' }}>{title}</h3>
      <div style={{ 
        padding: '48px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px',
        textAlign: 'center',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#6E7A82' }}>Line Chart Placeholder</span>
      </div>
    </div>
  );
};

export const BarChartPlaceholder: React.FC<ChartProps> = ({ 
  title = 'Bar Chart',
  height = 240
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
      <h3 style={{ fontSize: '16px', color: '#0A0F14', margin: '0 0 16px 0' }}>{title}</h3>
      <div style={{ 
        padding: '48px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px',
        textAlign: 'center',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#6E7A82' }}>Bar Chart Placeholder</span>
      </div>
    </div>
  );
};

export const DonutChartPlaceholder: React.FC<ChartProps> = ({ 
  title = 'Donut Chart',
  height = 240
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
      <h3 style={{ fontSize: '16px', color: '#0A0F14', margin: '0 0 16px 0' }}>{title}</h3>
      <div style={{ 
        padding: '48px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px',
        textAlign: 'center',
        height: `${height}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <span style={{ fontSize: '12px', color: '#6E7A82' }}>Donut Chart Placeholder</span>
      </div>
    </div>
  );
};
