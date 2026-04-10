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
    <div style={{ backgroundColor: '#F6F9FC', minHeight: '100vh', padding: '32px' }}>
      {/* Master Header */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
        borderRadius: '8px', 
        padding: '20px',
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '20px', color: '#0A0F14', margin: 0 }}>{masterName}</h1>
          <p style={{ fontSize: '13px', color: '#6E7A82', marginTop: '4px' }}>
            PLACEHOLDER: Master description
          </p>
        </div>
        <div style={{ 
          padding: '8px 16px', 
          backgroundColor: '#00A9B7', 
          borderRadius: '6px'
        }}>
          <span style={{ fontSize: '13px', color: '#FFFFFF' }}>+ Create New</span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ 
        backgroundColor: '#FFFFFF', 
        border: '1px solid #E1E6EA', 
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
              backgroundColor: '#F6F9FC', 
              border: '1px dashed #E1E6EA', 
              borderRadius: '4px'
            }}
          >
            <span style={{ fontSize: '12px', color: '#6E7A82' }}>{filter}</span>
          </div>
        ))}
      </div>

      {/* Main Content */}
      {children || (
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
            <span style={{ fontSize: '12px', color: '#6E7A82' }}>Master Data Table Placeholder</span>
          </div>
        </div>
      )}
    </div>
  );
};
