import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import { isMysqlApiEnabled } from '../lib/mysql/client';
import { isSuperAdminUser } from '../utils/superAdmin';
import clientLogo from '../assets/Client Logo.webp';
import procinixLogo from '../assets/Procinix Logo PNG V1.png';

export type LoginVariant = 'default' | 'super_admin';

interface LoginProps {
  variant?: LoginVariant;
}

export function Login({ variant = 'default' }: LoginProps) {
  const navigate = useNavigate();
  const { login, logout } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantCode, setTenantCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const showDemoAccounts = !isMysqlApiEnabled() && variant === 'default';

  const afterLoginNavigate = () => {
    if (variant === 'super_admin') {
      navigate('/super-admin');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const user = await login(email, password, {
      tenantCode: tenantCode.trim() || undefined,
    });

    if (user) {
      if (variant === 'super_admin' && !isSuperAdminUser(user)) {
        logout();
        setError(
          'This account is not allowlisted for super admin. Add your email to SUPER_ADMIN_EMAILS (server) and VITE_SUPER_ADMIN_EMAILS (client build), or assign the Super Admin role in Roles / User Master.',
        );
        setLoading(false);
        return;
      }
      afterLoginNavigate();
    } else {
      setError('Invalid email or password. Please try again.');
    }

    setLoading(false);
  };

  const quickLogin = async (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setError('');
    setLoading(true);

    const user = await login(userEmail, userPassword);
    if (user) {
      afterLoginNavigate();
    }

    setLoading(false);
  };

  const demoAccounts = [
    { email: 'rajesh.kumar@procinix.ai', password: 'admin123', role: 'Admin', name: 'Rajesh Kumar' },
    { email: 'priya.sharma@procinix.ai', password: 'creator123', role: 'PO Creator', name: 'Priya Sharma' },
    { email: 'amit.patel@procinix.ai', password: 'approver123', role: 'PO Approver', name: 'Amit Patel' },
    { email: 'sunita.reddy@procinix.ai', password: 'grn123', role: 'GRN Manager', name: 'Sunita Reddy' },
    { email: 'vikram.shah@procinix.ai', password: 'mumbai123', role: 'Location Manager - Mumbai', name: 'Vikram Shah' },
    { email: 'anjali.iyer@procinix.ai', password: 'bangalore123', role: 'Location Manager - Bangalore', name: 'Anjali Iyer' },
    { email: 'karthik.menon@procinix.ai', password: 'multi123', role: 'Multi-Role (Creator + Approver + GRN)', name: 'Karthik Menon' },
  ];

  const title =
    variant === 'super_admin' ? 'Super admin — sign in' : 'Procinix P2P Automation ERP';
  const subtitle =
    variant === 'super_admin'
      ? 'Manage tenants and platform entities (allowlisted operators only).'
      : 'Sign in to access your account';

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-cloud)' }}>
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img
              src={clientLogo}
              alt="Opptra"
              style={{ height: '56px', width: 'auto', margin: '0 auto 20px', display: 'block' }}
            />
            <h1 className="text-3xl mb-2" style={{ color: 'var(--color-ink)' }}>
              {title}
            </h1>
            <p style={{ color: 'var(--color-mercury-grey)' }}>{subtitle}</p>
            {variant === 'default' ? (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                <Link to="/super-admin/login" className="underline font-medium" style={{ color: 'var(--color-teal)' }}>
                  Super admin (tenant setup)
                </Link>
              </p>
            ) : (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-mercury-grey)' }}>
                <Link to="/login" className="underline font-medium" style={{ color: 'var(--color-teal)' }}>
                  Standard ERP login
                </Link>
              </p>
            )}
          </div>

          <div className="bg-white rounded-lg p-8" style={{ border: '1px solid var(--color-silver)' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {isMysqlApiEnabled() && variant === 'default' ? (
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                    Tenant code <span className="text-xs font-normal">(optional if only one tenant)</span>
                  </label>
                  <div className="relative">
                    <Building2
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                      style={{ color: 'var(--color-mercury-grey)' }}
                    />
                    <input
                      type="text"
                      value={tenantCode}
                      onChange={(ev) => setTenantCode(ev.target.value.toUpperCase())}
                      placeholder="e.g. DEFAULT"
                      className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm uppercase"
                      style={{
                        border: '1px solid var(--color-silver)',
                        color: 'var(--color-ink)',
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg"
                    style={{
                      border: '1px solid var(--color-silver)',
                      color: 'var(--color-ink)',
                    }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-lg"
                    style={{
                      border: '1px solid var(--color-silver)',
                      color: 'var(--color-ink)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--color-mercury-grey)' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFE8EA' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: 'var(--color-error)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-error)' }}>
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-teal)' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-teal-dark)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--color-teal)')}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-8" style={{ opacity: 0.75 }}>
          <span style={{ color: 'var(--color-mercury-grey)', fontSize: '11px', letterSpacing: '0.04em' }}>
            Powered by
          </span>
          <img src={procinixLogo} alt="Procinix" style={{ height: '20px', width: 'auto' }} />
        </div>
      </div>

      <div className="w-[480px] p-8 flex flex-col max-lg:hidden" style={{ backgroundColor: '#2A3A42' }}>
        <div className="flex-1 flex flex-col justify-center">
          {variant === 'super_admin' ? (
            <>
              <h2 className="text-2xl text-white mb-6">Tenant & entity setup</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-slate)' }}>
                After sign-in you can create tenants and their platform entities. API calls require your user email to
                match <code className="text-xs">SUPER_ADMIN_EMAILS</code> on the API server.
              </p>
              <div className="p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
                <p className="text-xs" style={{ color: 'var(--color-slate)' }}>
                  Use the same User Master credentials as the main ERP. Assign the <strong>Super Admin</strong> role in
                  Roles Master, or add your email to the allowlist env vars documented in <code>.env.example</code>.
                </p>
              </div>
            </>
          ) : showDemoAccounts ? (
            <>
              <h2 className="text-2xl text-white mb-6">Demo Accounts</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-slate)' }}>
                Click any account below to quick login and explore role-based features
              </p>

              <div className="space-y-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => quickLogin(account.email, account.password)}
                    className="w-full text-left p-4 rounded-lg transition-colors"
                    style={{
                      backgroundColor: '#1F2D35',
                      border: '1px solid #3A4A52',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2A3A42')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#1F2D35')}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white">{account.name}</p>
                      <span
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-teal)',
                          color: 'white',
                        }}
                      >
                        {account.role}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--color-slate)' }}>
                      {account.email}
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl text-white mb-6">Master-Driven Login</h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-slate)' }}>
                Sign-in validates against approved records from Employee Master, User Master, and Roles Master. Tenant
                scope is resolved from User Master and <code className="text-xs">user_entity_access</code>.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
                  <p className="text-sm text-white mb-2">What is required</p>
                  <ul className="text-xs space-y-1" style={{ color: 'var(--color-slate)' }}>
                    <li>• Employee must be active and approved in Employee Master</li>
                    <li>• User must be active and approved in User Master</li>
                    <li>• Assigned role must be active and approved in Roles Master</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
                  <p className="text-sm text-white mb-2">Multi-entity</p>
                  <p className="text-xs" style={{ color: 'var(--color-slate)' }}>
                    If you have access to more than one platform entity, you will be asked to choose one right after
                    login.
                  </p>
                </div>
              </div>
            </>
          )}

          {variant === 'default' ? (
            <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
              <p className="text-sm text-white mb-2">Role Permissions:</p>
              <ul className="text-xs space-y-1" style={{ color: 'var(--color-slate)' }}>
                <li>• <strong>Admin:</strong> Full system access</li>
                <li>• <strong>PO Creator:</strong> Create & edit purchase orders</li>
                <li>• <strong>PO Approver:</strong> Approve/reject purchase orders</li>
                <li>• <strong>GRN Manager:</strong> Create GRNs & allocate to locations</li>
                <li>• <strong>Location Manager:</strong> Accept GRN allocations for their location</li>
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
