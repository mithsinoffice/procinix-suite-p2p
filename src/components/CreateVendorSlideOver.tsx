import { useState } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { mysqlApiRequest } from '../lib/mysql/client';

const API = import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') || '';

interface CreateVendorSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  onVendorCreated: () => void;
  invoiceId: string;
  prefill: {
    vendorName: string;
    email: string;
    gstin?: string;
    country?: string;
  };
}

export function CreateVendorSlideOver({ isOpen, onClose, onVendorCreated, invoiceId, prefill }: CreateVendorSlideOverProps) {
  const [vendorName, setVendorName] = useState(prefill.vendorName || '');
  const [email, setEmail] = useState(prefill.email || '');
  const [gstin, setGstin] = useState(prefill.gstin || '');
  const [pan, setPan] = useState('');
  const [country, setCountry] = useState(prefill.country || 'India');
  const [vendorType, setVendorType] = useState('Goods');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!vendorName.trim()) { setError('Vendor name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await mysqlApiRequest('/masters/vendor_master', {
        method: 'PUT',
        body: JSON.stringify({
          payload: {
            vendorName: vendorName.trim(),
            legalName: vendorName.trim(),
            email: email.trim(),
            gstin: gstin.trim(),
            pan: pan.trim(),
            country,
            vendorType,
            paymentTerms,
            status: 'Active',
          },
        }),
      });

      // Revalidate the invoice
      try {
        const key = localStorage.getItem('apiSecretKey');
        await fetch(`${API}/api/invoice-ingestion/revalidate/${invoiceId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(key ? { Authorization: `Bearer ${key}` } : {}),
          },
        });
      } catch {
        // revalidation is best-effort
      }

      onVendorCreated();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)',
          zIndex: 49, transition: 'opacity 200ms',
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
          backgroundColor: '#FFFFFF', zIndex: 50,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 200ms ease-out',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Create vendor</h2>
              <p style={{ fontSize: 12, color: 'var(--color-teal)', fontWeight: 500, margin: '4px 0 0' }}>
                Pre-filled from invoice data
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB',
                backgroundColor: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X style={{ width: 16, height: 16, color: '#6B7280' }} />
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Vendor Name *" value={vendorName} onChange={setVendorName} />
            <FormField label="Email" value={email} onChange={setEmail} type="email" />
            <FormField label="GSTIN" value={gstin} onChange={setGstin} placeholder="22AAAAA0000A1Z5" />
            <FormField label="PAN" value={pan} onChange={setPan} placeholder="AAAAA0000A" />
            <FormField label="Country" value={country} onChange={setCountry} />

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Vendor Type
              </label>
              <select
                value={vendorType}
                onChange={e => setVendorType(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #D1D5DB', fontSize: 14, color: '#1A1A2E',
                  backgroundColor: '#F9FAFB', outline: 'none',
                }}
              >
                <option value="Goods">Goods</option>
                <option value="Services">Services</option>
                <option value="Both">Both</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Payment Terms
              </label>
              <select
                value={paymentTerms}
                onChange={e => setPaymentTerms(e.target.value)}
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #D1D5DB', fontSize: 14, color: '#1A1A2E',
                  backgroundColor: '#F9FAFB', outline: 'none',
                }}
              >
                <option value="Net 15">Net 15</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 45">Net 45</option>
                <option value="Net 60">Net 60</option>
                <option value="Immediate">Immediate</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: 13,
              border: '1px solid #FECACA',
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #D1D5DB',
              backgroundColor: '#FFFFFF', fontSize: 14, fontWeight: 500,
              color: '#6B7280', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 24px', borderRadius: 8, border: 'none',
              backgroundColor: 'var(--color-teal)', fontSize: 14, fontWeight: 600,
              color: '#FFFFFF', cursor: saving ? 'wait' : 'pointer',
              opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : <CheckCircle style={{ width: 16, height: 16 }} />}
            {saving ? 'Saving...' : 'Save & revalidate invoice \u2192'}
          </button>
        </div>
      </div>
    </>
  );
}

function FormField({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 8,
          border: '1px solid #D1D5DB', fontSize: 14, color: '#1A1A2E',
          backgroundColor: '#F9FAFB', outline: 'none', boxSizing: 'border-box',
        }}
      />
    </div>
  );
}
