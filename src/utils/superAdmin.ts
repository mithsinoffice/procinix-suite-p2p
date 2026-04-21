/** Client-side visibility (must match server SUPER_ADMIN_EMAILS for API mutations). */
export function isSuperAdminUser(
  user: { email: string; role?: string; roles?: string[] } | null,
): boolean {
  if (!user?.email) return false;
  const env = import.meta.env.VITE_SUPER_ADMIN_EMAILS || '';
  const allow = new Set(
    env
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  const email = user.email.trim().toLowerCase();
  if (allow.has(email)) return true;
  if (user.role === 'Super Admin') return true;
  if (user.roles?.includes('Super Admin')) return true;
  return false;
}
