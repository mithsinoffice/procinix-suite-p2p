/**
 * PROCUREMENT DESK - INTAKE PR PAGE
 * 
 * Purpose: Purchase requisition intake and management
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const ProcurementIntakePR = () => {
  return (
    <DeskLayoutShell deskName="Procurement Desk" pageName="Intake PR">
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid var(--color-silver)', 
        borderRadius: '8px', 
        padding: '20px'
      }}>
        <div style={{ 
          padding: '64px', 
          backgroundColor: 'var(--color-cloud)', 
          border: '1px dashed var(--color-silver)', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>PR Listing Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
