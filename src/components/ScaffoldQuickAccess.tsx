/**
 * SCAFFOLD QUICK ACCESS COMPONENT
 * 
 * Purpose: Quick access card for navigating to the scaffold showcase
 * Can be added to existing dashboards or settings pages
 */

import { useNavigate } from 'react-router-dom';

export const ScaffoldQuickAccess = () => {
  const navigate = useNavigate();

  return (
    <div 
      style={{ 
        backgroundColor: '#FFFFFF', 
        border: '2px solid #00A9B7',
        borderRadius: '12px', 
        padding: '24px',
        cursor: 'pointer',
        transition: 'all 0.2s'
      }}
      onClick={() => navigate('/scaffold-showcase')}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,169,183,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Icon */}
        <div style={{ 
          width: '48px', 
          height: '48px', 
          backgroundColor: '#00A9B7',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z" fill="#FFFFFF"/>
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '16px', color: '#0A0F14', margin: 0 }}>
              Desk-Based ERP Scaffold
            </h3>
            <span style={{ 
              fontSize: '11px', 
              color: '#00A9B7', 
              backgroundColor: '#F0FBFC',
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              NEW
            </span>
          </div>
          
          <p style={{ fontSize: '13px', color: '#6E7A82', margin: '0 0 12px 0', lineHeight: '1.5' }}>
            Browse the complete scaffold structure for the new desk-based navigation system. 
            Includes 48+ UI components across 4 role-based desks.
          </p>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#00A9B7', 
                borderRadius: '50%' 
              }} />
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>4 Desks</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#00A9B7', 
                borderRadius: '50%' 
              }} />
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>10 Masters</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#00A9B7', 
                borderRadius: '50%' 
              }} />
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>7 Modules</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                backgroundColor: '#00A9B7', 
                borderRadius: '50%' 
              }} />
              <span style={{ fontSize: '12px', color: '#6E7A82' }}>UI Only</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          color: '#00A9B7',
          fontSize: '20px'
        }}>
          →
        </div>
      </div>
    </div>
  );
};
