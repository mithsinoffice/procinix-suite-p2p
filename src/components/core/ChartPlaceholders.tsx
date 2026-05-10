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
  height = 240,
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
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
          Line Chart Placeholder
        </span>
      </div>
    </div>
  );
};

export const BarChartPlaceholder: React.FC<ChartProps> = ({
  title = 'Bar Chart',
  height = 240,
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
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
          Bar Chart Placeholder
        </span>
      </div>
    </div>
  );
};

export const DonutChartPlaceholder: React.FC<ChartProps> = ({
  title = 'Donut Chart',
  height = 240,
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
          height: `${height}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
          Donut Chart Placeholder
        </span>
      </div>
    </div>
  );
};
