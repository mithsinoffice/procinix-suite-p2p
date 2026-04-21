import { Login } from './Login';

/** Dedicated entry for platform operators (same credentials as ERP user, must be allowlisted). */
export function SuperAdminLogin() {
  return <Login variant="super_admin" />;
}
