import { ensureRelationalMasterRecords } from '../mysql/masterTables';
import { updateMasterApprovalStatus } from './masterApproval';

export function getCurrentApprovalActor() {
  if (typeof window === 'undefined') {
    return 'Approver';
  }

  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) {
      return 'Approver';
    }

    const parsed = JSON.parse(raw) as { name?: string };
    return typeof parsed?.name === 'string' && parsed.name.trim() ? parsed.name : 'Approver';
  } catch {
    return 'Approver';
  }
}

export async function applyMasterApprovalAction<T>(
  masterKey: Parameters<typeof ensureRelationalMasterRecords<T>>[0],
  fallbackRecords: T[],
  recordId: string,
  action: 'approve' | 'reject' | 'request_info',
  comments = '',
) {
  await updateMasterApprovalStatus(masterKey, recordId, action, {
    actor: getCurrentApprovalActor(),
    comments,
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('master-saved', { detail: { masterKey, action } }));
  }

  return ensureRelationalMasterRecords(masterKey, fallbackRecords);
}
