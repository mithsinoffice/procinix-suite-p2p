import nodemailer from 'nodemailer';
import { query } from '../../mysql.mjs';
import { LIFECYCLE_STATES } from '../invoices/lifecycleMapping.mjs';

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function triggerWorkflow(invoiceId, validationResult, matchResult) {
  const rows = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);

  if (rows.length === 0) return;
  const invoice = rows[0];

  const notificationEmail = process.env.AP_NOTIFICATION_EMAIL;
  const transporter = buildTransporter();

  if (
    invoice.status === 'pending_approval' ||
    invoice.lifecycle_state === LIFECYCLE_STATES.UNDER_VERIFICATION
  ) {
    // Trigger approval workflow — insert a workflow task
    await query(
      `INSERT INTO approval_workflows (id, workflow_name, min_amount, max_amount, approver, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'AP Team', 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP`,
      [
        invoiceId,
        `Auto-ingested Invoice ${invoice.invoice_number}`,
        String(invoice.total_amount),
        String(invoice.total_amount),
      ]
    );
  }

  // Send email notification
  if (transporter && notificationEmail) {
    const warningLines =
      validationResult.warnings.length > 0
        ? `\n\nWarnings:\n${validationResult.warnings.map((w) => `  - ${w}`).join('\n')}`
        : '';

    const matchLine = matchResult.matched
      ? `PO Match: ${matchResult.matchType} — ${matchResult.poNumber} (${(matchResult.matchConfidence * 100).toFixed(0)}% confidence)`
      : `PO Match: None found`;

    const subject = `New invoice ingested: ${invoice.invoice_number || 'Unknown'} from ${invoice.vendor_name || 'Unknown'}`;
    const body = [
      `Invoice Number: ${invoice.invoice_number}`,
      `Vendor: ${invoice.vendor_name}`,
      `Amount: ${invoice.currency} ${invoice.total_amount}`,
      `Date: ${invoice.invoice_date}`,
      `Status: ${invoice.status}`,
      matchLine,
      warningLines,
      validationResult.requiresManualReview ? '\n** This invoice requires manual review **' : '',
    ].join('\n');

    try {
      await transporter.sendMail({
        from: process.env.MAIL_FROM || 'info@procinix.ai',
        to: notificationEmail,
        subject,
        text: body,
      });
    } catch (err) {
      console.error('[WorkflowTrigger] Email notification failed:', err.message);
    }
  }

  return { status: invoice.status, notified: !!transporter };
}
