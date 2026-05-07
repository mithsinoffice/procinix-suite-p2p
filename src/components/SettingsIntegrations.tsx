import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  Mail,
  Send,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { FormShell, FormSection, PxFormField } from './ui/form-primitives';
import { mysqlApiBaseUrl } from '../lib/mysql/client';

const API = mysqlApiBaseUrl;

interface SettingRow {
  key: string;
  label: string;
  group: 'ai' | 'kyc' | 'imap' | 'smtp' | 'security';
  secret: boolean;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
  description: string | null;
  default: string | null;
  source: 'database' | 'environment' | 'unset';
  hasValue: boolean;
  value: string | null;
  updatedAt: string | null;
}

const GROUPS: { key: SettingRow['group']; title: string; subtitle: string; icon: ReactNode }[] = [
  {
    key: 'ai',
    title: 'AI & OCR',
    subtitle: 'Google Gemini is the only supported provider.',
    icon: <Sparkles style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />,
  },
  {
    key: 'kyc',
    title: 'KYC (Ongrid Gridlines)',
    subtitle: 'PAN, GSTIN, penny-drop, Udyam verification.',
    icon: <ShieldCheck style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />,
  },
  {
    key: 'imap',
    title: 'Email Ingestion (IMAP)',
    subtitle: 'Inbound invoice mailbox polled by the poller.',
    icon: <Mail style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />,
  },
  {
    key: 'smtp',
    title: 'Outbound Email (SMTP)',
    subtitle: 'Used for vendor invitations and transactional email.',
    icon: <Send style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />,
  },
  {
    key: 'security',
    title: 'Security & CORS',
    subtitle: 'API secret key and allowed origins.',
    icon: <Lock style={{ width: 20, height: 20, color: 'var(--color-teal)' }} />,
  },
];

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  fontSize: 13,
  border: '1.5px solid var(--color-silver)',
  borderRadius: 8,
  outline: 'none',
  color: 'var(--color-ink)',
  backgroundColor: '#fff',
};

