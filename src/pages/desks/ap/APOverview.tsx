/**
 * AP DESK - OVERVIEW PAGE
 * 
 * Purpose: Accounts Payable dashboard
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const APOverview = () => {
  return (
    <DeskLayoutShell deskName="AP Desk" pageName="Overview">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* KPI Cards */}
        {['Total Payables', 'Due This Week', 'Overdue', 'Advances'].map((title) => (
          <div 
            key={title}
            style={{ 
              backgroundColor: '#FFFFFF', 
              border: '1px solid var(--color-silver)', 
              borderRadius: '8px', 
              padding: '20px'
            }}
          >
            <h3 style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', margin: '0 0 12px 0' }}>{title}</h3>
            <div style={{ 
              padding: '16px', 
              backgroundColor: 'var(--color-cloud)', 
              border: '1px dashed var(--color-silver)', 
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Value</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid var(--color-silver)', 
          borderRadius: '8px', 
          padding: '20px'
        }}
      >
        <h3 style={{ fontSize: '16px', color: 'var(--color-ink)', margin: '0 0 16px 0' }}>Recent Activity</h3>
        <div style={{ 
          padding: '48px', 
          backgroundColor: 'var(--color-cloud)', 
          border: '1px dashed var(--color-silver)', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Activity Feed Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
