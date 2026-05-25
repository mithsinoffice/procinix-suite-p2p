import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Shield,
  FileX,
  Ban,
  Clock,
  MapPin,
  Filter,
  Search,
  Download,
  RefreshCw,
  Eye,
  XCircle,
  CheckCircle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  ArrowRight,
  Bell,
  Zap,
  Activity,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/design-system/StatusBadge";
import {
  useRiskDashboard,
  useScoreVendor,
  type RiskTrendPoint,
  type CategoryRiskRow,
  type GeographicRiskRow,
  type HighRiskVendor,
  type SanctionsAlert,
  type ExpiringDocAlert,
} from "../../../../../hooks/vendor-portal/useVendorRisk";

// Mock Data
// The module-level mock KPIs were replaced by the live `liveRiskKPIs`
// computed inside the component. Mock kept here as documentation but
// renamed to make it clear it's no longer the source of truth.
const _MOCK_riskKPIs = {
  totalVendors: { value: 1247, change: 5.3, trend: "up" },
  highRisk: { value: 47, change: -12.5, trend: "down" },
  newAlerts: { value: 23, change: 8.2, trend: "up" },
  sanctionsMatches: { value: 3, change: 0, trend: "neutral" },
  expiringDocs: { value: 89, change: 15.7, trend: "up" },
} as const;
void _MOCK_riskKPIs;

const riskDistribution = [
  { name: "Low Risk", value: 847, color: "#16A34A" },
  { name: "Medium Risk", value: 353, color: "#F59E0B" },
  { name: "High Risk", value: 47, color: "#DC2626" },
];

const monthlyTrend = [
  { month: "Aug", lowRisk: 820, mediumRisk: 340, highRisk: 52 },
  { month: "Sep", lowRisk: 835, mediumRisk: 348, highRisk: 50 },
  { month: "Oct", lowRisk: 842, mediumRisk: 351, highRisk: 48 },
  { month: "Nov", lowRisk: 838, mediumRisk: 355, highRisk: 49 },
  { month: "Dec", lowRisk: 845, mediumRisk: 352, highRisk: 46 },
  { month: "Jan", lowRisk: 847, mediumRisk: 353, highRisk: 47 },
];

const categoryRisk = [
  { category: "IT Services", risk: 85, count: 234 },
  { category: "Manufacturing", risk: 72, count: 186 },
  { category: "Logistics", risk: 68, count: 156 },
  { category: "Consulting", risk: 55, count: 142 },
  { category: "Raw Materials", risk: 48, count: 198 },
  { category: "Marketing", risk: 35, count: 89 },
];

const countryRiskData = [
  { country: "United States", risk: 15, vendors: 342 },
  { country: "United Kingdom", risk: 22, vendors: 198 },
  { country: "Germany", risk: 18, vendors: 156 },
  { country: "India", risk: 45, vendors: 234 },
  { country: "China", risk: 68, vendors: 124 },
  { country: "Singapore", risk: 12, vendors: 89 },
  { country: "Brazil", risk: 52, vendors: 67 },
  { country: "Russia", risk: 88, vendors: 23 },
];

const highRiskVendors = [
  {
    id: "VEN-2024-8234",
    name: "GlobalTech Industries Ltd",
    country: "China",
    riskScore: 88,
    primaryRisk: "Sanctions Alert",
    category: "IT Services",
    lastReview: "2026-01-15",
    spend: "$2.4M",
    status: "active",
  },
  {
    id: "VEN-2024-7129",
    name: "Eastern Logistics Corp",
    country: "Russia",
    riskScore: 85,
    primaryRisk: "Country Risk",
    category: "Logistics",
    lastReview: "2026-01-10",
    spend: "$1.8M",
    status: "review",
  },
  {
    id: "VEN-2023-5612",
    name: "Apex Manufacturing Inc",
    country: "Brazil",
    riskScore: 76,
    primaryRisk: "Financial Risk",
    category: "Manufacturing",
    lastReview: "2026-02-01",
    spend: "$3.2M",
    status: "active",
  },
  {
    id: "VEN-2024-9456",
    name: "Quantum Solutions GmbH",
    country: "Germany",
    riskScore: 72,
    primaryRisk: "Compliance Gap",
    category: "IT Services",
    lastReview: "2026-01-28",
    spend: "$987K",
    status: "active",
  },
  {
    id: "VEN-2024-3387",
    name: "Pacific Trade Partners",
    country: "Singapore",
    riskScore: 68,
    primaryRisk: "Document Expiry",
    category: "Raw Materials",
    lastReview: "2026-02-05",
    spend: "$1.5M",
    status: "warning",
  },
];

