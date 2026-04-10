/** Default From for transactional email (invitations, notifications) unless MAIL_FROM overrides. */
export const DEFAULT_APP_MAIL_FROM = 'info@procinix.ai';

export function getAppMailFrom() {
  const raw = typeof process.env.MAIL_FROM === 'string' ? process.env.MAIL_FROM.trim() : '';
  return raw || DEFAULT_APP_MAIL_FROM;
}
