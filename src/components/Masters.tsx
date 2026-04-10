import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  BadgeCheck,
  Banknote,
  Briefcase,
  Building2,
  ChevronDown,
  Coins,
  CreditCard,
  Database,
  Filter,
  FolderTree,
  Globe2,
  Landmark,
  LayoutGrid,
  MapPinned,
  Palette,
  PencilLine,
  Ruler,
  Search,
  Shield,
  Tags,
  TrendingUp,
  Truck,
  X,
  UserCog,
  UserRound,
  Users,
  WalletCards,
  Eye,
} from 'lucide-react';
import { useMasterData } from '../contexts/MasterDataContext';

type MasterDomain =
  | 'Procurement'
  | 'Finance'
  | 'Identity'
  | 'Organization'
  | 'Commercial'
  | 'Reference';

type MasterScope = 'Global' | 'Entity Scoped' | 'Multi Entity';
type MasterStatus = 'Live' | 'Workflow Enabled';
type MasterAccess = 'Admin' | 'Operational' | 'Controlled';

interface MasterRegisterRow {
  id: string;
  title: string;
  description: string;
  route: string;
  domain: MasterDomain;
  scope: MasterScope;
  entity: string;
  access: MasterAccess;
  status: MasterStatus;
  badge: string;
  icon: typeof Database;
  iconTint: string;
  iconBg: string;
}

