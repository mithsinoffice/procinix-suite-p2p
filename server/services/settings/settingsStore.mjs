import crypto from 'node:crypto';
import { query } from '../../mysql.mjs';

/**
 * Runtime config store backed by app_settings table.
 *
 * Design:
 * 1. On server startup, call loadSettingsToEnv() — reads every row and writes the
 *    value into process.env[key]. All existing code that reads process.env.X keeps
 *    working unchanged.
 * 2. On PUT /api/settings/:key, call setSetting() — persists to DB (encrypting if
 *    secret) and updates process.env immediately.
 * 3. For downstream services that must reconnect when their config changes
 *    (IMAP poller, SMTP transport), register a reconnect hook keyed by a prefix.
 *
 * Encryption:
 * - Secrets encrypted with AES-256-GCM using key from SETTINGS_ENCRYPTION_KEY env.
 * - Key format: 64 hex chars (32 bytes). Generate with:
 *     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 * - If no key is set, secrets are stored in plaintext with a loud warning.
 *   This is acceptable in dev; refuse in production.
 */

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getEncKey() {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex) return null;
  if (hex.length !== 64 || !/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('SETTINGS_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const key = getEncKey();
  if (!key) return { value: plaintext, encrypted: false };
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    value: `${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`,
    encrypted: true,
  };
}

