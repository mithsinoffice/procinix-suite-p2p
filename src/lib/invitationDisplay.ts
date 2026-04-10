import type { VendorInvitation } from '../types/vendorInvitation';

export type InvitationUiKind = 'pending' | 'accepted' | 'expired';

export function getInvitationUiKind(inv: VendorInvitation, now = new Date()): InvitationUiKind {
  if (inv.status === 'approved') return 'accepted';
  const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
  if (exp && now > exp && inv.status === 'invited') return 'expired';
  return 'pending';
}

export function formatInvitationDisplayId(inv: VendorInvitation): string {
  const y = new Date(inv.createdAt).getFullYear();
  const seq = inv.displaySequence ?? 0;
  if (seq === 0) {
    const tail = (inv.id.replace(/\D/g, '').slice(-4) || '0001').padStart(4, '0');
    return `INV-${y}-${tail}`;
  }
  return `INV-${y}-${String(seq).padStart(3, '0')}`;
}

export function formatInvitedDate(iso: string): string {
  return iso.split('T')[0] ?? iso;
}

export function formatExpiresIn(inv: VendorInvitation): string {
  if (inv.status === 'approved' || inv.status === 'rejected') return '—';
  const exp = inv.expiresAt ? new Date(inv.expiresAt) : null;
  if (!exp) return '—';
  const now = new Date();
  if (inv.status === 'invited' && now > exp) return 'Expired';
  if (now > exp) return '—';
  const ms = exp.getTime() - now.getTime();
  const days = Math.max(0, Math.ceil(ms / 864e5));
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function computeInvitationKpis(invitations: VendorInvitation[]) {
  const now = new Date();
  let accepted = 0;
  let expired = 0;
  let pending = 0;
  for (const inv of invitations) {
    const k = getInvitationUiKind(inv, now);
    if (k === 'accepted') accepted += 1;
    else if (k === 'expired') expired += 1;
    else pending += 1;
  }
  return {
    total: invitations.length,
    accepted,
    expired,
    pending,
  };
}
