/**
 * CORE COMPONENT - ALERT CARD
 * 
 * Purpose: Reusable alert/notification card
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface AlertCardProps {
  title?: string;
  message?: string;
  type?: 'info' | 'warning' | 'error';
}

export const AlertCard: React.FC<AlertCardProps> = ({ 
  title = 'Alert', 
  message = 'Alert message',
  type = 'info'
}) => {
  return (
    <div 
      style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
        borderRadius: '8px', 
        padding: '16px'
      }}
    >
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#F6F9FC', 
        border: '1px dashed #E1E6EA', 
        borderRadius: '4px'
      }}>
        <h4 style={{ fontSize: '13px', color: '#0A0F14', margin: '0 0 4px 0' }}>{title}</h4>
        <p style={{ fontSize: '12px', color: '#6E7A82', margin: 0 }}>{message}</p>
      </div>
    </div>
  );
};
