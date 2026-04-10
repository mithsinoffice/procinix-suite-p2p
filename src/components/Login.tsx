import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { isMysqlApiEnabled } from '../lib/mysql/client';

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const showDemoAccounts = !isMysqlApiEnabled();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const success = await login(email, password);
    
    if (success) {
      navigate('/');
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

    const success = await login(userEmail, userPassword);
    
    if (success) {
      navigate('/');
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#F6F9FC' }}>
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4" style={{ backgroundColor: '#E8F7F8' }}>
              <Lock className="w-8 h-8" style={{ color: '#00A9B7' }} />
            </div>
            <h1 className="text-3xl mb-2" style={{ color: '#0A0F14' }}>
              Procurement Portal
            </h1>
            <p style={{ color: '#6E7A82' }}>
              Sign in to access your account
            </p>
          </div>

          {/* Login Form */}
          <div className="bg-white rounded-lg p-8" style={{ border: '1px solid #E1E6EA' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6E7A82' }} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-lg"
                    style={{
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm mb-2" style={{ color: '#6E7A82' }}>
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#6E7A82' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-12 py-3 rounded-lg"
                    style={{
                      border: '1px solid #E1E6EA',
                      color: '#0A0F14'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: '#6E7A82' }}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFE8EA' }}>
                  <AlertCircle className="w-5 h-5" style={{ color: '#FF4E5B' }} />
                  <p className="text-sm" style={{ color: '#FF4E5B' }}>
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#00A9B7' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#007D87')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#00A9B7')}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Account Guidance */}
      <div className="w-[480px] p-8 flex flex-col" style={{ backgroundColor: '#2A3A42' }}>
        <div className="flex-1 flex flex-col justify-center">
          {showDemoAccounts ? (
            <>
              <h2 className="text-2xl text-white mb-6">Demo Accounts</h2>
              <p className="text-sm mb-6" style={{ color: '#9AA6AF' }}>
                Click any account below to quick login and explore role-based features
              </p>

              <div className="space-y-3">
                {demoAccounts.map((account) => (
                  <button
                    key={account.email}
                    onClick={() => quickLogin(account.email, account.password)}
                    className="w-full text-left p-4 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: '#1F2D35',
                      border: '1px solid #3A4A52'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2A3A42'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1F2D35'}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white">{account.name}</p>
                      <span 
                        className="px-2 py-1 rounded text-xs"
                        style={{ 
                          backgroundColor: '#00A9B7',
                          color: 'white'
                        }}
                      >
                        {account.role}
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#9AA6AF' }}>
                      {account.email}
                    </p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl text-white mb-6">Master-Driven Login</h2>
              <p className="text-sm mb-6" style={{ color: '#9AA6AF' }}>
                Sign-in now validates against approved records from Employee Master, User Master, and Roles Master.
              </p>
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
                  <p className="text-sm text-white mb-2">What is required</p>
                  <ul className="text-xs space-y-1" style={{ color: '#9AA6AF' }}>
                    <li>• Employee must be active and approved in Employee Master</li>
                    <li>• User must be active and approved in User Master</li>
                    <li>• Assigned role must be active and approved in Roles Master</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
                  <p className="text-sm text-white mb-2">Setup note</p>
                  <p className="text-xs" style={{ color: '#9AA6AF' }}>
                    Use the employee email and the login password stored on the approved User Master record.
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: '#1F2D35', border: '1px solid #3A4A52' }}>
            <p className="text-sm text-white mb-2">Role Permissions:</p>
            <ul className="text-xs space-y-1" style={{ color: '#9AA6AF' }}>
              <li>• <strong>Admin:</strong> Full system access</li>
              <li>• <strong>PO Creator:</strong> Create & edit purchase orders</li>
              <li>• <strong>PO Approver:</strong> Approve/reject purchase orders</li>
              <li>• <strong>GRN Manager:</strong> Create GRNs & allocate to locations</li>
              <li>• <strong>Location Manager:</strong> Accept GRN allocations for their location</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
