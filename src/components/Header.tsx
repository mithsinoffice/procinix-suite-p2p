import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import {
  fetchPendingMasterApprovals,
  type MasterApprovalItem,
} from '../lib/masters/masterApproval';
import {
  Bell,
  ChevronDown,
  User,
  LogOut,
  Building,
  Settings,
  HelpCircle,
  X,
  CheckCircle,
  Layers,
  ChevronRight,
  Eye,
  UserCircle,
  Mail,
  MapPin,
  Package,
  Users,
  FileText,
  Clock,
  Phone,
  Building2,
} from 'lucide-react';

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
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<MasterApprovalItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchPendingMasterApprovals()
        .then((items) => {
          if (!cancelled) setPendingApprovals(items);
        })
        .catch((err) => console.warn('Header: failed to load pending approvals', err));
    };
    load();
    const onMasterSaved = () => load();
    window.addEventListener('master-saved', onMasterSaved);
    return () => {
      cancelled = true;
      window.removeEventListener('master-saved', onMasterSaved);
    };
  }, []);

  const { user, logout, switchEntity } = useAuth();
  const { currentRole, currentCompany, availableCompanies, switchCompany, getEntityById } =
    useMasterData();
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
        width: rect.width,
      });
    }
  }, [showCompanyDropdown]);

  return (
    <header
      className="bg-white flex items-center justify-end"
      style={{
        borderBottom: '1px solid var(--color-silver)',
        height: '64px',
        paddingLeft: '32px',
        paddingRight: '32px',
        position: 'relative',
        zIndex: 100,
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
              backgroundColor: 'var(--color-cloud)',
              border: '1px solid var(--color-silver)',
              minWidth: '200px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-teal-tint)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
          >
            <Building style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }} />
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  lineHeight: '1.2',
                }}
              >
                {currentCompany
                  ? getEntityById(currentCompany.id)?.legalName || currentCompany.name
                  : 'Select Entity'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: 'var(--color-mercury-grey)',
                  marginTop: '2px',
                  lineHeight: '1.2',
                }}
              >
                {currentCompany
                  ? getEntityById(currentCompany.id)?.country || currentCompany.code
                  : 'No entity selected'}
              </div>
            </div>
            <ChevronDown
              style={{ width: '14px', height: '14px', color: 'var(--color-mercury-grey)' }}
            />
          </button>

          {/* Entity Dropdown Menu - PORTAL RENDERED */}
          {showCompanyDropdown &&
            dropdownPosition &&
            createPortal(
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
                  border: '1px solid var(--color-silver)',
                  boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                  zIndex: 9999,
                  overflowY: 'auto',
                  padding: '8px',
                  opacity: 1,
                  visibility: 'visible',
                  pointerEvents: 'auto',
                  cursor: 'default',
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
                    backgroundColor:
                      currentCompany?.id === 'CONSOLIDATED'
                        ? 'var(--color-teal-tint)'
                        : 'transparent',
                    border:
                      currentCompany?.id === 'CONSOLIDATED'
                        ? '1px solid var(--color-teal)'
                        : '1px solid transparent',
                    marginBottom: '8px',
                    display: 'block',
                    borderBottom: '1px solid var(--color-silver)',
                    paddingBottom: '12px',
                  }}
                  onMouseEnter={(e) => {
                    if (currentCompany?.id !== 'CONSOLIDATED')
                      e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentCompany?.id !== 'CONSOLIDATED')
                      e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: '13px',
                          color: 'var(--color-ink)',
                          fontWeight: currentCompany?.id === 'CONSOLIDATED' ? '600' : '500',
                          margin: 0,
                          lineHeight: '1.3',
                        }}
                      >
                        Consolidated View
                      </p>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--color-mercury-grey)',
                          margin: '4px 0 0 0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>Multi-Entity</span>
                        <span>•</span>
                        <span>Base Currency: INR</span>
                      </div>
                    </div>
                    {currentCompany?.id === 'CONSOLIDATED' && (
                      <CheckCircle
                        style={{
                          width: '16px',
                          height: '16px',
                          color: 'var(--color-teal)',
                          marginLeft: '8px',
                        }}
                      />
                    )}
                  </div>
                </button>

                {(availableCompanies && availableCompanies.length > 0
                  ? availableCompanies
                  : []
                ).map((company) => {
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
                        backgroundColor: isActive ? 'var(--color-teal-tint)' : 'transparent',
                        border: isActive ? '1px solid var(--color-teal)' : '1px solid transparent',
                        marginBottom: '4px',
                        display: 'block',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
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
                              color: 'var(--color-ink)',
                              fontWeight: isActive ? '600' : '500',
                              margin: 0,
                              lineHeight: '1.3',
                            }}
                          >
                            {legalName}
                          </p>
                          <div
                            style={{
                              fontSize: '11px',
                              color: 'var(--color-mercury-grey)',
                              margin: '4px 0 0 0',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
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
                          <CheckCircle
                            style={{
                              width: '16px',
                              height: '16px',
                              color: 'var(--color-teal)',
                              marginLeft: '8px',
                            }}
                          />
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
            style={{
              backgroundColor: 'var(--color-teal-tint)',
              border: '1px solid var(--color-teal)',
            }}
            title={`Viewing as: ${currentRole.roleName}`}
          >
            <Layers style={{ width: '14px', height: '14px', color: 'var(--color-teal)' }} />
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-teal)' }}>
              {currentRole.roleName}
            </span>
          </div>
        )}

        {/* Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--color-silver)' }} />

        {/* Notifications Icon Button - 32x32 */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotificationPopover(!showNotificationPopover)}
            className="relative rounded-lg transition-all flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: 'transparent',
              border: 'none',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            title="View Pending Approvals"
          >
            <Bell style={{ width: '18px', height: '18px', color: 'var(--color-mercury-grey)' }} />
            {/* Notification Badge */}
            {pendingApprovals.length > 0 && (
              <span
                className="absolute rounded-full flex items-center justify-center"
                style={{
                  top: '2px',
                  right: '2px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  backgroundColor: 'var(--color-error)',
                  color: '#FFFFFF',
                  fontSize: '10px',
                  fontWeight: '600',
                }}
              >
                {pendingApprovals.length > 99 ? '99+' : pendingApprovals.length}
              </span>
            )}
          </button>

          {/* Notification Popover - 260px width */}
          {showNotificationPopover && (
            <div
              className="absolute right-0 bg-white rounded-lg"
              style={{
                marginTop: '8px',
                width: '320px',
                maxHeight: '420px',
                border: '1px solid var(--color-silver)',
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 1000,
                overflowY: 'auto',
              }}
            >
              {/* Notification Header */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--color-silver)' }}>
                <div className="flex items-center justify-between">
                  <p
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--color-ink)',
                      margin: 0,
                    }}
                  >
                    Pending Approvals
                  </p>
                  {pendingApprovals.length > 0 && (
                    <span
                      className="rounded-full flex items-center justify-center"
                      style={{
                        minWidth: '20px',
                        height: '20px',
                        padding: '0 6px',
                        backgroundColor: 'var(--color-error)',
                        color: '#FFFFFF',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                    >
                      {pendingApprovals.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Notification Items */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {pendingApprovals.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                    <CheckCircle
                      style={{
                        width: '32px',
                        height: '32px',
                        color: 'var(--color-silver)',
                        margin: '0 auto 8px',
                      }}
                    />
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-ink)',
                        margin: 0,
                        fontWeight: 500,
                      }}
                    >
                      All caught up
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--color-mercury-grey)',
                        margin: '4px 0 0 0',
                      }}
                    >
                      No pending approvals
                    </p>
                  </div>
                ) : (
                  pendingApprovals.slice(0, 8).map((item) => {
                    const submittedAt = new Date(item.submittedDate);
                    const diffMs = Math.max(0, Date.now() - submittedAt.getTime());
                    const mins = Math.floor(diffMs / 60_000);
                    const hrs = Math.floor(mins / 60);
                    const days = Math.floor(hrs / 24);
                    const ago =
                      days > 0 ? `${days}d ago` : hrs > 0 ? `${hrs}h ago` : `${mins}m ago`;
                    return (
                      <div
                        key={item.id}
                        className="transition-all cursor-pointer"
                        style={{
                          padding: '12px',
                          borderBottom: '1px solid var(--color-silver)',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.backgroundColor = 'transparent')
                        }
                        onClick={() => {
                          navigate(item.route || '/approvals');
                          setShowNotificationPopover(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="rounded-lg flex items-center justify-center"
                            style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: 'var(--color-teal-tint)',
                              flexShrink: 0,
                            }}
                          >
                            <FileText
                              style={{ width: '16px', height: '16px', color: 'var(--color-teal)' }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: '13px',
                                fontWeight: '500',
                                color: 'var(--color-ink)',
                                margin: 0,
                              }}
                              className="truncate"
                            >
                              {item.title}
                            </p>
                            <p
                              style={{
                                fontSize: '12px',
                                color: 'var(--color-mercury-grey)',
                                margin: '2px 0 0 0',
                              }}
                              className="truncate"
                            >
                              {item.details?.recordCode ||
                                item.details?.workflowName ||
                                'Pending review'}
                            </p>
                            <div className="flex items-center gap-1" style={{ marginTop: '4px' }}>
                              <Clock
                                style={{
                                  width: '12px',
                                  height: '12px',
                                  color: 'var(--color-mercury-grey)',
                                }}
                              />
                              <span
                                style={{ fontSize: '11px', color: 'var(--color-mercury-grey)' }}
                              >
                                {ago}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* View All Button */}
              <div style={{ padding: '12px' }}>
                <button
                  onClick={() => {
                    navigate('/approvals');
                    setShowNotificationPopover(false);
                  }}
                  className="w-full rounded-lg transition-all"
                  style={{
                    height: '36px',
                    backgroundColor: 'var(--color-teal)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-teal)')
                  }
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
              backgroundColor: showProfileMenu ? 'var(--color-cloud)' : 'transparent',
              border: 'none',
            }}
            onMouseEnter={(e) => {
              if (!showProfileMenu) e.currentTarget.style.backgroundColor = 'var(--color-cloud)';
            }}
            onMouseLeave={(e) => {
              if (!showProfileMenu) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {/* Avatar Circle */}
            <div
              className="rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--color-teal)',
                width: '32px',
                height: '32px',
                color: '#FFFFFF',
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
                border: '1px solid var(--color-silver)',
                boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.12)',
                zIndex: 1000,
              }}
            >
              {/* User Info (Top - Read Only) - Padding 12px */}
              <div style={{ padding: '12px', borderBottom: '1px solid var(--color-silver)' }}>
                <p
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--color-ink)',
                    margin: 0,
                  }}
                >
                  {user?.name || 'Guest User'}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-mercury-grey)',
                    margin: '2px 0 0 0',
                  }}
                >
                  {user?.role || 'Guest'}
                </p>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-mercury-grey)',
                    margin: '2px 0 0 0',
                  }}
                >
                  {user?.department || 'Procurement'} ·{' '}
                  {user?.currentEntity?.name || 'Procinix Solutions Pvt Ltd'}
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
                    border: 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <UserCircle
                    style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
                  />
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
                    marginTop: '8px',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <Settings
                    style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
                  />
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
                    marginTop: '8px',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-cloud)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <HelpCircle
                    style={{ width: '16px', height: '16px', color: 'var(--color-mercury-grey)' }}
                  />
                  <span style={{ fontSize: '13px', color: '#2A3A42' }}>Help & Support</span>
                </button>
              </div>

              {/* Divider */}
              <div style={{ height: '1px', backgroundColor: 'var(--color-silver)' }} />

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
                    border: 'none',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--color-error-light)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <LogOut style={{ width: '16px', height: '16px', color: 'var(--color-error)' }} />
                  <span style={{ fontSize: '13px', color: 'var(--color-error)' }}>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* My Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            className="bg-white rounded-lg w-full max-w-2xl mx-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
                My Profile
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1 hover:bg-opacity-50 rounded"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* User Avatar and Basic Info */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF' }}
                >
                  <span className="text-2xl font-medium">
                    {getUserInitials(user?.name || 'Guest User')}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                    {user?.name}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                    {user?.role}
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      Email Address
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      Department
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      {user?.department || 'Not specified'}
                    </p>
                  </div>
                </div>

                {user?.location && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                    <div>
                      <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                        Location
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                        {user.location}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                      Phone Number
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-ink)' }}>
                      +91 98765 43210
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-end gap-3 p-6"
              style={{ borderTop: '1px solid var(--color-silver)' }}
            >
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-silver)',
                }}
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
          <div
            className="bg-white rounded-lg w-full max-w-2xl mx-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
                My Preferences
              </h2>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="p-1 hover:bg-opacity-50 rounded"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Language */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                  Language
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Hindi</option>
                </select>
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                  Date Format
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>

              {/* Time Zone */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                  Time Zone
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option>Asia/Kolkata (IST +5:30)</option>
                  <option>Asia/Dubai (GST +4:00)</option>
                  <option>Europe/London (GMT +0:00)</option>
                  <option>America/New_York (EST -5:00)</option>
                </select>
              </div>

              {/* Number Format */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                  Number Format
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option>1,234,567.89</option>
                  <option>1.234.567,89</option>
                  <option>1 234 567.89</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-ink)' }}>
                  Currency Display
                </label>
                <select
                  className="w-full px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-cloud)',
                    border: '1px solid var(--color-silver)',
                    color: 'var(--color-ink)',
                  }}
                >
                  <option>INR (₹)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                  <option>GBP (£)</option>
                </select>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-end gap-3 p-6"
              style={{ borderTop: '1px solid var(--color-silver)' }}
            >
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPreferencesModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{ backgroundColor: 'var(--color-teal)', color: '#FFFFFF' }}
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
          <div
            className="bg-white rounded-lg w-full max-w-2xl mx-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
                Help & Support
              </h2>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1 hover:bg-opacity-50 rounded"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <h3 className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                  📚 Documentation
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Access user guides and manuals
                </p>
              </div>

              <div
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <h3 className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                  💬 Contact Support
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Email: support@procinix.ai
                </p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Phone: +91 1800 123 4567
                </p>
              </div>

              <div
                className="p-4 rounded-lg cursor-pointer hover:bg-opacity-70 transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <h3 className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                  🎫 Raise Support Ticket
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Submit a ticket for technical issues
                </p>
              </div>

              <div
                className="p-4 rounded-lg"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  border: '1px solid var(--color-silver)',
                }}
              >
                <h3 className="text-sm mb-1" style={{ color: 'var(--color-ink)' }}>
                  ℹ️ System Information
                </h3>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Version: 2.1.0
                </p>
                <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                  Last Updated: Dec 12, 2025
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-end gap-3 p-6"
              style={{ borderTop: '1px solid var(--color-silver)' }}
            >
              <button
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-silver)',
                }}
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
          <div
            className="bg-white rounded-lg w-full max-w-2xl mx-4"
            style={{ border: '1px solid var(--color-silver)' }}
          >
            {/* Modal Header */}
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <div>
                <h2 className="text-lg" style={{ color: 'var(--color-ink)' }}>
                  Switch Entity
                </h2>
                <p className="text-xs mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Select an entity to switch your working context
                </p>
              </div>
              <button
                onClick={() => setShowEntitySwitcher(false)}
                className="p-1 hover:bg-opacity-50 rounded"
              >
                <X className="w-5 h-5" style={{ color: 'var(--color-mercury-grey)' }} />
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
                        backgroundColor: isActive ? 'var(--color-teal-tint)' : 'var(--color-cloud)',
                        border: isActive
                          ? '2px solid var(--color-teal)'
                          : '1px solid var(--color-silver)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center"
                            style={{
                              backgroundColor: isActive ? 'var(--color-teal)' : '#FFFFFF',
                              border: '1px solid var(--color-silver)',
                            }}
                          >
                            <Building
                              className="w-6 h-6"
                              style={{ color: isActive ? '#FFFFFF' : 'var(--color-teal)' }}
                            />
                          </div>
                          <div>
                            <p
                              className="text-sm mb-1"
                              style={{
                                color: 'var(--color-ink)',
                                fontWeight: isActive ? '600' : '400',
                              }}
                            >
                              {displayName}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                              {entity.code}
                              {currency ? ` | ${currency}` : ''}
                            </p>
                          </div>
                        </div>
                        {isActive && (
                          <div
                            className="flex items-center gap-2 px-3 py-1 rounded-full"
                            style={{ backgroundColor: 'var(--color-teal)' }}
                          >
                            <CheckCircle className="w-4 h-4" style={{ color: '#FFFFFF' }} />
                            <span className="text-xs" style={{ color: '#FFFFFF' }}>
                              Active
                            </span>
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
                  ℹ️ Switching entities will change your data context. All transactions and reports
                  will reflect the selected entity.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              className="flex justify-end gap-3 p-6"
              style={{ borderTop: '1px solid var(--color-silver)' }}
            >
              <button
                onClick={() => setShowEntitySwitcher(false)}
                className="px-4 py-2 rounded-lg transition-all"
                style={{
                  backgroundColor: 'var(--color-cloud)',
                  color: 'var(--color-ink)',
                  border: '1px solid var(--color-silver)',
                }}
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
