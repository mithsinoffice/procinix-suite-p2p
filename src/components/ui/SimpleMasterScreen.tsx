import { useCallback, useMemo, useState } from 'react';
import { Edit, Plus, Trash2, X } from 'lucide-react';
import { useIncrementalMasterRecords } from '../../hooks/useIncrementalMasterRecords';
import type { MasterKey } from '../../lib/mysql/masterTables';
import { MasterListToolbar, type ExportColumn } from './MasterListToolbar';
import { MasterPageShell } from './MasterPageShell';
import {
  listingTable,
  listingThead,
  listingTh,
  listingTd,
  listingTdPrimary,
  badgeBase,
  badgeApproved,
  badgePending,
  badgeRejected,
  badgeDraft,
  badgeViaUpload,
  tableWrapper,
  rowHover,
  listingPrimaryBtn,
} from './listingStyles';

export interface SimpleMasterField {
  /** Path in the record (e.g. "level" or "payload.approvalLimit"). */
  key: string;
  label: string;
  type?: 'text' | 'number';
  /** Optional renderer for the list-row cell. Receives the resolved value. */
  format?: (value: unknown) => string;
  /** Read from payload JSON field instead of top-level row. */
  fromPayload?: boolean;
}

export interface SimpleMasterRecord {
  id?: string;
  code?: string;
  recordCode?: string;
  name?: string;
  recordName?: string;
  status?: string;
  approvalStatus?: string;
  isActive?: boolean;
  payload?: Record<string, unknown>;
  [k: string]: unknown;
}

interface SimpleMasterScreenProps {
  masterKey: MasterKey;
  masterName: string;
  description?: string;
  /** Extra columns shown in the list table after Code / Name. */
  extraFields?: SimpleMasterField[];
  /** Default seed records used when the API returns nothing. */
  defaultSeed?: SimpleMasterRecord[];
}

/**
 * Lightweight CRUD screen for masters that don't need the full approval-
 * workflow / entity-mapping machinery of the heavyweight `*Master.tsx`
 * components. Lists records, supports add / edit / delete / status toggle,
 * shows the approval-status badge, and projects configurable extra columns
 * (top-level row fields or payload-JSON fields).
 *
 * Persistence flows through `useIncrementalMasterRecords`, which writes via
 * `saveRelationalMasterRecords` to `PUT /api/masters/<masterKey>`.
 */
