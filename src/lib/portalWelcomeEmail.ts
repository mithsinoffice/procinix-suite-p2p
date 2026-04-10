import { isMysqlApiEnabled, mysqlApiRequest } from './mysql/client';

export function buildPortalWelcomeMailto(opts: {
  to: string;
  firstName: string;
  lastName: string;
  vendorName?: string;
  role?: string;
  loginUrl: string;
}): string {
  const subject = 'Your vendor portal access — Procinix';
  const body = `Hello ${opts.firstName},

Your account for the vendor portal has been created${opts.vendorName ? ` for ${opts.vendorName}` : ''}${opts.role ? ` (${opts.role})` : ''}.

Sign in here to continue:
${opts.loginUrl}

If you did not expect this message, you can ignore it.

— Procinix`;
  const q = (s: string) => encodeURIComponent(s);
  return `mailto:${q(opts.to)}?subject=${q(subject)}&body=${q(body)}`;
}

export type SendPortalWelcomeResult =
  | { ok: true; viaApi: true }
  | { ok: true; viaApi: false }
  | { ok: false; error: string };

export async function sendPortalWelcomeEmail(params: {
  to: string;
  firstName: string;
  lastName: string;
  vendorName?: string;
  role?: string;
  loginUrl: string;
}): Promise<SendPortalWelcomeResult> {
  if (!isMysqlApiEnabled()) {
    return { ok: true, viaApi: false };
  }

  try {
    const payload = await mysqlApiRequest<{ success?: boolean; mock?: boolean }>('/portal-users/welcome-email', {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        firstName: params.firstName,
        lastName: params.lastName,
        vendorName: params.vendorName,
        role: params.role,
        loginUrl: params.loginUrl,
      }),
    });
    if (payload.mock) {
      return { ok: true, viaApi: false };
    }
    return { ok: true, viaApi: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Welcome email request failed.';
    return { ok: false, error: message };
  }
}
