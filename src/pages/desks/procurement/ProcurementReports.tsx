/**
 * PROCUREMENT DESK - REPORTS PAGE
 *
 * Purpose: Procurement analytics and reporting
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const ProcurementReports = () => {
  return (
    <DeskLayoutShell deskName="Procurement Desk" pageName="Reports">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
        {['Spend Analysis', 'Vendor Performance', 'Cycle Time Reports'].map((category) => (
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
