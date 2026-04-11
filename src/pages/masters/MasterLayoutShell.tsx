/**
 * MASTER LAYOUT SHELL - CORE COMPONENT
 * 
 * Purpose: Reusable layout wrapper for all master pages
 * Status: SCAFFOLD ONLY - No logic
 */

import React from 'react';

interface MasterLayoutShellProps {
  masterName: string;
  children?: React.ReactNode;
}

export const MasterLayoutShell: React.FC<MasterLayoutShellProps> = ({ 
  masterName, 
  children 
}) => {
  return (
    <div style={{ backgroundColor: 'var(--color-cloud)', minHeight: '100vh', padding: '32px' }}>
      {/* Master Header */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid var(--color-silver)', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', color: 'var(--color-ink)', margin: 0 }}>{masterName}</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
            PLACEHOLDER: Master description
          </p>
        </div>
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: 'var(--color-teal)', 
          borderRadius: '6px'
        }}>
          <span style={{ fontSize: '13px', color: '#FFFFFF' }}>+ Create New</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid var(--color-silver)', 
        borderRadius: '8px', 
        padding: '16px',
        marginBottom: '24px',
        display: 'flex',
        gap: '12px'
      }}>
        {['Status', 'Entity', 'Search'].map((filter) => (
          <div 
            key={filter}
            style={{ 
              padding: '8px 12px', 
              backgroundColor: 'var(--color-cloud)', 
              border: '1px dashed var(--color-silver)', 
              borderRadius: '4px'
            }}
          >
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>{filter}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {children || (
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
            <span style={{ fontSize: '12px', color: 'var(--color-mercury-grey)' }}>Master Data Table Placeholder</span>
          </div>
        </div>
      )}
    </div>
  );
};
