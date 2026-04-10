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
          <span style={{ fontSize: '12px', color: '#6E7A82' }}>GRN/SRN Listing Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
