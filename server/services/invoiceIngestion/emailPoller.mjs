import { ImapFlow } from 'imapflow';
import { randomUUID } from 'node:crypto';
import { query } from '../../mysql.mjs';

// ImapFlow emits 'error' on internal Decoder/pipeline streams that have no
// listener when a socket closes unexpectedly (e.g. attachment download timeout).
// Node.js turns unlistened error events into uncaught exceptions that crash the
// server. Intercept only those specific IMAP connection errors here; for
// anything else replicate Node's default behaviour (print + exit).
process.on('uncaughtException', (err) => {
  if (err?.code === 'NoConnection' || String(err?.message).includes('Connection not available')) {
    console.error('[EmailPoller] Suppressed IMAP socket-close error (NoConnection):', err.message);
    return;
  }
  console.error('Uncaught exception (not IMAP):', err);
  process.exit(1);
});

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
// Timeouts: Gmail can leave the TCP socket open with no data movement for
// minutes when its IMAP frontend is overloaded — the prior `socketTimeout`
// of 300000 ms (5 min) let the poller hang exactly that long before
// imapflow surfaced an error, blocking concurrent triggers and the
// background loop's in-flight flag for the same window.
//   greetingTimeout    — how long to wait for the server greeting after TCP
//   connectionTimeout  — TCP connect ceiling (imapflow passes this through
//                        to the underlying socket where applicable; harmless
//                        when unrecognised by the version in use)
//   socketTimeout      — server inactivity ceiling on any single operation
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
    connectionTimeout: 15000,
    socketTimeout: 30000,
    disableCompression: true,
  };
}

/**
 * Promise.race against a timeout. The IMAP library's own `socketTimeout`
 * only fires when there's been no socket activity for the duration —
 * Gmail sometimes trickles keepalive bytes during a hung SELECT, which
 * resets that clock. This explicit racer guarantees an upper bound on
 * any single async call.
 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ── Check OCR API key (Gemini only) ─────────────────────
export function checkGeminiKey() {
  const google = process.env.GOOGLE_AI_API_KEY;
  if (!google || google === 'your-google-ai-api-key' || google === 'your-key-here') {
    console.error('[OCR] ⚠ GOOGLE_AI_API_KEY not set — OCR will fail. Add it to .env.mysql.local');
    return false;
  }
  console.log('[OCR] Gemini available');
  return true;
}

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
    // 15s connect ceiling — Gmail-side hangs at TCP/TLS handshake are the
    // most common stall mode. Throws cleanly into the outer catch which
    // releases the in-flight lock via the caller's finally.
    await withTimeout(client.connect(), 15000, 'IMAP connect');
    console.log('[EmailPoller] IMAP connected to', config.host, 'as', config.auth.user);

    const inbox = process.env.AP_EMAIL_INBOX || 'INBOX';
    // 15s mailbox-open ceiling — same rationale, applied to SELECT INBOX.
    const lock = await withTimeout(client.getMailboxLock(inbox), 15000, `SELECT ${inbox}`);

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

      const messages = client.fetch(
        uids,
        {
          envelope: true,
          bodyStructure: true,
          uid: true,
        },
        { uid: true }
      );

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
            console.log(
              `    Part ${part.part}: ${filename || '(unnamed)'} [${mime}] ${isAtt ? '→ WILL DOWNLOAD' : '→ SKIP (not invoice type)'}`
            );
          }

          if (isAtt) {
            attachmentParts.push({ part: part.part, filename, mime });
          }
        }

        // Download attachments using a FRESH dedicated connection per email
        // This avoids socket timeout from long-running shared connection
        const attachments = [];
        if (attachmentParts.length > 0) {
          console.log(
            `  Downloading ${attachmentParts.length} attachment(s) via dedicated connection (10min timeout)...`
          );
          let dlClient;
          try {
            const dlConfig = buildImapConfig();
            dlConfig.socketTimeout = 600000; // 10 minutes for large attachment downloads
            dlClient = new ImapFlow(dlConfig);
            dlClient.on('error', () => {});
            await withTimeout(dlClient.connect(), 15000, 'IMAP connect (download)');
            const dlLock = await withTimeout(
              dlClient.getMailboxLock(inbox),
              15000,
              `SELECT ${inbox} (download)`
            );
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
                    const resolvedMime =
                      ap.mime === 'application/octet-stream'
                        ? inferMimeFromFilename(ap.filename)
                        : ap.mime;
                    console.log(
                      `    ✓ Downloaded: ${ap.filename || 'unnamed'} (${(buffer.length / 1024).toFixed(1)} KB, mime: ${resolvedMime})`
                    );
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
            try {
              if (dlClient) await dlClient.logout();
            } catch {
              /* ignore */
            }
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

    // Always close the main IMAP client once attachments are downloaded.
    // Processing (OCR, validation, workflow) runs WITHOUT IMAP connected —
    // prevents Gmail from killing an idle session during long OCR cycles.
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.error('[EmailPoller] IMAP error:', err.message, err.responseText || '', err.code || '');
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
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

