/**
 * CORE COMPONENT - KPI CARD
 * 
 * Purpose: Reusable KPI display card
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface KPICardProps {
  title?: string;
  value?: string;
  trend?: string;
}

export const KPICard: React.FC<KPICardProps> = ({ 
  title = 'KPI Title', 
  value = '0', 
  trend = '+0%' 
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
      <h3 style={{ fontSize: '13px', color: '#6E7A82', margin: '0 0 8px 0' }}>{title}</h3>
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '24px', color: '#0A0F14', margin: '0 0 4px 0' }}>{value}</p>
        <p style={{ fontSize: '12px', color: '#6E7A82', margin: 0 }}>{trend}</p>
      </div>
    </div>
  );
};