const masterRegister: MasterRegisterRow[] = [
  {
    id: 'entity-master',
    title: 'Entity Master',
    description: 'Legal entities, companies, plants, branches and operating units.',
    route: '/masters/entity-master',
    domain: 'Organization',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Admin',
    status: 'Workflow Enabled',
    badge: 'Core',
    icon: Building2,
    iconTint: '#0F766E',
    iconBg: 'linear-gradient(135deg, #D9FFFB 0%, #B6F6EE 100%)',
  },
  {
    id: 'department-master',
    title: 'Department Master',
    description: 'Department structure used for approvals, budgeting and ownership.',
    route: '/masters/department-master',
    domain: 'Organization',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Org',
    icon: Landmark,
    iconTint: '#2563EB',
    iconBg: 'linear-gradient(135deg, #E0EEFF 0%, #D5E5FF 100%)',
  },
  {
    id: 'employee-master',
    title: 'Employee Master',
    description: 'Employee profiles, approver identities and organizational ownership.',
    route: '/masters/employee-master',
    domain: 'Identity',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Identity',
    icon: UserRound,
    iconTint: '#7C3AED',
    iconBg: 'linear-gradient(135deg, #EEE2FF 0%, #E2D5FF 100%)',
  },
  {
    id: 'user-master',
    title: 'User Master',
    description: 'Login-enabled users mapped to employee and role masters.',
    route: '/masters/user-master',
    domain: 'Identity',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Admin',
    status: 'Workflow Enabled',
    badge: 'Security',
    icon: UserCog,
    iconTint: '#9333EA',
    iconBg: 'linear-gradient(135deg, #F3E8FF 0%, #EEDBFF 100%)',
  },
  {
    id: 'roles-master',
    title: 'Roles Master',
    description: 'Access roles and workflow participation controls.',
    route: '/masters/roles-master',
    domain: 'Identity',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Admin',
    status: 'Workflow Enabled',
    badge: 'Security',
    icon: Shield,
    iconTint: '#7C2D12',
    iconBg: 'linear-gradient(135deg, #FFF1E3 0%, #FFE6CF 100%)',
  },
  {
    id: 'vendor-master',
    title: 'Vendor Master',
    description: 'Supplier governance, tax, banking, entity applicability and contact data.',
    route: '/vendors',
    domain: 'Commercial',
    scope: 'Multi Entity',
    entity: 'Multi Entity',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Supplier',
    icon: Truck,
    iconTint: '#0E7490',
    iconBg: 'linear-gradient(135deg, #DFF7FF 0%, #CBEFFF 100%)',
  },
  {
    id: 'vendor-payment-terms-master',
    title: 'Vendor Payment Terms',
    description: 'Credit periods, settlement terms and default payable conditions.',
    route: '/masters/vendor-payment-terms-master',
    domain: 'Finance',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Payables',
    icon: CreditCard,
    iconTint: '#0F766E',
    iconBg: 'linear-gradient(135deg, #DDFBF4 0%, #C8F7EC 100%)',
  },
  {
    id: 'item-master',
    title: 'Item Master',
    description: 'Operational goods and services catalog for downstream transactions.',
    route: '/masters/item-master',
    domain: 'Procurement',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Catalog',
    icon: LayoutGrid,
    iconTint: '#2563EB',
    iconBg: 'linear-gradient(135deg, #E2ECFF 0%, #D5E1FF 100%)',
  },
  {
    id: 'product-master',
    title: 'Product Master',
    description: 'Commercial product codes, descriptions and HSN assignments.',
    route: '/masters/product-master',
    domain: 'Commercial',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Catalog',
    icon: Tags,
    iconTint: '#7C3AED',
    iconBg: 'linear-gradient(135deg, #EFE4FF 0%, #E6D8FF 100%)',
  },
  {
    id: 'sku-master',
    title: 'SKU Master',
    description: 'Sellable and purchasable SKU combinations built from product attributes.',
    route: '/masters/sku-master',
    domain: 'Commercial',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Catalog',
    icon: BadgeCheck,
    iconTint: '#4338CA',
    iconBg: 'linear-gradient(135deg, #E7E5FF 0%, #DDD6FE 100%)',
  },
  {
    id: 'category-master',
    title: 'Category Master',
    description: 'Category grouping for commercial and procurement classification.',
    route: '/masters/category-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Reference',
    icon: FolderTree,
    iconTint: '#0F766E',
    iconBg: 'linear-gradient(135deg, #DDFBF4 0%, #C9F6EA 100%)',
  },
  {
    id: 'item-category-master',
    title: 'Item Category Master',
    description: 'Procurement categorization used in PR and sourcing flows.',
    route: '/masters/item-category-master',
    domain: 'Procurement',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Reference',
    icon: FolderTree,
    iconTint: '#0369A1',
    iconBg: 'linear-gradient(135deg, #E0F2FE 0%, #CFE9FC 100%)',
  },
  {
    id: 'uom-master',
    title: 'UOM Master',
    description: 'Standard units of measure for all operational documents.',
    route: '/masters/uom-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Reference',
    icon: Ruler,
    iconTint: '#6D28D9',
    iconBg: 'linear-gradient(135deg, #F1E7FF 0%, #E6D7FF 100%)',
  },
  {
    id: 'tax-code-master',
    title: 'Tax Code Master',
    description: 'Tax treatment, GST codes and accounting applicability.',
    route: '/masters/tax-code-master',
    domain: 'Finance',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Compliance',
    icon: Banknote,
    iconTint: '#B45309',
    iconBg: 'linear-gradient(135deg, #FFF4DD 0%, #FFEBC7 100%)',
  },
  {
    id: 'debit-note-reason-master',
    title: 'Debit Note Reason Master',
    description: 'Debit note classification and reason governance.',
    route: '/masters/debit-note-reason-master',
    domain: 'Finance',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'AP',
    icon: WalletCards,
    iconTint: '#BE123C',
    iconBg: 'linear-gradient(135deg, #FFE4EA 0%, #FFD6E0 100%)',
  },
  {
    id: 'cost-centre-master',
    title: 'Cost Centre Master',
    description: 'Cost ownership structure for spend control and accounting.',
    route: '/masters/cost-centre-master',
    domain: 'Finance',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Finance',
    icon: Briefcase,
    iconTint: '#0F766E',
    iconBg: 'linear-gradient(135deg, #DDFCF1 0%, #C9F6E3 100%)',
  },
  {
    id: 'profit-centre-master',
    title: 'Profit Centre Master',
    description: 'Profit accountability structure for commercial performance.',
    route: '/masters/profit-centre-master',
    domain: 'Finance',
    scope: 'Entity Scoped',
    entity: 'Entity Mapped',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Finance',
    icon: TrendingUp,
    iconTint: '#0369A1',
    iconBg: 'linear-gradient(135deg, #DDF3FF 0%, #CAE9FF 100%)',
  },
  {
    id: 'contract-master',
    title: 'Contract Master',
    description: 'Contract visibility, validity and supplier commercial coverage.',
    route: '/masters/contract-master',
    domain: 'Commercial',
    scope: 'Multi Entity',
    entity: 'Multi Entity',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Commercial',
    icon: Database,
    iconTint: '#7C2D12',
    iconBg: 'linear-gradient(135deg, #FFF0E5 0%, #FFE3D0 100%)',
  },
  {
    id: 'country-master',
    title: 'Country Master',
    description: 'Country reference used for address, tax and currency logic.',
    route: '/masters/country-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Geo',
    icon: Globe2,
    iconTint: '#0369A1',
    iconBg: 'linear-gradient(135deg, #E1F5FE 0%, #D0EEFD 100%)',
  },
  {
    id: 'state-master',
    title: 'State Master',
    description: 'State and regional mapping used for tax and address validation.',
    route: '/masters/state-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Geo',
    icon: MapPinned,
    iconTint: '#2563EB',
    iconBg: 'linear-gradient(135deg, #E3EEFF 0%, #D7E7FF 100%)',
  },
  {
    id: 'currency-master',
    title: 'Currency Master',
    description: 'Supported currencies and valuation definitions.',
    route: '/masters/currency-master',
    domain: 'Finance',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Treasury',
    icon: Coins,
    iconTint: '#0F766E',
    iconBg: 'linear-gradient(135deg, #DBFFF5 0%, #C9F8EB 100%)',
  },
  {
    id: 'exchange-rate-master',
    title: 'Exchange Rate Master',
    description: 'Cross-currency exchange maintenance for multi-currency processing.',
    route: '/masters/exchange-rate-master',
    domain: 'Finance',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Controlled',
    status: 'Workflow Enabled',
    badge: 'Treasury',
    icon: TrendingUp,
    iconTint: '#047857',
    iconBg: 'linear-gradient(135deg, #E4FFF1 0%, #D0FAE5 100%)',
  },
  {
    id: 'color-master',
    title: 'Color Master',
    description: 'Color standards used by commercial and inventory structures.',
    route: '/masters/color-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Attribute',
    icon: Palette,
    iconTint: '#DB2777',
    iconBg: 'linear-gradient(135deg, #FFE5F2 0%, #FFD8EB 100%)',
  },
  {
    id: 'size-master',
    title: 'Size Master',
    description: 'Sizing grids and sort logic for variant-driven SKUs.',
    route: '/masters/size-master',
    domain: 'Reference',
    scope: 'Global',
    entity: 'All Entities',
    access: 'Operational',
    status: 'Workflow Enabled',
    badge: 'Attribute',
    icon: Ruler,
    iconTint: '#9333EA',
    iconBg: 'linear-gradient(135deg, #F5E8FF 0%, #ECD8FF 100%)',
  },
];

