import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Plus, Package, X, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMasterData } from '../contexts/MasterDataContext';
import {
  useProcurementData,
  fetchPO,
  createGRNApi,
  type CreateGRNPayload,
} from '../contexts/ProcurementDataContext';
import { FormSection, PxFormField } from './ui/form-primitives';
import {
  listingHeader,
  listingTitle,
  listingSubtitle,
  listingPrimaryBtn,
  listingPage,
  listingTable,
  listingThead,
  listingTh,
  listingTd,
} from './ui/listingStyles';
import type { ApiRequestError } from '../lib/mysql/client';
import type { POLineItem, PurchaseOrder } from '../types/procurement';

interface GRNRow {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendor: string;
  receiptDate: string;
  amount: number;
  qtyReceived: number;
  poQty: number;
  allocationStatus: 'Not Allocated' | 'Partially Allocated' | 'Accepted';
}

interface ReceiptLineDraft {
  poItemId: string;
  qtyReceived: number;
}

const todayIso = () => new Date().toISOString().split('T')[0];

const getAllocationStatusColor = (status: GRNRow['allocationStatus']) => {
  switch (status) {
    case 'Not Allocated':
      return 'var(--color-error)';
    case 'Partially Allocated':
      return '#D97706';
    case 'Accepted':
      return 'var(--color-teal)';
    default:
      return 'var(--color-mercury-grey)';
  }
};

