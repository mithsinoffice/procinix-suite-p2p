import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { mysqlApiRequest } from '../lib/mysql/client';
import { InvoiceFormPO } from './InvoiceFormPO';
import { NonPOInvoiceForm } from './NonPOInvoiceForm';

/**
 * Edit-mode router for /invoices/edit/:id.
 *
 * Looks up the invoice's source so we mount the correct form. Non-PO invoices
 * land in NonPOInvoiceForm (no PO/GRN selector); everything else uses
 * InvoiceFormPO. The form itself does its own full prefill GET — this wrapper
 * only decides which one to render.
 */
type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; form: 'po' | 'non_po' };

export default function InvoiceEditLoader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    if (!id) {
      setState({ kind: 'error', message: 'No invoice id in URL.' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await mysqlApiRequest<{
          success: boolean;
          data: { source?: string | null; po_number?: string | null } | null;
        }>(`/invoices/${encodeURIComponent(id)}`);
        if (cancelled) return;
        if (!res?.success || !res.data) {
          setState({ kind: 'error', message: 'Invoice not found.' });
          return;
        }
        // Routing heuristic — the schema has no invoice_type column, so we
        // derive it from the same signals the listing uses: a present
        // po_number implies a PO invoice; otherwise treat as non-PO. Manual
        // and email-ingestion sources without a PO go to NonPOInvoiceForm.
        const hasPo = typeof res.data.po_number === 'string' && res.data.po_number.trim() !== '';
        setState({ kind: 'ready', form: hasPo ? 'po' : 'non_po' });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load invoice.';
        setState({ kind: 'error', message: msg });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.kind === 'loading') {
    return (
      <div
        style={{
          padding: '48px 24px',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          fontSize: 13,
        }}
      >
        Loading invoice…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p style={{ color: '#A32D2D', fontSize: 13, marginBottom: 12 }}>{state.message}</p>
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          style={{
            height: 30,
            padding: '0 12px',
            border: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 'var(--border-radius-md)',
            background: '#FFFFFF',
            color: 'var(--color-text-primary)',
            fontSize: 12,
            cursor: 'pointer',
          }}
        >
          Back to invoices
        </button>
      </div>
    );
  }

  return state.form === 'non_po' ? <NonPOInvoiceForm /> : <InvoiceFormPO />;
}
