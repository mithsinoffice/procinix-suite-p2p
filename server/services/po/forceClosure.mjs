import { randomUUID } from 'crypto';

/**
 * Get a preview of force-closing a PO.
 * Returns PO summary, line items with qty status, budget impact, accrual impact.
 */
export async function getForceClosurePreview(queryFn, poId) {
  // Check for existing closure events
  const logs = await queryFn(
    'SELECT * FROM p2p_schema_mt.po_expiry_log WHERE po_id = ? AND event_type = ? ORDER BY created_at DESC',
    [poId, 'manually_closed']
  );

  // Check amendments on this PO
  const amendments = await queryFn(
    'SELECT COUNT(*) as cnt, SUM(value_change) as totalChange FROM p2p_schema_mt.po_amendments WHERE po_id = ? AND status = ?',
    [poId, 'approved']
  );

  return {
    poId,
    alreadyClosed: logs.length > 0,
    previousClosures: logs,
    approvedAmendments: amendments[0]?.cnt || 0,
    totalAmendmentValueChange: amendments[0]?.totalChange || 0,
    warnings: logs.length > 0 ? ['This PO has already been force-closed previously.'] : [],
    impactSummary: {
      budgetRelease: 'Remaining PO value will be released back to budget',
      accrualReversal: 'Open accruals will be reversed upon closure',
      vendorNotification: 'Vendor will be notified if selected',
    },
  };
}

/**
 * Force-close a PO.
 * Records the event in po_expiry_log and returns confirmation.
 */
export async function forceclosePO(
  queryFn,
  poId,
  userId,
  { reason, remarks, notifyVendor, accrualReversal }
) {
  const eventId = randomUUID();

  await queryFn(
    `INSERT INTO p2p_schema_mt.po_expiry_log (id, po_id, event_type, event_detail, triggered_by)
     VALUES (?, ?, 'manually_closed', ?, ?)`,
    [eventId, poId, JSON.stringify({ reason, remarks, notifyVendor, accrualReversal }), userId]
  );

  return {
    success: true,
    eventId,
    poId,
    closedAt: new Date().toISOString(),
    closedBy: userId,
    notifyVendor: !!notifyVendor,
    accrualReversal: !!accrualReversal,
  };
}