export function GoodsReceipt() {
  const { user } = useAuth();
  const { entities, currentCompany } = useMasterData();
  const { pos: relationalPOs, grns: relationalGrns, refresh } = useProcurementData();

  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Modal state — single PO + N receipt lines
  const [selectedPOId, setSelectedPOId] = useState<string>('');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [loadingPO, setLoadingPO] = useState(false);
  const [receiptDate, setReceiptDate] = useState<string>(todayIso());
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState<string>('');
  const [vehicleNo, setVehicleNo] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [lines, setLines] = useState<ReceiptLineDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Entity context — same pattern used by RegularPRForm/CreatePurchaseOrder.
  // Fall back to the auth user's default platform entity when MasterDataContext
  // hasn't surfaced a currentCompany yet (e.g. fresh login).
  const entityRecord = useMemo(() => {
    const lookup =
      entities.find(
        (e) =>
          e.id === currentCompany?.id ||
          e.id === user?.currentPlatformEntityId ||
          e.name === currentCompany?.name
      ) ?? entities[0];
    return lookup;
  }, [entities, currentCompany?.id, currentCompany?.name, user?.currentPlatformEntityId]);

  const entityId = currentCompany?.id ?? user?.currentPlatformEntityId ?? entityRecord?.id ?? '';
  const entityCode = entityRecord?.code ?? currentCompany?.code ?? '';

  // Only POs that can still receive material/service are pickable.
  const pickablePOs = useMemo(
    () =>
      relationalPOs.filter((po) => po.status === 'issued' || po.status === 'partially_received'),
    [relationalPOs]
  );

  // Listing data — source of truth is the relational GRN list from
  // useProcurementData().grns. Newly-created GRNs land here after refresh().
  const grns: GRNRow[] = useMemo(
    () =>
      relationalGrns.map((g) => {
        const po = relationalPOs.find((p) => p.id === g.poId);
        const totalReceivedQty = (g.items || []).reduce(
          (sum, li) => sum + Number(li.qtyReceived || 0),
          0
        );
        const totalAcceptedQty = (g.items || []).reduce(
          (sum, li) => sum + Number(li.qtyAccepted || 0),
          0
        );
        const totalAmount = (g.items || []).reduce(
          (sum, li) => sum + Number(li.lineAmount || 0),
          0
        );
        const allAccepted = totalAcceptedQty > 0 && totalAcceptedQty >= totalReceivedQty;
        const partialAccepted = totalAcceptedQty > 0 && totalAcceptedQty < totalReceivedQty;
        return {
          id: g.id,
          grnNumber: g.grnRef,
          poNumber: po?.poRef ?? '',
          vendor: po?.vendorName ?? '',
          receiptDate: g.receiptDate ?? '',
          amount: totalAmount,
          qtyReceived: totalReceivedQty,
          poQty: totalReceivedQty,
          allocationStatus: allAccepted
            ? 'Accepted'
            : partialAccepted
              ? 'Partially Allocated'
              : 'Not Allocated',
        };
      }),
    [relationalGrns, relationalPOs]
  );

  const filteredGRNs = grns.filter(
    (grn) =>
      grn.grnNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      grn.vendor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const resetModal = () => {
    setSelectedPOId('');
    setSelectedPO(null);
    setReceiptDate(todayIso());
    setReceivedBy('');
    setDeliveryNoteNo('');
    setVehicleNo('');
    setRemarks('');
    setLines([]);
    setSubmitError(null);
    setSubmitting(false);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    resetModal();
  };

  // When user picks a PO, fetch full detail (list endpoint returns headers
  // only — line items come from GET /procurement/pos/:id).
  useEffect(() => {
    if (!selectedPOId) {
      setSelectedPO(null);
      setLines([]);
      return;
    }
    let cancelled = false;
    setLoadingPO(true);
    fetchPO(selectedPOId)
      .then((po) => {
        if (cancelled) return;
        setSelectedPO(po);
        // Pre-populate one line draft per PO line with remaining qty > 0,
        // user can clear individual rows by zeroing the qtyReceived.
        if (po) {
          const drafts: ReceiptLineDraft[] = (po.lineItems || [])
            .filter((li) => Number(li.quantity) - Number(li.qtyReceived || 0) > 0)
            .map((li) => ({ poItemId: li.id, qtyReceived: 0 }));
          setLines(drafts);
        } else {
          setLines([]);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.error('[GoodsReceipt] fetchPO failed:', err);
        setSelectedPO(null);
        setLines([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPO(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPOId]);

  const setLineQty = (poItemId: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.poItemId === poItemId ? { ...l, qtyReceived: qty } : l)));
  };

  const remainingForLine = (li: POLineItem): number =>
    Math.max(0, Number(li.quantity || 0) - Number(li.qtyReceived || 0));

  const linesToSubmit = lines.filter((l) => Number(l.qtyReceived) > 0);

  // Validation — empty lines, missing entity context, qty exceeds remaining.
  const validationError = useMemo<string | null>(() => {
    if (!selectedPO) return 'Select a purchase order.';
    if (!receiptDate) return 'Receipt date is required.';
    if (!entityId || !entityCode) return 'Entity context unavailable — please re-select a company.';
    if (linesToSubmit.length === 0) return 'Enter quantity received on at least one line.';
    for (const draft of linesToSubmit) {
      const poLine = selectedPO.lineItems.find((l) => l.id === draft.poItemId);
      if (!poLine) return 'Line item not found on PO.';
      const remaining = remainingForLine(poLine);
      if (draft.qtyReceived > remaining) {
        return `Line ${poLine.lineNumber}: cannot receive ${draft.qtyReceived} (remaining ${remaining}).`;
      }
    }
    return null;
  }, [selectedPO, receiptDate, entityId, entityCode, linesToSubmit]);

  const handleSubmit = async () => {
    setSubmitError(null);
    if (validationError || !selectedPO) {
      setSubmitError(validationError ?? 'Cannot submit GRN.');
      return;
    }
    const payload: CreateGRNPayload = {
      poId: selectedPO.id,
      receiptDate,
      entityId,
      entityCode,
      vendorId: selectedPO.vendorId || undefined,
      receivedBy: receivedBy.trim() || user?.name || undefined,
      deliveryNoteNo: deliveryNoteNo.trim() || undefined,
      vehicleNo: vehicleNo.trim() || undefined,
      remarks: remarks.trim() || undefined,
      items: linesToSubmit.map((draft) => ({
        poItemId: draft.poItemId,
        qtyReceived: Number(draft.qtyReceived),
      })),
    };
    setSubmitting(true);
    try {
      const created = await createGRNApi(payload);
      if (!created) {
        setSubmitError('GRN creation returned no data.');
        return;
      }
      await refresh();
      closeModal();
    } catch (err) {
      const apiErr = err as ApiRequestError;
      const detail =
        Array.isArray(apiErr?.details) && apiErr.details.length
          ? apiErr.details.join('; ')
          : apiErr?.message || 'GRN creation failed.';
      setSubmitError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={listingPage}>
      <div style={listingHeader}>
        <div>
          <h1 style={listingTitle}>Goods Receipt (GRN)</h1>
          <p style={listingSubtitle}>Record vendor deliveries against issued purchase orders</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} style={listingPrimaryBtn}>
          <Plus size={13} />
          Create GRN from PO
        </button>
      </div>

      <div
        style={{
          padding: '8px 20px',
          background: 'var(--color-background-secondary)',
          borderBottom: '1px solid var(--color-fog)',
          display: 'flex',
          gap: 8,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={13}
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-mercury-grey)',
            }}
          />
          <input
            type="text"
            placeholder="Search by GRN number, PO number, or vendor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              height: 28,
              padding: '0 10px 0 26px',
              borderRadius: 'var(--border-radius-md)',
              border: '1px solid var(--color-silver)',
              background: '#FFFFFF',
              fontSize: 12,
              color: 'var(--color-ink)',
              outline: 'none',
            }}
          />
        </div>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            height: 28,
            padding: '0 10px',
            borderRadius: 'var(--border-radius-md)',
            border: '1px solid var(--color-silver)',
            background: '#FFFFFF',
            color: 'var(--color-ink)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          <Filter size={13} /> Filter
        </button>
      </div>

      <div style={{ background: '#FFFFFF' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={listingTable}>
            <thead style={listingThead}>
              <tr>
                <th style={listingTh}>GRN Number</th>
                <th style={listingTh}>PO Number</th>
                <th style={listingTh}>Vendor</th>
                <th style={listingTh}>Receipt Date</th>
                <th style={{ ...listingTh, textAlign: 'right' }}>Qty Received</th>
                <th style={{ ...listingTh, textAlign: 'right' }}>Amount</th>
                <th style={listingTh}>Allocation Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredGRNs.map((grn, index) => (
                <tr
                  key={grn.id}
                  style={{
                    borderTop: index === 0 ? 'none' : '1px solid var(--color-silver)',
                  }}
                >
                  <td style={listingTd}>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" style={{ color: 'var(--color-teal)' }} />
                      {grn.grnNumber}
                    </div>
                  </td>
                  <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                    {grn.poNumber}
                  </td>
                  <td style={listingTd}>{grn.vendor}</td>
                  <td style={{ ...listingTd, color: 'var(--color-mercury-grey)' }}>
                    {grn.receiptDate ? new Date(grn.receiptDate).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td style={{ ...listingTd, textAlign: 'right' }}>{grn.qtyReceived}</td>
                  <td style={{ ...listingTd, textAlign: 'right' }}>
                    ₹{grn.amount.toLocaleString('en-IN')}
                  </td>
                  <td style={listingTd}>
                    <span
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
                      style={{
                        backgroundColor: getAllocationStatusColor(grn.allocationStatus) + '20',
                        color: getAllocationStatusColor(grn.allocationStatus),
                      }}
                    >
                      {grn.allocationStatus === 'Accepted' && <CheckCircle className="w-3 h-3" />}
                      {grn.allocationStatus === 'Partially Allocated' && (
                        <Clock className="w-3 h-3" />
                      )}
                      {grn.allocationStatus === 'Not Allocated' && (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      {grn.allocationStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create GRN modal — single PO + per-line qty rows */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div
              className="flex items-center justify-between p-6"
              style={{ borderBottom: '1px solid var(--color-silver)' }}
            >
              <div>
                <h2 className="text-xl" style={{ color: 'var(--color-ink)' }}>
                  Record Goods Receipt
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-mercury-grey)' }}>
                  Pick a PO and enter the quantity received against each line.
                </p>
              </div>
              <button onClick={closeModal} style={{ color: 'var(--color-mercury-grey)' }}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <FormSection title="PO Selection" columns={1}>
                <PxFormField label="Purchase Order" required>
                  <select
                    value={selectedPOId}
                    onChange={(e) => setSelectedPOId(e.target.value)}
                    className="px-select"
                  >
                    <option value="">Choose a PO…</option>
                    {pickablePOs.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.poRef} — {po.vendorName} ({po.status.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </PxFormField>
              </FormSection>

              {loadingPO && (
                <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                  Loading PO line items…
                </p>
              )}

              {selectedPO && !loadingPO && (
                <>
                  <div
                    className="mb-4 p-4 rounded-lg"
                    style={{
                      backgroundColor: 'var(--color-cloud)',
                      border: '1px solid var(--color-silver)',
                    }}
                  >
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p style={{ color: 'var(--color-mercury-grey)' }}>Vendor</p>
                        <p style={{ color: 'var(--color-ink)' }}>{selectedPO.vendorName}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mercury-grey)' }}>PO Ref</p>
                        <p style={{ color: 'var(--color-ink)' }}>{selectedPO.poRef}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mercury-grey)' }}>Status</p>
                        <p style={{ color: 'var(--color-ink)' }}>
                          {selectedPO.status.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <FormSection title="Receipt Details" columns={2}>
                    <PxFormField label="Receipt Date" required>
                      <input
                        type="date"
                        value={receiptDate}
                        onChange={(e) => setReceiptDate(e.target.value)}
                        className="px-input"
                      />
                    </PxFormField>
                    <PxFormField label="Received By">
                      <input
                        type="text"
                        value={receivedBy}
                        onChange={(e) => setReceivedBy(e.target.value)}
                        placeholder={user?.name ?? 'Receiver name'}
                        className="px-input"
                      />
                    </PxFormField>
                    <PxFormField label="Delivery Note No.">
                      <input
                        type="text"
                        value={deliveryNoteNo}
                        onChange={(e) => setDeliveryNoteNo(e.target.value)}
                        className="px-input"
                      />
                    </PxFormField>
                    <PxFormField label="Vehicle No.">
                      <input
                        type="text"
                        value={vehicleNo}
                        onChange={(e) => setVehicleNo(e.target.value)}
                        className="px-input"
                      />
                    </PxFormField>
                  </FormSection>

                  <FormSection title="Line Items" columns={1}>
                    {lines.length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
                        This PO has no lines with remaining quantity.
                      </p>
                    ) : (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={listingTable}>
                          <thead style={listingThead}>
                            <tr>
                              <th style={listingTh}>#</th>
                              <th style={listingTh}>Item</th>
                              <th style={{ ...listingTh, textAlign: 'right' }}>Ordered</th>
                              <th style={{ ...listingTh, textAlign: 'right' }}>Already received</th>
                              <th style={{ ...listingTh, textAlign: 'right' }}>Remaining</th>
                              <th style={{ ...listingTh, textAlign: 'right' }}>Receive now</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPO.lineItems
                              .filter((li) => remainingForLine(li) > 0)
                              .map((li) => {
                                const draft = lines.find((l) => l.poItemId === li.id);
                                const remaining = remainingForLine(li);
                                return (
                                  <tr
                                    key={li.id}
                                    style={{ borderTop: '1px solid var(--color-silver)' }}
                                  >
                                    <td style={listingTd}>{li.lineNumber}</td>
                                    <td style={listingTd}>
                                      <div style={{ color: 'var(--color-ink)' }}>
                                        {li.itemDescription || li.itemCode}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: 11,
                                          color: 'var(--color-mercury-grey)',
                                        }}
                                      >
                                        {li.itemCode} · {li.unit || '—'}
                                      </div>
                                    </td>
                                    <td style={{ ...listingTd, textAlign: 'right' }}>
                                      {li.quantity}
                                    </td>
                                    <td style={{ ...listingTd, textAlign: 'right' }}>
                                      {li.qtyReceived}
                                    </td>
                                    <td style={{ ...listingTd, textAlign: 'right' }}>
                                      {remaining}
                                    </td>
                                    <td style={{ ...listingTd, textAlign: 'right' }}>
                                      <input
                                        type="number"
                                        min={0}
                                        max={remaining}
                                        value={draft?.qtyReceived ?? 0}
                                        onChange={(e) =>
                                          setLineQty(
                                            li.id,
                                            Math.max(
                                              0,
                                              Math.min(remaining, parseInt(e.target.value, 10) || 0)
                                            )
                                          )
                                        }
                                        style={{
                                          width: 96,
                                          height: 28,
                                          padding: '0 8px',
                                          textAlign: 'right',
                                          border: '1px solid var(--color-silver)',
                                          borderRadius: 'var(--border-radius-md)',
                                          fontSize: 12,
                                          color: 'var(--color-ink)',
                                        }}
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </FormSection>

                  <FormSection title="Remarks" columns={1}>
                    <PxFormField label="Remarks">
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        rows={2}
                        className="px-input"
                        placeholder="Optional notes about this receipt"
                      />
                    </PxFormField>
                  </FormSection>
                </>
              )}

              {submitError && (
                <div
                  className="mt-4 p-3 rounded-lg text-sm"
                  style={{
                    background: '#FCEBEB',
                    color: '#791F1F',
                    border: '1px solid #F09595',
                  }}
                >
                  {submitError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6" style={{ borderTop: '1px solid var(--color-silver)' }}>
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-3 rounded-lg"
                style={{
                  border: '1px solid var(--color-silver)',
                  color: 'var(--color-ink)',
                  backgroundColor: 'white',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!!validationError || submitting}
                className="flex-1 px-4 py-3 rounded-lg text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-teal)' }}
              >
                {submitting ? 'Creating…' : 'Create GRN'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
