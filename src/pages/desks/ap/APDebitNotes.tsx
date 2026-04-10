/**
 * AP DESK - DEBIT NOTES PAGE
 * 
 * Purpose: Debit note management
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const APDebitNotes = () => {
  return (
    <DeskLayoutShell deskName="AP Desk" pageName="Debit Notes">
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
          <span style={{ fontSize: '12px', color: '#6E7A82' }}>Debit Notes Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
