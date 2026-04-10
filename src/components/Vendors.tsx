import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import {
  Search,
  Plus,
  Building2,
  CheckCircle,
  PauseCircle,
  Ban,
  Home,
  Globe2,
  Award,
  Eye,
  PencilLine,
  ArrowUpRight,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMasterData } from '../contexts/MasterDataContext';
import type { VendorMaster } from '../contexts/MasterDataContext';
import { PremiumActionButton, PremiumFilterMenu, toggleMultiSelect } from './ui/premium-register';

const surface = '#F6F9FC';
const border = '#E1E6EA';
const textMuted = '#6E7A82';
const textMain = '#0A0F14';
const accent = '#00A9B7';

function statusChipStyle(status: VendorMaster['status']): CSSProperties {
  switch (status) {
    case 'Active':
      return { backgroundColor: `${accent}18`, color: accent, border: `1px solid ${accent}55` };
    case 'Inactive':
      return { backgroundColor: '#F1F4F6', color: '#6E7A82', border: '1px solid #E1E6EA' };
    case 'Blocked':
      return { backgroundColor: '#FEE2E2', color: '#B91C1C', border: '1px solid #FECACA' };
    default:
      return { backgroundColor: '#F1F4F6', color: '#6E7A82', border: '1px solid #E1E6EA' };
  }
}

function Chip({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={style}
    >
      {children}
    </span>
  );
}

function entityLabel(v: VendorMaster): string {
  if (v.entityName?.trim()) return v.entityName.trim();
  if (v.entityId?.trim()) return v.entityId.trim();
  return '—';
}

