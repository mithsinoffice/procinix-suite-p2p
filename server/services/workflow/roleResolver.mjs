/**
 * Role → user resolver for the workflow engine.
 *
 * Reads `user_roles` to find the user(s) that carry a given role inside a
 * tenant. `resolveStepApprover` adds the anti-fraud rule: an approver cannot
 * be the same person who submitted the document, even if they hold the
 * required role. If filtering leaves zero approvers the step is "blocked"
 * and the dispatcher returns HTTP 422 to the caller.
 *
 * `db` is the mysql pool (provides `execute`). Pure-ish: only does the DB
 * read; no writes, no side effects on its inputs.
 */

/** SELECT user_id FROM user_roles. Returns `[]` when nothing matched. */
export async function resolveApproversForRole(roleName, tenantId, db) {
  if (!roleName) return [];
  const [rows] = await db.execute(
    `SELECT user_id FROM user_roles
      WHERE LOWER(role_name) = LOWER(?)
        AND tenant_id = ?
      ORDER BY is_primary DESC, created_at ASC`,
    [String(roleName).trim(), tenantId]
  );
  return rows.map((r) => r.user_id).filter(Boolean);
}

/**
 * Resolve approvers for one workflow step, applying the same-approver-as-
 * submitter block. Returns either `{ approvers: string[] }` (success) or
 * `{ blocked: true, reason: string }` (caller must surface to user).
 *
 * `step` shape: { stepNumber, approverRole, specificUserId?, isMandatory, allowDelegation }
 *
 * Spec rule: if `specificUserId` is set on the step, it overrides the role
 * lookup (useful for "approver-by-name" workflows). Otherwise resolve via
 * role, then filter out the submitter so they can't approve their own work.
 */
export async function resolveStepApprover(step, tenantId, submittedBy, db) {
  if (!step) return { blocked: true, reason: 'Step missing' };
  const role = step.approverRole || step.role || '';
  const specificUserId = step.specificUserId || null;

  let candidates;
  if (specificUserId) {
    candidates = [specificUserId];
  } else {
    candidates = await resolveApproversForRole(role, tenantId, db);
  }
  // Same-approver-as-submitter block. Always applied (no opt-out flag at
  // the moment — `allowDelegation` is reserved for the future delegation
  // feature and is independent of this rule).
  const submitter = submittedBy ? String(submittedBy) : null;
  const filtered = submitter
    ? candidates.filter((uid) => String(uid) !== submitter)
    : candidates.slice();

  if (filtered.length === 0) {
    if (candidates.length === 0) {
      return {
        blocked: true,
        reason: `No approver mapped for role "${role}" in this tenant`,
      };
    }
    return {
      blocked: true,
      reason: `No independent approver available for role "${role}" (would self-approve)`,
    };
  }
  return { approvers: filtered };
}