function decrypt(stored) {
  const key = getEncKey();
  if (!key) throw new Error('SETTINGS_ENCRYPTION_KEY is not set but an encrypted value was found');
  const [ivB64, tagB64, ctB64] = stored.split(':');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const ct = Buffer.from(ctB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/* ------------------------------------------------------------------ */
/*  Setting catalog — the definitive list of settings we expose.      */
/* ------------------------------------------------------------------ */
export const SETTING_CATALOG = [
  // AI & OCR
  { key: 'GOOGLE_AI_API_KEY', group: 'ai', label: 'Google Gemini API Key', secret: true, required: true, description: 'Required for invoice OCR and all AI features.' },
  { key: 'GEMINI_MODEL', group: 'ai', label: 'Gemini Model', secret: false, default: 'gemini-2.5-pro', description: 'Model to use (e.g. gemini-2.5-pro, gemini-2.5-flash).' },

  // KYC (Ongrid)
  { key: 'ONGRID_API_KEY', group: 'kyc', label: 'Ongrid API Key', secret: true, description: 'Leave blank to use mock mode.' },
  { key: 'ONGRID_BASE_URL', group: 'kyc', label: 'Ongrid Base URL', secret: false, default: 'https://api.gridlines.io', description: 'Production endpoint.' },
  { key: 'ONGRID_SANDBOX_URL', group: 'kyc', label: 'Ongrid Sandbox URL', secret: false, default: 'https://api.gridlines.io', description: 'Dev endpoint (used when NODE_ENV != production).' },
  { key: 'ONGRID_MOCK_MODE', group: 'kyc', label: 'Force Mock Mode', secret: false, type: 'boolean', description: 'If true, use mock responses even when API key is set.' },

  // Email ingestion (IMAP)
  { key: 'AP_EMAIL_HOST', group: 'imap', label: 'IMAP Host', secret: false, default: 'imap.gmail.com', description: 'Leave blank to disable inbox polling.' },
  { key: 'AP_EMAIL_PORT', group: 'imap', label: 'IMAP Port', secret: false, type: 'number', default: '993' },
  { key: 'AP_EMAIL_USER', group: 'imap', label: 'IMAP Username', secret: false, description: 'Email address AP invoices are sent to.' },
  { key: 'AP_EMAIL_PASSWORD', group: 'imap', label: 'IMAP App Password', secret: true, description: 'Use an app password for Gmail — not the account password.' },
  { key: 'AP_EMAIL_INBOX', group: 'imap', label: 'IMAP Folder', secret: false, default: 'INBOX' },
  { key: 'AP_POLL_INTERVAL_MINUTES', group: 'imap', label: 'Poll Interval (minutes)', secret: false, type: 'number', default: '10' },

  // Outbound email (SMTP)
  { key: 'SMTP_HOST', group: 'smtp', label: 'SMTP Host', secret: false, description: 'Leave blank to mock outbound email.' },
  { key: 'SMTP_PORT', group: 'smtp', label: 'SMTP Port', secret: false, type: 'number', default: '587' },
  { key: 'SMTP_SECURE', group: 'smtp', label: 'SMTP Secure (TLS)', secret: false, type: 'boolean' },
  { key: 'SMTP_USER', group: 'smtp', label: 'SMTP Username', secret: false },
  { key: 'SMTP_PASS', group: 'smtp', label: 'SMTP Password', secret: true },
  { key: 'MAIL_FROM', group: 'smtp', label: 'From Address', secret: false, default: 'info@procinix.ai' },

  // Security
  { key: 'API_SECRET_KEY', group: 'security', label: 'API Secret Key', secret: true, description: 'Required for API auth. Leave blank only in dev.' },
  { key: 'CORS_ALLOWED_ORIGINS', group: 'security', label: 'CORS Allowed Origins', secret: false, description: 'Comma-separated list.' },
];

const CATALOG_BY_KEY = Object.fromEntries(SETTING_CATALOG.map(s => [s.key, s]));

export function getCatalog() {
  return SETTING_CATALOG;
}

export function getCatalogEntry(key) {
  return CATALOG_BY_KEY[key];
}

/* ------------------------------------------------------------------ */
/*  DB layer                                                           */
/* ------------------------------------------------------------------ */

async function readAllRows() {
  const rows = await query('SELECT setting_key, setting_value, is_secret, is_encrypted FROM app_settings');
  return rows;
}

async function upsertRow(key, value, { isSecret, isEncrypted, updatedBy }) {
  await query(
    `INSERT INTO app_settings (setting_key, setting_value, is_secret, is_encrypted, description, updated_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       is_secret = VALUES(is_secret),
       is_encrypted = VALUES(is_encrypted),
       updated_by = VALUES(updated_by)`,
    [key, value, isSecret ? 1 : 0, isEncrypted ? 1 : 0, CATALOG_BY_KEY[key]?.description || null, updatedBy || null]
  );
}

/* ------------------------------------------------------------------ */
/*  Bootstrap: load all settings into process.env                      */
/* ------------------------------------------------------------------ */

export async function loadSettingsToEnv() {
  let rows;
  try {
    rows = await readAllRows();
  } catch (err) {
    console.error('[Settings] Failed to read app_settings table:', err.message);
    console.error('[Settings] Make sure the 20260414_app_settings.sql migration has run.');
    return;
  }
  let loaded = 0;
  for (const row of rows) {
    const raw = row.setting_value;
    if (raw === null || raw === undefined) continue;
    let value = raw;
    if (row.is_encrypted) {
      try { value = decrypt(raw); }
      catch (err) { console.warn(`[Settings] Failed to decrypt ${row.setting_key}: ${err.message}`); continue; }
    }
    process.env[row.setting_key] = value;
    loaded++;
  }
  console.log(`[Settings] Loaded ${loaded} setting(s) from app_settings into process.env`);
}

/* ------------------------------------------------------------------ */
/*  Read API                                                           */
/* ------------------------------------------------------------------ */

function maskSecret(raw) {
  if (!raw) return null;
  if (raw.length <= 4) return '••••';
  return `••••••••${raw.slice(-4)}`;
}

/**
 * List all settings with their current effective values (DB overlaid on env).
 * Secrets come back masked as "••••••••XYZ4"; full value is never returned.
 */
export async function listSettings() {
  const rows = await readAllRows();
  const dbMap = Object.fromEntries(rows.map(r => [r.setting_key, r]));

  return SETTING_CATALOG.map(cat => {
    const row = dbMap[cat.key];
    let effective = process.env[cat.key];
    if (row && row.setting_value !== null) {
      effective = row.is_encrypted ? (() => { try { return decrypt(row.setting_value); } catch { return null; } })() : row.setting_value;
    }
    const hasValue = effective !== undefined && effective !== null && effective !== '';
    return {
      key: cat.key,
      label: cat.label,
      group: cat.group,
      secret: !!cat.secret,
      required: !!cat.required,
      type: cat.type || 'string',
      description: cat.description || null,
      default: cat.default || null,
      source: row ? 'database' : (hasValue ? 'environment' : 'unset'),
      hasValue,
      value: cat.secret ? (hasValue ? maskSecret(effective) : null) : (hasValue ? effective : null),
      updatedAt: row?.updated_at || null,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Write API                                                          */
/* ------------------------------------------------------------------ */

const reconnectHooks = [];

/** Register a callback invoked when any key starting with `prefix` is updated. */
export function onSettingsChange(prefix, callback) {
  reconnectHooks.push({ prefix, callback });
}

export async function setSetting(key, rawValue, { updatedBy } = {}) {
  const catalog = CATALOG_BY_KEY[key];
  if (!catalog) throw new Error(`Unknown setting key: ${key}`);

  const value = rawValue == null ? '' : String(rawValue);

  // Encrypt secrets if key is available; otherwise warn and store plaintext.
  let toStore = value;
  let isEncrypted = false;
  if (catalog.secret && value) {
    const enc = encrypt(value);
    toStore = enc.value;
    isEncrypted = enc.encrypted;
    if (!isEncrypted) {
      console.warn(`[Settings] ⚠ Storing secret "${key}" in PLAINTEXT — set SETTINGS_ENCRYPTION_KEY to enable encryption.`);
    }
  }

  await upsertRow(key, toStore, { isSecret: catalog.secret, isEncrypted, updatedBy });

  // Write to process.env so existing code picks it up immediately
  process.env[key] = value;

  // Fire any reconnect hooks whose prefix matches this key
  for (const hook of reconnectHooks) {
    if (key.startsWith(hook.prefix)) {
      try { await hook.callback(key); }
      catch (err) { console.error(`[Settings] Reconnect hook for ${hook.prefix} failed:`, err.message); }
    }
  }
}

export async function deleteSetting(key) {
  const catalog = CATALOG_BY_KEY[key];
  if (!catalog) throw new Error(`Unknown setting key: ${key}`);
  await query('DELETE FROM app_settings WHERE setting_key = ?', [key]);
  delete process.env[key];
  for (const hook of reconnectHooks) {
    if (key.startsWith(hook.prefix)) {
      try { await hook.callback(key); } catch { /* ignore */ }
    }
  }
}