export function SettingsIntegrations() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<SettingRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingGroup, setSavingGroup] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState<{ group: string; message: string } | null>(null);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/settings`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load settings');
      setRows(json.data);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const byGroup = useMemo(() => {
    const g: Record<string, SettingRow[]> = {};
    for (const r of rows) {
      (g[r.group] ||= []).push(r);
    }
    return g;
  }, [rows]);

  const getDisplayValue = (row: SettingRow) => {
    if (row.key in drafts) return drafts[row.key];
    if (row.secret && !revealed[row.key]) return row.value ?? '';
    return row.value ?? '';
  };

  const setDraft = (key: string, value: string) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const saveGroup = async (group: string) => {
    setSavingGroup(group);
    setError('');
    const toSave = (byGroup[group] || []).filter((r) => r.key in drafts);
    try {
      for (const r of toSave) {
        const res = await fetch(`${API}/api/settings/${encodeURIComponent(r.key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: drafts[r.key] }),
        });
        const json = await res.json();
        if (!json.success)
          throw new Error(`Failed to save ${r.key}: ${json.error || 'unknown error'}`);
      }
      setDrafts((prev) => {
        const next = { ...prev };
        for (const r of toSave) delete next[r.key];
        return next;
      });
      setFlash({ group, message: `Saved ${toSave.length} setting(s)` });
      setTimeout(() => setFlash(null), 3000);
      await loadAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingGroup(null);
    }
  };

  const renderField = (row: SettingRow) => {
    const isDirty = row.key in drafts;
    const displayValue = getDisplayValue(row);

    if (row.type === 'boolean') {
      const current = (drafts[row.key] ?? row.value ?? 'false').toString().toLowerCase();
      return (
        <select
          value={current === 'true' ? 'true' : 'false'}
          onChange={(e) => setDraft(row.key, e.target.value)}
          style={{ ...inputStyle, appearance: 'auto' }}
        >
          <option value="false">No / false</option>
          <option value="true">Yes / true</option>
        </select>
      );
    }

    if (row.secret) {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type={revealed[row.key] || isDirty ? 'text' : 'password'}
              value={
                isDirty ? drafts[row.key] : revealed[row.key] ? row.value || '' : row.value || ''
              }
              placeholder={
                row.hasValue ? '(stored — start typing to replace)' : row.default || 'Enter value'
              }
              onChange={(e) => setDraft(row.key, e.target.value)}
              style={inputStyle}
            />
          </div>
          <button
            type="button"
            onClick={() => setRevealed((prev) => ({ ...prev, [row.key]: !prev[row.key] }))}
            style={{
              padding: '7px 10px',
              borderRadius: 6,
              border: '1px solid var(--color-silver)',
              background: '#fff',
              cursor: 'pointer',
              color: 'var(--color-mercury-grey)',
            }}
            title={revealed[row.key] ? 'Hide' : 'Reveal'}
          >
            {revealed[row.key] ? (
              <EyeOff style={{ width: 14, height: 14 }} />
            ) : (
              <Eye style={{ width: 14, height: 14 }} />
            )}
          </button>
        </div>
      );
    }

    return (
      <input
        type={row.type === 'number' ? 'number' : 'text'}
        value={displayValue}
        placeholder={row.default || 'Enter value'}
        onChange={(e) => setDraft(row.key, e.target.value)}
        style={inputStyle}
      />
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-mercury-grey)' }}>
        Loading settings…
      </div>
    );
  }

  return (
    <FormShell
      title="Integrations & API Keys"
      subtitle="Configure runtime settings without editing .env files"
      masterName="Settings"
      onBack={() => navigate('/')}
    >
      {error && (
        <div
          style={{
            padding: '12px 16px',
            marginBottom: 16,
            borderRadius: 8,
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <div
        className="bg-white rounded-xl border-2 px-8"
        style={{ borderColor: 'var(--color-silver)' }}
      >
        {GROUPS.map((g, gIdx) => {
          const groupRows = byGroup[g.key] || [];
          const hasDrafts = groupRows.some((r) => r.key in drafts);
          const isSaving = savingGroup === g.key;
          const justFlashed = flash?.group === g.key;
          return (
            <FormSection
              key={g.key}
              title={g.title}
              subtitle={g.subtitle}
              columns={2}
              icon={g.icon}
              flat
              style={gIdx === 0 ? { borderTop: 'none', paddingTop: 24 } : undefined}
              action={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {justFlashed && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 12,
                        color: '#007D60',
                      }}
                    >
                      <CheckCircle2 style={{ width: 14, height: 14 }} /> {flash?.message}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => saveGroup(g.key)}
                    disabled={!hasDrafts || isSaving}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '7px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      border: 'none',
                      cursor: !hasDrafts || isSaving ? 'not-allowed' : 'pointer',
                      backgroundColor: hasDrafts ? '#007D87' : '#F6F9FC',
                      color: hasDrafts ? '#fff' : '#9CA3AF',
                    }}
                  >
                    <Save style={{ width: 14, height: 14 }} />
                    {isSaving ? 'Saving…' : 'Save section'}
                  </button>
                </div>
              }
            >
              {groupRows.map((row) => (
                <PxFormField
                  key={row.key}
                  label={row.label}
                  required={row.required}
                  hint={row.description || undefined}
                  colSpan={row.type === 'boolean' ? 1 : undefined}
                >
                  {renderField(row)}
                  <div
                    style={{
                      display: 'flex',
                      gap: 8,
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--color-mercury-grey)',
                    }}
                  >
                    <span>
                      Source:{' '}
                      <strong
                        style={{
                          color:
                            row.source === 'database'
                              ? '#007D60'
                              : row.source === 'environment'
                                ? '#92400E'
                                : '#DC2626',
                        }}
                      >
                        {row.source}
                      </strong>
                    </span>
                    {row.updatedAt && (
                      <span>· Updated {new Date(row.updatedAt).toLocaleString()}</span>
                    )}
                  </div>
                </PxFormField>
              ))}
            </FormSection>
          );
        })}
      </div>
    </FormShell>
  );
}

export default SettingsIntegrations;
