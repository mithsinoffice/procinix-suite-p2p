import { useMemo } from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import {
  SimpleMasterScreenV2,
  type MasterV2Config,
  type MasterV2Record,
} from './masters/SimpleMasterScreenV2';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * RateContractMaster — V2-driven with an inline items sub-table mirroring the
 * KitBundleMaster pattern. Items live on `record.items[]` (also mirrored to
 * `record.payload.items` for parity with other masters); the server splits
 * them into `rate_contract_items` on save and rejoins on read.
 *
 * Pre-negotiated vendor × item rate agreements — invoices auto-fill the
 * agreed rate / gst_rate / hsn_code from the matched line. See
 * `GET /api/masters/rate_contract/lookup` and InvoiceFormDirectV2 /
 * NonPOInvoiceForm.
 */

const FOG = 'var(--color-border-tertiary)';
const INK = 'var(--color-text-primary)';
const MUTED = 'var(--color-text-secondary)';
const TEAL = '#1D9E75';
const TEAL_DARK = '#0F6E56';

interface ContractItem {
  itemId?: string;
  itemCode?: string;
  itemName?: string;
  agreedRate?: number;
  currency?: string;
  uom?: string;
  gstRate?: number;
  hsnCode?: string;
  lineNumber?: number;
}

function readItems(form: MasterV2Record): ContractItem[] {
  const direct = (form as { items?: ContractItem[] }).items;
  if (Array.isArray(direct)) return direct;
  const payload = (form.payload as { items?: ContractItem[] } | undefined) ?? {};
  return Array.isArray(payload.items) ? payload.items : [];
}

function writeItems(
  setForm: (updater: (prev: MasterV2Record) => MasterV2Record) => void,
  items: ContractItem[]
) {
  setForm((prev) => {
    const payload = { ...((prev.payload as Record<string, unknown>) ?? {}) };
    payload.items = items;
    return { ...prev, items, payload };
  });
}

function ItemsTable({
  form,
  setForm,
  readOnly,
  itemOptions,
}: {
  form: MasterV2Record;
  setForm: (updater: (prev: MasterV2Record) => MasterV2Record) => void;
  readOnly: boolean;
  itemOptions: Array<{
    id: string;
    code: string;
    name: string;
    hsnCode?: string;
    gstRate?: number;
    uom?: string;
  }>;
}) {
  const items = readItems(form);

  const update = (index: number, patch: Partial<ContractItem>) => {
    const next = items.map((item, i) => (i === index ? { ...item, ...patch } : item));
    writeItems(setForm, next);
  };

  const removeRow = (index: number) => {
    writeItems(
      setForm,
      items.filter((_, i) => i !== index)
    );
  };

  const addRow = () => {
    writeItems(setForm, [
      ...items,
      {
        itemCode: '',
        itemName: '',
        agreedRate: 0,
        currency: 'INR',
        uom: 'NOS',
        gstRate: 18,
        hsnCode: '',
        lineNumber: items.length + 1,
      },
    ]);
  };

  const handleItemPicked = (index: number, itemId: string) => {
    const picked = itemOptions.find((it) => it.id === itemId);
    if (!picked) {
      update(index, { itemId: '', itemCode: '', itemName: '' });
      return;
    }
    update(index, {
      itemId: picked.id,
      itemCode: picked.code,
      itemName: picked.name,
      hsnCode: picked.hsnCode ?? '',
      gstRate: picked.gstRate ?? 18,
      uom: picked.uom ?? 'NOS',
    });
  };

  return (
    <div>
      <div
        style={{
          border: `0.5px solid ${FOG}`,
          borderRadius: 8,
          background: '#FFFFFF',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#F4FBF8', borderBottom: `0.5px solid ${FOG}` }}>
              <th style={th()}>Item</th>
              <th style={th()}>Item Code</th>
              <th style={{ ...th(), textAlign: 'right' }}>Agreed Rate</th>
              <th style={th()}>Currency</th>
              <th style={th()}>UOM</th>
              <th style={{ ...th(), textAlign: 'right' }}>GST %</th>
              <th style={th()}>HSN</th>
              <th style={{ ...th(), width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ padding: 16, textAlign: 'center', color: MUTED, fontSize: 12 }}
                >
                  No items added yet. Click <strong>Add item</strong> below to start.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} style={{ borderBottom: `0.5px solid ${FOG}` }}>
                  <td style={td()}>
                    <select
                      value={item.itemId ?? ''}
                      onChange={(e) => handleItemPicked(index, e.target.value)}
                      disabled={readOnly}
                      style={cellInput()}
                    >
                      <option value="">— Pick item —</option>
                      {itemOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.code})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td style={td()}>
                    <input
                      type="text"
                      value={item.itemCode ?? ''}
                      onChange={(e) => update(index, { itemCode: e.target.value })}
                      readOnly={readOnly}
                      placeholder="ITM-001"
                      style={cellInput()}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={item.agreedRate ?? 0}
                      onChange={(e) => update(index, { agreedRate: Number(e.target.value) || 0 })}
                      readOnly={readOnly}
                      style={{ ...cellInput(), textAlign: 'right' }}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="text"
                      value={item.currency ?? 'INR'}
                      onChange={(e) =>
                        update(index, { currency: e.target.value.toUpperCase().slice(0, 3) })
                      }
                      readOnly={readOnly}
                      style={cellInput()}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="text"
                      value={item.uom ?? ''}
                      onChange={(e) => update(index, { uom: e.target.value })}
                      readOnly={readOnly}
                      placeholder="NOS"
                      style={cellInput()}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.gstRate ?? 0}
                      onChange={(e) => update(index, { gstRate: Number(e.target.value) || 0 })}
                      readOnly={readOnly}
                      style={{ ...cellInput(), textAlign: 'right' }}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="text"
                      value={item.hsnCode ?? ''}
                      onChange={(e) => update(index, { hsnCode: e.target.value })}
                      readOnly={readOnly}
                      placeholder="HSN"
                      style={cellInput()}
                    />
                  </td>
                  <td style={{ ...td(), textAlign: 'right' }}>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        title="Remove item"
                        aria-label="Remove item"
                        style={{
                          height: 26,
                          width: 26,
                          border: `0.5px solid ${FOG}`,
                          background: '#FFFFFF',
                          borderRadius: 6,
                          cursor: 'pointer',
                          color: '#A32D2D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          style={{
            marginTop: 8,
            height: 30,
            padding: '0 12px',
            border: `0.5px solid ${TEAL}`,
            background: '#FFFFFF',
            color: TEAL_DARK,
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Plus size={13} /> Add item
        </button>
      )}
    </div>
  );
}

