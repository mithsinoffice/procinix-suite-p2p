import { useCallback, useEffect, useState } from 'react';
import { mysqlApiRequest } from '../lib/mysql/client';

type TenantRow = {
  id: string;
  name: string;
  code: string;
  status: string;
  created_at?: string;
};

type EntityRow = {
  id: string;
  tenant_id: string;
  name: string;
  code: string | null;
  currency: string | null;
  country: string | null;
  isDefault?: boolean;
};

export function SuperAdminConsole() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  const [newTenantName, setNewTenantName] = useState('');
  const [newTenantCode, setNewTenantCode] = useState('');
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityCode, setNewEntityCode] = useState('');
  const [newEntityCurrency, setNewEntityCurrency] = useState('INR');
  const [newEntityCountry, setNewEntityCountry] = useState('');
  const [newEntityDefault, setNewEntityDefault] = useState(false);

  const loadTenants = useCallback(async () => {
    setLoadError('');
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: TenantRow[] }>('/admin/tenants');
      const list = res.data || [];
      setTenants(list);
      setSelectedTenantId((prev) => (prev || (list[0]?.id ?? '')));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load tenants');
    }
  }, []);

  const loadEntities = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setEntities([]);
      return;
    }
    setLoadError('');
    try {
      const res = await mysqlApiRequest<{ success: boolean; data: EntityRow[] }>(
        `/admin/tenants/${encodeURIComponent(tenantId)}/entities`,
      );
      setEntities(res.data || []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load entities');
    }
  }, []);

  useEffect(() => {
    void loadTenants();
  }, [loadTenants]);

  useEffect(() => {
    void loadEntities(selectedTenantId);
  }, [selectedTenantId, loadEntities]);

  const createTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName.trim() || !newTenantCode.trim()) return;
    setBusy(true);
    setLoadError('');
    try {
      await mysqlApiRequest('/admin/tenants', {
        method: 'POST',
        body: JSON.stringify({
          name: newTenantName.trim(),
          code: newTenantCode.trim(),
        }),
      });
      setNewTenantName('');
      setNewTenantCode('');
      await loadTenants();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Create tenant failed');
    } finally {
      setBusy(false);
    }
  };

  const createEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenantId || !newEntityName.trim()) return;
    setBusy(true);
    setLoadError('');
    try {
      await mysqlApiRequest(`/admin/tenants/${encodeURIComponent(selectedTenantId)}/entities`, {
        method: 'POST',
        body: JSON.stringify({
          name: newEntityName.trim(),
          code: newEntityCode.trim() || undefined,
          currency: newEntityCurrency.trim() || undefined,
          country: newEntityCountry.trim() || undefined,
          isDefault: newEntityDefault,
        }),
      });
      setNewEntityName('');
      setNewEntityCode('');
      setNewEntityDefault(false);
      await loadEntities(selectedTenantId);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Create entity failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <p className="text-sm" style={{ color: 'var(--color-mercury-grey)' }}>
        Create tenants first, then add entities under each tenant. Server enforces access via{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">SUPER_ADMIN_EMAILS</code> and the{' '}
        <code className="text-xs bg-slate-100 px-1 rounded">X-User-Email</code> header (set automatically after you sign
        in here).
      </p>

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>
      ) : null}

      <section className="rounded-xl border bg-white p-6" style={{ borderColor: 'var(--color-silver)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>
          Tenants
        </h2>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--color-silver)' }}>
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b" style={{ borderColor: 'var(--color-silver)' }}>
                  <td className="py-2 pr-4 font-mono text-xs">{t.code}</td>
                  <td className="py-2 pr-4">{t.name}</td>
                  <td className="py-2">{t.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={createTenant} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              New tenant name
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newTenantName}
              onChange={(ev) => setNewTenantName(ev.target.value)}
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Tenant code (unique)
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newTenantCode}
              onChange={(ev) => setNewTenantCode(ev.target.value.toUpperCase())}
              placeholder="ACME"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              Add tenant
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-6" style={{ borderColor: 'var(--color-silver)' }}>
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-ink)' }}>
          Entities under tenant
        </h2>
        <div className="mb-4">
          <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
            Select tenant
          </label>
          <select
            className="w-full max-w-md rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-silver)' }}
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
          >
            <option value="">—</option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.code} — {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: 'var(--color-silver)' }}>
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Currency</th>
                <th className="pb-2">Default</th>
              </tr>
            </thead>
            <tbody>
              {entities.map((en) => (
                <tr key={en.id} className="border-b" style={{ borderColor: 'var(--color-silver)' }}>
                  <td className="py-2 pr-4 font-mono text-xs">{en.code || '—'}</td>
                  <td className="py-2 pr-4">{en.name}</td>
                  <td className="py-2 pr-4">{en.currency || '—'}</td>
                  <td className="py-2">{en.isDefault ? 'Yes' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form onSubmit={createEntity} className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newEntityDefault} onChange={(e) => setNewEntityDefault(e.target.checked)} />
              Set as default entity for this tenant
            </label>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Entity name
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newEntityName}
              onChange={(ev) => setNewEntityName(ev.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Entity code
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newEntityCode}
              onChange={(ev) => setNewEntityCode(ev.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Currency
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newEntityCurrency}
              onChange={(ev) => setNewEntityCurrency(ev.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-mercury-grey)' }}>
              Country
            </label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-silver)' }}
              value={newEntityCountry}
              onChange={(ev) => setNewEntityCountry(ev.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !selectedTenantId}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-teal)' }}
            >
              Add entity
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
