import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateEnv, checkAndExitIfInvalid } from '../validateEnv.mjs';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ALL_PRESENT = {
  NODE_ENV: 'production',
  GOOGLE_AI_API_KEY: 'gemini-key-abc',
  ANTHROPIC_API_KEY: 'sk-ant-abc',
  API_SECRET_KEY: 'test-secret-key',
};

const WITH_IMAP = {
  ...ALL_PRESENT,
  AP_EMAIL_HOST: 'imap.gmail.com',
  AP_EMAIL_USER: 'ap@company.com',
  AP_EMAIL_PASSWORD: 's3cret',
  SMTP_HOST: 'smtp.company.com',
};

// ── validateEnv (pure, no side effects) ──────────────────────────────────────

describe('validateEnv', () => {
  it('returns no errors when all required vars are present', () => {
    const { errors, warnings } = validateEnv(ALL_PRESENT);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('accepts N8N_WEBHOOK_URL as alternative OCR provider to GOOGLE_AI_API_KEY', () => {
    const env = { ANTHROPIC_API_KEY: 'key', N8N_WEBHOOK_URL: 'https://n8n.example.com/webhook/abc' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('OCR'))).toBe(false);
  });

  it('errors when both GOOGLE_AI_API_KEY and N8N_WEBHOOK_URL are absent', () => {
    const env = { ANTHROPIC_API_KEY: 'key' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('OCR provider'))).toBe(true);
  });

  it('errors when GOOGLE_AI_API_KEY is empty string', () => {
    const env = { GOOGLE_AI_API_KEY: '   ', ANTHROPIC_API_KEY: 'key' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('OCR provider'))).toBe(true);
  });

  it('errors when ANTHROPIC_API_KEY is missing', () => {
    const env = { GOOGLE_AI_API_KEY: 'key' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('ANTHROPIC_API_KEY'))).toBe(true);
  });

  it('errors when ANTHROPIC_API_KEY is whitespace-only', () => {
    const env = { GOOGLE_AI_API_KEY: 'key', ANTHROPIC_API_KEY: '  ' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('ANTHROPIC_API_KEY'))).toBe(true);
  });

  it('accumulates multiple errors independently', () => {
    const { errors } = validateEnv({});
    expect(errors.length).toBeGreaterThanOrEqual(2);
  });

  it('adds SMTP warning when IMAP is fully configured but SMTP_HOST is absent', () => {
    const env = {
      ...ALL_PRESENT,
      AP_EMAIL_HOST: 'imap.gmail.com',
      AP_EMAIL_USER: 'ap@company.com',
      AP_EMAIL_PASSWORD: 'secret',
      // SMTP_HOST intentionally absent
    };
    const { warnings } = validateEnv(env);
    expect(warnings.some(w => w.includes('SMTP_HOST'))).toBe(true);
  });

  it('does NOT warn about SMTP when IMAP is not configured', () => {
    // No AP_EMAIL_* vars — IMAP polling disabled, SMTP irrelevant
    const { warnings } = validateEnv(ALL_PRESENT);
    expect(warnings).toHaveLength(0);
  });

  it('does NOT warn about SMTP when IMAP is only partially configured', () => {
    // Only one IMAP var present — not fully enabled
    const env = { ...ALL_PRESENT, AP_EMAIL_HOST: 'imap.gmail.com' };
    const { warnings } = validateEnv(env);
    expect(warnings).toHaveLength(0);
  });

  it('no warnings or errors when IMAP + SMTP are both fully set', () => {
    const { errors, warnings } = validateEnv(WITH_IMAP);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it('errors when NODE_ENV=production and API_SECRET_KEY is absent', () => {
    const { API_SECRET_KEY: _omit, ...withoutKey } = ALL_PRESENT;
    const env = { ...withoutKey, NODE_ENV: 'production' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('API_SECRET_KEY'))).toBe(true);
  });

  it('errors when NODE_ENV=production and API_SECRET_KEY is whitespace-only', () => {
    const env = { ...ALL_PRESENT, NODE_ENV: 'production', API_SECRET_KEY: '   ' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('API_SECRET_KEY'))).toBe(true);
  });

  it('does NOT error when NODE_ENV=production and API_SECRET_KEY is set', () => {
    const env = { ...ALL_PRESENT, NODE_ENV: 'production', API_SECRET_KEY: 'secret-key-abc' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('API_SECRET_KEY'))).toBe(false);
  });

  it('does NOT error when NODE_ENV=development and API_SECRET_KEY is absent', () => {
    const { API_SECRET_KEY: _omit, ...withoutKey } = ALL_PRESENT;
    const env = { ...withoutKey, NODE_ENV: 'development' };
    const { errors } = validateEnv(env);
    expect(errors.some(e => e.includes('API_SECRET_KEY'))).toBe(false);
  });
});

// ── checkAndExitIfInvalid ─────────────────────────────────────────────────────

describe('checkAndExitIfInvalid', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does nothing when all vars are present', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    checkAndExitIfInvalid(ALL_PRESENT);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('exits with code 1 in production when required vars are missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit(${code})`);
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      checkAndExitIfInvalid({ NODE_ENV: 'production', GOOGLE_AI_API_KEY: 'key' /* missing ANTHROPIC */ })
    ).toThrow('process.exit(1)');

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('does NOT exit in development when required vars are missing', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    checkAndExitIfInvalid({ NODE_ENV: 'development' });

    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('logs warnings to console.warn in development', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => {});

    checkAndExitIfInvalid({ NODE_ENV: 'development' });

    expect(warnSpy).toHaveBeenCalled();
  });

  it('logs errors to console.error in production before exiting', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit'); });

    try { checkAndExitIfInvalid({ NODE_ENV: 'production' }); } catch {}

    expect(errorSpy).toHaveBeenCalled();
  });

  it('defaults to development behaviour when NODE_ENV is unset', () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // No NODE_ENV — should not exit
    checkAndExitIfInvalid({});
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