export function SimpleMasterScreen({
  masterKey,
  masterName,
  description,
  extraFields = [],
  defaultSeed = [],
}: SimpleMasterScreenProps) {
  const [records, setRecords] = useIncrementalMasterRecords<SimpleMasterRecord>(
    masterKey,
    defaultSeed
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [editing, setEditing] = useState<SimpleMasterRecord | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const resolveValue = useCallback(
    (record: SimpleMasterRecord, field: SimpleMasterField): unknown => {
      if (field.fromPayload) {
        const payload = (record.payload ?? record) as Record<string, unknown>;
        return payload[field.key];
      }
      return record[field.key];
    },
    []
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return records.filter((r) => {
      const code = String(r.recordCode ?? r.code ?? '').toLowerCase();
      const name = String(r.recordName ?? r.name ?? '').toLowerCase();
      if (q && !code.includes(q) && !name.includes(q)) return false;
      const stat = String(r.status ?? '').toLowerCase();
      if (statusFilter.length > 0 && !statusFilter.includes(stat)) return false;
      return true;
    });
  }, [records, searchTerm, statusFilter]);

  const handleSave = (next: SimpleMasterRecord) => {
    const id = String(next.id ?? next.recordCode ?? next.code ?? `R-${Date.now()}`);
    const target: SimpleMasterRecord = { ...next, id };
    setRecords((current) => {
      const existing = current.findIndex((r) => r.id === id);
      if (existing >= 0) {
        return current.map((r, i) => (i === existing ? target : r));
      }
      return [...current, target];
    });
    setDrawerOpen(false);
    setEditing(null);
  };

  const handleDelete = (record: SimpleMasterRecord) => {
    if (!record.id) return;
    if (!window.confirm(`Delete "${record.recordName ?? record.name ?? record.id}"?`)) return;
    setRecords((current) => current.filter((r) => r.id !== record.id));
  };

  const exportCols: ExportColumn[] = useMemo(() => {
    const cols: ExportColumn[] = [
      { key: 'recordCode', label: 'Code' },
      { key: 'recordName', label: 'Name' },
      { key: 'status', label: 'Status' },
      { key: 'approvalStatus', label: 'Approval' },
    ];
    extraFields.forEach((f) => cols.push({ key: f.key, label: f.label }));
    return cols;
  }, [extraFields]);

  return (
    <MasterPageShell masterName={masterName} description={description}>
      <MasterListToolbar
        masterName={masterName}
        masterKey={masterKey as string}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: ['Active', 'Inactive'],
            selected: statusFilter,
          },
        ]}
        onFilterChange={(_, values) => setStatusFilter(values)}
        records={filtered}
        columns={exportCols}
        totalCount={records.length}
        filteredCount={filtered.length}
      />

      <div style={{ background: '#FFFFFF' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 20px',
            borderBottom: '1px solid var(--color-fog)',
            background: 'var(--color-background-secondary)',
          }}
        >
          <span style={{ fontSize: 11, color: 'var(--color-mercury-grey)' }}>
            {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => {
              setEditing({ status: 'Active', approvalStatus: 'Approved', payload: {} });
              setDrawerOpen(true);
            }}
            style={listingPrimaryBtn}
          >
            <Plus size={14} /> Add Record
          </button>
        </div>

        <div style={tableWrapper}>
          <table style={listingTable}>
            <thead style={listingThead}>
              <tr>
                <th style={listingTh}>Code</th>
                <th style={listingTh}>Name</th>
                {extraFields.map((f) => (
                  <th key={f.key} style={listingTh}>
                    {f.label}
                  </th>
                ))}
                <th style={listingTh}>Status</th>
                <th style={listingTh}>Approval</th>
                <th style={{ ...listingTh, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5 + extraFields.length}
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--color-mercury-grey)',
                      fontSize: 12,
                    }}
                  >
                    No records yet. Click <strong>Add Record</strong> to create one.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id ?? r.recordCode} className={rowHover}>
                  <td style={listingTd}>{String(r.recordCode ?? r.code ?? '')}</td>
                  <td style={listingTdPrimary}>{String(r.recordName ?? r.name ?? '')}</td>
                  {extraFields.map((f) => {
                    const v = resolveValue(r, f);
                    return (
                      <td key={f.key} style={listingTd}>
                        {f.format ? f.format(v) : v == null ? '—' : String(v)}
                      </td>
                    );
                  })}
                  <td style={listingTd}>
                    <StatusBadge status={String(r.status ?? '')} />
                  </td>
                  <td style={listingTd}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <ApprovalBadge approval={String(r.approvalStatus ?? '')} />
                      {(r.upload_source === 'bulk_upload' || r.uploadSource === 'bulk_upload') && (
                        <span title="Imported via bulk upload" style={badgeViaUpload}>
                          Via Upload
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ ...listingTd, textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r);
                        setDrawerOpen(true);
                      }}
                      title="Edit"
                      style={iconBtn}
                    >
                      <Edit size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      title="Delete"
                      style={{ ...iconBtn, color: '#D14343' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {drawerOpen && editing && (
        <SimpleMasterDrawer
          record={editing}
          masterName={masterName}
          extraFields={extraFields}
          onClose={() => {
            setDrawerOpen(false);
            setEditing(null);
          }}
          onSave={handleSave}
        />
      )}
    </MasterPageShell>
  );
}

const iconBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  marginLeft: 2,
  borderRadius: 4,
};

function StatusBadge({ status }: { status: string }) {
  const isActive = status.toLowerCase() === 'active';
  return <span style={isActive ? badgeApproved : badgeDraft}>{status || '—'}</span>;
}