// ── Mark email as SEEN (opens a short-lived IMAP connection) ──
// Called AFTER processing completes, so we never hold IMAP open during OCR.
// One retry on transient socket/reset errors.
export async function markEmailSeen(uid) {
  const inbox = process.env.AP_EMAIL_INBOX || 'INBOX';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const client = new ImapFlow(buildImapConfig());
    client.on('error', () => {
      /* swallow — handled below */
    });
    try {
      await withTimeout(client.connect(), 15000, 'IMAP connect (mark-seen)');
      const lock = await withTimeout(
        client.getMailboxLock(inbox),
        15000,
        `SELECT ${inbox} (mark-seen)`
      );
      try {
        await client.messageFlagsAdd({ uid }, ['\\Seen'], { uid: true });
        console.log(`[EmailPoller] Marked UID ${uid} as SEEN`);
      } finally {
        lock.release();
      }
      await client.logout();
      return;
    } catch (err) {
      try {
        await client.logout();
      } catch {
        /* ignore */
      }
      if (attempt === 2) {
        console.error(`[EmailPoller] Failed to mark UID ${uid} as SEEN after retry:`, err.message);
      } else {
        console.warn(
          `[EmailPoller] markEmailSeen attempt 1 failed for UID ${uid}: ${err.message} — retrying`
        );
      }
    }
  }
}

// ── Public API ──────────────────────────────────────────
let pollerInterval = null;
let currentProcessCallback = null;
// In-flight guard shared between the background loop (`startEmailPoller.run`)
// and the on-demand /api/invoice-ingestion/trigger endpoint. Both call paths
// flip this around their work so concurrent invocations don't compete for
// the single IMAP connection allowed per Gmail app password.
let pollInFlight = false;

/** True when a poll cycle is currently running. */
export function isPollInFlight() {
  return pollInFlight;
}

/** Mark a poll cycle started — caller must pair with `endPoll()` in finally. */
export function beginPoll() {
  pollInFlight = true;
}

/** Mark the current poll cycle finished. Idempotent on already-false. */
export function endPoll() {
  pollInFlight = false;
}

export async function pollOnce() {
  console.log('[EmailPoller] ═══════════════════════════════════════');
  console.log('[EmailPoller] Poll started at', new Date().toISOString());

  // Check API key before polling
  checkGeminiKey();

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
  console.log(
    `[EmailPoller] Poll complete: ${results.processed} to process, ${results.skipped} duplicates, ${results.failed} failed`
  );
  return { emails: toProcess, results };
}

export function startEmailPoller(processCallback) {
  currentProcessCallback = processCallback || currentProcessCallback;
  const intervalMinutes = Number(process.env.AP_POLL_INTERVAL_MINUTES || 10);

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
  console.log(`  GOOGLE_AI_API_KEY: ${checkGeminiKey() ? 'SET' : 'MISSING'}`);
  console.log(`[EmailPoller] Starting — polling every ${intervalMinutes} minutes`);

  // Guard against overlapping poll cycles — if a poll is still running when
  // the next interval ticks, skip this tick rather than stacking connections.
  // The flag lives at module scope so the /api/invoice-ingestion/trigger
  // endpoint shares the same in-flight state — it can detect a background
  // poll in progress and respond 202 with "already in progress" rather than
  // competing for the single IMAP connection Gmail allows per app password.

  const run = async () => {
    if (pollInFlight) {
      console.log('[EmailPoller] Previous poll still running — skipping this tick');
      return;
    }
    beginPoll();
    // 5-min watchdog — releases the in-flight lock if a poll wedges on an
    // unrecoverable IMAP stall the per-call 15s/30s timeouts somehow miss
    // (e.g. a download client never resolving its `download()` stream).
    // Without this, a single hang would block every subsequent trigger
    // until process restart.
    const watchdog = setTimeout(
      () => {
        console.error('[EmailPoller] Watchdog: poll exceeded 5min — force-releasing lock');
        endPoll();
      },
      5 * 60 * 1000
    );
    try {
      const { emails } = await pollOnce();

      for (const email of emails) {
        try {
          console.log(
            `[EmailPoller] Processing: "${email.subject}" (${email.attachments.length} attachment(s))`
          );
          await processCallback(email);

          // IMAP is already closed; open a fresh short-lived session to mark SEEN.
          if (email.uid) {
            await markEmailSeen(email.uid);
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
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err) {
      console.error('[EmailPoller] Poll cycle error:', err.message);
      console.error(err.stack);
    } finally {
      clearTimeout(watchdog);
      endPoll();
    }
  };

  run();
  pollerInterval = setInterval(run, intervalMinutes * 60 * 1000);
}

export function restartEmailPoller() {
  stopEmailPoller();
  if (currentProcessCallback) {
    console.log('[EmailPoller] Restarting with updated settings…');
    startEmailPoller(currentProcessCallback);
  }
}

export function stopEmailPoller() {
  if (pollerInterval) {
    clearInterval(pollerInterval);
    pollerInterval = null;
  }
}
