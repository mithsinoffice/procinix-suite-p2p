import { isMysqlApiEnabled, mysqlApiRequest } from './mysql/client';

/** Same shape as previous form check, plus length bound */
function isValidEmailShape(normalized: string): boolean {
  return normalized.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function normalizeAndValidateInvitationEmail(raw: string): { ok: true; email: string } | { ok: false; error: string } {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, error: 'Email is required.' };
  }
  if (!isValidEmailShape(trimmed)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  return { ok: true, email: trimmed };
}

/** Ensures persisted invitation email matches what the user entered (defensive). */
export function assertInvitationEmailBound(invitationEmail: string, expectedNormalized: string): boolean {
  return invitationEmail === expectedNormalized;
}

export function buildVendorInvitationMailto(opts: {
  to: string;
  legalName: string;
  invitationUrl: string;
  entityName?: string;
}): string {
  const subject = `Vendor onboarding invitation — ${opts.legalName}`;
  const body = `Hello,

You have been invited to complete vendor onboarding for ${opts.legalName}${opts.entityName ? ` (${opts.entityName})` : ''}.

Open this link to continue:
${opts.invitationUrl}

Thank you.`;
  const q = (s: string) => encodeURIComponent(s);
  return `mailto:${q(opts.to)}?subject=${q(subject)}&body=${q(body)}`;
}

export type SendVendorInvitationEmailResult =
  | { ok: true; viaApi: true }
  | { ok: true; viaApi: false; reason: 'API_DISABLED' }
  | { ok: false; viaApi: false; error: string };

/**
 * Sends invitation email to the exact address from the form when backend supports it.
 * POST /vendor-invitations/send — backend should deliver to `to` only.
 */
export async function sendVendorInvitationEmail(params: {
  to: string;
  invitationUrl: string;
  legalName: string;
  entityName?: string;
  invitationId?: string;
}): Promise<SendVendorInvitationEmailResult> {
  if (!isMysqlApiEnabled()) {
    return { ok: true, viaApi: false, reason: 'API_DISABLED' };
  }

  try {
    const payload = await mysqlApiRequest<{ success?: boolean; mock?: boolean }>('/vendor-invitations/send', {
      method: 'POST',
      body: JSON.stringify({
        to: params.to,
        invitationUrl: params.invitationUrl,
        legalName: params.legalName,
        entityName: params.entityName,
        invitationId: params.invitationId,
      }),
    });
    if (payload.mock) {
      return { ok: true, viaApi: false, reason: 'API_DISABLED' };
    }
    return { ok: true, viaApi: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Email service request failed.';
    return { ok: false, viaApi: false, error: message };
  }
}
