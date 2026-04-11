/**
 * Shared read-only labels for vendor onboarding data (portal form → vendor master on approval).
 * Used by Vendor Review detail; mirrors VendorInvitationPortal field groups.
 */
import type { VendorInviteBasics, VendorSubmissionPayload } from '../types/vendorInvitation';

const textMuted = 'var(--color-mercury-grey)';
const textMain = 'var(--color-ink)';
const border = 'var(--color-silver)';

export function InviteBasicsReadonly({ basic }: { basic: VendorInviteBasics }) {
  return (
    <section className="rounded-xl p-6" style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}>
      <h2 className="text-sm font-semibold mb-4" style={{ color: textMain }}>
        Invite (prefill from procurement)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Entity
          </p>
          <p style={{ color: textMain }}>{basic.entityName ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Country
          </p>
          <p style={{ color: textMain }}>{basic.countryName ?? '—'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Legal name
          </p>
          <p style={{ color: textMain }}>{basic.legalName}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            PAN
          </p>
          <p className="font-mono" style={{ color: textMain }}>
            {basic.pan}
          </p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Category
          </p>
          <p style={{ color: textMain }}>{basic.category}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Email
          </p>
          <p style={{ color: textMain }}>{basic.email}</p>
        </div>
        <div>
          <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
            Contact
          </p>
          <p style={{ color: textMain }}>{basic.contactName}</p>
        </div>
        {basic.message?.trim() ? (
          <div className="col-span-2 pt-2 border-t" style={{ borderColor: border }}>
            <p className="text-xs font-medium tracking-wide mb-1.5" style={{ color: textMuted }}>
              Message to vendor
            </p>
            <p style={{ color: textMain }} className="whitespace-pre-wrap">
              {basic.message}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function VendorMasterFormReadonly({ s }: { s: VendorSubmissionPayload }) {
  return (
    <section className="rounded-xl p-6" style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}>
      <h2 className="text-sm font-semibold mb-1" style={{ color: textMain }}>
        Vendor master onboarding form
      </h2>
      <p className="text-xs mb-4" style={{ color: textMuted }}>
        Same fields as the invitation link portal. On approval, these map to the Vendor Master record (name, GSTIN,
        contact, address, bank).
      </p>
      <dl className="text-sm grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <dt style={{ color: textMuted }}>Trade / display name (→ master name)</dt>
          <dd style={{ color: textMain }}>{s.tradeName}</dd>
        </div>
        <div>
          <dt style={{ color: textMuted }}>GSTIN (→ master GSTIN)</dt>
          <dd className="font-mono" style={{ color: textMain }}>
            {s.gstin}
          </dd>
        </div>
        <div>
          <dt style={{ color: textMuted }}>Phone (→ master phone)</dt>
          <dd style={{ color: textMain }}>{s.phone}</dd>
        </div>
        <div>
          <dt style={{ color: textMuted }}>Vendor type (→ master)</dt>
          <dd style={{ color: textMain }}>{s.vendorType}</dd>
        </div>
        <div className="col-span-2">
          <dt style={{ color: textMuted }}>Registered address (→ master address)</dt>
          <dd style={{ color: textMain }}>
            {s.addressLine1}, {s.city}, {s.state} {s.pincode}, {s.country}
          </dd>
        </div>
        <div className="col-span-2">
          <dt style={{ color: textMuted }}>Primary bank (→ master bank account)</dt>
          <dd style={{ color: textMain }}>
            {s.bankName} · {s.bankAccountName} · A/c {s.bankAccountNumber} · IFSC {s.bankIfsc}
          </dd>
        </div>
        {s.vendorNotes && (
          <div className="col-span-2">
            <dt style={{ color: textMuted }}>Vendor notes</dt>
            <dd style={{ color: textMain }}>{s.vendorNotes}</dd>
          </div>
        )}
      </dl>
      {s.documents.length > 0 && (
        <ul className="mt-4 text-sm list-disc pl-5" style={{ color: textMain }}>
          {s.documents.map((d) => (
            <li key={d.id}>
              {d.fileName} <span style={{ color: textMuted }}>({d.label})</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
