import { useMemo } from 'react';
import { Package, Plus, Trash2 } from 'lucide-react';
import {
  SimpleMasterScreenV2,
  type MasterV2Config,
  type MasterV2Record,
} from './masters/SimpleMasterScreenV2';
import { useMasterData } from '../contexts/MasterDataContext';

/**
 * KitBundleMaster — V2-driven, with a custom-render section for the items
 * sub-table (Add row / delete row / per-row inputs). The items array lives
 * inside record.payload.items[]; the server splits it into the
 * kit_bundle_items child table on save and recombines on read.
 */

const FOG = 'var(--color-border-tertiary)';
const INK = 'var(--color-text-primary)';
const MUTED = 'var(--color-text-secondary)';
const TEAL = '#1D9E75';
const TEAL_DARK = '#0F6E56';

interface BundleItem {
  itemCode?: string;
  itemName?: string;
  description?: string;
  qty?: number;
  uom?: string;
  unitPrice?: number;
  gstRate?: number;
  hsnCode?: string;
  mandatory?: boolean;
}

function readItems(form: MasterV2Record): BundleItem[] {
  const payload = (form.payload as { items?: BundleItem[] } | undefined) ?? {};
  return Array.isArray(payload.items) ? payload.items : [];
}

function writeItems(
  setForm: (updater: (prev: MasterV2Record) => MasterV2Record) => void,
  items: BundleItem[]
) {
  setForm((prev) => {
    const payload = { ...((prev.payload as Record<string, unknown>) ?? {}) };
    payload.items = items;
    return { ...prev, payload };
  });
}

function ItemsTable({
  form,
  setForm,
  readOnly,
}: {
  form: MasterV2Record;
  setForm: (updater: (prev: MasterV2Record) => MasterV2Record) => void;
  readOnly: boolean;
}) {
  const items = readItems(form);

  const update = (index: number, patch: Partial<BundleItem>) => {
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
        itemName: '',
        qty: 1,
        uom: 'NOS',
        unitPrice: 0,
        gstRate: 18,
        mandatory: true,
      },
    ]);
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
              <th style={th()}>Item Code</th>
              <th style={th()}>Item Name</th>
              <th style={{ ...th(), textAlign: 'right' }}>Qty</th>
              <th style={th()}>UOM</th>
              <th style={{ ...th(), textAlign: 'right' }}>Unit Price</th>
              <th style={{ ...th(), textAlign: 'right' }}>GST %</th>
              <th style={th()}>HSN</th>
              <th style={th()}>Mandatory</th>
              <th style={{ ...th(), width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: 16, textAlign: 'center', color: MUTED, fontSize: 12 }}
                >
                  No items added yet. Click <strong>Add item</strong> below to start.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={index} style={{ borderBottom: `0.5px solid ${FOG}` }}>
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
                      type="text"
                      value={item.itemName ?? ''}
                      onChange={(e) => update(index, { itemName: e.target.value })}
                      readOnly={readOnly}
                      placeholder="Item name"
                      style={cellInput()}
                    />
                  </td>
                  <td style={td()}>
                    <input
                      type="number"
                      min={0}
                      value={item.qty ?? 0}
                      onChange={(e) => update(index, { qty: Number(e.target.value) || 0 })}
                      readOnly={readOnly}
                      style={{ ...cellInput(), textAlign: 'right' }}
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
                      value={item.unitPrice ?? 0}
                      onChange={(e) => update(index, { unitPrice: Number(e.target.value) || 0 })}
                      readOnly={readOnly}
                      style={{ ...cellInput(), textAlign: 'right' }}
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
                  <td style={td()}>
                    <label
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12,
                        color: MUTED,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={item.mandatory !== false}
                        onChange={(e) => update(index, { mandatory: e.target.checked })}
                        disabled={readOnly}
                      />
                      Required
                    </label>
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

export function KitBundleMaster() {
  const { liveVendors } = useMasterData();
  const vendorOptions = useMemo(
    () =>
      liveVendors.map((v) => ({
        value: v.id,
        label: `${v.name} (${v.code})`,
      })),
    [liveVendors]
  );

  const config: MasterV2Config = {
    title: 'Kit / Bundle Master',
    subtitle: 'Pre-negotiated multi-SKU bundles sourced from a single vendor.',
    icon: Package,
    masterKey: 'kit_bundle_master',
    codeKey: 'bundleCode',
    nameKey: 'bundleName',
    columns: [
      { key: 'vendorName', label: 'Vendor' },
      {
        key: 'items',
        label: '# Items',
        fromPayload: true,
        format: (v) => (Array.isArray(v) ? String(v.length) : '0'),
      },
      { key: 'status', label: 'Status' },
    ],
    formSections: [
      {
        id: 'header',
        title: 'Vendor & Description',
        subtitle: 'A bundle is always sourced from one vendor and cannot be split.',
        stripe: 'blue',
        fields: [
          {
            key: 'vendorId',
            label: 'Vendor',
            type: 'select',
            fromPayload: true,
            required: true,
            dynamicOptions: vendorOptions,
            labelKey: 'vendorName',
          },
          {
            key: 'vendorCode',
            label: 'Vendor Code',
            fromPayload: true,
            placeholder: 'Optional override',
          },
          {
            key: 'description',
            label: 'Description',
            type: 'textarea',
            fromPayload: true,
          },
        ],
      },
      {
        id: 'items',
        title: 'Bundle Items',
        subtitle: 'Each line item ships as part of this bundle.',
        stripe: 'amber',
        fields: [],
        customRender: ({ form, setForm, readOnly }) => (
          <ItemsTable form={form} setForm={setForm} readOnly={readOnly} />
        ),
      },
    ],
  };

  return <SimpleMasterScreenV2 config={config} />;
}
