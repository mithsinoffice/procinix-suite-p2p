/**
 * Startup environment validation.
 * Call checkAndExitIfInvalid() once, after loadSettingsToEnv(), before any service starts.
 * In production: exits 1 on missing required vars.
 * In development: logs a prominent warning block and continues.
 */

// OCR: at least one of these must be set
const OCR_VARS = ['GOOGLE_AI_API_KEY', 'N8N_WEBHOOK_URL'];

// Vars that must be present for the agent pipeline to function
const AGENT_VARS = ['ANTHROPIC_API_KEY'];

// SMTP is only validated when IMAP polling is fully configured
const IMAP_REQUIRED = ['AP_EMAIL_HOST', 'AP_EMAIL_USER', 'AP_EMAIL_PASSWORD'];

/**
 * Pure validation — no side effects. Returns { errors, warnings }.
 * Pass a custom env object for testing; defaults to process.env.
 */
export function validateEnv(env = process.env) {
  const errors = [];
  const warnings = [];

  // OCR provider: Gemini key OR n8n webhook (either suffices)
  if (!OCR_VARS.some(k => env[k]?.trim())) {
    errors.push(
      `Missing OCR provider: set GOOGLE_AI_API_KEY (Gemini) or N8N_WEBHOOK_URL (n8n webhook)`
    );
  }

  // Anthropic key for agent reasoning
  if (!env.ANTHROPIC_API_KEY?.trim()) {
    errors.push(
      `Missing ANTHROPIC_API_KEY — the Claude agent pipeline (vendor match, tax, routing) will fail`
    );
  }

  // SMTP warning: only relevant when IMAP polling is enabled
  const imapEnabled = IMAP_REQUIRED.every(k => env[k]?.trim());
  if (imapEnabled && !env.SMTP_HOST?.trim()) {
    warnings.push(
      `SMTP_HOST not set — email notifications (vendor invitations, agent alerts) will be silently skipped`
    );
  }

  return { errors, warnings };
}

/**
 * Validate env and act on results:
 * - prod: exit(1) on any error after logging all issues
 * - dev:  warn prominently but continue
 */
export function checkAndExitIfInvalid(env = process.env) {
  const { errors, warnings } = validateEnv(env);
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';

  if (warnings.length > 0) {
    console.warn('[Startup] Environment warnings:');
    for (const w of warnings) console.warn(`  ⚠  ${w}`);
  }

  if (errors.length === 0) return;

  if (isProd) {
    console.error('[Startup] ✗ Missing required environment variables — refusing to boot:');
    for (const e of errors) console.error(`  ✗  ${e}`);
    console.error('[Startup] Fix the variables above and restart.');
    process.exit(1);
  } else {
    console.warn('[Startup] ══════════════════════════════════════════════════════');
    console.warn('[Startup]  DEVELOPMENT — required env vars are MISSING:');
    for (const e of errors) console.warn(`  ✗  ${e}`);
    console.warn('[Startup]  Some features will fail silently. Set vars before testing ingestion.');
    console.warn('[Startup] ══════════════════════════════════════════════════════');
  }
}
