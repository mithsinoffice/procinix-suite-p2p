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
              border: '1px solid #E1E6EA', 
              borderRadius: '8px', 
              padding: '20px'
            }}
          >
            <h3 style={{ fontSize: '14px', color: '#0A0F14', margin: '0 0 12px 0' }}>{category}</h3>
            <div style={{ 
              padding: '24px', 
              backgroundColor: '#F6F9FC', 
              border: '1px dashed #E1E6EA', 
              borderRadius: '4px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>Report List</span>
            </div>
          </div>
        ))}
      </div>
    </DeskLayoutShell>
  );
};
