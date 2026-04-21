import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Users,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle,
  Clock,
  Ban,
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';
import { usePortalUsers } from '../contexts/PortalUsersContext';
import type { PortalUser, PortalUserStatus } from '../types/portalUser';
import { Switch } from './ui/switch';
import { buildPortalWelcomeMailto, sendPortalWelcomeEmail } from '../lib/portalWelcomeEmail';

const surface = 'var(--color-cloud)';
const border = 'var(--color-silver)';
const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const accent = 'var(--color-teal)';

const PORTAL_ROLES = [
  'Primary Contact',
  'Finance Manager',
  'Admin',
  'Procurement',
  'Approver',
] as const;

function StatusBadge({ status }: { status: PortalUserStatus }) {
  const map: Record<PortalUserStatus, { label: string; bg: string; color: string }> = {
    pending: { label: 'Pending', bg: '#FFFBEB', color: '#B45309' },
    active: { label: 'Active', bg: '#ECFDF5', color: '#047857' },
    suspended: { label: 'Suspended', bg: '#FEF2F2', color: '#B91C1C' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconColor,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  iconColor: string;
}) {
  return (
    <div
      className="rounded-lg p-4 flex items-center gap-3 min-w-0"
      style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
    >
      <div className="rounded-lg p-2 shrink-0" style={{ backgroundColor: `${iconColor}18` }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide truncate" style={{ color: textMuted }}>
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums" style={{ color: textMain }}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function PortalUsers() {
  const { getActiveVendors } = useMasterData();
  const vendors = useMemo(() => getActiveVendors(), [getActiveVendors]);
  const { users, hydrated, addUser, updateUser, suspendUser, activateUser } = usePortalUsers();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PortalUserStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PortalUser | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [role, setRole] = useState<string>(PORTAL_ROLES[0]);
  const [sendWelcome, setSendWelcome] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const kpis = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const pending = users.filter((u) => u.status === 'pending').length;
    const suspended = users.filter((u) => u.status === 'suspended').length;
    return { total, active, pending, suspended };
  }, [users]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (!q) return true;
      const hay = [
        u.userId,
        u.firstName,
        u.lastName,
        u.email,
        u.vendorName,
        u.vendorCode,
        u.role,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [users, search, statusFilter]);

  const openAdd = () => {
    setEditing(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setVendorId(vendors[0]?.id ?? '');
    setRole(PORTAL_ROLES[0]);
    setSendWelcome(true);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (u: PortalUser) => {
    setEditing(u);
    setFirstName(u.firstName);
    setLastName(u.lastName);
    setEmail(u.email);
    setVendorId(u.vendorId);
    setRole(u.role);
    setSendWelcome(false);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
    setSubmitBusy(false);
  };

  const handleExport = () => {
    const headers = ['User ID', 'Name', 'Email', 'Vendor', 'Vendor code', 'Role', 'Status', 'Last login'];
    const rows = filtered.map((u) => [
      u.userId,
      `${u.firstName} ${u.lastName}`,
      u.email,
      u.vendorName,
      u.vendorCode,
      u.role,
      u.status,
      u.lastLoginAt ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))].join(
      '\n'
    );
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portal-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First and last name are required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Enter a valid email address.');
      return;
    }
    const v = vendors.find((x) => x.id === vendorId);
    if (!v) {
      setFormError('Select a vendor.');
      return;
    }

    setSubmitBusy(true);
    try {
      if (editing) {
        updateUser(editing.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          role,
          vendorId: v.id,
          vendorCode: v.code,
          vendorName: v.name,
        });
        closeModal();
        return;
      }

      const row = addUser({
        firstName,
        lastName,
        email,
        vendorId: v.id,
        vendorCode: v.code,
        vendorName: v.name,
        role,
        status: 'pending',
      });

      const loginUrl = `${window.location.origin}/login`;
      if (sendWelcome) {
        const sendResult = await sendPortalWelcomeEmail({
          to: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          vendorName: row.vendorName,
          role: row.role,
          loginUrl,
        });
        if (!sendResult.ok) {
          setFormError('error' in sendResult ? sendResult.error : 'Welcome email request failed.');
          return;
        }
        if (!sendResult.viaApi) {
          window.open(
            buildPortalWelcomeMailto({
              to: row.email,
              firstName: row.firstName,
              lastName: row.lastName,
              vendorName: row.vendorName,
              role: row.role,
              loginUrl,
            }),
            '_blank',
            'noopener,noreferrer'
          );
        }
      }

      closeModal();
    } finally {
      setSubmitBusy(false);
    }
  };

  if (!hydrated) {
    return (
      <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
        <p className="text-sm" style={{ color: textMuted }}>
          Loading portal users…
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ color: textMain }}>
            Portal Users
          </h1>
          <p className="text-sm mt-1" style={{ color: textMuted }}>
            Manage vendor portal user access and permissions. These users can receive invitations and complete vendor
            onboarding.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setStatusFilter('all');
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors"
            style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: accent }}
          >
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard
          label="Total Users"
          value={kpis.total}
          icon={<Users className="w-5 h-5" style={{ color: '#2563EB' }} />}
          iconColor="#2563EB"
        />
        <KpiCard
          label="Active"
          value={kpis.active}
          icon={<CheckCircle className="w-5 h-5" style={{ color: '#16A34A' }} />}
          iconColor="#16A34A"
        />
        <KpiCard
          label="Pending"
          value={kpis.pending}
          icon={<Clock className="w-5 h-5" style={{ color: '#CA8A04' }} />}
          iconColor="#CA8A04"
        />
        <KpiCard
          label="Suspended"
          value={kpis.suspended}
          icon={<Ban className="w-5 h-5" style={{ color: 'var(--color-error-dark)' }} />}
          iconColor="var(--color-error-dark)"
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
            placeholder="Search by name, email, vendor, or user ID..."
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
          {(['all', 'pending', 'active', 'suspended'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setStatusFilter(k)}
              className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: statusFilter === k ? `${accent}22` : '#fff',
                color: statusFilter === k ? accent : textMuted,
                border: `1px solid ${statusFilter === k ? accent : border}`,
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
          <table className="w-full min-w-[960px] text-sm text-left">
            <thead>
              <tr style={{ borderBottom: `1px solid ${border}`, backgroundColor: surface }}>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  User ID
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Name
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Email
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Vendor
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Role
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Status
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Last login
                </th>
                <th className="py-3 px-4 font-semibold text-xs uppercase tracking-wide" style={{ color: textMuted }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: textMuted }}>
                    {users.length === 0
                      ? 'No portal users yet. Add a user to invite them to the vendor portal.'
                      : 'No users match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${border}` }}>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs font-medium" style={{ color: accent }}>
                        {u.userId}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium" style={{ color: textMain }}>
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="py-3 px-4" style={{ color: textMuted }}>
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium" style={{ color: textMain }}>
                        {u.vendorName}
                      </div>
                      <div className="text-xs" style={{ color: textMuted }}>
                        {u.vendorCode}
                      </div>
                    </td>
                    <td className="py-3 px-4" style={{ color: textMuted }}>
                      {u.role}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="py-3 px-4 font-mono text-xs" style={{ color: textMuted }}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="text-xs font-medium hover:underline"
                          style={{ color: accent }}
                          onClick={() => openEdit(u)}
                        >
                          Edit
                        </button>
                        {u.status === 'active' && (
                          <button
                            type="button"
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#B91C1C' }}
                            onClick={() => suspendUser(u.id)}
                          >
                            Suspend
                          </button>
                        )}
                        {u.status === 'suspended' && (
                          <button
                            type="button"
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#047857' }}
                            onClick={() => activateUser(u.id)}
                          >
                            Activate
                          </button>
                        )}
                        {u.status === 'pending' && (
                          <button
                            type="button"
                            className="text-xs font-medium hover:underline"
                            style={{ color: '#047857' }}
                            onClick={() => activateUser(u.id)}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
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
          aria-labelledby="portal-user-modal-title"
        >
          <div
            className="w-full max-w-lg rounded-xl shadow-xl p-6 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: '#fff', border: `1px solid ${border}` }}
          >
            <h2 id="portal-user-modal-title" className="text-lg font-semibold" style={{ color: textMain }}>
              {editing ? 'Edit portal user' : 'Add Portal User'}
            </h2>
            <p className="text-sm mt-1 mb-6" style={{ color: textMuted }}>
              {editing
                ? 'Update user details for vendor portal access.'
                : 'Create a new user account for vendor portal access.'}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: textMuted }}>
                    First name <span style={{ color: 'var(--color-error-dark)' }}>*</span>
                  </label>
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ border: `1px solid ${border}`, color: textMain }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: textMuted }}>
                    Last name <span style={{ color: 'var(--color-error-dark)' }}>*</span>
                  </label>
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ border: `1px solid ${border}`, color: textMain }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textMuted }}>
                  Email address <span style={{ color: 'var(--color-error-dark)' }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="john.doe@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ border: `1px solid ${border}`, color: textMain }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textMuted }}>
                  Vendor <span style={{ color: 'var(--color-error-dark)' }}>*</span>
                </label>
                <select
                  required
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white"
                  style={{ border: `1px solid ${border}`, color: textMain }}
                >
                  <option value="">Select vendor</option>
                  {vendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.code})
                    </option>
                  ))}
                </select>
                {vendors.length === 0 && (
                  <p className="text-xs mt-1" style={{ color: '#B91C1C' }}>
                    Add vendors in Vendor Master first.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: textMuted }}>
                  Role <span style={{ color: 'var(--color-error-dark)' }}>*</span>
                </label>
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none bg-white"
                  style={{ border: `1px solid ${border}`, color: textMain }}
                >
                  <option value="">Select role</option>
                  {PORTAL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {!editing && (
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-sm" style={{ color: textMain }}>
                    Send welcome email with login instructions
                  </span>
                  <Switch
                    checked={sendWelcome}
                    onCheckedChange={setSendWelcome}
                    className="data-[state=checked]:bg-[var(--color-teal)]"
                  />
                </div>
              )}

              {formError && (
                <p className="text-sm" style={{ color: '#B91C1C' }}>
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium border"
                  style={{ borderColor: border, color: textMain, backgroundColor: '#fff' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitBusy || vendors.length === 0}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                >
                  {submitBusy ? 'Saving…' : editing ? 'Save changes' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
