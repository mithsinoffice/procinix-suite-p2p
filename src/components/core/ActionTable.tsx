/**
 * CORE COMPONENT - ACTION TABLE
 *
 * Purpose: Reusable table with action buttons
 * Status: SCAFFOLD ONLY - No data or logic
 */

interface ActionTableProps {
  title?: string;
  columns?: string[];
}

export const ActionTable: React.FC<ActionTableProps> = ({
  title = 'Table Title',
  columns = ['Column 1', 'Column 2', 'Column 3', 'Actions'],
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
        <p style={{ fontSize: '12px', color: 'var(--color-mercury-grey)', margin: '0 0 8px 0' }}>
          Action Table Placeholder
        </p>
        <p style={{ fontSize: '11px', color: 'var(--color-mercury-grey)', margin: 0 }}>
          Columns: {columns.join(', ')}
        </p>
      </div>
    </div>
  );
};