function ApprovalBadge({ approval }: { approval: string }) {
  const a = approval.toLowerCase();
  let style: React.CSSProperties = badgeDraft;
  if (a === 'approved') style = badgeApproved;
  else if (a.includes('pending')) style = badgePending;
  else if (a === 'rejected') style = badgeRejected;
  return <span style={style}>{approval || '—'}</span>;
}

interface DrawerProps {
  record: SimpleMasterRecord;
  masterName: string;
  extraFields: SimpleMasterField[];
  onClose: () => void;
  onSave: (next: SimpleMasterRecord) => void;
}

function SimpleMasterDrawer({ record, masterName, extraFields, onClose, onSave }: DrawerProps) {
  const [form, setForm] = useState<SimpleMasterRecord>(record);
  const isEdit = Boolean(record.id);

  const updateTop = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const updateField = (field: SimpleMasterField, value: string) => {
    if (field.fromPayload) {
      const cast: unknown = field.type === 'number' ? Number(value) : value;
      setForm((prev) => ({
        ...prev,
        payload: { ...((prev.payload as Record<string, unknown>) ?? {}), [field.key]: cast },
      }));
    } else {
      const cast: unknown = field.type === 'number' ? Number(value) : value;
      setForm((prev) => ({ ...prev, [field.key]: cast }));
    }
  };

  const readField = (field: SimpleMasterField): string => {
    const v = field.fromPayload
      ? ((form.payload as Record<string, unknown>) ?? {})[field.key]
      : form[field.key];
    return v == null ? '' : String(v);
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 999 }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 480,
          maxWidth: '95vw',
          background: '#fff',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-12px 0 40px rgba(15,23,42,0.18)',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-fog)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 16, color: 'var(--color-ink)' }}>
            {isEdit ? 'Edit' : 'Add'} {masterName}
          </h3>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'grid', gap: 14 }}>
          <Field label="Code" required>
            <input
              type="text"
              value={String(form.recordCode ?? form.code ?? '')}
              onChange={(e) => {
                updateTop('recordCode', e.target.value);
                updateTop('code', e.target.value);
              }}
              placeholder="e.g. AC-009"
              style={inputStyle}
              disabled={isEdit}
            />
          </Field>
          <Field label="Name" required>
            <input
              type="text"
              value={String(form.recordName ?? form.name ?? '')}
              onChange={(e) => {
                updateTop('recordName', e.target.value);
                updateTop('name', e.target.value);
              }}
              style={inputStyle}
            />
          </Field>
          {extraFields.map((f) => (
            <Field key={f.key} label={f.label}>
              <input
                type={f.type === 'number' ? 'number' : 'text'}
                value={readField(f)}
                onChange={(e) => updateField(f, e.target.value)}
                style={inputStyle}
              />
            </Field>
          ))}
          <Field label="Status">
            <select
              value={String(form.status ?? 'Active')}
              onChange={(e) => updateTop('status', e.target.value)}
              style={inputStyle}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </Field>
          <Field label="Approval Status">
            <select
              value={String(form.approvalStatus ?? 'Approved')}
              onChange={(e) => updateTop('approvalStatus', e.target.value)}
              style={inputStyle}
            >
              <option value="Approved">Approved</option>
              <option value="Pending Approval">Pending Approval</option>
              <option value="Rejected">Rejected</option>
            </select>
          </Field>
        </div>

        <div
          style={{
            padding: 16,
            borderTop: '1px solid var(--color-fog)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#fff',
              border: '1px solid var(--color-silver)',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={!(form.recordCode ?? form.code) || !(form.recordName ?? form.name)}
            style={{
              padding: '8px 16px',
              background: 'var(--color-teal)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            {isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'block', fontSize: 12, color: 'var(--color-mercury-grey)' }}>
      <span style={{ display: 'block', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#D14343' }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-silver)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-ink)',
  background: '#fff',
};
