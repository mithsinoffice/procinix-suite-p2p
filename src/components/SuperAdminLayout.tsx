import { useEffect } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isSuperAdminUser } from '../utils/superAdmin';
import { LogOut, ArrowLeft } from 'lucide-react';

export function SuperAdminLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/super-admin/login', { replace: true });
      return;
    }
    if (user && !isSuperAdminUser(user)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  if (!isAuthenticated || !user || !isSuperAdminUser(user)) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-sm"
        style={{ color: 'var(--color-mercury-grey)' }}
      >
        Checking access…
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--color-cloud)' }}>
      <header
        className="flex items-center justify-between gap-4 px-6 py-4 border-b bg-white"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium"
            style={{ color: 'var(--color-teal)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to ERP
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg font-semibold truncate" style={{ color: 'var(--color-ink)' }}>
            Super admin — tenants & entities
          </h1>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span
            className="text-sm truncate max-w-[200px]"
            style={{ color: 'var(--color-mercury-grey)' }}
          >
            {user.email}
          </span>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-silver)' }}
            onClick={() => {
              logout();
              navigate('/super-admin/login', { replace: true });
            }}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
