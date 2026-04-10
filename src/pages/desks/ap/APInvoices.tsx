/**
 * AP DESK - INVOICES PAGE
 * 
 * Purpose: Invoice management hub
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const APInvoices = () => {
  return (
    <DeskLayoutShell deskName="AP Desk" pageName="Invoices">
      {/* Actions Bar */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          {['Status', 'Entity', 'Vendor', 'Date Range'].map((filter) => (
            <div 
              key={filter}
              style={{ 
                padding: '8px 12px', 
                backgroundColor: '#F6F9FC', 
                border: '1px dashed #E1E6EA', 
                borderRadius: '4px'
              }}
            >
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>{filter}</span>
            </div>
          ))}
        </div>
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#00A9B7', 
          borderRadius: '6px'
        }}>
          <span style={{ fontSize: '13px', color: '#FFFFFF' }}>+ Create Invoice</span>
        </div>
      </div>

      {/* Invoice Table */}
      <div 
        style={{ 
          backgroundColor: '#FFFFFF', 
          border: '1px solid #E1E6EA', 
          borderRadius: '8px', 
          padding: '20px'
        }}
      >
        <div style={{ 
          padding: '64px', 
          backgroundColor: '#F6F9FC', 
          border: '1px dashed #E1E6EA', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '12px', color: '#6E7A82' }}>Invoice Listing Table Placeholder</span>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
