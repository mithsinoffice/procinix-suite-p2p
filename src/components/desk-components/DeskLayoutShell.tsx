/**
 * DESK LAYOUT SHELL - CORE COMPONENT
 *
 * Purpose: Reusable layout wrapper for all desk pages
 * Status: SCAFFOLD ONLY - No logic
 */

import React from 'react';

interface DeskLayoutShellProps {
  deskName: string;
  pageName: string;
  children?: React.ReactNode;
}

export const DeskLayoutShell: React.FC<DeskLayoutShellProps> = ({
  deskName,
  pageName,
  children,
}) => {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--color-cloud)' }}>
      {/* Left Navigation Placeholder */}
      <div
        style={{
          width: '240px',
          backgroundColor: 'var(--color-ink)',
          borderRight: '1px solid var(--color-silver)',
          padding: '24px 16px',
        }}
      >
        <div
          style={{
            padding: '12px',
            backgroundColor: 'rgba(255,255,255,0.1)',
            border: '1px dashed rgba(255,255,255,0.2)',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '13px', color: '#FFFFFF' }}>Left Nav - {deskName}</span>
        </div>

        {/* Nav Items Placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                padding: '10px 12px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px dashed rgba(255,255,255,0.1)',
                borderRadius: '4px',
              }}
            >
              <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>
                Nav Item {i}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Global Context Bar Placeholder */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--color-silver)',
            padding: '12px 32px',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-cloud)',
              border: '1px dashed var(--color-silver)',
              borderRadius: '6px',
              display: 'inline-block',
            }}
          >
            <span style={{ fontSize: '13px', color: 'var(--color-mercury-grey)' }}>
              Global Context Bar
            </span>
          </div>
        </div>

        {/* Page Header */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '24px 32px',
            borderBottom: '1px solid var(--color-silver)',
          }}
        >
          <h1 style={{ fontSize: '24px', color: 'var(--color-ink)', margin: 0 }}>
            {deskName} / {pageName}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
            PLACEHOLDER: Page description
          </p>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children || (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '2px dashed var(--color-silver)',
                borderRadius: '8px',
                padding: '48px',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)' }}>
                PLACEHOLDER: Main content area
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
