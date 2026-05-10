/**
 * AP DESK - VENDOR ADVANCES PAGE
 *
 * Purpose: Vendor advance payment management
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const APVendorAdvances = () => {
  return (
    <DeskLayoutShell deskName="AP Desk" pageName="Vendor Advances">
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid var(--color-silver)',
          borderRadius: '8px',
          padding: '20px',
        }}
      >
        <div
          style={{
            padding: '64px',
            backgroundColor: 'var(--color-cloud)',
            border: '1px dashed var(--color-silver)',
            borderRadius: '4px',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
            Vendor Advances Table Placeholder
          </span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
