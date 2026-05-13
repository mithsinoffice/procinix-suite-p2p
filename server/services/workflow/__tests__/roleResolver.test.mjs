import { describe, it, expect, vi } from 'vitest';
import { resolveApproversForRole, resolveStepApprover } from '../roleResolver.mjs';

function stubDb(rows) {
  return { execute: vi.fn().mockResolvedValue([rows]) };
}

describe('resolveApproversForRole', () => {
  it('returns empty array when roleName missing', async () => {
    const db = stubDb([]);
    expect(await resolveApproversForRole('', 'tenant', db)).toEqual([]);
  });
  it('returns user ids from the query', async () => {
    const db = stubDb([{ user_id: 'user-1' }, { user_id: 'user-2' }]);
    expect(await resolveApproversForRole('Finance Manager', 'tenant', db)).toEqual([
      'user-1',
      'user-2',
    ]);
  });
});

describe('resolveStepApprover', () => {
  it('blocks when no users mapped', async () => {
    const db = stubDb([]);
    const r = await resolveStepApprover({ approverRole: 'CFO' }, 'tenant', 'submitter-1', db);
    expect(r.blocked).toBe(true);
    expect(r.reason).toMatch(/No approver mapped/);
  });

  it('blocks when only candidate is the submitter (self-approval)', async () => {
    const db = stubDb([{ user_id: 'user-mith' }]);
    const r = await resolveStepApprover(
      { approverRole: 'CFO' },
      'tenant-default-001',
      'user-mith',
      db
    );
    expect(r.blocked).toBe(true);
    expect(r.reason).toMatch(/independent approver/);
  });

  it('returns approvers filtered against the submitter', async () => {
    const db = stubDb([{ user_id: 'user-mith' }, { user_id: 'user-other' }]);
    const r = await resolveStepApprover(
      { approverRole: 'CFO' },
      'tenant-default-001',
      'user-mith',
      db
    );
    expect(r.blocked).toBeUndefined();
    expect(r.approvers).toEqual(['user-other']);
  });

  it('honours specificUserId override', async () => {
    const db = stubDb([]); // role resolver wouldn't return anyone
    const r = await resolveStepApprover(
      { approverRole: 'Anything', specificUserId: 'user-xyz' },
      'tenant',
      'submitter-1',
      db
    );
    expect(r.blocked).toBeUndefined();
    expect(r.approvers).toEqual(['user-xyz']);
  });
});
