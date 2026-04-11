import { ImapFlow } from 'imapflow';
import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

// ── Attachment detection ────────────────────────────────
// Accept broad MIME types + filename extension fallback
const VALID_MIME = new Set([
  'application/pdf',
  'application/x-pdf',
  'application/octet-stream',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/tiff',
]);

const VALID_EXT = /\.(pdf|jpg|jpeg|png|tiff)$/i;

function isValidAttachment(part) {
  // Check MIME type
  if (part.type && VALID_MIME.has(part.type)) return true;
  // Check filename extension as fallback — never skip on MIME alone
  const filename = part.filename || part.dispositionParameters?.filename || '';
  if (VALID_EXT.test(filename)) return true;
  return false;
}

function inferMimeFromFilename(filename) {
  if (!filename) return 'application/octet-stream';
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.tiff')) return 'image/tiff';
  return 'application/octet-stream';
}

// ── IMAP config ─────────────────────────────────────────
function buildImapConfig() {
  return {
    host: process.env.AP_EMAIL_HOST,
    port: Number(process.env.AP_EMAIL_PORT || 993),
    secure: true,
    auth: {
      user: process.env.AP_EMAIL_USER,
      pass: process.env.AP_EMAIL_PASSWORD,
    },
    logger: false,
    tls: { rejectUnauthorized: true },
    greetingTimeout: 15000,
    socketTimeout: 300000,
    disableCompression: true,
  };
}

// ── Check OCR API keys ──────────────────────────────────
export function checkOcrKeys() {
  const keys = [];
  const anthropic = process.env.ANTHROPIC_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  const google = process.env.GOOGLE_AI_API_KEY;

  if (anthropic && anthropic !== 'your-key-here' && anthropic !== 'your-anthropic-api-key') keys.push('Claude');
  if (openai && openai !== 'your-openai-api-key') keys.push('ChatGPT');
  if (google && google !== 'your-google-ai-api-key') keys.push('Gemini');

  if (keys.length === 0) {
    console.error('[OCR] ⚠ No OCR API keys set — OCR will fail. Add ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_AI_API_KEY to .env.mysql.local');
    return false;
  }
  console.log(`[OCR] Available providers: ${keys.join(' → ')}`);
  return true;
}

// Backward compat alias
export const checkAnthropicKey = checkOcrKeys;

