import { randomUUID } from 'crypto';

/**
 * Create a PO amendment.
 * Handles pricing, quantity, delivery date, and full amendments.
 * Auto-approves delivery-only changes; routes others through approval workflow.
 */
export async function createAmendment(
  queryFn,
  poId,
  userId,
  { amendmentType, reason, lineChanges, supportingDoc, vendorAcknowledged }
) {
  // Get next amendment number for this PO
  const countResult = await queryFn(
    'SELECT COUNT(*) as cnt FROM p2p_schema_mt.po_amendments WHERE po_id = ?',
    [poId]
  );
  const amendmentNumber = (countResult[0]?.cnt || 0) + 1;

  // Calculate value changes from line items
  let originalValue = 0;
  let amendedValue = 0;
  for (const change of lineChanges || []) {
    originalValue += Number(change.originalValue) || 0;
    amendedValue += Number(change.newValue) || 0;
  }
  const valueChange = amendedValue - originalValue;
  const valueChangePct = originalValue > 0 ? (valueChange / originalValue) * 100 : 0;

  // Determine if approval is needed
  // Delivery-only changes with no value impact are auto-approved
  const needsApproval = amendmentType !== 'delivery' && Math.abs(valueChangePct) > 0;
  const status = needsApproval ? 'pending_approval' : 'approved';

  const amendmentId = randomUUID();

  await queryFn(
    `INSERT INTO p2p_schema_mt.po_amendments
     (id, po_id, amendment_number, amendment_type, amendment_reason,
      supporting_document_url, vendor_acknowledged, original_value, amended_value,
      value_change, value_change_pct, changes_json, status, submitted_by, submitted_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      amendmentId,
      poId,
      amendmentNumber,
      amendmentType,
      reason,
      supportingDoc || null,
      vendorAcknowledged || false,
      originalValue,
      amendedValue,
      valueChange,
      Math.round(valueChangePct * 100) / 100,
      JSON.stringify(lineChanges || []),
      status,
      userId,
    ]
  );

  // Insert individual line-level changes
  for (const change of lineChanges || []) {
    await queryFn(
      `INSERT INTO p2p_schema_mt.po_amendment_line_changes
       (id, amendment_id, po_line_item_id, field_changed, original_value, new_value, change_reason)
       VALUES (?,?,?,?,?,?,?)`,
      [
        randomUUID(),
        amendmentId,
        change.lineItemId || '',
        change.fieldChanged || '',
        String(change.originalValue),
        String(change.newValue),
        change.changeReason || '',
      ]
    );
  }

  // If auto-approved (delivery-only, no value change), stamp approval immediately
  if (status === 'approved') {
    await queryFn(
      'UPDATE p2p_schema_mt.po_amendments SET approved_by = ?, approved_at = NOW() WHERE id = ?',
      [userId, amendmentId]
    );
  }

  return {
    success: true,
    amendmentId,
    amendmentNumber,
    status,
    valueChange,
    valueChangePct: Math.round(valueChangePct * 100) / 100,
    needsApproval,
  };
}

/**
 * Approve a pending amendment.
 */
export async function approveAmendment(queryFn, amendmentId, userId) {
  await queryFn(
    'UPDATE p2p_schema_mt.po_amendments SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?',
    ['approved', userId, amendmentId]
  );
  return { success: true, amendmentId };
}

/**
 * Reject a pending amendment with a reason.
 */
export async function rejectAmendment(queryFn, amendmentId, userId, rejectionReason) {
  await queryFn(
    'UPDATE p2p_schema_mt.po_amendments SET status = ?, rejected_by = ?, rejected_reason = ? WHERE id = ?',
    ['rejected', userId, rejectionReason, amendmentId]
  );
  return { success: true, amendmentId };
}

/**
 * Get full amendment history for a PO, including line-level changes.
 */
export async function getAmendmentHistory(queryFn, poId) {
  const amendments = await queryFn(
    'SELECT * FROM p2p_schema_mt.po_amendments WHERE po_id = ? ORDER BY amendment_number ASC',
    [poId]
  );

  for (const a of amendments) {
    a.lineChanges = await queryFn(
      'SELECT * FROM p2p_schema_mt.po_amendment_line_changes WHERE amendment_id = ?',
      [a.id]
    );
  }

  return amendments;
}

/**
 * Preview the impact of a proposed amendment before submitting.
 * Returns value change calculations and approval routing info.
 */
export async function getAmendmentPreview(queryFn, poId, lineChanges) {
  let originalValue = 0;
  let amendedValue = 0;
  for (const change of lineChanges || []) {
    originalValue += Number(change.originalValue) || 0;
    amendedValue += Number(change.newValue) || 0;
  }
  const valueChange = amendedValue - originalValue;
  const valueChangePct = originalValue > 0 ? (valueChange / originalValue) * 100 : 0;

  const needsApproval = Math.abs(valueChangePct) > 10;
  const approver = needsApproval
    ? 'CFO'
    : Math.abs(valueChangePct) > 0
      ? 'Finance Manager'
      : 'Auto-approved';

  // Get existing amendment count for context
  const countResult = await queryFn(
    'SELECT COUNT(*) as cnt FROM p2p_schema_mt.po_amendments WHERE po_id = ?',
    [poId]
  );

  return {
    originalValue,
    amendedValue,
    valueChange,
    valueChangePct: Math.round(valueChangePct * 100) / 100,
    needsApproval,
    approver,
    existingAmendments: countResult[0]?.cnt || 0,
    nextAmendmentNumber: (countResult[0]?.cnt || 0) + 1,
  };
}