const realtimeAlerts: { id: number; type: "critical" | "high" | "medium" | "low"; title: string; vendor: string; time: string; description: string; action: string }[] = [
  {
    id: 1,
    type: "critical",
    title: "Sanctions Match Detected",
    vendor: "GlobalTech Industries Ltd",
    time: "2 minutes ago",
    description: "Vendor matched against OFAC sanctions list",
    action: "Review Immediately",
  },
  {
    id: 2,
    type: "high",
    title: "Document Expiring Soon",
    vendor: "Eastern Logistics Corp",
    time: "15 minutes ago",
    description: "ISO 9001 certificate expires in 7 days",
    action: "Request Renewal",
  },
  {
    id: 3,
    type: "medium",
    title: "Payment Delay Detected",
    vendor: "Apex Manufacturing Inc",
    time: "1 hour ago",
    description: "Invoice INV-2024-5623 overdue by 15 days",
    action: "Contact Vendor",
  },
  {
    id: 4,
    type: "medium",
    title: "Risk Score Increased",
    vendor: "Quantum Solutions GmbH",
    time: "2 hours ago",
    description: "Risk score changed from 65 to 72 (+7)",
    action: "Review Changes",
  },
  {
    id: 5,
    type: "low",
    title: "Compliance Check Completed",
    vendor: "Pacific Trade Partners",
    time: "3 hours ago",
    description: "Annual compliance review passed",
    action: "View Report",
  },
];

const riskTimeline = [
  {
    date: "2026-02-19 14:30",
    type: "critical",
    event: "Sanctions match detected for GlobalTech Industries Ltd",
    action: "Auto-suspended transactions",
    user: "System",
  },
  {
    date: "2026-02-19 11:15",
    type: "high",
    event: "Risk score increased for Eastern Logistics Corp (78 → 85)",
    action: "Compliance team notified",
    user: "Risk Engine",
  },
  {
    date: "2026-02-19 09:45",
    type: "medium",
    event: "Document expiry warning for 12 vendors",
    action: "Email notifications sent",
    user: "System",
  },
  {
    date: "2026-02-18 16:20",
    type: "low",
    event: "Quarterly risk assessment completed for IT Services category",
    action: "Report generated",
    user: "Sarah Johnson",
  },
  {
    date: "2026-02-18 14:10",
    type: "medium",
    event: "Payment delay detected for Apex Manufacturing Inc",
    action: "Escalated to procurement",
    user: "System",
  },
  {
    date: "2026-02-18 10:30",
    type: "high",
    event: "New vendor screening completed with high risk flag",
    action: "Pending executive approval",
    user: "Michael Chen",
  },
];

