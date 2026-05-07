/**
 * CFO DESK - OVERVIEW PAGE
 *
 * Purpose: Executive dashboard for CFO role
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const CFOOverview = () => {
  return (
    <DeskLayoutShell deskName="CFO Desk" pageName="Overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {/* KPI Cards Placeholder */}
        {['Cash Position', 'Payables Due', 'Pending Approvals'].map((title) => (
          <div
            key={title}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              padding: '20px',
              minHeight: '120px',
            }}
          >
            <h3
              style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: '0 0 12px 0' }}
            >
              {title}
            </h3>
            <div
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cloud)',
                border: '1px dashed var(--color-silver)',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                KPI Value
              </span>
            </div>
          </div>
        ))}

        {/* Charts Placeholder */}
        <div
          style={{
            gridColumn: 'span 2',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-silver)',
            borderRadius: '8px',
            padding: '20px',
            minHeight: '300px',
          }}
        >
          <h3
            style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: '0 0 12px 0' }}
          >
            Cash Flow Trend
          </h3>
          <div
            style={{
              padding: '48px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '4px',
              textAlign: 'center',
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
              Chart Placeholder
            </span>
          </div>
        </div>

        {/* Alert Card Placeholder */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-silver)',
            borderRadius: '8px',
            padding: '20px',
            minHeight: '300px',
          }}
        >
          <h3
            style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: '0 0 12px 0' }}
          >
            Alerts
          </h3>
          <div
            style={{
              padding: '24px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Alert List</span>
          </div>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
