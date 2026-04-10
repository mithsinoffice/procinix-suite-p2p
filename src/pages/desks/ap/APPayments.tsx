/**
 * AP DESK - PAYMENTS PAGE
 * 
 * Purpose: Payment processing and tracking
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const APPayments = () => {
  return (
    <DeskLayoutShell deskName="AP Desk" pageName="Payments">
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
        borderRadius: '8px', 
        padding: '20px'
      }}>
        <div style={{ 
          padding: '64px', 
          backgroundColor: '#F6F9FC', 
          border: '1px dashed #E1E6EA', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#6E7A82' }}>Payments Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