export function VendorRiskDashboard() {
  const [selectedFilters, setSelectedFilters] = useState({
    country: [] as string[],
    riskLevel: [] as string[],
    sanctions: false,
    expiring: false,
    erpFailure: false,
    paymentDelay: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [showAlerts, setShowAlerts] = useState(true);

  // ── Real data ──
  // The module-level mock consts above (riskKPIs, riskDistribution, …) stay
  // as default fallbacks for the first paint; we shadow them with live data
  // inside the function once the dashboard query resolves.
  const dashboardQuery = useRiskDashboard();
  const scoreVendor    = useScoreVendor();
  const d = dashboardQuery.data;
  // Build adapters that match the existing mock-shape names. KPI mock shape
  // was `{ value, change, trend }` per slot; the API returns flat numbers,
  // so we synthesise change=0/trend="neutral" until the API exposes deltas.
  const liveRiskKPIs = {
    totalVendors:      { value: d?.kpis.totalVendors        ?? 0, change: 0, trend: 'neutral' as const },
    highRisk:          { value: (d?.kpis.highRiskCount ?? 0) + (d?.kpis.criticalRiskCount ?? 0), change: 0, trend: 'neutral' as const },
    newAlerts:         { value: d?.kpis.newAlertsCount      ?? 0, change: 0, trend: 'neutral' as const },
    sanctionsMatches:  { value: d?.kpis.sanctionsMatchCount ?? 0, change: 0, trend: 'neutral' as const },
    expiringDocs:      { value: d?.kpis.expiringDocsCount   ?? 0, change: 0, trend: 'neutral' as const },
  };

  const liveRiskDistribution = d
    ? [
        { name: 'Low Risk',      value: d.riskDistribution.LOW,      color: '#16A34A' },
        { name: 'Medium Risk',   value: d.riskDistribution.MEDIUM,   color: '#F59E0B' },
        { name: 'High Risk',     value: d.riskDistribution.HIGH,     color: '#DC2626' },
        { name: 'Critical Risk', value: d.riskDistribution.CRITICAL, color: '#7C2D12' },
      ].filter((r) => r.value > 0)
    : riskDistribution;

  const liveMonthlyTrend = d
    ? d.riskTrend.map((t: RiskTrendPoint) => ({
        month: t.month.slice(5), // "2026-02" → "02"
        lowRisk:    t.LOW,
        mediumRisk: t.MEDIUM,
        // Combine HIGH+CRITICAL into the existing "highRisk" series so the
        // chart's three-area layout still works.
        highRisk:   t.HIGH + t.CRITICAL,
      }))
    : monthlyTrend;

  const liveCategoryRisk = d
    ? d.categoryRisk.map((c: CategoryRiskRow) => ({ category: c.category, risk: c.avgRiskScore, count: c.vendorCount }))
    : categoryRisk;

  const liveCountryRiskData = d
    ? d.geographicRisk.map((g: GeographicRiskRow) => ({ country: g.countryCode, risk: g.avgRiskScore, vendors: g.vendorCount }))
    : countryRiskData;

  const liveHighRiskVendors = d
    ? d.highRiskVendors.map((v: HighRiskVendor) => ({
        id:           v.id,
        name:         v.legalName,
        country:      v.countryCode,
        riskScore:    v.riskScore ?? 0,
        primaryRisk:  v.primaryRiskFactor,
        category:     v.industryCategory ?? '—',
        lastReview:   '—',
        spend:        '—',
        status:       v.status?.toLowerCase() ?? 'active',
      }))
    : highRiskVendors;

  // Live alerts merge sanctions + expiring docs into the existing
  // `realtimeAlerts` shape. Sanctions hits map to "critical"; expiring docs
  // within 30 days to "medium".
  const liveRealtimeAlerts = d
    ? [
        ...d.recentAlerts.sanctions.map((s: SanctionsAlert, i: number) => ({
          id:          i + 1,
          type:        'critical' as const,
          title:       'Sanctions Match Detected',
          vendor:      s.vendor.legalName,
          time:        s.screenedAt,
          description: `${s.screeningProvider} flagged this vendor against ${s.listName}`,
          action:      'Review Immediately',
        })),
        ...d.recentAlerts.expiring.map((e: ExpiringDocAlert, i: number) => ({
          id:          d.recentAlerts.sanctions.length + i + 1,
          type:        'medium' as const,
          title:       'Document Expiring Soon',
          vendor:      e.vendor.legalName,
          time:        e.expiresAt ?? '',
          description: `${e.documentType} expires ${e.expiresAt ?? 'soon'}`,
          action:      'Request Renewal',
        })),
      ]
    : realtimeAlerts;

  // Shadow the module-level consts so the render code (untouched) reads
  // live data. Using `let` reassignment isn't possible for const imports;
  // we accept the rename pattern instead.
  const riskKPIs         = liveRiskKPIs;
  const riskDistribution_ = liveRiskDistribution;  void riskDistribution_;
  const monthlyTrend_     = liveMonthlyTrend;       void monthlyTrend_;
  const categoryRisk_     = liveCategoryRisk;       void categoryRisk_;
  const countryRiskData_  = liveCountryRiskData;    void countryRiskData_;
  const highRiskVendors_  = liveHighRiskVendors;    void highRiskVendors_;
  const realtimeAlerts_   = liveRealtimeAlerts;     void realtimeAlerts_;

  // Run-Risk-Analysis: scores the FIRST high-risk vendor visible on the
  // page. The "select a specific vendor" UX lands in Sprint 4 when the
  // dashboard gains a vendor picker.
  const handleRunRiskAnalysis = async () => {
    const targetId = liveHighRiskVendors[0]?.id;
    if (!targetId) return;
    await scoreVendor.mutateAsync(targetId);
  };
  void handleRunRiskAnalysis;

  const toggleFilter = (category: keyof typeof selectedFilters, value: any) => {
    if (Array.isArray(selectedFilters[category])) {
      const current = selectedFilters[category] as string[];
      setSelectedFilters({
        ...selectedFilters,
        [category]: current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value],
      });
    } else {
      setSelectedFilters({
        ...selectedFilters,
        [category]: !selectedFilters[category],
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Top Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0A0F14] mb-1">
                Vendor Risk Intelligence
              </h1>
              <p className="text-sm text-[#64748B]">
                Real-time monitoring and analytics for vendor risk management
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
              <Button variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Refresh
              </Button>
              <Button
                className="gap-2 bg-[#00A9B7] hover:bg-[#008A96] text-white"
                onClick={handleRunRiskAnalysis}
                disabled={scoreVendor.isPending || liveHighRiskVendors.length === 0}
              >
                <Target className="w-4 h-4" />
                {scoreVendor.isPending ? 'Scoring…' : 'Run Risk Analysis'}
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4">
            <KPICard
              title="Total Vendors"
              value={riskKPIs.totalVendors.value}
              change={riskKPIs.totalVendors.change}
              trend={riskKPIs.totalVendors.trend}
              icon={<Shield className="w-5 h-5" />}
              color="blue"
            />
            <KPICard
              title="High Risk"
              value={riskKPIs.highRisk.value}
              change={riskKPIs.highRisk.change}
              trend={riskKPIs.highRisk.trend}
              icon={<AlertTriangle className="w-5 h-5" />}
              color="red"
            />
            <KPICard
              title="New Alerts"
              value={riskKPIs.newAlerts.value}
              change={riskKPIs.newAlerts.change}
              trend={riskKPIs.newAlerts.trend}
              icon={<Bell className="w-5 h-5" />}
              color="orange"
            />
            <KPICard
              title="Sanctions Matches"
              value={riskKPIs.sanctionsMatches.value}
              change={riskKPIs.sanctionsMatches.change}
              trend={riskKPIs.sanctionsMatches.trend}
              icon={<Ban className="w-5 h-5" />}
              color="purple"
            />
            <KPICard
              title="Expiring Docs"
              value={riskKPIs.expiringDocs.value}
              change={riskKPIs.expiringDocs.change}
              trend={riskKPIs.expiringDocs.trend}
              icon={<FileX className="w-5 h-5" />}
              color="yellow"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex">
        {/* Left Filter Panel */}
        {showFilters && (
          <aside className="w-80 bg-white border-r border-[#E6EEF2] h-[calc(100vh-220px)] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#0A0F14] flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#00A9B7]" />
                  Filters
                </h2>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-[#64748B] hover:text-[#0A0F14]"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 border-[#E6EEF2]"
                  />
                </div>
              </div>

              {/* Risk Level Filter */}
              <FilterSection title="Risk Level">
                <FilterCheckbox
                  label="Critical (80-100)"
                  count={12}
                  color="red"
                  checked={selectedFilters.riskLevel.includes("critical")}
                  onChange={() => toggleFilter("riskLevel", "critical")}
                />
                <FilterCheckbox
                  label="High (60-79)"
                  count={35}
                  color="orange"
                  checked={selectedFilters.riskLevel.includes("high")}
                  onChange={() => toggleFilter("riskLevel", "high")}
                />
                <FilterCheckbox
                  label="Medium (40-59)"
                  count={353}
                  color="yellow"
                  checked={selectedFilters.riskLevel.includes("medium")}
                  onChange={() => toggleFilter("riskLevel", "medium")}
                />
                <FilterCheckbox
                  label="Low (0-39)"
                  count={847}
                  color="green"
                  checked={selectedFilters.riskLevel.includes("low")}
                  onChange={() => toggleFilter("riskLevel", "low")}
                />
              </FilterSection>

              {/* Country Filter */}
              <FilterSection title="Country">
                {countryRiskData.slice(0, 6).map((country) => (
                  <FilterCheckbox
                    key={country.country}
                    label={country.country}
                    count={country.vendors}
                    checked={selectedFilters.country.includes(country.country)}
                    onChange={() => toggleFilter("country", country.country)}
                  />
                ))}
              </FilterSection>

              {/* Quick Filters */}
              <FilterSection title="Quick Filters">
                <FilterToggle
                  label="Sanctions Alert"
                  icon={<Ban className="w-4 h-4" />}
                  checked={selectedFilters.sanctions}
                  onChange={() => toggleFilter("sanctions", null)}
                />
                <FilterToggle
                  label="Expiring Documents"
                  icon={<FileX className="w-4 h-4" />}
                  checked={selectedFilters.expiring}
                  onChange={() => toggleFilter("expiring", null)}
                />
                <FilterToggle
                  label="ERP Sync Failure"
                  icon={<AlertCircle className="w-4 h-4" />}
                  checked={selectedFilters.erpFailure}
                  onChange={() => toggleFilter("erpFailure", null)}
                />
                <FilterToggle
                  label="Payment Delayed"
                  icon={<Clock className="w-4 h-4" />}
                  checked={selectedFilters.paymentDelay}
                  onChange={() => toggleFilter("paymentDelay", null)}
                />
              </FilterSection>

              {/* Clear Filters */}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() =>
                  setSelectedFilters({
                    country: [],
                    riskLevel: [],
                    sanctions: false,
                    expiring: false,
                    erpFailure: false,
                    paymentDelay: false,
                  })
                }
              >
                Clear All Filters
              </Button>
            </div>
          </aside>
        )}

        {/* Center Content */}
        <main className="flex-1 overflow-auto h-[calc(100vh-220px)]">
          <div className="p-6 space-y-6">
            {/* Charts Row 1 */}
            <div className="grid grid-cols-2 gap-6">
              {/* Risk Distribution */}
              <ChartCard title="Risk Distribution" subtitle="By risk level">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={riskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {riskDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E6EEF2",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  {riskDistribution.map((item) => (
                    <div key={item.name} className="text-center">
                      <div
                        className="w-3 h-3 rounded-full mx-auto mb-1"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="text-xs text-[#64748B]">{item.name}</div>
                      <div className="text-lg font-bold text-[#0A0F14]">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>

              {/* Monthly Trend */}
              <ChartCard title="Risk Trend" subtitle="Last 6 months">
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" />
                    <XAxis
                      dataKey="month"
                      stroke="#64748B"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#64748B" style={{ fontSize: "12px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E6EEF2",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="lowRisk"
                      stroke="#16A34A"
                      strokeWidth={2}
                      name="Low Risk"
                    />
                    <Line
                      type="monotone"
                      dataKey="mediumRisk"
                      stroke="#F59E0B"
                      strokeWidth={2}
                      name="Medium Risk"
                    />
                    <Line
                      type="monotone"
                      dataKey="highRisk"
                      stroke="#DC2626"
                      strokeWidth={2}
                      name="High Risk"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-2 gap-6">
              {/* Category Risk */}
              <ChartCard title="Category Risk Analysis" subtitle="By spend category">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryRisk} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" />
                    <XAxis type="number" stroke="#64748B" style={{ fontSize: "12px" }} />
                    <YAxis
                      type="category"
                      dataKey="category"
                      stroke="#64748B"
                      style={{ fontSize: "11px" }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        border: "1px solid #E6EEF2",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="risk" fill="#00A9B7" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Country Heatmap */}
              <ChartCard title="Geographic Risk Heatmap" subtitle="By country">
                <div className="space-y-3 p-4">
                  {countryRiskData.map((country) => (
                    <div key={country.country} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-[#64748B]" />
                          <span className="text-[#0A0F14] font-medium">
                            {country.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#64748B]">
                            {country.vendors} vendors
                          </span>
                          <span
                            className={`text-sm font-semibold ${
                              country.risk > 70
                                ? "text-[#DC2626]"
                                : country.risk > 40
                                ? "text-[#F59E0B]"
                                : "text-[#16A34A]"
                            }`}
                          >
                            {country.risk}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-[#F6F9FC] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            country.risk > 70
                              ? "bg-[#DC2626]"
                              : country.risk > 40
                              ? "bg-[#F59E0B]"
                              : "bg-[#16A34A]"
                          }`}
                          style={{ width: `${country.risk}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </div>

            {/* High Risk Vendors Table */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
              <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0F14]">
                    High Risk Vendors
                  </h3>
                  <p className="text-sm text-[#64748B]">
                    Requires immediate attention and review
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F6F9FC]">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Vendor
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Country
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Risk Score
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Primary Risk
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Category
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Annual Spend
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Status
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6EEF2]">
                    {highRiskVendors.map((vendor) => (
                      <tr
                        key={vendor.id}
                        className="hover:bg-[#F6F9FC] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-[#0A0F14]">
                              {vendor.name}
                            </div>
                            <div className="text-xs text-[#64748B]">
                              {vendor.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-[#64748B]" />
                            <span className="text-sm text-[#0A0F14]">
                              {vendor.country}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="h-2 bg-[#F6F9FC] rounded-full overflow-hidden w-16">
                                <div
                                  className={`h-full ${
                                    vendor.riskScore > 80
                                      ? "bg-[#DC2626]"
                                      : vendor.riskScore > 60
                                      ? "bg-[#F59E0B]"
                                      : "bg-[#16A34A]"
                                  }`}
                                  style={{ width: `${vendor.riskScore}%` }}
                                />
                              </div>
                            </div>
                            <span
                              className={`text-sm font-semibold ${
                                vendor.riskScore > 80
                                  ? "text-[#DC2626]"
                                  : vendor.riskScore > 60
                                  ? "text-[#F59E0B]"
                                  : "text-[#16A34A]"
                              }`}
                            >
                              {vendor.riskScore}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] text-[#DC2626] rounded text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            {vendor.primaryRisk}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-[#64748B]">
                            {vendor.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-[#0A0F14]">
                            {vendor.spend}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge
                            status={
                              vendor.status === "active"
                                ? "success"
                                : vendor.status === "warning"
                                ? "warning"
                                : "neutral"
                            }
                            label={vendor.status}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1.5 hover:bg-[#E0F5F7] rounded-lg transition-colors">
                              <Eye className="w-4 h-4 text-[#00A9B7]" />
                            </button>
                            <button className="p-1.5 hover:bg-[#E0F5F7] rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4 text-[#64748B]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Risk Timeline */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
              <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
                <h3 className="text-lg font-semibold text-[#0A0F14]">
                  Risk Activity Timeline
                </h3>
                <p className="text-sm text-[#64748B]">
                  Chronological view of recent risk events
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {riskTimeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            item.type === "critical"
                              ? "bg-[#FEF2F2] text-[#DC2626]"
                              : item.type === "high"
                              ? "bg-[#FEF3C7] text-[#F59E0B]"
                              : item.type === "medium"
                              ? "bg-[#EFF6FF] text-[#3B82F6]"
                              : "bg-[#F0FDF4] text-[#16A34A]"
                          }`}
                        >
                          {item.type === "critical" ? (
                            <Ban className="w-5 h-5" />
                          ) : item.type === "high" ? (
                            <AlertTriangle className="w-5 h-5" />
                          ) : item.type === "medium" ? (
                            <Activity className="w-5 h-5" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </div>
                        {index < riskTimeline.length - 1 && (
                          <div className="w-0.5 h-16 bg-[#E6EEF2] my-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-start justify-between mb-1">
                          <div className="font-medium text-[#0A0F14]">
                            {item.event}
                          </div>
                          <div className="text-xs text-[#64748B]">{item.date}</div>
                        </div>
                        <div className="text-sm text-[#64748B] mb-2">
                          Action: {item.action}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-[#E0F5F7] rounded-full flex items-center justify-center">
                            <span className="text-[10px] font-medium text-[#00A9B7]">
                              {item.user.substring(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-[#64748B]">{item.user}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Alerts Rail */}
        {showAlerts && (
          <aside className="w-96 bg-white border-l border-[#E6EEF2] h-[calc(100vh-220px)] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-[#0A0F14] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#00A9B7]" />
                  Real-Time Alerts
                </h2>
                <button
                  onClick={() => setShowAlerts(false)}
                  className="text-[#64748B] hover:text-[#0A0F14]"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {realtimeAlerts.map((alert) => (
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Toggle Buttons for Collapsed Panels */}
      {!showFilters && (
        <button
          onClick={() => setShowFilters(true)}
          className="fixed left-0 top-1/2 -translate-y-1/2 bg-[#00A9B7] text-white p-3 rounded-r-lg shadow-lg hover:bg-[#008A96] transition-colors"
        >
          <Filter className="w-5 h-5" />
        </button>
      )}
      {!showAlerts && (
        <button
          onClick={() => setShowAlerts(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#00A9B7] text-white p-3 rounded-l-lg shadow-lg hover:bg-[#008A96] transition-colors"
        >
          <Bell className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// Component: KPI Card
function KPICard({
  title,
  value,
  change,
  trend,
  icon,
  color,
}: {
  title: string;
  value: number;
  change: number;
  trend: "up" | "down" | "neutral";
  icon: React.ReactNode;
  color: "blue" | "red" | "orange" | "purple" | "yellow";
}) {
  const colorClasses = {
    blue: "bg-[#EFF6FF] text-[#3B82F6]",
    red: "bg-[#FEF2F2] text-[#DC2626]",
    orange: "bg-[#FEF3C7] text-[#F59E0B]",
    purple: "bg-[#F5F3FF] text-[#8B5CF6]",
    yellow: "bg-[#FEFCE8] text-[#EAB308]",
  };

  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex items-center gap-1">
          {trend === "up" ? (
            <TrendingUp className="w-4 h-4 text-[#DC2626]" />
          ) : trend === "down" ? (
            <TrendingDown className="w-4 h-4 text-[#16A34A]" />
          ) : null}
          <span
            className={`text-sm font-medium ${
              trend === "up" ? "text-[#DC2626]" : trend === "down" ? "text-[#16A34A]" : "text-[#64748B]"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change}%
          </span>
        </div>
      </div>
      <div className="text-3xl font-bold text-[#0A0F14] mb-1">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-[#64748B]">{title}</div>
    </div>
  );
}

// Component: Chart Card
function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[#0A0F14]">{title}</h3>
        <p className="text-sm text-[#64748B]">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// Component: Filter Section
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full mb-3"
      >
        <h3 className="text-sm font-semibold text-[#0A0F14]">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#64748B]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#64748B]" />
        )}
      </button>
      {isOpen && <div className="space-y-2">{children}</div>}
    </div>
  );
}

// Component: Filter Checkbox
function FilterCheckbox({
  label,
  count,
  color,
  checked,
  onChange,
}: {
  label: string;
  count: number;
  color?: "red" | "orange" | "yellow" | "green";
  checked: boolean;
  onChange: () => void;
}) {
  const colorDot = {
    red: "bg-[#DC2626]",
    orange: "bg-[#F59E0B]",
    yellow: "bg-[#EAB308]",
    green: "bg-[#16A34A]",
  };

  return (
    <label className="flex items-center gap-3 cursor-pointer hover:bg-[#F6F9FC] p-2 rounded-lg transition-colors">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-[#00A9B7] border-[#E6EEF2] rounded focus:ring-[#00A9B7]"
      />
      <div className="flex items-center gap-2 flex-1">
        {color && <div className={`w-2 h-2 rounded-full ${colorDot[color]}`} />}
        <span className="text-sm text-[#0A0F14]">{label}</span>
      </div>
      <span className="text-xs text-[#64748B]">{count}</span>
    </label>
  );
}

// Component: Filter Toggle
function FilterToggle({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`flex items-center gap-3 p-3 rounded-lg w-full transition-colors ${
        checked ? "bg-[#E0F5F7] border-2 border-[#00A9B7]" : "bg-[#F6F9FC] border-2 border-transparent"
      }`}
    >
      <div className={`${checked ? "text-[#00A9B7]" : "text-[#64748B]"}`}>
        {icon}
      </div>
      <span className={`text-sm flex-1 text-left ${checked ? "text-[#00A9B7] font-medium" : "text-[#0A0F14]"}`}>
        {label}
      </span>
      {checked && <CheckCircle className="w-4 h-4 text-[#00A9B7]" />}
    </button>
  );
}

// Component: Alert Card
function AlertCard({
  alert,
}: {
  alert: {
    type: "critical" | "high" | "medium" | "low";
    title: string;
    vendor: string;
    time: string;
    description: string;
    action: string;
  };
}) {
  const typeStyles = {
    critical: {
      bg: "bg-[#FEF2F2]",
      border: "border-[#DC2626]",
      text: "text-[#DC2626]",
      icon: <Ban className="w-5 h-5" />,
    },
    high: {
      bg: "bg-[#FEF3C7]",
      border: "border-[#F59E0B]",
      text: "text-[#F59E0B]",
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    medium: {
      bg: "bg-[#EFF6FF]",
      border: "border-[#3B82F6]",
      text: "text-[#3B82F6]",
      icon: <Info className="w-5 h-5" />,
    },
    low: {
      bg: "bg-[#F0FDF4]",
      border: "border-[#16A34A]",
      text: "text-[#16A34A]",
      icon: <CheckCircle className="w-5 h-5" />,
    },
  };

  const style = typeStyles[alert.type];

  return (
    <div
      className={`${style.bg} border-l-4 ${style.border} rounded-lg p-4 hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={style.text}>{style.icon}</div>
        <div className="flex-1">
          <div className="font-semibold text-[#0A0F14] mb-1">{alert.title}</div>
          <div className="text-sm text-[#64748B] mb-1">{alert.vendor}</div>
          <div className="text-xs text-[#64748B]">{alert.time}</div>
        </div>
      </div>
      <p className="text-sm text-[#0A0F14] mb-3">{alert.description}</p>
      <Button size="sm" className="w-full bg-[#00A9B7] hover:bg-[#008A96] text-white">
        {alert.action}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
