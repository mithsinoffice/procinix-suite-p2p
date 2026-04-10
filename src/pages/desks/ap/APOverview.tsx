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
              border: '1px solid #E1E6EA', 
              borderRadius: '8px', 
              padding: '20px'
            }}
          >
            <h3 style={{ fontSize: '13px', color: '#6E7A82', margin: '0 0 12px 0' }}>{title}</h3>
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#F6F9FC', 
              border: '1px dashed #E1E6EA', 
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>Value</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E1E6EA', 
          borderRadius: '8px', 
          padding: '20px'
        }}
      >
        <h3 style={{ fontSize: '16px', color: '#0A0F14', margin: '0 0 16px 0' }}>Recent Activity</h3>
        <div style={{ 
          padding: '48px', 
          backgroundColor: '#F6F9FC', 
          border: '1px dashed #E1E6EA', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#6E7A82' }}>Activity Feed Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
