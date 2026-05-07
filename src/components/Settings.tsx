import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Globe,
  Palette,
  Database,
  Mail,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'integrations', label: 'Integrations', icon: Database },
    { id: 'email', label: 'Email', icon: Mail },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-cloud)', minHeight: '100vh' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-ink)', margin: 0 }}>
          Settings
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', marginTop: '4px' }}>
          Manage your account settings and preferences
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '24px' }}>
        {/* Sidebar */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--color-silver)',
            padding: '8px',
            height: 'fit-content',
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'integrations') {
                    navigate('/settings/integrations');
                    return;
                  }
                  setActiveTab(tab.id);
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: isActive ? 'var(--color-teal-tint)' : 'transparent',
                  color: isActive ? 'var(--color-teal)' : 'var(--color-ink)',
                  fontSize: '14px',
                  fontWeight: isActive ? '500' : '400',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <Icon style={{ width: '16px', height: '16px' }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid var(--color-silver)',
            padding: '24px',
          }}
        >
          {activeTab === 'profile' && (
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  margin: '0 0 20px 0',
                }}
              >
                Profile Settings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="john.doe@company.com"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Department
                  </label>
                  <input
                    type="text"
                    placeholder="Finance"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--color-teal)',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                    }}
                  >
                    Save Changes
                  </button>
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  margin: '0 0 20px 0',
                }}
              >
                Notification Preferences
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  {
                    label: 'Email notifications for approvals',
                    description: 'Receive emails when approval is required',
                  },
                  {
                    label: 'Push notifications',
                    description: 'Get push notifications for important updates',
                  },
                  { label: 'Invoice updates', description: 'Notify when invoice status changes' },
                  { label: 'Payment alerts', description: 'Get alerts for payment activities' },
                  { label: 'Weekly summary', description: 'Receive weekly summary of activities' },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: 'var(--color-cloud)',
                      borderRadius: '8px',
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: 'var(--color-ink)',
                          margin: 0,
                        }}
                      >
                        {item.label}
                      </p>
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--color-mercury-grey)',
                          margin: '4px 0 0 0',
                        }}
                      >
                        {item.description}
                      </p>
                    </div>
                    <label
                      style={{
                        position: 'relative',
                        display: 'inline-block',
                        width: '44px',
                        height: '24px',
                      }}
                    >
                      <input
                        type="checkbox"
                        defaultChecked={index < 3}
                        style={{ opacity: 0, width: 0, height: 0 }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          cursor: 'pointer',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: index < 3 ? 'var(--color-teal)' : 'var(--color-silver)',
                          transition: '0.3s',
                          borderRadius: '24px',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            content: '""',
                            height: '18px',
                            width: '18px',
                            left: index < 3 ? '23px' : '3px',
                            bottom: '3px',
                            backgroundColor: 'white',
                            transition: '0.3s',
                            borderRadius: '50%',
                          }}
                        />
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  margin: '0 0 20px 0',
                }}
              >
                Security Settings
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Current Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: 'var(--color-ink)',
                      marginBottom: '8px',
                    }}
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--color-silver)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: 'var(--color-ink)',
                      backgroundColor: 'var(--color-cloud)',
                    }}
                  />
                </div>

                <button
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'var(--color-teal)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    width: 'fit-content',
                    marginTop: '8px',
                  }}
                >
                  Update Password
                </button>
              </div>
            </div>
          )}

          {['preferences', 'integrations', 'email'].includes(activeTab) && (
            <div style={{ padding: '60px 20px', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--color-cloud)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <SettingsIcon
                  style={{ width: '24px', height: '24px', color: 'var(--color-mercury-grey)' }}
                />
              </div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--color-ink)',
                  margin: '0 0 8px 0',
                }}
              >
                {tabs.find((t) => t.id === activeTab)?.label} Settings
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-mercury-grey)', margin: 0 }}>
                Configuration options will be available soon
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