function FilterMenu({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D7E3EA',
          color: '#0A0F14',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
        }}
      >
        <Filter className="w-4 h-4" style={{ color: '#00A9B7' }} />
        <span>{label}</span>
        {selected.length > 0 && (
          <span
            className="px-2 py-0.5 rounded-full text-xs"
            style={{ backgroundColor: '#E7FBFD', color: '#00808C', fontWeight: 700 }}
          >
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-4 h-4" style={{ color: '#6E7A82' }} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 w-64 rounded-2xl p-3 z-20"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D7E3EA',
            boxShadow: '0 24px 48px rgba(15, 23, 42, 0.12)',
          }}
        >
          <div className="flex flex-wrap gap-2 mb-3">
            {selected.length === 0 ? (
              <span className="text-xs" style={{ color: '#6E7A82' }}>No filters selected</span>
            ) : (
              selected.map((value) => (
                <span
                  key={value}
                  className="px-2.5 py-1 rounded-full text-xs"
                  style={{ backgroundColor: '#ECFEFF', color: '#0F766E', fontWeight: 700 }}
                >
                  {value}
                </span>
              ))
            )}
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {options.map((option) => {
              const isSelected = selected.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onToggle(option)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: isSelected ? '#E7FBFD' : '#FFFFFF',
                    color: '#0A0F14',
                    border: `1px solid ${isSelected ? '#7ADBE3' : 'transparent'}`,
                  }}
                >
                  <span>{option}</span>
                  {isSelected && (
                    <span
                      className="px-2 py-0.5 rounded-full text-[11px]"
                      style={{ backgroundColor: '#00A9B7', color: '#FFFFFF', fontWeight: 700 }}
                    >
                      On
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid #EDF3F7' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: '#0A0F14', color: '#FFFFFF', fontWeight: 600 }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function toggleMultiSelect(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
}

export function Masters() {
  const navigate = useNavigate();
  const { currentCompany } = useMasterData();
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState<string[]>([]);
  const [scopeFilter, setScopeFilter] = useState<string[]>([]);
  const [entityFilter, setEntityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const filteredMasters = useMemo(() => {
    return masterRegister.filter((master) => {
      const searchValue = search.trim().toLowerCase();
      const matchesSearch =
        !searchValue ||
        master.title.toLowerCase().includes(searchValue) ||
        master.description.toLowerCase().includes(searchValue) ||
        master.domain.toLowerCase().includes(searchValue) ||
        master.entity.toLowerCase().includes(searchValue);

      const matchesDomain = domainFilter.length === 0 || domainFilter.includes(master.domain);
      const matchesScope = scopeFilter.length === 0 || scopeFilter.includes(master.scope);
      const matchesEntity = entityFilter.length === 0 || entityFilter.includes(master.entity);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(master.status);

      return matchesSearch && matchesDomain && matchesScope && matchesEntity && matchesStatus;
    });
  }, [domainFilter, entityFilter, scopeFilter, search, statusFilter]);

  const totalLive = filteredMasters.filter((master) => master.status === 'Live').length;
  const totalWorkflow = filteredMasters.filter((master) => master.status === 'Workflow Enabled').length;
  const hasActiveFilters =
    search.trim().length > 0 ||
    domainFilter.length > 0 ||
    scopeFilter.length > 0 ||
    entityFilter.length > 0 ||
    statusFilter.length > 0;

  const clearFilters = () => {
    setSearch('');
    setDomainFilter([]);
    setScopeFilter([]);
    setEntityFilter([]);
    setStatusFilter([]);
  };

  return (
    <div className="p-8" style={{ background: 'linear-gradient(180deg, #EEF6FB 0%, #F6F9FC 42%, #F6F9FC 100%)', minHeight: '100vh' }}>
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #DDF8FF 0%, #CBEFFF 100%)',
                boxShadow: '0 14px 30px rgba(0, 169, 183, 0.14)',
              }}
            >
              <Database className="w-6 h-6" style={{ color: '#008A96' }} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E7FBFD', color: '#00808C', fontWeight: 700 }}>
                Master Register
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#E8FFF2', color: '#0F9D69', fontWeight: 700 }}>
                {filteredMasters.length} Active Views
              </span>
              <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }}>
                Entity: {currentCompany?.name || 'All Entities'}
              </span>
            </div>
          </div>
          <h1 className="text-3xl mb-2" style={{ color: '#0A0F14', fontWeight: 700 }}>Masters</h1>
          <p style={{ color: '#6E7A82', maxWidth: '840px' }}>
            Review master domains, entity applicability, governance status, and open the right maintenance screen from one premium operational register.
          </p>
        </div>

        <div
          className="rounded-3xl p-5 min-w-[300px]"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #D7E3EA',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.06)',
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Workflow Enabled</p>
              <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: 700 }}>{totalWorkflow}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#6E7A82' }}>Live Only</p>
              <p className="text-2xl" style={{ color: '#0A0F14', fontWeight: 700 }}>{totalLive}</p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="rounded-[28px] overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #D7E3EA',
          boxShadow: '0 24px 52px rgba(15, 23, 42, 0.07)',
        }}
      >
        <div className="overflow-x-auto">
          <div style={{ minWidth: '1380px' }}>
            <div
              className="grid gap-4 px-6 py-4"
              style={{
                gridTemplateColumns: '3.1fr 1.2fr 1.2fr 1.2fr 1fr 1fr 0.9fr',
                backgroundColor: '#FFFFFF',
                borderBottom: '1px solid #E8F0F4',
              }}
            >
              <div className="space-y-2">
                <div className="relative w-full">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#6E7A82' }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search master..."
                    className="w-full pl-11 pr-4 py-2.5 rounded-2xl text-sm"
                    style={{
                      backgroundColor: '#F8FBFD',
                      border: '1px solid #D7E3EA',
                      color: '#0A0F14',
                    }}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: '#FFF5F5',
                      border: '1px solid #FED7D7',
                      color: '#C53030',
                      fontWeight: 600,
                    }}
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </button>
                )}
              </div>
              <div className="flex items-start">
                <FilterMenu
                  label="Domain"
                  options={[...new Set(masterRegister.map((master) => master.domain))]}
                  selected={domainFilter}
                  onToggle={(value) => setDomainFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <FilterMenu
                  label="Scope"
                  options={[...new Set(masterRegister.map((master) => master.scope))]}
                  selected={scopeFilter}
                  onToggle={(value) => setScopeFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div className="flex items-start">
                <FilterMenu
                  label="Entity"
                  options={[...new Set(masterRegister.map((master) => master.entity))]}
                  selected={entityFilter}
                  onToggle={(value) => setEntityFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
              <div className="flex items-start">
                <FilterMenu
                  label="Status"
                  options={[...new Set(masterRegister.map((master) => master.status))]}
                  selected={statusFilter}
                  onToggle={(value) => setStatusFilter((current) => toggleMultiSelect(current, value))}
                />
              </div>
              <div />
            </div>

            <div
              className="grid gap-4 px-6 py-4"
              style={{
                gridTemplateColumns: '3.1fr 1.2fr 1.2fr 1.2fr 1fr 1fr 0.9fr',
                background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                borderBottom: '1px solid #E4EDF2',
              }}
            >
              {['Master', 'Domain', 'Scope', 'Entity', 'Access', 'Status', 'Action'].map((column) => (
                <div key={column} className="text-xs uppercase tracking-[0.18em]" style={{ color: '#6E7A82', fontWeight: 700 }}>
                  {column}
                </div>
              ))}
            </div>

            <div>
              {filteredMasters.map((master, index) => {
            const Icon = master.icon;
            return (
              <button
                key={master.id}
                type="button"
                onClick={() => navigate(master.route)}
                className="w-full grid gap-4 px-6 py-4 text-left transition-all"
                style={{
                  gridTemplateColumns: '3.1fr 1.2fr 1.2fr 1.2fr 1fr 1fr 0.9fr',
                  borderBottom: index === filteredMasters.length - 1 ? 'none' : '1px solid #EDF3F7',
                  backgroundColor: '#FFFFFF',
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = '#F8FCFE';
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: master.iconBg,
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: master.iconTint }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span style={{ color: '#0A0F14', fontWeight: 700 }}>{master.title}</span>
                        <span className="px-2.5 py-1 rounded-full text-[11px]" style={{ backgroundColor: '#EEF7FF', color: '#2563EB', fontWeight: 700 }}>
                          {master.badge}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: '#6E7A82', lineHeight: '1.5' }}>
                        {master.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#F5F8FB', color: '#334155', fontWeight: 700 }}>
                    {master.domain}
                  </span>
                </div>

                <div className="flex items-center">
                  <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#F8F4FF', color: '#6D28D9', fontWeight: 700 }}>
                    {master.scope}
                  </span>
                </div>

                <div className="flex items-center">
                  <span className="px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: '#EFFCF7', color: '#0F766E', fontWeight: 700 }}>
                    {master.entity}
                  </span>
                </div>

                <div className="flex items-center">
                  <span
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{
                      backgroundColor:
                        master.access === 'Admin'
                          ? '#FFF1E6'
                          : master.access === 'Controlled'
                            ? '#FEF3C7'
                            : '#EEF2FF',
                      color:
                        master.access === 'Admin'
                          ? '#9A3412'
                          : master.access === 'Controlled'
                            ? '#B45309'
                            : '#4338CA',
                      fontWeight: 700,
                    }}
                  >
                    {master.access}
                  </span>
                </div>

                <div className="flex items-center">
                  <span
                    className="px-3 py-1.5 rounded-full text-xs"
                    style={{
                      backgroundColor: master.status === 'Workflow Enabled' ? '#E7FBFD' : '#F0FDF4',
                      color: master.status === 'Workflow Enabled' ? '#00808C' : '#15803D',
                      fontWeight: 700,
                    }}
                  >
                    {master.status}
                  </span>
                </div>

                <div className="flex items-center justify-end">
                  <div
                    className="flex items-center gap-1.5 p-1 rounded-xl"
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                    }}
                  >
                    <button
                      type="button"
                      title={`View ${master.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(master.route);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: '#EAFBFE',
                        color: '#00A1AF',
                        border: '1px solid #CDEFF4',
                      }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title={`Edit ${master.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(master.route);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        backgroundColor: '#F1F0FF',
                        color: '#6B5BFF',
                        border: '1px solid #E1DEFF',
                      }}
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      title={`Open ${master.title}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        navigate(master.route);
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #DFF4FF 0%, #CCE9FF 100%)',
                        color: '#2563EB',
                        border: '1px solid #BFDBFE',
                        boxShadow: '0 6px 14px rgba(37, 99, 235, 0.10)',
                      }}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </button>
            );
          })}

              {filteredMasters.length === 0 && (
                <div className="px-8 py-16 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EAF8FB 0%, #DDF2F8 100%)' }}
                  >
                    <Search className="w-6 h-6" style={{ color: '#00A9B7' }} />
                  </div>
                  <p className="text-base mb-1" style={{ color: '#0A0F14', fontWeight: 700 }}>No masters match the current filters</p>
                  <p className="text-sm" style={{ color: '#6E7A82' }}>Clear one or more filters to bring the full register back.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
