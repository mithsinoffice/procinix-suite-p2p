import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2 } from 'lucide-react';

/**
 * Shown after login when the user belongs to more than one platform entity
 * (`entities` + `user_entity_access`). Confirms session scope before the main shell.
 */
export function PlatformEntityGate() {
  const { user, confirmPlatformEntity } = useAuth();
  const [entityId, setEntityId] = useState(() => user?.platformEntities?.[0]?.id ?? '');

  if (!user?.platformEntities?.length) {
    return null;
  }

  const onContinue = () => {
    if (!entityId) return;
    confirmPlatformEntity(entityId);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.55)' }}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl"
        style={{ border: '1px solid var(--color-silver)' }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8" style={{ color: 'var(--color-teal)' }} />
          <h1 className="text-xl font-semibold" style={{ color: 'var(--color-ink)' }}>
            Choose entity
          </h1>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--color-mercury-grey)' }}>
          Tenant: <strong>{user.tenantName || user.tenantCode || user.tenantId}</strong>. Select the
          legal entity this session applies to.
        </p>
        <label className="block text-sm mb-2" style={{ color: 'var(--color-mercury-grey)' }}>
          Entity
        </label>
        <select
          className="w-full rounded-lg border px-3 py-2.5 mb-6 text-sm"
          style={{ borderColor: 'var(--color-silver)', color: 'var(--color-ink)' }}
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
        >
          {user.platformEntities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} {e.code ? `(${e.code})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="w-full rounded-lg py-3 text-white text-sm font-medium"
          style={{ backgroundColor: 'var(--color-teal)' }}
          onClick={onContinue}
        >
          Continue to app
        </button>
      </div>
    </div>
  );
}
