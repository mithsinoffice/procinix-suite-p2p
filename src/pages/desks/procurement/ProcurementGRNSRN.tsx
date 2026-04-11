/**
 * PROCUREMENT DESK - GRN/SRN PAGE
 * 
 * Purpose: Goods/Services receipt note management
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const ProcurementGRNSRN = () => {
  return (
    <DeskLayoutShell deskName="Procurement Desk" pageName="GRN / SRN">
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
          <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>GRN/SRN Listing Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
