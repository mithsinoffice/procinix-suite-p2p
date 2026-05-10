import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMasterData } from '../contexts/MasterDataContext';
import { useIncrementalMasterRecords } from '../hooks/useIncrementalMasterRecords';
import {
  COUNTRY_MASTER_SEED,
  selectableCountriesFromMaster,
  type CountryMasterRow,
} from '../lib/countryMasterSeed';
import {
  Mail,
  Link2,
  CheckCircle,
  RefreshCw,
  Plus,
  Clock,
  XCircle,
  Search,
  Filter,
  Download,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useVendorInvitations } from '../contexts/VendorInvitationContext';
import type { VendorInvitation } from '../types/vendorInvitation';
import {
  computeInvitationKpis,
  formatExpiresIn,
  formatInvitationDisplayId,
  formatInvitedDate,
  getInvitationUiKind,
  type InvitationUiKind,
} from '../lib/invitationDisplay';
import {
  assertInvitationEmailBound,
  buildVendorInvitationMailto,
  normalizeAndValidateInvitationEmail,
  sendVendorInvitationEmail,
} from '../lib/vendorInvitationEmail';

const surface = 'var(--color-cloud)';
const border = 'var(--color-silver)';
const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const accent = 'var(--color-teal)';

const CATEGORIES = [
  'Goods — Raw material',
  'Goods — Packaging',
  'Services — Professional',
  'Services — Logistics',
  'IT & Software',
  'Facilities & Admin',
  'Marketing & Brand',
  'Other',
];

function StatusChip({ kind }: { kind: InvitationUiKind }) {
  const map: Record<InvitationUiKind, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pending', bg: '#FFFBEB', color: '#B45309' },
    accepted: { label: 'Accepted', bg: '#ECFDF5', color: '#047857' },
    expired: { label: 'Expired', bg: '#FEF2F2', color: '#B91C1C' },
  };
  const s = map[kind];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

