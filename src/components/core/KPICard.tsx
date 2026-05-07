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
  trend = '+0%',
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-silver)',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <h3 style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: '0 0 8px 0' }}>
        {title}
      </h3>
      <div
        style={{
          padding: '16px',
          backgroundColor: 'var(--color-cloud)',
          border: '1px dashed var(--color-silver)',
          borderRadius: '4px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '24px', color: 'var(--color-ink)', margin: '0 0 4px 0' }}>{value}</p>
        <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>{trend}</p>
      </div>
    </div>
  );
};
