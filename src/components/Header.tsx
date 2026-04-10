import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import { Bell, ChevronDown, User, LogOut, Building, Settings, HelpCircle, X, CheckCircle, Layers, ChevronRight, Eye, UserCircle, Mail, MapPin, Package, Users, FileText, Clock, Phone, Building2 } from 'lucide-react';

/**
 * ENTERPRISE TOP BAR - GLOBAL CONTEXT ONLY
 * 
 * Purpose: Show and control global operating context
 * 
 * Contains:
 * - Entity/Company selector
 * - Role/Persona selector (display only)
 * - Notifications
 * - User profile
 * - Optional: Global search/help
 * 
 * Does NOT contain:
 * - Page title (moved to page header)
 * - Module navigation (in left nav)
 * - Page-level filters (in page header)
 * - Primary actions (in page header)
 */

export function Header() {
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showEntitySwitcher, setShowEntitySwitcher] = useState(false);
  const [showNotificationPopover, setShowNotificationPopover] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const { user, logout, switchEntity } = useAuth();
  const { 
    currentRole,
    currentCompany,
    availableCompanies,
    switchCompany,
    getEntityById
  } = useMasterData();
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const companyRef = useRef<HTMLDivElement>(null);
  const companyButtonRef = useRef<HTMLButtonElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);

  // Get user initials
  const getUserInitials = (name: string) => {
    if (!name) return 'GU';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  useEffect(() => {
    const currentRef = menuRef.current;
    const handleClickOutside = (event: MouseEvent) => {
      if (currentRef && !currentRef.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentRef = notificationRef.current;
    const handleClickOutside = (event: MouseEvent) => {
      if (currentRef && !currentRef.contains(event.target as Node)) {
        setShowNotificationPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const currentRef = companyRef.current;
    const dropdownRef = companyDropdownRef.current;
    
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Check if click is outside both the button AND the dropdown
      if (
        currentRef && 
        !currentRef.contains(target) && 
        (!dropdownRef || !dropdownRef.contains(target))
      ) {
        setShowCompanyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCompanyDropdown]); // Re-attach when dropdown visibility changes

  useEffect(() => {
    const buttonRef = companyButtonRef.current;
    if (buttonRef) {
      const rect = buttonRef.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  }, [showCompanyDropdown]);

  return (
    <header 
      className="bg-white flex items-center justify-end"
      style={{ 
        borderBottom: '1px solid #E1E6EA',
        height: '64px',
        paddingLeft: '32px',
        paddingRight: '32px',
        position: 'relative',
        zIndex: 100
      }}
    >
      {/* GLOBAL CONTEXT ZONE - Company, Role, Notifications, User Profile */}
      <div className="flex items-center" style={{ gap: '12px' }}>
        
        {/* Entity Switcher - Always Visible */}
        <div className="relative" ref={companyRef}>
          <button
            ref={companyButtonRef}
            onClick={() => setShowCompanyDropdown(!showCompanyDropdown)}
            className="flex items-center rounded-lg transition-all"
            style={{
              gap: '8px',
              paddingTop: '8px',
              paddingBottom: '8px',
              paddingLeft: '12px',
              paddingRight: '12px',
              backgroundColor: '#F6F9FC',
              border: '1px solid #E1E6EA',
              minWidth: '200px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E8F7F8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
          >
            <Building style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#0A0F14', lineHeight: '1.2' }}>
                {currentCompany ? (getEntityById(currentCompany.id)?.legalName || currentCompany.name) : 'Select Entity'}
              </div>
              <div style={{ fontSize: '11px', color: '#6E7A82', marginTop: '2px', lineHeight: '1.2' }}>
                {currentCompany ? (getEntityById(currentCompany.id)?.country || currentCompany.code) : 'No entity selected'}
              </div>
            </div>
            <ChevronDown 
              style={{ width: '14px', height: '14px', color: '#6E7A82' }} 
            />
          </button>

          {/* Entity Dropdown Menu - PORTAL RENDERED */}
          {showCompanyDropdown && dropdownPosition && createPortal(
            <div 
              ref={companyDropdownRef}
              className="bg-white rounded-lg"
              style={{ 
                position: 'fixed',
                top: `${dropdownPosition.top + 8}px`,
                left: `${dropdownPosition.left}px`,
                minWidth: Math.max(dropdownPosition.width, 280),
                maxWidth: '420px',
                maxHeight: '360px',
                border: '1px solid #E1E6EA',
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 9999,
                overflowY: 'auto',
                padding: '8px',
                opacity: 1,
                visibility: 'visible',
                pointerEvents: 'auto',
                cursor: 'default'
              }}
            >
              {/* CONSOLIDATED VIEW OPTION - NON-MASTER SELECTOR */}
              <button
                onClick={() => {
                  switchCompany('CONSOLIDATED');
                  setShowCompanyDropdown(false);
                }}
                className="w-full p-3 rounded-lg transition-all text-left"
                style={{
                  backgroundColor: currentCompany?.id === 'CONSOLIDATED' ? '#E8F7F8' : 'transparent',
                  border: currentCompany?.id === 'CONSOLIDATED' ? '1px solid #00A9B7' : '1px solid transparent',
                  marginBottom: '8px',
                  display: 'block',
                  borderBottom: '1px solid #E1E6EA',
                  paddingBottom: '12px'
                }}
                onMouseEnter={(e) => {
                  if (currentCompany?.id !== 'CONSOLIDATED') e.currentTarget.style.backgroundColor = '#F6F9FC';
                }}
                onMouseLeave={(e) => {
                  if (currentCompany?.id !== 'CONSOLIDATED') e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1 }}>
                    <p 
                      style={{ 
                        fontSize: '13px',
                        color: '#0A0F14',
                        fontWeight: currentCompany?.id === 'CONSOLIDATED' ? '600' : '500',
                        margin: 0,
                        lineHeight: '1.3'
                      }}
                    >
                      Consolidated View
                    </p>
                    <div 
                      style={{ 
                        fontSize: '11px',
                        color: '#6E7A82',
                        margin: '4px 0 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <span>Multi-Entity</span>
                      <span>•</span>
                      <span>Base Currency: INR</span>
                    </div>
                  </div>
                  {currentCompany?.id === 'CONSOLIDATED' && (
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#00A9B7', marginLeft: '8px' }} />
                  )}
                </div>
              </button>

              {(availableCompanies && availableCompanies.length > 0 ? availableCompanies : []).map((company) => {
                const isActive = company.id === currentCompany?.id;
                const entityDetails = getEntityById(company.id);
                const legalName = entityDetails?.legalName || company.name;
                const country = entityDetails?.country || '';
                const currency = entityDetails?.currency || '';
                
                return (
                  <button
                    key={company.id}
                    onClick={() => {
                      switchCompany(company.id);
                      setShowCompanyDropdown(false);
                    }}
                    className="w-full p-3 rounded-lg transition-all text-left"
                    style={{
                      backgroundColor: isActive ? '#E8F7F8' : 'transparent',
                      border: isActive ? '1px solid #00A9B7' : '1px solid transparent',
                      marginBottom: '4px',
                      display: 'block'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#F6F9FC';
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div style={{ flex: 1 }}>
                        <p 
                          style={{ 
                            fontSize: '13px',
                            color: '#0A0F14',
                            fontWeight: isActive ? '600' : '500',
                            margin: 0,
                            lineHeight: '1.3'
                          }}
                        >
                          {legalName}
                        </p>
                        <div 
                          style={{ 
                            fontSize: '11px',
                            color: '#6E7A82',
                            margin: '4px 0 0 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}
                        >
                          <span>{country}</span>
                          {currency && (
                            <>
                              <span>•</span>
                              <span>{currency}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {isActive && (
                        <CheckCircle style={{ width: '16px', height: '16px', color: '#00A9B7', marginLeft: '8px' }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>,
            document.body
          )}
        </div>

        {/* Role Badge - Compact */}
        {currentRole && (
          <div 
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#E8F7F8', border: '1px solid #00A9B7' }}
            title={`Viewing as: ${currentRole.roleName}`}
          >
            <Layers style={{ width: '14px', height: '14px', color: '#00A9B7' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#00A9B7' }}>
              {currentRole.roleName}
            </span>
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#E1E6EA' }} />
        
        {/* Notifications Icon Button - 32x32 */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotificationPopover(!showNotificationPopover)}
            className="relative rounded-lg transition-all flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="View Pending Approvals"
          >
            <Bell style={{ width: '18px', height: '18px', color: '#6E7A82' }} />
            {/* Notification Badge */}
            <span
              className="absolute rounded-full flex items-center justify-center"
              style={{
                top: '2px',
                right: '2px',
                width: '16px',
                height: '16px',
                backgroundColor: '#FF4E5B',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: '600'
              }}
            >
              3
            </span>
          </button>

          {/* Notification Popover - 260px width */}
          {showNotificationPopover && (
            <div 
              className="absolute right-0 bg-white rounded-lg"
              style={{ 
                marginTop: '8px',
                width: '320px',
                maxHeight: '420px',
                border: '1px solid #E1E6EA',
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 1000,
                overflowY: 'auto'
              }}
            >
              {/* Notification Header */}
              <div style={{ padding: '12px', borderBottom: '1px solid #E1E6EA' }}>
                <div className="flex items-center justify-between">
                  <p style={{ fontSize: '14px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                    Pending Approvals
                  </p>
                  <span 
                    className="rounded-full flex items-center justify-center"
                    style={{
                      width: '20px',
                      height: '20px',
                      backgroundColor: '#FF4E5B',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    3
                  </span>
                </div>
              </div>

              {/* Notification Items */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {/* PO Approval */}
                <div
                  className="transition-all cursor-pointer"
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #E1E6EA',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    navigate('/approval-dashboard');
                    setShowNotificationPopover(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="rounded-lg flex items-center justify-center"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#E8F7F8',
                        flexShrink: 0
                      }}
                    >
                      <FileText style={{ width: '16px', height: '16px', color: '#00A9B7' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#0A0F14', margin: 0 }}>
                        Purchase Order Approval
                      </p>
                      <p style={{ fontSize: '12px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                        PO-2024-001 • ₹2,45,000
                      </p>
                      <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                        <Clock style={{ width: '12px', height: '12px', color: '#6E7A82' }} />
                        <span style={{ fontSize: '11px', color: '#6E7A82' }}>2 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* GRN Approval */}
                <div
                  className="transition-all cursor-pointer"
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #E1E6EA',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    navigate('/approval-dashboard');
                    setShowNotificationPopover(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="rounded-lg flex items-center justify-center"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#FFF9E6',
                        flexShrink: 0
                      }}
                    >
                      <Package style={{ width: '16px', height: '16px', color: '#D97706' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#0A0F14', margin: 0 }}>
                        GRN Location Acceptance
                      </p>
                      <p style={{ fontSize: '12px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                        GRN-2024-045 • Mumbai Warehouse
                      </p>
                      <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                        <Clock style={{ width: '12px', height: '12px', color: '#6E7A82' }} />
                        <span style={{ fontSize: '11px', color: '#6E7A82' }}>5 hours ago</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Master Approval */}
                <div
                  className="transition-all cursor-pointer"
                  style={{
                    padding: '12px',
                    borderBottom: '1px solid #E1E6EA',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  onClick={() => {
                    navigate('/approval-dashboard');
                    setShowNotificationPopover(false);
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="rounded-lg flex items-center justify-center"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: '#F3E5F5',
                        flexShrink: 0
                      }}
                    >
                      <Users style={{ width: '16px', height: '16px', color: '#7B1FA2' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: '500', color: '#0A0F14', margin: 0 }}>
                        Vendor Master Update
                      </p>
                      <p style={{ fontSize: '12px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                        Tech Solutions Pvt Ltd
                      </p>
                      <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                        <Clock style={{ width: '12px', height: '12px', color: '#6E7A82' }} />
                        <span style={{ fontSize: '11px', color: '#6E7A82' }}>1 day ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* View All Button */}
              <div style={{ padding: '12px' }}>
                <button
                  onClick={() => {
                    navigate('/approval-dashboard');
                    setShowNotificationPopover(false);
                  }}
                  className="w-full rounded-lg transition-all"
                  style={{
                    height: '36px',
                    backgroundColor: '#00A9B7',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#007D87'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00A9B7'}
                >
                  View All Approvals
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar - 32x32 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="rounded-lg transition-all flex items-center"
            style={{
              gap: '6px',
              paddingTop: '6px',
              paddingBottom: '6px',
              paddingLeft: '6px',
              paddingRight: '6px',
              backgroundColor: showProfileMenu ? '#F6F9FC' : 'transparent',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              if (!showProfileMenu) e.currentTarget.style.backgroundColor = '#F6F9FC';
            }}
            onMouseLeave={(e) => {
              if (!showProfileMenu) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Avatar Circle */}
            <div 
              className="rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: '#00A9B7', 
                width: '32px',
                height: '32px',
                color: '#FFFFFF'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: '600' }}>
                {getUserInitials(user?.name || 'Guest User')}
              </span>
            </div>
          </button>

          {/* User Dropdown Menu - 260px width */}
          {showProfileMenu && (
            <div 
              className="absolute right-0 bg-white rounded-lg"
              style={{ 
                marginTop: '8px',
                width: '260px',
                border: '1px solid #E1E6EA',
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 1000
              }}
            >
              {/* User Info (Top - Read Only) - Padding 12px */}
              <div style={{ padding: '12px', borderBottom: '1px solid #E1E6EA' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#0A0F14', margin: 0 }}>
                  {user?.name || 'Guest User'}
                </p>
                <p style={{ fontSize: '12px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                  {user?.role || 'Guest'}
                </p>
                <p style={{ fontSize: '12px', color: '#6E7A82', margin: '2px 0 0 0' }}>
                  {user?.department || 'Procurement'} · {user?.currentEntity?.name || 'Procinix Solutions Pvt Ltd'}
                </p>
              </div>

              {/* Menu Items - Padding 12px, Gap 8px */}
              <div style={{ padding: '12px' }}>
                {/* My Profile */}
                <button
                  onClick={() => {
                    setShowProfileModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center rounded transition-all text-left"
                  style={{
                    gap: '8px',
                    height: '36px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    backgroundColor: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <UserCircle style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
                  <span style={{ fontSize: '13px', color: '#2A3A42' }}>My Profile</span>
                </button>

                {/* My Preferences */}
                <button
                  onClick={() => {
                    setShowPreferencesModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center rounded transition-all text-left"
                  style={{
                    gap: '8px',
                    height: '36px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    marginTop: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Settings style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
                  <span style={{ fontSize: '13px', color: '#2A3A42' }}>My Preferences</span>
                </button>

                {/* Help & Support */}
                <button
                  onClick={() => {
                    setShowHelpModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center rounded transition-all text-left"
                  style={{
                    gap: '8px',
                    height: '36px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    marginTop: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F6F9FC'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <HelpCircle style={{ width: '16px', height: '16px', color: '#6E7A82' }} />
                  <span style={{ fontSize: '13px', color: '#2A3A42' }}>Help & Support</span>
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: '#E1E6EA' }} />

              {/* Logout */}
              <div style={{ padding: '12px' }}>
                <button
                  onClick={logout}
                  className="w-full flex items-center rounded transition-all text-left"
                  style={{
                    gap: '8px',
                    height: '36px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                    backgroundColor: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut style={{ width: '16px', height: '16px', color: '#FF4E5B' }} />
                  <span style={{ fontSize: '13px', color: '#FF4E5B' }}>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4" style={{ border: '1px solid #E1E6EA' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h2 className="text-lg" style={{ color: '#0A0F14' }}>My Profile</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-1 hover:bg-opacity-50 rounded">
                <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center gap-4 mb-6">
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#00A9B7', color: '#FFFFFF' }}
                >
                  <span className="text-2xl font-medium">
                    {getUserInitials(user?.name || 'Guest User')}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl" style={{ color: '#0A0F14' }}>{user?.name}</h3>
                  <p className="text-sm mt-1" style={{ color: '#6E7A82' }}>{user?.role}</p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" style={{ color: '#6E7A82' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#6E7A82' }}>Email Address</p>
                    <p className="text-sm" style={{ color: '#0A0F14' }}>{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" style={{ color: '#6E7A82' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#6E7A82' }}>Department</p>
                    <p className="text-sm" style={{ color: '#0A0F14' }}>{user?.department || 'Not specified'}</p>
                  </div>
                </div>

                {user?.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5" style={{ color: '#6E7A82' }} />
                    <div>
                      <p className="text-xs" style={{ color: '#6E7A82' }}>Location</p>
                      <p className="text-sm" style={{ color: '#0A0F14' }}>{user.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" style={{ color: '#6E7A82' }} />
                  <div>
                    <p className="text-xs" style={{ color: '#6E7A82' }}>Phone Number</p>
                    <p className="text-sm" style={{ color: '#0A0F14' }}>+91 98765 43210</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#F6F9FC', color: '#0A0F14', border: '1px solid #E1E6EA' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Preferences Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4" style={{ border: '1px solid #E1E6EA' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h2 className="text-lg" style={{ color: '#0A0F14' }}>My Preferences</h2>
              <button onClick={() => setShowPreferencesModal(false)} className="p-1 hover:bg-opacity-50 rounded">
                <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Language */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#0A0F14' }}>Language</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Hindi</option>
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#0A0F14' }}>Date Format</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>

              {/* Time Zone */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#0A0F14' }}>Time Zone</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option>Asia/Kolkata (IST +5:30)</option>
                  <option>Asia/Dubai (GST +4:00)</option>
                  <option>Europe/London (GMT +0:00)</option>
                  <option>America/New_York (EST -5:00)</option>
                </select>
              </div>

              {/* Number Format */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#0A0F14' }}>Number Format</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option>1,234,567.89</option>
                  <option>1.234.567,89</option>
                  <option>1 234 567.89</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#0A0F14' }}>Currency Display</label>
                <select 
                  className="w-full px-4 py-2 rounded-lg"
                  style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA', color: '#0A0F14' }}
                >
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#F6F9FC', color: '#0A0F14', border: '1px solid #E1E6EA' }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#00A9B7', color: '#FFFFFF' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4" style={{ border: '1px solid #E1E6EA' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <h2 className="text-lg" style={{ color: '#0A0F14' }}>Help & Support</h2>
              <button onClick={() => setShowHelpModal(false)} className="p-1 hover:bg-opacity-50 rounded">
                <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div 
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <h3 className="text-sm mb-1" style={{ color: '#0A0F14' }}>📚 Documentation</h3>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Access user guides and manuals</p>
              </div>

              <div 
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <h3 className="text-sm mb-1" style={{ color: '#0A0F14' }}>💬 Contact Support</h3>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Email: support@procinix.ai</p>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Phone: +91 1800 123 4567</p>
              </div>

              <div 
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <h3 className="text-sm mb-1" style={{ color: '#0A0F14' }}>🎫 Raise Support Ticket</h3>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Submit a ticket for technical issues</p>
              </div>

              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: '#F6F9FC', border: '1px solid #E1E6EA' }}
              >
                <h3 className="text-sm mb-1" style={{ color: '#0A0F14' }}>ℹ️ System Information</h3>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Version: 2.1.0</p>
                <p className="text-xs" style={{ color: '#6E7A82' }}>Last Updated: Dec 12, 2025</p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#F6F9FC', color: '#0A0F14', border: '1px solid #E1E6EA' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Switcher Modal */}
      {showEntitySwitcher && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl mx-4" style={{ border: '1px solid #E1E6EA' }}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6" style={{ borderBottom: '1px solid #E1E6EA' }}>
              <div>
                <h2 className="text-lg" style={{ color: '#0A0F14' }}>Switch Entity</h2>
                <p className="text-xs mt-1" style={{ color: '#6E7A82' }}>
                  Select an entity to switch your working context
                </p>
              </div>
              <button onClick={() => setShowEntitySwitcher(false)} className="p-1 hover:bg-opacity-50 rounded">
                <X className="w-5 h-5" style={{ color: '#6E7A82' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="space-y-3">
                {user.availableEntities.map((entity) => {
                  const isActive = entity.id === user.currentEntity.id;
                  
                  // Get full entity details from Entity Master
                  const fullEntity = getEntityById(entity.id);
                  const displayName = fullEntity?.legalName || entity.name;
                  const currency = fullEntity?.currency || '';
                  
                  return (
                    <button
                      key={entity.id}
                      onClick={() => {
                        switchEntity(entity.id);
                        setShowEntitySwitcher(false);
                      }}
                      className="w-full p-4 rounded-lg transition-all text-left"
                      style={{
                        backgroundColor: isActive ? '#E8F7F8' : '#F6F9FC',
                        border: isActive ? '2px solid #00A9B7' : '1px solid #E1E6EA'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{ 
                              backgroundColor: isActive ? '#00A9B7' : '#FFFFFF',
                              border: '1px solid #E1E6EA'
                            }}
                          >
                            <Building 
                              className="w-6 h-6" 
                              style={{ color: isActive ? '#FFFFFF' : '#00A9B7' }} 
                            />
                          </div>
                          <div>
                            <p 
                              className="text-sm mb-1" 
                              style={{ 
                                color: '#0A0F14',
                                fontWeight: isActive ? '600' : '400'
                              }}
                            >
                              {displayName}
                            </p>
                            <p className="text-xs" style={{ color: '#6E7A82' }}>
                              {entity.code}{currency ? ` | ${currency}` : ''}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <div 
                            className="flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{ backgroundColor: '#00A9B7' }}
                          >
                            <CheckCircle className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                            <span className="text-xs" style={{ color: '#FFFFFF' }}>Active</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info Message */}
              <div 
                className="mt-6 p-4 rounded-lg"
                style={{ backgroundColor: '#FFF9E6', border: '1px solid #FCD34D' }}
              >
                <p className="text-xs" style={{ color: '#D97706' }}>
                  ℹ️ Switching entities will change your data context. All transactions and reports will reflect the selected entity.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6" style={{ borderTop: '1px solid #E1E6EA' }}>
              <button
                onClick={() => setShowEntitySwitcher(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: '#F6F9FC', color: '#0A0F14', border: '1px solid #E1E6EA' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}