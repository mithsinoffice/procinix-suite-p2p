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
  children 
}) => {
  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F6F9FC' }}>
      {/* Left Navigation Placeholder */}
      <div 
        style={{ 
          width: '240px', 
          backgroundColor: '#0A0F14', 
          borderRight: '1px solid #E1E6EA',
          padding: '24px 16px'
        }}
      >
        <div style={{ 
          padding: '12px', 
          backgroundColor: 'rgba(255,255,255,0.1)', 
          border: '1px dashed rgba(255,255,255,0.2)', 
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <span style={{ fontSize: '13px', color: '#FFFFFF' }}>Left Nav - {deskName}</span>
        </div>

        {/* Nav Items Placeholder */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div 
              key={i}
              style={{ 
                padding: '10px 12px', 
                backgroundColor: 'rgba(255,255,255,0.05)', 
                border: '1px dashed rgba(255,255,255,0.1)', 
                borderRadius: '4px'
              }}
            >
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>Nav Item {i}</span>
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
            borderBottom: '1px solid #E1E6EA',
            padding: '12px 32px'
          }}
        >
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#F6F9FC', 
            border: '1px dashed #E1E6EA', 
            borderRadius: '6px',
            display: 'inline-block'
          }}>
            <span style={{ fontSize: '13px', color: '#6E7A82' }}>Global Context Bar</span>
          </div>
        </div>

        {/* Page Header */}
        <div style={{ backgroundColor: '#FFFFFF', padding: '24px 32px', borderBottom: '1px solid #E1E6EA' }}>
          <h1 style={{ fontSize: '24px', color: '#0A0F14', margin: 0 }}>
            {deskName} / {pageName}
          </h1>
          <p style={{ fontSize: '13px', color: '#6E7A82', marginTop: '4px' }}>
            PLACEHOLDER: Page description
          </p>
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
          {children || (
            <div style={{ 
              backgroundColor: '#FFFFFF', 
              border: '2px dashed #E1E6EA', 
              borderRadius: '8px', 
              padding: '48px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '14px', color: '#6E7A82' }}>
                PLACEHOLDER: Main content area
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