// ── Fetch emails ────────────────────────────────────────
async function fetchEmails() {
  const config = buildImapConfig();
  if (!config.host || !config.auth.user || !config.auth.pass) {
    console.log('[EmailPoller] IMAP credentials not configured');
    return [];
  }

  const client = new ImapFlow(config);
  const emails = [];

  client.on('error', (err) => {
    console.error('[EmailPoller] ImapFlow error event:', err.message);
  });

  try {
    await client.connect();
    console.log('[EmailPoller] IMAP connected to', config.host, 'as', config.auth.user);

    const inbox = process.env.AP_EMAIL_INBOX || 'INBOX';
    const lock = await client.getMailboxLock(inbox);

    try {
      // Strategy: try UNSEEN first; if 0 found, fall back to last 10
      let uids = await client.search({ seen: false }, { uid: true });
      let fetchMode = 'UNSEEN';

      if (!uids || uids.length === 0) {
        console.log('[EmailPoller] No UNSEEN emails — falling back to last 10');
        const allUids = await client.search({ all: true }, { uid: true });
        uids = allUids.slice(-10);
        fetchMode = 'LAST_10';
      }

      if (!uids || uids.length === 0) {
        console.log('[EmailPoller] Inbox is completely empty');
        lock.release();
        await client.logout();
        return [];
      }

      console.log(`[EmailPoller] Fetching ${uids.length} email(s) [mode: ${fetchMode}]`);

      const messages = client.fetch(uids, {
        envelope: true,
        bodyStructure: true,
        uid: true,
      }, { uid: true });

      let emailIndex = 0;
      for await (const msg of messages) {
        emailIndex++;
        const envelope = msg.envelope || {};
        const messageId = envelope.messageId || `no-mid-${msg.uid}`;
        const sender = envelope.from?.[0] || {};
        const subject = envelope.subject || '(no subject)';

        console.log(`[EmailPoller] ── Email #${emailIndex} ──────────────────────`);
        console.log(`  Subject: ${subject}`);
        console.log(`  Sender:  ${sender.name || ''} <${sender.address || '?'}>`);
        console.log(`  Date:    ${envelope.date || 'unknown'}`);
        console.log(`  UID:     ${msg.uid}`);

        // Flatten all MIME parts
        const allParts = flattenParts(msg.bodyStructure);
        console.log(`  MIME parts found: ${allParts.length}`);

        // Collect attachment metadata first (no download yet)
        const attachmentParts = [];
        for (const part of allParts) {
          const filename = part.filename || part.dispositionParameters?.filename || '';
          const mime = part.type || 'unknown';
          const isAtt = isValidAttachment(part);

          if (filename || part.disposition === 'attachment') {
            console.log(`    Part ${part.part}: ${filename || '(unnamed)'} [${mime}] ${isAtt ? '→ WILL DOWNLOAD' : '→ SKIP (not invoice type)'}`);
          }

          if (isAtt) {
            attachmentParts.push({ part: part.part, filename, mime });
          }
        }

        // Download attachments using a FRESH dedicated connection per email
        // This avoids socket timeout from long-running shared connection
        const attachments = [];
        if (attachmentParts.length > 0) {
          console.log(`  Downloading ${attachmentParts.length} attachment(s) via dedicated connection (10min timeout)...`);
          let dlClient;
          try {
            const dlConfig = buildImapConfig();
            dlConfig.socketTimeout = 600000; // 10 minutes for large attachment downloads
            dlClient = new ImapFlow(dlConfig);
            dlClient.on('error', () => {});
            await dlClient.connect();
            const dlLock = await dlClient.getMailboxLock(inbox);
            try {
              for (const ap of attachmentParts) {
                try {
                  const data = await dlClient.download(String(msg.uid), ap.part, { uid: true });
                  const chunks = [];
                  for await (const chunk of data.content) {
                    chunks.push(chunk);
                  }
                  const buffer = Buffer.concat(chunks);
                  if (buffer.length > 0) {
                    const resolvedMime = ap.mime === 'application/octet-stream' ? inferMimeFromFilename(ap.filename) : ap.mime;
                    console.log(`    ✓ Downloaded: ${ap.filename || 'unnamed'} (${(buffer.length / 1024).toFixed(1)} KB, mime: ${resolvedMime})`);
                    attachments.push({
                      filename: ap.filename || `attachment.${mimeToExt(resolvedMime)}`,
                      mimeType: resolvedMime,
                      buffer,
                    });
                  }
                } catch (dlErr) {
                  console.error(`    ✗ Download failed for part ${ap.part}: ${dlErr.message}`);
                }
              }
            } finally {
              dlLock.release();
            }
            await dlClient.logout();
          } catch (connErr) {
            console.error(`    ✗ Dedicated download connection failed: ${connErr.message}`);
            try { if (dlClient) await dlClient.logout(); } catch { /* ignore */ }
          }
        }

        if (attachments.length === 0) {
          console.log(`  Decision: SKIP — no invoice attachments found`);
          continue;
        }

        console.log(`  Decision: PROCESS — ${attachments.length} valid attachment(s)`);
        // Do NOT mark as SEEN yet — only after successful processing
        emails.push({
          messageId,
          uid: msg.uid,
          senderEmail: sender.address || '',
          senderName: sender.name || '',
          subject,
          date: envelope.date || new Date(),
          attachments,
        });
      }
    } finally {
      lock.release();
    }

    // Store client ref so we can mark SEEN after processing
    if (emails.length > 0) {
      emails._imapClient = client;
    } else {
      await client.logout();
    }
  } catch (err) {
    console.error('[EmailPoller] IMAP error:', err.message, err.responseText || '', err.code || '');
    try { await client.logout(); } catch { /* ignore */ }
  }

  return emails;
}

// ── Helpers ─────────────────────────────────────────────
function flattenParts(structure, prefix = '') {
  const parts = [];
  if (!structure) return parts;
  if (structure.childNodes) {
    structure.childNodes.forEach((child, i) => {
      const partNum = prefix ? `${prefix}.${i + 1}` : `${i + 1}`;
      child.part = partNum;
      if (child.childNodes) {
        parts.push(...flattenParts(child, partNum));
      } else {
        parts.push(child);
      }
    });
  } else {
    structure.part = prefix || '1';
    parts.push(structure);
  }
  return parts;
}

function mimeToExt(mime) {
  const map = {
    'application/pdf': 'pdf',
    'application/x-pdf': 'pdf',
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/tiff': 'tiff',
  };
  return map[mime] || 'pdf';
}

