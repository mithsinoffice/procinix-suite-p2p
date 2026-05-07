import { randomUUID } from 'crypto';

/**
 * Check and process PO expiries.
 * Scans for POs past their validity date and logs auto-closure events.
 * In a full implementation this would query POs from the AP context / ap_data domain.
 */
export async function checkAndProcessExpiries(queryFn) {
  console.log('[PO Expiry] Running expiry check at', new Date().toISOString());

  // Find POs that were extended but may have passed the new expiry
  const extendedLogs = await queryFn(
    `SELECT po_id, event_detail FROM p2p_schema_mt.po_expiry_log
     WHERE event_type = 'extended'
     ORDER BY created_at DESC`
  );

  let processed = 0;
  let expired = 0;
  let notified = 0;

  for (const log of extendedLogs) {
    processed++;
    try {
      const detail = JSON.parse(log.event_detail || '{}');
      if (detail.newExpiryDate && new Date(detail.newExpiryDate) < new Date()) {
        // PO has passed its extended expiry date — log auto-closure
        const alreadyClosed = await queryFn(
          `SELECT COUNT(*) as cnt FROM p2p_schema_mt.po_expiry_log
           WHERE po_id = ? AND event_type IN ('auto_closed', 'manually_closed')
           AND created_at > (SELECT MAX(created_at) FROM p2p_schema_mt.po_expiry_log WHERE po_id = ? AND event_type = 'extended')`,
          [log.po_id, log.po_id]
        );
        if ((alreadyClosed[0]?.cnt || 0) === 0) {
          await queryFn(
            `INSERT INTO p2p_schema_mt.po_expiry_log (id, po_id, event_type, event_detail, triggered_by)
             VALUES (?, ?, 'auto_closed', ?, 'system')`,
            [
              randomUUID(),
              log.po_id,
              JSON.stringify({ reason: 'Extended validity period expired' }),
            ]
          );
          expired++;
        }
      }
    } catch {
      // Skip invalid JSON
    }
  }

  console.log(`[PO Expiry] Processed: ${processed}, Expired: ${expired}, Notified: ${notified}`);
  return { processed, expired, notified };
}

/**
 * Send expiry reminders for POs approaching their validity date.
 * In a full implementation this would integrate with email/notification service.
 */
export async function sendExpiryReminders(queryFn) {
  console.log('[PO Expiry] Sending reminders at', new Date().toISOString());

  // Find POs with recent extension events (as a proxy for tracked POs with validity dates)
  const extendedLogs = await queryFn(
    `SELECT po_id, event_detail FROM p2p_schema_mt.po_expiry_log
     WHERE event_type = 'extended'
     ORDER BY created_at DESC`
  );

  let sent = 0;

  for (const log of extendedLogs) {
    try {
      const detail = JSON.parse(log.event_detail || '{}');
      if (!detail.newExpiryDate) continue;

      const expiryDate = new Date(detail.newExpiryDate);
      const now = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

      // Send reminder if expiring within 7 days and not already expired
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 7) {
        // Check if reminder already sent today
        const alreadySent = await queryFn(
          `SELECT COUNT(*) as cnt FROM p2p_schema_mt.po_expiry_log
           WHERE po_id = ? AND event_type = 'reminder_sent' AND DATE(created_at) = CURDATE()`,
          [log.po_id]
        );
        if ((alreadySent[0]?.cnt || 0) === 0) {
          await queryFn(
            `INSERT INTO p2p_schema_mt.po_expiry_log (id, po_id, event_type, event_detail, triggered_by)
             VALUES (?, ?, 'reminder_sent', ?, 'system')`,
            [
              randomUUID(),
              log.po_id,
              JSON.stringify({ daysUntilExpiry, expiryDate: detail.newExpiryDate }),
            ]
          );
          sent++;
        }
      }
    } catch {
      // Skip invalid entries
    }
  }

  console.log(`[PO Expiry] Reminders sent: ${sent}`);
  return { sent };
}

/**
 * Extend a PO's validity date.
 */
export async function extendPO(queryFn, poId, userId, { newExpiryDate, reason, remarks }) {
  const eventId = randomUUID();

  await queryFn(
    `INSERT INTO p2p_schema_mt.po_expiry_log (id, po_id, event_type, event_detail, triggered_by)
     VALUES (?, ?, 'extended', ?, ?)`,
    [eventId, poId, JSON.stringify({ newExpiryDate, reason, remarks }), userId]
  );

  return { success: true, eventId, poId, newExpiryDate };
}

/**
 * Get expiring POs dashboard data.
 */
export async function getExpiringPOs(queryFn, entityId) {
  // Get recent expiry-related logs
  const logs = await queryFn(
    'SELECT * FROM p2p_schema_mt.po_expiry_log ORDER BY created_at DESC LIMIT 100'
  );

  // Categorize logs
  const expiringThisWeek = [];
  const expiredToday = [];
  const autoClosedThisMonth = [];

  for (const log of logs) {
    if (log.event_type === 'reminder_sent') {
      expiringThisWeek.push(log);
    } else if (log.event_type === 'expired') {
      expiredToday.push(log);
    } else if (log.event_type === 'auto_closed') {
      autoClosedThisMonth.push(log);
    }
  }

  return { expiringThisWeek, expiredToday, autoClosedThisMonth, logs };
}