function th(): React.CSSProperties {
  return {
    padding: '8px 10px',
    fontSize: 11,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: MUTED,
    textAlign: 'left',
    whiteSpace: 'nowrap',
  };
}

function td(): React.CSSProperties {
  return { padding: '6px 8px', fontSize: 12, color: INK, verticalAlign: 'middle' };
}

function cellInput(): React.CSSProperties {
  return {
    width: '100%',
    height: 28,
    padding: '0 8px',
    border: `0.5px solid ${FOG}`,
    borderRadius: 6,
    fontSize: 12,
    background: '#FFFFFF',
    color: INK,
  };
}

export function RateContractMaster() {
  const { liveVendors, entities, items: itemMaster } = useMasterData();

  const vendorOptions = useMemo(
    () =>
      liveVendors.map((v) => ({
        value: v.id,
        label: `${v.name} (${v.code})`,
      })),
    [liveVendors]
  );

  const entityOptions = useMemo(
    () =>
      entities.map((e) => ({
        value: e.id,
        label: e.name,
      })),
    [entities]
  );

  const itemOptions = useMemo(
    () =>
      itemMaster
        .filter((it) => it.status === 'Active')
        .map((it) => ({
          id: it.id,
          code: it.code,
          name: it.name,
          hsnCode: it.hsnCode ?? '',
          gstRate: typeof it.gstRate === 'number' ? it.gstRate : Number(it.gstRate ?? 18) || 18,
          uom: it.uom ?? 'NOS',
        })),
    [itemMaster]
  );

  const config: MasterV2Config = {
    title: 'Rate Contract Master',
    subtitle:
      'Pre-negotiated vendor × item rate agreements. Invoices auto-enforce the agreed rate when a match exists.',
    icon: FileText,
    masterKey: 'rate_contract_master',
    codeKey: 'contractCode',
    nameKey: 'contractName',
    columns: [
      { key: 'vendorName', label: 'Vendor' },
      { key: 'startDate', label: 'Start' },
      { key: 'endDate', label: 'End' },
      {
        key: 'items',
        label: '# Items',
        format: (v) => (Array.isArray(v) ? String(v.length) : '0'),
      },
      { key: 'status', label: 'Status' },
    ],
    formSections: [
      {
        id: 'identity',
        title: 'Contract Identity',
        subtitle: 'Code is auto-generated. Status defaults to active.',
        stripe: 'teal',
        fields: [
          {
            key: 'contractCode',
            label: 'Contract Code',
            autoGenerated: true,
          },
          {
            key: 'contractName',
            label: 'Contract Name',
            required: true,
            placeholder: 'e.g. TCS Laptop & Accessories FY26',
          },
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: ['active', 'inactive', 'expired'],
          },
        ],
      },
      {
        id: 'vendor',
        title: 'Vendor & Validity',
        subtitle: 'Bind the contract to one vendor for one entity, valid between the two dates.',
        stripe: 'blue',
        fields: [
          {
            key: 'vendorId',
            label: 'Vendor',
            type: 'select',
            required: true,
            dynamicOptions: vendorOptions,
            labelKey: 'vendorName',
          },
          {
            key: 'entityId',
            label: 'Entity',
            type: 'select',
            dynamicOptions: entityOptions,
            labelKey: 'entityCode',
          },
          {
            key: 'startDate',
            label: 'Start Date',
            type: 'date',
            required: true,
          },
          {
            key: 'endDate',
            label: 'End Date',
            type: 'date',
            required: true,
            validate: (value, form) => {
              if (!value || !form.startDate) return null;
              if (String(value) < String(form.startDate)) {
                return 'End date must be on or after start date';
              }
              return null;
            },
          },
          {
            key: 'notes',
            label: 'Notes',
            type: 'textarea',
          },
        ],
      },
      {
        id: 'items',
        title: 'Contract Items',
        subtitle: 'Each line carries the agreed rate, GST %, and HSN that flow to invoices.',
        stripe: 'amber',
        fields: [],
        customRender: ({ form, setForm, readOnly }) => (
          <ItemsTable form={form} setForm={setForm} readOnly={readOnly} itemOptions={itemOptions} />
        ),
      },
    ],
  };

  return <SimpleMasterScreenV2 config={config} />;
}
