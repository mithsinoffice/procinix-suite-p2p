/**
 * CORE COMPONENT - DRILLDOWN TABLE
 *
 * Purpose: Reusable table with expand/collapse functionality
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface DrilldownTableProps {
  title?: string;
}

export const DrilldownTable: React.FC<DrilldownTableProps> = ({ title = 'Drilldown Table' }) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-silver)',
        borderRadius: '8px',
        padding: '20px',
      }}
    >
      <h3 style={{ fontSize: '16px', color: 'var(--color-ink)', margin: '0 0 16px 0' }}>{title}</h3>
      <div
        style={{
          padding: '48px',
          backgroundColor: 'var(--color-cloud)',
          border: '1px dashed var(--color-silver)',
          borderRadius: '4px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: 0 }}>
          Drilldown Table Placeholder
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
          with expand/collapse rows
        </p>
      </div>
    </div>
  );
};