export function InviteVendors() {
  const { user } = useAuth();
  const { getActiveEntities } = useMasterData();
  const [countryRows] = useIncrementalMasterRecords<CountryMasterRow>(
    'country_master',
    COUNTRY_MASTER_SEED
  );
  const countryOptions = useMemo(() => selectableCountriesFromMaster(countryRows), [countryRows]);
  const { invitations, createInvitation, buildInvitationUrl, extendInvitationExpiry } =
    useVendorInvitations();

  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<InvitationUiKind | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [entityId, setEntityId] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [message, setMessage] = useState('');
  const [legalName, setLegalName] = useState('');
  const [pan, setPan] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastInviteMeta, setLastInviteMeta] = useState<{
    email: string;
    legalName: string;
    entityName?: string;
  } | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailDelivery, setEmailDelivery] = useState<{
    sentByApi: boolean;
    error?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const kpis = useMemo(() => computeInvitationKpis(invitations), [invitations]);

  const now = useMemo(() => new Date(), [refreshKey]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...invitations]
      .filter((inv) => {
        const kind = getInvitationUiKind(inv, now);
        if (filterKind !== 'all' && kind !== filterKind) return false;
        if (!q) return true;
        const id = formatInvitationDisplayId(inv).toLowerCase();
        const blob = [
          id,
          inv.basic.legalName,
          inv.basic.email,
          inv.basic.contactName,
          inv.basic.entityName,
          inv.basic.countryName,
          inv.basic.message,
          inv.invitedByName,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return blob.includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invitations, search, filterKind, now]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleExport = () => {
    const headers = [
      'Invitation ID',
      'Vendor Name',
      'Email',
      'Entity',
      'Country',
      'Message',
      'Invited By',
      'Invited Date',
      'Status',
      'Expires In',
    ];
    const lines = filteredRows.map((inv) => {
      const kind = getInvitationUiKind(inv, now);
      return [
        formatInvitationDisplayId(inv),
        inv.basic.legalName,
        inv.basic.email,
        inv.basic.entityName ?? '—',
        inv.basic.countryName ?? '—',
        (inv.basic.message ?? '').replace(/,/g, ';'),
        inv.invitedByName ?? '—',
        formatInvitedDate(inv.createdAt),
        kind,
        formatExpiresIn(inv),
      ].join(',');
    });
    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vendor-invitations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setEmailDelivery(null);
    if (!legalName.trim() || !pan.trim() || !email.trim() || !contactName.trim()) {
      setError('Please fill all required fields.');
      return;
    }
    if (!entityId) {
      setError('Select an entity.');
      return;
    }
    if (!countryCode) {
      setError('Select a country.');
      return;
    }
    const entity = getActiveEntities().find((ent) => ent.id === entityId);
    const country = countryOptions.find((c) => c.countryCode === countryCode);
    if (!entity) {
      setError('Selected entity is not available.');
      return;
    }
    if (!country) {
      setError('Selected country is not available.');
      return;
    }
    const emailCheck = normalizeAndValidateInvitationEmail(email);
    if (!emailCheck.ok) {
      setError('error' in emailCheck ? emailCheck.error : 'Enter a valid email address.');
      return;
    }
    const normalizedEmail = emailCheck.email;

    const inv = createInvitation(
      {
        legalName: legalName.trim(),
        pan: pan.trim().toUpperCase(),
        category,
        email: normalizedEmail,
        contactName: contactName.trim(),
        entityId: entity.id,
        entityName: entity.name,
        countryCode: country.countryCode,
        countryName: country.countryName,
        message: message.trim() || undefined,
      },
      user?.name
    );

    if (!assertInvitationEmailBound(inv.basic.email, normalizedEmail)) {
      setError(
        'Email could not be bound to this invitation. Please re-enter the email and try again.'
      );
      return;
    }

    const url = buildInvitationUrl(inv.token);
    setLastUrl(url);
    setLastInviteMeta({
      email: inv.basic.email,
      legalName: inv.basic.legalName,
      entityName: inv.basic.entityName,
    });

    setEmailSending(true);
    const sendResult = await sendVendorInvitationEmail({
      to: normalizedEmail,
      invitationUrl: url,
      legalName: inv.basic.legalName,
      entityName: inv.basic.entityName,
      invitationId: inv.id,
    });
    setEmailSending(false);

    if (sendResult.ok) {
      if (sendResult.viaApi) {
        setEmailDelivery({ sentByApi: true });
      } else {
        setEmailDelivery({ sentByApi: false });
      }
    } else {
      setEmailDelivery({
        sentByApi: false,
        error: 'error' in sendResult ? sendResult.error : 'Automatic send failed.',
      });
    }

    console.info('[Vendor invite] Target email:', inv.basic.email, 'URL:', url, sendResult);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    const ents = getActiveEntities();
    setEntityId(ents[0]?.id ?? '');
    const pool = selectableCountriesFromMaster(countryRows);
    setCountryCode(pool[0]?.countryCode ?? '');
    setMessage('');
    setLegalName('');
    setPan('');
    setCategory(CATEGORIES[0]);
    setEmail('');
    setContactName('');
    setLastUrl(null);
    setLastInviteMeta(null);
    setEmailDelivery(null);
    setEmailSending(false);
    setError(null);
    setCopied(false);
  };

  const copyLink = async () => {
    if (!lastUrl) return;
    try {
      await navigator.clipboard.writeText(lastUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy link.');
    }
  };

  const resend = async (inv: VendorInvitation) => {
    const check = normalizeAndValidateInvitationEmail(inv.basic.email);
    if (!check.ok) {
      return;
    }
    extendInvitationExpiry(inv.id);
    const url = buildInvitationUrl(inv.token);
    navigator.clipboard.writeText(url).catch(() => {});
    const sendResult = await sendVendorInvitationEmail({
      to: check.email,
      invitationUrl: url,
      legalName: inv.basic.legalName,
      entityName: inv.basic.entityName,
      invitationId: inv.id,
    });
    if (!sendResult.ok || (sendResult.ok && !sendResult.viaApi)) {
      window.location.href = buildVendorInvitationMailto({
        to: check.email,
        legalName: inv.basic.legalName,
        invitationUrl: url,
        entityName: inv.basic.entityName,
      });
    }
  };

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <h1
            className="text-2xl md:text-3xl font-semibold tracking-tight"
            style={{ color: textMain }}
          >
            Vendor Invitations
          </h1>
          <p className="text-sm mt-1" style={{ color: textMuted }}>
            Manage and track vendor onboarding invitations.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setModalOpen(true);
              setLastUrl(null);
              setLastInviteMeta(null);
              setEmailDelivery(null);
              setEmailSending(false);
              setError(null);
              setLegalName('');
              setPan('');
              setCategory(CATEGORIES[0]);
              setEmail('');
              setContactName('');
              const ents = getActiveEntities();
              setEntityId(ents[0]?.id ?? '');
              const pool = selectableCountriesFromMaster(countryRows);
              setCountryCode(pool[0]?.countryCode ?? '');
              setMessage('');
              setCopied(false);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            <Plus className="w-4 h-4" />
            Send invitation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-6 w-full min-w-0">
        <KpiCard
          icon={<Mail className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#2563EB' }} />}
          label="Total sent"
          value={kpis.total}
        />
        <KpiCard
          icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#CA8A04' }} />}
          label="Pending"
          value={kpis.pending}
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#16A34A' }} />}
          label="Accepted"
          value={kpis.accepted}
        />
        <KpiCard
          icon={
            <XCircle
              className="w-5 h-5 sm:w-6 sm:h-6"
              style={{ color: 'var(--color-error-dark)' }}
            />
          }
          label="Expired"
          value={kpis.expired}
        />
      </div>

      <div
        className="rounded-lg p-4 mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
      >
        <div className="relative flex-1 max-w-xl">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: textMuted }}
          />
          <input
            type="search"
            placeholder="Search by vendor name, email, or invitation ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm outline-none"
            style={{ border: `1px solid ${border}`, backgroundColor: surface, color: textMain }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border"
            style={{
              borderColor: border,
              color: textMain,
              backgroundColor: showFilters ? surface : '#fff',
            }}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border"
            style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(['all', 'pending', 'accepted', 'expired'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: filterKind === k ? `${accent}22` : '#fff',
                color: filterKind === k ? accent : textMuted,
                border: `1px solid ${filterKind === k ? accent : border}`,
              }}
            >
              {k === 'all' ? 'All' : k.charAt(0).toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>
      )}

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, backgroundColor: surface }}>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Invitation ID
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Vendor name
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Email
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Invited by
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Invited date
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Status
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Expires in
                </th>
                <th
                  className="py-3 px-4 font-semibold text-xs uppercase tracking-wide"
                  style={{ color: textMuted }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: textMuted }}>
                    No invitations match your filters.
                  </td>
                </tr>
              ) : (
                filteredRows.map((inv) => {
                  const kind = getInvitationUiKind(inv, now);
                  const displayId = formatInvitationDisplayId(inv);
                  return (
                    <tr key={inv.id} style={{ borderBottom: `1px solid ${border}` }}>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-medium" style={{ color: accent }}>
                          {displayId}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium" style={{ color: textMain }}>
                        {inv.basic.legalName}
                      </td>
                      <td className="py-3 px-4" style={{ color: textMuted }}>
                        {inv.basic.email}
                      </td>
                      <td className="py-3 px-4" style={{ color: textMuted }}>
                        {inv.invitedByName ?? '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs" style={{ color: textMain }}>
                        {formatInvitedDate(inv.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusChip kind={kind} />
                      </td>
                      <td className="py-3 px-4" style={{ color: textMuted }}>
                        {formatExpiresIn(inv)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="text-xs font-medium hover:underline"
                            style={{ color: accent }}
                            onClick={() => resend(inv)}
                          >
                            Resend
                          </button>
                          <Link
                            to={`/vendor-management/review/${inv.id}`}
                            className="text-xs font-medium hover:underline"
                            style={{ color: accent }}
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(10, 15, 20, 0.45)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-2xl rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#fff', border: `1px solid ${border}` }}
          >
            <div className="px-8 py-5 border-b" style={{ borderColor: border }}>
              <h2 className="text-lg font-semibold" style={{ color: textMain }}>
                Send vendor invitation
              </h2>
              <p className="text-sm mt-2" style={{ color: textMuted }}>
                Basic details are prefilled for the vendor when they open the secure link.
              </p>
            </div>
            <div className="p-8">
              {!lastUrl ? (
                <form onSubmit={handleModalSubmit} className="flex flex-col gap-6">
                  <div
                    className="rounded-xl p-6"
                    style={{ backgroundColor: surface, border: `1px solid ${border}` }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Field label="Entity name" required>
                        <select
                          required
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={entityId}
                          onChange={(e) => setEntityId(e.target.value)}
                        >
                          {getActiveEntities().length === 0 ? (
                            <option value="">No entities in master</option>
                          ) : (
                            getActiveEntities().map((ent) => (
                              <option key={ent.id} value={ent.id}>
                                {ent.name}
                              </option>
                            ))
                          )}
                        </select>
                      </Field>
                      <Field label="Country" required>
                        <select
                          required
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                        >
                          {countryOptions.length === 0 ? (
                            <option value="">No countries in master</option>
                          ) : (
                            countryOptions.map((c) => (
                              <option key={c.id} value={c.countryCode}>
                                {c.countryName}
                              </option>
                            ))
                          )}
                        </select>
                      </Field>
                      <Field label="Vendor legal name" required>
                        <input
                          required
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={legalName}
                          onChange={(e) => setLegalName(e.target.value)}
                        />
                      </Field>
                      <Field label="PAN" required>
                        <input
                          required
                          className="w-full px-4 py-3 rounded-lg text-sm font-mono uppercase"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={pan}
                          onChange={(e) => setPan(e.target.value.toUpperCase())}
                          maxLength={10}
                        />
                      </Field>
                      <Field label="Category" required>
                        <select
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Contact name" required>
                        <input
                          required
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                        />
                      </Field>
                      <Field label="Email ID" required>
                        <input
                          required
                          type="email"
                          className="w-full px-4 py-3 rounded-lg text-sm"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </Field>
                      <Field label="Message">
                        <textarea
                          rows={4}
                          className="w-full px-4 py-3 rounded-lg text-sm resize-y min-h-[120px]"
                          style={{
                            border: `1px solid ${border}`,
                            color: textMain,
                            backgroundColor: '#fff',
                          }}
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          placeholder="Optional note for the vendor (shown on the invitation page)"
                        />
                      </Field>
                    </div>
                  </div>
                  {error && (
                    <p className="text-sm px-1" style={{ color: '#B91C1C' }}>
                      {error}
                    </p>
                  )}
                  <div
                    className="flex flex-col gap-4 md:flex-row md:justify-end pt-6 border-t"
                    style={{ borderColor: border }}
                  >
                    <button
                      type="button"
                      onClick={handleModalClose}
                      className="w-full md:w-auto px-6 py-3 rounded-lg text-sm font-medium border"
                      style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={emailSending}
                      className="w-full md:w-auto px-6 py-3 rounded-lg text-sm font-medium text-white"
                      style={{
                        backgroundColor: accent,
                        boxShadow: '0 1px 2px rgba(10, 15, 20, 0.06)',
                      }}
                    >
                      {emailSending ? 'Sending…' : 'Send invitation'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" style={{ color: accent }} />
                    <span className="font-medium" style={{ color: textMain }}>
                      Invitation created
                    </span>
                  </div>
                  {lastInviteMeta && (
                    <div
                      className="rounded-lg p-3 text-sm"
                      style={{ backgroundColor: surface, border: `1px solid ${border}` }}
                    >
                      <p style={{ color: textMuted }} className="text-xs mb-1">
                        Email recipient (from form)
                      </p>
                      <p className="font-medium break-all" style={{ color: textMain }}>
                        {lastInviteMeta.email}
                      </p>
                      {emailDelivery?.sentByApi ? (
                        <p className="mt-2 text-xs" style={{ color: '#047857' }}>
                          Message sent to this address via server.
                        </p>
                      ) : emailDelivery?.error ? (
                        <p className="mt-2 text-xs" style={{ color: '#B45309' }}>
                          Automatic send failed: {emailDelivery.error}. Use &quot;Open mail&quot;
                          below — the draft is addressed to the same email.
                        </p>
                      ) : (
                        <p className="mt-2 text-xs" style={{ color: textMuted }}>
                          No email API configured or send skipped. Use &quot;Open mail&quot; to send
                          from your app to the address above.
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm" style={{ color: textMuted }}>
                    Secure onboarding link:
                  </p>
                  <div
                    className="p-3 rounded-lg text-xs font-mono break-all"
                    style={{ backgroundColor: surface, border: `1px solid ${border}` }}
                  >
                    {lastUrl}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={copyLink}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
                      style={{ borderColor: border, color: textMain }}
                    >
                      <Link2 className="w-4 h-4" />
                      {copied ? 'Copied' : 'Copy link'}
                    </button>
                    {lastUrl && lastInviteMeta ? (
                      <a
                        href={buildVendorInvitationMailto({
                          to: lastInviteMeta.email,
                          legalName: lastInviteMeta.legalName,
                          invitationUrl: lastUrl,
                          entityName: lastInviteMeta.entityName,
                        })}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                        style={{ backgroundColor: accent }}
                      >
                        <Mail className="w-4 h-4" />
                        Open mail to vendor
                      </a>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleModalClose}
                    className="w-full py-2.5 rounded-lg text-sm font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div
      className="rounded-xl p-3 sm:p-5 flex items-start justify-between gap-2 sm:gap-3 min-w-0"
      style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-0.5 sm:mb-1 truncate"
          style={{ color: textMuted }}
        >
          {label}
        </p>
        <p
          className="text-xl sm:text-2xl font-semibold tabular-nums leading-tight"
          style={{ color: textMain }}
        >
          {value}
        </p>
      </div>
      <div
        className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: surface }}
      >
        {icon}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium mb-2" style={{ color: textMain }}>
        {label}
        {required && <span style={{ color: '#B91C1C' }}> *</span>}
      </label>
      {children}
    </div>
  );
}