// ── Ingestion log ───────────────────────────────────────
async function saveIngestionLog(email) {
  const id = randomUUID();

  const existing = await query(
    'SELECT id FROM invoice_ingestion_log WHERE message_id = ? LIMIT 1',
    [email.messageId]
  );
  if (existing.length > 0) {
    return null; // deduplicate
  }

  await query(
    `INSERT INTO invoice_ingestion_log
      (id, message_id, sender_email, sender_name, subject, received_at, attachment_count, status, raw_email_meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'received', CAST(? AS JSON))`,
    [
      id,
      email.messageId,
      email.senderEmail,
      email.senderName,
      email.subject,
      email.date,
      email.attachments.length,
      JSON.stringify({ senderEmail: email.senderEmail, subject: email.subject }),
    ]
  );

  return id;
}

// ── Mark email as SEEN (called after successful processing) ──
export async function markEmailSeen(imapClient, uid) {
  try {
    const inbox = process.env.AP_EMAIL_INBOX || 'INBOX';
    const lock = await imapClient.getMailboxLock(inbox);
    try {
      await imapClient.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
      console.log(`[EmailPoller] Marked UID ${uid} as SEEN`);
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error(`[EmailPoller] Failed to mark UID ${uid} as SEEN:`, err.message);
  }
}

// ── Public API ──────────────────────────────────────────
let pollerInterval = null;

export async function pollOnce() {
  console.log('[EmailPoller] ═══════════════════════════════════════');
  console.log('[EmailPoller] Poll started at', new Date().toISOString());

  // Check API key before polling
  checkAnthropicKey();

  const emails = await fetchEmails();
  const results = { processed: 0, failed: 0, skipped: 0 };

  for (const email of emails) {
    try {
      const logId = await saveIngestionLog(email);
      if (!logId) {
        console.log(`[EmailPoller] Skipping duplicate: ${email.messageId}`);
        results.skipped++;
        continue;
      }
      results.processed++;
      email._logId = logId;
    } catch (err) {
      console.error(`[EmailPoller] Failed to save log for ${email.subject}:`, err.message);
      results.failed++;
    }
  }

  const toProcess = emails.filter((e) => e._logId);
  console.log(`[EmailPoller] Poll complete: ${results.processed} to process, ${results.skipped} duplicates, ${results.failed} failed`);
  return { emails: toProcess, imapClient: emails._imapClient || null, results };
}

export function startEmailPoller(processCallback) {
  const intervalMinutes = Number(process.env.AP_POLL_INTERVAL_MINUTES || 5);

  if (!process.env.AP_EMAIL_HOST) {
    console.log('[EmailPoller] AP_EMAIL_HOST not configured — email polling disabled');
    return;
  }

  // Startup checks
  console.log('[EmailPoller] ── Env Check ──');
  console.log(`  AP_EMAIL_HOST:  ${process.env.AP_EMAIL_HOST}`);
  console.log(`  AP_EMAIL_PORT:  ${process.env.AP_EMAIL_PORT || 993}`);
  console.log(`  AP_EMAIL_USER:  ${process.env.AP_EMAIL_USER}`);
  console.log(`  AP_EMAIL_INBOX: ${process.env.AP_EMAIL_INBOX || 'INBOX'}`);
  console.log(`  AP_POLL_INTERVAL_MINUTES: ${intervalMinutes}`);
  console.log(`  ANTHROPIC_API_KEY: ${checkAnthropicKey() ? 'SET' : 'MISSING'}`);
  console.log(`[EmailPoller] Starting — polling every ${intervalMinutes} minutes`);

  const run = async () => {
    try {
      const { emails, imapClient } = await pollOnce();

      for (const email of emails) {
        try {
          console.log(`[EmailPoller] Processing: "${email.subject}" (${email.attachments.length} attachment(s))`);
          await processCallback(email);

          // Mark as SEEN only after successful processing
          if (imapClient && email.uid) {
            await markEmailSeen(imapClient, email.uid);
          }
        } catch (err) {
          console.error(`[EmailPoller] ✗ Failed to process "${email.subject}":`, err.message);
          console.error(err.stack);
          // Leave as UNSEEN so it retries next poll
          try {
            if (email._logId) {
              await query(
                'UPDATE invoice_ingestion_log SET status = ?, error_message = ? WHERE id = ?',
                ['failed', err.message, email._logId]
              );
            }
          } catch { /* ignore */ }
        }
      }

      // Close IMAP after all emails processed
      if (imapClient) {
        try { await imapClient.logout(); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error('[EmailPoller] Poll cycle error:', err.message);
      console.error(err.stack);
    }
  };

  run();
  pollerInterval = setInterval(run, intervalMinutes * 60 * 1000);
}

export function stopEmailPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}