function VendorKpiCard({
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

export function Vendors() {
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { vendors } = useMasterData();

  const pageTitle = location.pathname.includes('/vendor-management')
    ? 'Vendor Master'
    : 'Vendors';

  const listReturnState = { returnTo: `${location.pathname}${location.search}` };

  const filteredVendors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return vendors.filter((v) => {
      const hay = [
        v.name,
        v.legalName,
        v.code,
        v.category,
        v.entityName,
        v.entityId,
        v.vendorType,
        v.status,
        v.country,
        v.currency,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = !q || hay.includes(q);
      const matchesEntity = entityFilter.length === 0 || entityFilter.includes(entityLabel(v));
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(v.status);
      const matchesType = typeFilter.length === 0 || typeFilter.includes(v.vendorType);
      return matchesSearch && matchesEntity && matchesStatus && matchesType;
    });
  }, [entityFilter, searchTerm, statusFilter, typeFilter, vendors]);

  const kpis = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter((v) => v.status === 'Active').length;
    const inactive = vendors.filter((v) => v.status === 'Inactive').length;
    const blocked = vendors.filter((v) => v.status === 'Blocked').length;
    const domestic = vendors.filter((v) => v.vendorType === 'Domestic').length;
    const importCount = vendors.filter((v) => v.vendorType === 'Import').length;
    const msme = vendors.filter((v) => v.msmeRegistered).length;
    return { total, active, inactive, blocked, domestic, importCount, msme };
  }, [vendors]);
  const hasActiveFilters =
    searchTerm.trim().length > 0 || entityFilter.length > 0 || statusFilter.length > 0 || typeFilter.length > 0;

  return (
    <div className="p-6 md:p-8" style={{ backgroundColor: surface, minHeight: '100%' }}>
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-semibold min-w-0" style={{ color: textMain }}>
            {pageTitle}
          </h1>
          <button
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white shrink-0"
            style={{ backgroundColor: accent }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#007D87';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = accent;
            }}
            onClick={() => navigate('/add-vendor', { state: listReturnState })}
          >
            <Plus className="w-4 h-4" />
            Add vendor
          </button>
        </div>
        <p className="text-sm mt-1" style={{ color: textMuted }}>
          Browse vendors by entity, status, and classification.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <VendorKpiCard
          label="Total vendors"
          value={kpis.total}
          icon={<Building2 className="w-5 h-5" style={{ color: '#2563EB' }} />}
          iconColor="#2563EB"
        />
        <VendorKpiCard
          label="Active"
          value={kpis.active}
          icon={<CheckCircle className="w-5 h-5" style={{ color: '#16A34A' }} />}
          iconColor="#16A34A"
        />
        <VendorKpiCard
          label="Inactive"
          value={kpis.inactive}
          icon={<PauseCircle className="w-5 h-5" style={{ color: '#6E7A82' }} />}
          iconColor="#6E7A82"
        />
        <VendorKpiCard
          label="Blocked"
          value={kpis.blocked}
          icon={<Ban className="w-5 h-5" style={{ color: '#DC2626' }} />}
          iconColor="#DC2626"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        <VendorKpiCard
          label="Domestic"
          value={kpis.domestic}
          icon={<Home className="w-5 h-5" style={{ color: '#007D87' }} />}
          iconColor="#00A9B7"
        />
        <VendorKpiCard
          label="Import"
          value={kpis.importCount}
          icon={<Globe2 className="w-5 h-5" style={{ color: '#4338CA' }} />}
          iconColor="#4338CA"
        />
        <VendorKpiCard
          label="MSME registered"
          value={kpis.msme}
          icon={<Award className="w-5 h-5" style={{ color: '#CA8A04' }} />}
          iconColor="#CA8A04"
        />
      </div>

      <div
        className="rounded-lg overflow-hidden"
        style={{ border: `1px solid ${border}`, backgroundColor: '#fff' }}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div
              className="grid gap-4 px-4 py-4"
              style={{
                gridTemplateColumns: '2.6fr 1.2fr 1fr 1.3fr 1.2fr 0.9fr',
                borderBottom: `1px solid ${border}`,
              }}
            >
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: textMuted }}
                  />
                  <input
                    type="search"
                    placeholder="Search vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      border: `1px solid ${border}`,
                      backgroundColor: surface,
                      color: textMain,
                    }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setEntityFilter([]);
                      setStatusFilter([]);
                      setTypeFilter([]);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FED7D7',
                      color: '#C53030',
                      fontWeight: 600,
                    }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Entity"
                  options={[...new Set(vendors.map((vendor) => entityLabel(vendor)))]}
                  selected={entityFilter}
                  onToggle={(value) => setEntityFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Status"
                  options={['Active', 'Inactive', 'Blocked']}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <PremiumFilterMenu
                  label="Type"
                  options={['Domestic', 'Import']}
                  selected={typeFilter}
                  onToggle={(value) => setTypeFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
              <div />
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}`, backgroundColor: surface }}>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                    Vendor
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                    Entity
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                    Status
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                    Classification
                  </th>
                  <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wide" style={{ color: textMuted }}>
                    Payment
                  </th>
                  <th className="py-3 px-4 w-28" aria-hidden />
                </tr>
              </thead>
              <tbody>
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm" style={{ color: textMuted }}>
                    No vendors match your search.
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="group transition-colors cursor-pointer"
                    style={{ borderBottom: `1px solid ${border}` }}
                    onClick={() =>
                      navigate(`/add-vendor/${encodeURIComponent(vendor.id)}`, { state: listReturnState })
                    }
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = surface;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#fff';
                    }}
                  >
                    <td className="py-4 px-4 align-top">
                      <div className="flex gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: surface }}
                        >
                          <Building2 className="w-5 h-5" style={{ color: accent }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight" style={{ color: textMain }}>
                            {vendor.name}
                          </p>
                          {vendor.legalName && vendor.legalName !== vendor.name && (
                            <p className="text-xs mt-0.5 truncate max-w-[260px]" style={{ color: textMuted }}>
                              {vendor.legalName}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            <Chip
                              style={{
                                backgroundColor: '#fff',
                                color: textMain,
                                border: `1px solid ${border}`,
                              }}
                            >
                              {vendor.code}
                            </Chip>
                            {vendor.currency && (
                              <Chip
                                style={{
                                  backgroundColor: `${accent}12`,
                                  color: '#007D87',
                                  border: `1px solid ${accent}40`,
                                }}
                              >
                                {vendor.currency}
                              </Chip>
                            )}
                            {vendor.country && (
                              <Chip
                                style={{
                                  backgroundColor: surface,
                                  color: textMuted,
                                  border: `1px solid ${border}`,
                                }}
                              >
                                {vendor.country}
                              </Chip>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <p className="text-sm font-medium" style={{ color: textMain }}>
                        {entityLabel(vendor)}
                      </p>
                      {vendor.entityName && vendor.entityId && vendor.entityId !== vendor.entityName && (
                        <p className="text-xs mt-1 font-mono" style={{ color: textMuted }}>
                          {vendor.entityId}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 align-top">
                      <Chip style={statusChipStyle(vendor.status)}>{vendor.status}</Chip>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        <Chip
                          style={{
                            backgroundColor: surface,
                            color: textMain,
                            border: `1px solid ${border}`,
                          }}
                        >
                          {vendor.category}
                        </Chip>
                        <Chip
                          style={{
                            backgroundColor: vendor.vendorType === 'Import' ? '#EEF2FF' : surface,
                            color: vendor.vendorType === 'Import' ? '#4338CA' : textMuted,
                            border:
                              vendor.vendorType === 'Import'
                                ? '1px solid #C7D2FE'
                                : `1px solid ${border}`,
                          }}
                        >
                          {vendor.vendorType}
                        </Chip>
                        {vendor.msmeRegistered && (
                          <Chip
                            style={{
                              backgroundColor: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0',
                            }}
                          >
                            MSME
                            {vendor.msmeCategory ? ` · ${vendor.msmeCategory}` : ''}
                          </Chip>
                        )}
                        {vendor.tdsApplicable && (
                          <Chip
                            style={{
                              backgroundColor: '#FFFBEB',
                              color: '#B45309',
                              border: '1px solid #FDE68A',
                            }}
                          >
                            TDS
                          </Chip>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1.5">
                        <span className="text-sm font-medium" style={{ color: textMain }}>
                          {vendor.paymentTerms}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          <Chip
                            style={{
                              backgroundColor: surface,
                              color: textMuted,
                              border: `1px solid ${border}`,
                            }}
                          >
                            {vendor.creditDays} days credit
                          </Chip>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2 align-middle text-right">
                      <div className="flex items-center justify-end gap-2">
                        <PremiumActionButton
                          label="View vendor"
                          icon={<Eye className="w-4 h-4" />}
                          tone="teal"
                          onClick={() => navigate(`/add-vendor/${encodeURIComponent(vendor.id)}`, { state: listReturnState })}
                        />
                        <PremiumActionButton
                          label="Edit vendor"
                          icon={<PencilLine className="w-4 h-4" />}
                          tone="violet"
                          onClick={() => navigate(`/add-vendor/${encodeURIComponent(vendor.id)}`, { state: listReturnState })}
                        />
                        <PremiumActionButton
                          label="Open vendor"
                          icon={<ArrowUpRight className="w-4 h-4" />}
                          tone="blue"
                          onClick={() => navigate(`/add-vendor/${encodeURIComponent(vendor.id)}`, { state: listReturnState })}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs mt-3" style={{ color: textMuted }}>
        Showing {filteredVendors.length} of {vendors.length} vendors
      </p>
    </div>
  );
}
