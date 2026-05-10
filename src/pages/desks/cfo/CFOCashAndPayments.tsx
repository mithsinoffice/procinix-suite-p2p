/**
 * CFO DESK - CASH AND PAYMENTS PAGE
 *
 * Purpose: Cash flow and payment oversight
 * Status: SCAFFOLD ONLY - No data or logic
 */

import { DeskLayoutShell } from '../../../components/desk-components/DeskLayoutShell';

export const CFOCashAndPayments = () => {
  return (
    <DeskLayoutShell deskName="CFO Desk" pageName="Cash and Payments">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
        {/* Cash Position Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-silver)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', color: 'var(--color-ink)', margin: '0 0 16px 0' }}>
            Cash Position
          </h3>
          <div
            style={{
              padding: '48px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
              Metric + Trend Card
            </span>
          </div>
        </div>

        {/* Payment Schedule */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-silver)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', color: 'var(--color-ink)', margin: '0 0 16px 0' }}>
            Payment Schedule
          </h3>
          <div
            style={{
              padding: '48px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
              Drilldown Table
            </span>
          </div>
        </div>

        {/* Forecast Chart */}
        <div
          style={{
            gridColumn: 'span 2',
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-silver)',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <h3 style={{ fontSize: '16px', color: 'var(--color-ink)', margin: '0 0 16px 0' }}>
            Cash Flow Forecast
          </h3>
          <div
            style={{
              padding: '48px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '4px',
              textAlign: 'center',
              height: '240px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
              Line Chart Placeholder
            </span>
          </div>
        </div>
      </div>
    </DeskLayoutShell>
  );
};
