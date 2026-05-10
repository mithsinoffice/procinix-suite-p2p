/**
 * CFO DESK - REPORTS PAGE
 *
 * Purpose: Executive reporting and analytics
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const CFOReports = () => {
  return (
    <DeskLayoutShell deskName="CFO Desk" pageName="Reports">
      {/* Report Categories */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {['Financial Reports', 'Operational Reports', 'Audit Reports'].map((category) => (
          <div
            key={category}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-silver)',
              borderRadius: '8px',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', color: 'var(--color-ink)', margin: '0 0 12px 0' }}>
              {category}
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
                Report List
              </span>
            </div>
          </div>
        ))}
      </div>
    </DeskLayoutShell>
  );
};
