import { Outlet } from 'react-router-dom';
import { AppProviders } from './AppProviders';

export function RootLayout() {
  return (
    <AppProviders>
      <Outlet />
    </AppProviders>
  );
}
