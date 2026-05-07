import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { SubkoCoffeeNavigation } from './SubkoCoffeeNavigation';
import { ChatBot } from './ChatBot';
import { PlatformEntityGate } from './PlatformEntityGate';
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function DashboardLayout() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const hasNavigated = useRef(false);

  useEffect(() => {
    if (!isAuthenticated && !hasNavigated.current) {
      hasNavigated.current = true;
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen" style={{ backgroundColor: 'var(--color-cloud)' }}>
      {user?.mustSelectPlatformEntity ? <PlatformEntityGate /> : null}
      {/* Subko Coffee Flat Navigation */}
      <SubkoCoffeeNavigation />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-auto w-full min-w-0">
          <Outlet />
        </main>
      </div>
      <ChatBot />
    </div>
  );
}
