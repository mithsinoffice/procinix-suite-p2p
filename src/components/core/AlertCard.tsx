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
  type = 'info',
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-silver)',
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      <div
        style={{
          padding: '12px',
          backgroundColor: 'var(--color-cloud)',
          border: '1px dashed var(--color-silver)',
          borderRadius: '4px',
        }}
      >
        <h4 style={{ fontSize: '13px', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>
          {title}
        </h4>
        <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>{message}</p>
      </div>
    </div>
  );
};
