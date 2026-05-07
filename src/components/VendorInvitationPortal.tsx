import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Building2, FileUp, ShieldCheck } from 'lucide-react';
import { useVendorInvitations } from '../contexts/VendorInvitationContext';
import type { VendorInvitationDocument, VendorSubmissionPayload } from '../types/vendorInvitation';
import { isGstinFormat, isIfscFormat, isPanFormat } from '../lib/vendorKyc';

const surface = 'var(--color-cloud)';
const border = 'var(--color-silver)';
const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const accent = 'var(--color-teal)';

export function VendorInvitationPortal() {
  const { token } = useParams<{ token: string }>();
  const { getByToken, markVendorOpened, saveVendorSubmission } = useVendorInvitations();
  const inv = token ? getByToken(token) : undefined;

  useEffect(() => {
    if (!token || !inv || inv.status !== 'invited') return;
    markVendorOpened(token);
  }, [token, inv, markVendorOpened]);

  const [tradeName, setTradeName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [vendorType, setVendorType] = useState<'Domestic' | 'Import'>('Domestic');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [country, setCountry] = useState('India');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');
  const [vendorNotes, setVendorNotes] = useState('');
  const [documents, setDocuments] = useState<VendorInvitationDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inv) return;
    const s = inv.submission;
    if (s) {
      setTradeName(s.tradeName);
      setPhone(s.phone);
      setGstin(s.gstin);
      setVendorType(s.vendorType);
      setAddressLine1(s.addressLine1);
      setCity(s.city);
      setState(s.state);
      setPincode(s.pincode);
      setCountry(s.country);
      setBankAccountName(s.bankAccountName);
      setBankAccountNumber(s.bankAccountNumber);
      setBankIfsc(s.bankIfsc);
      setBankName(s.bankName);
      setVendorNotes(s.vendorNotes ?? '');
      setDocuments(s.documents ?? []);
    } else {
      setTradeName(inv.basic.legalName);
    }
  }, [inv?.id, inv?.submission]);

  const panFromInvite = inv?.basic.pan ?? '';

  const kycPreview = useMemo(() => {
    const panOk = isPanFormat(panFromInvite);
    const gstOk = isGstinFormat(gstin);
    const ifscOk = isIfscFormat(bankIfsc);
    return { panOk, gstOk, ifscOk };
  }, [panFromInvite, gstin, bankIfsc]);

  if (!token || !inv) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: surface }}
      >
        <p style={{ color: textMuted }}>This invitation link is invalid or has expired.</p>
      </div>
    );
  }

  if (inv.status === 'approved') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: surface }}
      >
        <ShieldCheck className="w-14 h-14 mb-4" style={{ color: accent }} />
        <h1 className="text-xl font-semibold" style={{ color: textMain }}>
          Registration complete
        </h1>
        <p className="text-sm mt-2 text-center max-w-md" style={{ color: textMuted }}>
          Your organisation has been approved. Vendor code:{' '}
          <strong style={{ color: textMain }}>{inv.createdVendorCode ?? '—'}</strong>
        </p>
      </div>
    );
  }

  if (inv.status === 'rejected') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: surface }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#B91C1C' }}>
          Invitation closed
        </h1>
        <p className="text-sm mt-2 text-center max-w-md" style={{ color: textMuted }}>
          {inv.rejectedReason ?? 'This onboarding request was not approved.'}
        </p>
      </div>
    );
  }

  if (
    inv.status === 'submitted_by_vendor' ||
    inv.status === 'pending_internal_review' ||
    inv.status === 'pending_approval'
  ) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: surface }}
      >
        <Building2 className="w-12 h-12 mb-4" style={{ color: accent }} />
        <h1 className="text-xl font-semibold" style={{ color: textMain }}>
          Response submitted
        </h1>
        <p className="text-sm mt-2 text-center max-w-md" style={{ color: textMuted }}>
          Thank you. Your details are with the procurement team for review and internal approval.
          You will be notified by email.
        </p>
      </div>
    );
  }

  const editable =
    inv.status === 'invited' ||
    inv.status === 'vendor_in_progress' ||
    inv.status === 'changes_requested';

  const addDocumentRow = (file: File | null, label: string) => {
    if (!file) return;
    const doc: VendorInvitationDocument = {
      id: `doc-${Date.now()}`,
      label: label || file.name,
      fileName: file.name,
      uploadedAt: new Date().toISOString(),
    };
    setDocuments((d) => [...d, doc]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!editable) return;

    if (!tradeName.trim() || !phone.trim() || !gstin.trim()) {
      setError('Trade name, phone and GSTIN are required.');
      return;
    }
    if (!isPanFormat(inv.basic.pan)) {
      setError('PAN on file is invalid. Contact the buyer.');
      return;
    }
    if (!isGstinFormat(gstin)) {
      setError('Enter a valid 15-character GSTIN.');
      return;
    }
    if (!addressLine1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setError('Complete the registered address.');
      return;
    }
    if (
      !bankAccountName.trim() ||
      !bankAccountNumber.trim() ||
      !bankIfsc.trim() ||
      !bankName.trim()
    ) {
      setError('Complete bank details.');
      return;
    }
    if (!isIfscFormat(bankIfsc)) {
      setError('Enter a valid IFSC (e.g. HDFC0001234).');
      return;
    }
    if (documents.length === 0) {
      setError('Upload at least one KYC document (e.g. cancelled cheque, COI).');
      return;
    }

    const payload: VendorSubmissionPayload = {
      tradeName: tradeName.trim(),
      phone: phone.trim(),
      gstin: gstin.trim().toUpperCase(),
      vendorType,
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      country: country.trim(),
      bankAccountName: bankAccountName.trim(),
      bankAccountNumber: bankAccountNumber.trim(),
      bankIfsc: bankIfsc.trim().toUpperCase(),
      bankName: bankName.trim(),
      panValidated: isPanFormat(inv.basic.pan),
      gstinValidated: isGstinFormat(gstin),
      bankValidated: isIfscFormat(bankIfsc),
      documents,
      submittedAt: new Date().toISOString(),
      vendorNotes: vendorNotes.trim() || undefined,
    };

    saveVendorSubmission(token, payload);
  };

  const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm';
  const labelCls = 'block text-sm font-medium mb-1.5';

  return (
    <div className="min-h-screen" style={{ backgroundColor: surface }}>
      <header
        style={{ borderBottom: `1px solid ${border}`, backgroundColor: '#fff' }}
        className="px-6 py-4"
      >
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Building2 className="w-8 h-8" style={{ color: accent }} />
          <div>
            <p className="text-xs uppercase tracking-wide" style={{ color: textMuted }}>
              Vendor onboarding
            </p>
            <h1 className="text-lg font-semibold" style={{ color: textMain }}>
              {inv.basic.legalName}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <p
          className="text-sm rounded-lg px-4 py-3"
          style={{
            backgroundColor: '#E8F8FA',
            color: textMain,
            border: `1px solid ${border}`,
          }}
        >
          Complete the sections below to submit your vendor profile. This is the same onboarding
          information your buyer reviews in <strong>Vendor Review</strong> and maps to the{' '}
          <strong>Vendor Master</strong> record when approved.
        </p>
        <section
          className="rounded-lg p-5"
          style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
        >
          <h2 className="text-sm font-semibold mb-3" style={{ color: textMain }}>
            Prefilled by buyer
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span style={{ color: textMuted }}>Entity</span>
              <p style={{ color: textMain }}>{inv.basic.entityName ?? '—'}</p>
            </div>
            <div>
              <span style={{ color: textMuted }}>Country</span>
              <p style={{ color: textMain }}>{inv.basic.countryName ?? '—'}</p>
            </div>
            <div>
              <span style={{ color: textMuted }}>Legal name</span>
              <p style={{ color: textMain }}>{inv.basic.legalName}</p>
            </div>
            <div>
              <span style={{ color: textMuted }}>PAN</span>
              <p className="font-mono" style={{ color: textMain }}>
                {inv.basic.pan}
              </p>
            </div>
            <div>
              <span style={{ color: textMuted }}>Category</span>
              <p style={{ color: textMain }}>{inv.basic.category}</p>
            </div>
            <div>
              <span style={{ color: textMuted }}>Contact email</span>
              <p style={{ color: textMain }}>{inv.basic.email}</p>
            </div>
            <div>
              <span style={{ color: textMuted }}>Contact name</span>
              <p style={{ color: textMain }}>{inv.basic.contactName}</p>
            </div>
            {inv.basic.message?.trim() ? (
              <div className="sm:col-span-2">
                <span style={{ color: textMuted }}>Message from buyer</span>
                <p className="whitespace-pre-wrap mt-0.5" style={{ color: textMain }}>
                  {inv.basic.message}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section
            className="rounded-lg p-5 space-y-4"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <div className="mb-1">
              <h2 className="text-sm font-semibold" style={{ color: textMain }}>
                Vendor master onboarding (company &amp; registration)
              </h2>
              <p className="text-xs mt-1" style={{ color: textMuted }}>
                Trade name, GSTIN, address and bank feed the vendor master on approval.
              </p>
            </div>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Trade / display name <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <input
                required
                disabled={!editable}
                className={inputCls}
                style={{ border: `1px solid ${border}`, color: textMain }}
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  Phone <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  GSTIN <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={`${inputCls} font-mono uppercase`}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Vendor type <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <select
                disabled={!editable}
                className={inputCls}
                style={{ border: `1px solid ${border}`, color: textMain }}
                value={vendorType}
                onChange={(e) => setVendorType(e.target.value as 'Domestic' | 'Import')}
              >
                <option value="Domestic">Domestic</option>
                <option value="Import">Import</option>
              </select>
            </div>
          </section>

          <section
            className="rounded-lg p-5 space-y-4"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: textMain }}>
              Registered address
            </h2>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Address line 1 <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <input
                required
                disabled={!editable}
                className={inputCls}
                style={{ border: `1px solid ${border}`, color: textMain }}
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  City <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  State <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  PIN code <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  Country <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </section>

          <section
            className="rounded-lg p-5 space-y-4"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: textMain }}>
              Bank details
            </h2>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Account name <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <input
                required
                disabled={!editable}
                className={inputCls}
                style={{ border: `1px solid ${border}`, color: textMain }}
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  Account number <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={inputCls}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls} style={{ color: textMain }}>
                  IFSC <span style={{ color: '#B91C1C' }}>*</span>
                </label>
                <input
                  required
                  disabled={!editable}
                  className={`${inputCls} font-mono uppercase`}
                  style={{ border: `1px solid ${border}`, color: textMain }}
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                />
              </div>
            </div>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Bank name <span style={{ color: '#B91C1C' }}>*</span>
              </label>
              <input
                required
                disabled={!editable}
                className={inputCls}
                style={{ border: `1px solid ${border}`, color: textMain }}
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
          </section>

          <section
            className="rounded-lg p-5 space-y-4"
            style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
          >
            <h2
              className="text-sm font-semibold flex items-center gap-2"
              style={{ color: textMain }}
            >
              <FileUp className="w-4 h-4" />
              KYC documents
            </h2>
            <p className="text-xs" style={{ color: textMuted }}>
              Upload PDF or images. Files are stored securely in production; here only file names
              are recorded.
            </p>
            <div>
              <label className={labelCls} style={{ color: textMain }}>
                Add document
              </label>
              <input
                type="file"
                disabled={!editable}
                className="text-sm w-full"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) addDocumentRow(f, f.name);
                  e.target.value = '';
                }}
              />
            </div>
            {documents.length > 0 && (
              <ul className="text-sm space-y-1" style={{ color: textMain }}>
                {documents.map((d) => (
                  <li key={d.id} className="flex justify-between gap-2">
                    <span>{d.fileName}</span>
                    <span style={{ color: textMuted }}>
                      {new Date(d.uploadedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="rounded-lg p-5 space-y-3"
            style={{ border: `1px solid ${accent}40`, backgroundColor: '#fff' }}
          >
            <h2 className="text-sm font-semibold" style={{ color: textMain }}>
              KYC validation summary (preview)
            </h2>
            <ul className="text-sm space-y-2">
              <li style={{ color: kycPreview.panOk ? '#047857' : '#B45309' }}>
                PAN format: {kycPreview.panOk ? 'Valid' : 'Check'}
              </li>
              <li style={{ color: kycPreview.gstOk ? '#047857' : '#B45309' }}>
                GSTIN format: {kycPreview.gstOk ? 'Valid' : 'Enter 15-char GSTIN'}
              </li>
              <li style={{ color: kycPreview.ifscOk ? '#047857' : '#B45309' }}>
                IFSC format: {kycPreview.ifscOk ? 'Valid' : 'Enter IFSC'}
              </li>
            </ul>
          </section>

          <div>
            <label className={labelCls} style={{ color: textMain }}>
              Notes to buyer (optional)
            </label>
            <textarea
              disabled={!editable}
              rows={3}
              className={inputCls}
              style={{ border: `1px solid ${border}`, color: textMain }}
              value={vendorNotes}
              onChange={(e) => setVendorNotes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: '#B91C1C' }}>
              {error}
            </p>
          )}

          {editable && (
            <button
              type="submit"
              className="w-full py-3 rounded-lg text-white text-sm font-medium"
              style={{ backgroundColor: accent }}
            >
              Submit for review
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
