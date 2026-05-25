import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Ban,
  GitBranch,
  ExternalLink,
  Download,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Shield,
  FileText,
  Landmark,
  Building2,
  FolderOpen,
  Activity,
  RefreshCw,
  History,
  Eye,
  DollarSign,
  Calendar,
  Globe,
  AlertCircle,
  XCircle,
  Download as DownloadIcon,
  Upload,
  Trash2,
  Edit,
  Plus,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/design-system/StatusBadge";

type Tab =
  | "overview"
  | "compliance"
  | "banking"
  | "entity-mapping"
  | "documents"
  | "risk"
  | "erp-sync"
  | "change-history"
  | "audit-trail";

// Mock vendor data
const vendorData = {
  legalName: "GlobalTech Industries Inc.",
  procinixCode: "VEN-2024-0892",
  erpCodes: {
    sap: "SAP-100234",
    oracle: "ORA-567890",
    workday: "WD-894521",
  },
  country: "United States",
  countryCode: "US",
  vendorType: "Goods & Services",
  riskLevel: "Medium",
  status: "Active",
  spendYTD: "$2,847,532",
  spendLastYear: "$2,134,890",
  activeEntities: 4,
  lastTransaction: "2026-02-15",
  complianceScore: 87,
  riskScore: 62,
  openChangeRequests: 2,
};

const entityMappings = [
  {
    id: "1",
    entity: "Procinix USA Inc.",
    erpCode: "SAP-100234",
    taxId: "US-TAX-8834521",
    paymentTerms: "Net 30",
    status: "Active",
    currency: "USD",
  },
  {
    id: "2",
    entity: "Procinix UK Ltd.",
    erpCode: "SAP-100235",
    taxId: "UK-VAT-7734291",
    paymentTerms: "Net 45",
    status: "Active",
    currency: "GBP",
  },
  {
    id: "3",
    entity: "Procinix Singapore",
    erpCode: "SAP-100236",
    taxId: "SG-GST-2234567",
    paymentTerms: "Net 30",
    status: "Active",
    currency: "SGD",
  },
  {
    id: "4",
    entity: "Procinix India Pvt.",
    erpCode: "SAP-100237",
    taxId: "IN-GST-1134890",
    paymentTerms: "Net 60",
    status: "Inactive",
    currency: "INR",
  },
];

const documents = [
  {
    id: "1",
    category: "Tax Certificates",
    name: "W9 Form - 2026",
    uploadDate: "2026-01-15",
    expiryDate: "2026-12-31",
    status: "Valid",
    size: "245 KB",
  },
  {
    id: "2",
    category: "Banking",
    name: "Bank Verification Letter",
    uploadDate: "2025-11-20",
    expiryDate: "2026-11-20",
    status: "Valid",
    size: "1.2 MB",
  },
  {
    id: "3",
    category: "Insurance",
    name: "Liability Insurance Certificate",
    uploadDate: "2025-10-10",
    expiryDate: "2026-03-15",
    status: "Expiring Soon",
    size: "890 KB",
  },
  {
    id: "4",
    category: "Compliance",
    name: "ISO 27001 Certificate",
    uploadDate: "2025-09-01",
    expiryDate: "2027-09-01",
    status: "Valid",
    size: "567 KB",
  },
  {
    id: "5",
    category: "Tax Certificates",
    name: "GST Registration - India",
    uploadDate: "2025-08-15",
    expiryDate: "2025-12-31",
    status: "Expired",
    size: "324 KB",
  },
];

const changeHistory = [
  {
    id: "1",
    type: "Bank Account Change",
    requestDate: "2026-02-10",
    approvedDate: "2026-02-12",
    requestedBy: "John Smith",
    approvedBy: "Sarah Mitchell",
    details: "Updated primary bank account routing number",
  },
  {
    id: "2",
    type: "Address Update",
    requestDate: "2026-01-20",
    approvedDate: "2026-01-22",
    requestedBy: "Vendor Portal",
    approvedBy: "Mike Johnson",
    details: "Changed registered office address to new location",
  },
  {
    id: "3",
    type: "Tax ID Update",
    requestDate: "2025-12-15",
    approvedDate: "2025-12-18",
    requestedBy: "Vendor Portal",
    approvedBy: "Sarah Mitchell",
    details: "Updated GST registration number for India entity",
  },
];

const auditTrail = [
  {
    timestamp: "2026-02-19 14:32:15",
    user: "Sarah Mitchell",
    action: "Viewed Vendor Profile",
    details: "Accessed 360° console",
    ipAddress: "192.168.1.45",
  },
  {
    timestamp: "2026-02-15 09:20:33",
    user: "System",
    action: "ERP Sync Completed",
    details: "Synced to SAP - Success",
    ipAddress: "System",
  },
  {
    timestamp: "2026-02-12 16:45:22",
    user: "Sarah Mitchell",
    action: "Approved Change Request",
    details: "Bank account change approved - CR-2024-0234",
    ipAddress: "192.168.1.45",
  },
  {
    timestamp: "2026-02-10 11:15:08",
    user: "John Smith",
    action: "Created Change Request",
    details: "Bank account change requested",
    ipAddress: "192.168.1.67",
  },
];

const erpSyncData = [
  {
    system: "SAP S/4HANA",
    vendorCode: "SAP-100234",
    lastSync: "2026-02-19 08:30:15",
    status: "Success",
    records: 4,
    errors: 0,
  },
  {
    system: "Oracle Fusion",
    vendorCode: "ORA-567890",
    lastSync: "2026-02-18 23:45:22",
    status: "Success",
    records: 3,
    errors: 0,
  },
  {
    system: "Workday Financial",
    vendorCode: "WD-894521",
    lastSync: "2026-02-17 15:20:10",
    status: "Failed",
    records: 0,
    errors: 2,
  },
];

export function Vendor360ConsolePage() {
  const {  } = useParams();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const tabs = [
    { id: "overview" as Tab, label: "Overview", icon: <Activity className="w-4 h-4" /> },
    { id: "compliance" as Tab, label: "Compliance & KYC", icon: <Shield className="w-4 h-4" /> },
    { id: "banking" as Tab, label: "Banking & Payments", icon: <Landmark className="w-4 h-4" /> },
    { id: "entity-mapping" as Tab, label: "Entity Mapping", icon: <Building2 className="w-4 h-4" /> },
    { id: "documents" as Tab, label: "Documents Vault", icon: <FolderOpen className="w-4 h-4" /> },
    { id: "risk" as Tab, label: "Risk & Scoring", icon: <AlertTriangle className="w-4 h-4" /> },
    { id: "erp-sync" as Tab, label: "ERP Sync", icon: <RefreshCw className="w-4 h-4" /> },
    { id: "change-history" as Tab, label: "Change History", icon: <GitBranch className="w-4 h-4" /> },
    { id: "audit-trail" as Tab, label: "Audit Trail", icon: <History className="w-4 h-4" /> },
  ];

  const lifecycleSteps = [
    { label: "Created", status: "completed", date: "2024-03-15" },
    { label: "Validated", status: "completed", date: "2024-03-18" },
    { label: "Approved", status: "completed", date: "2024-03-20" },
    { label: "ERP Synced", status: "completed", date: "2024-03-21" },
    { label: "Active", status: "current", date: "2024-03-22" },
    { label: "Changes", status: "available", date: "2 Pending" },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FC] pb-24">
      {/* Sticky Vendor Identity Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-[#E6EEF2] shadow-sm">
        <div className="px-8 py-4">
          {/* Back Navigation */}
          <div className="mb-4">
            <Link
              to="/vendors/requests"
              className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#00A9B7] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Vendor Requests
            </Link>
          </div>

          {/* Vendor Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Country Flag */}
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#00A9B7] to-[#008A96] flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {vendorData.countryCode}
              </div>

              <div>
                <h1 className="text-3xl font-semibold text-[#0A0F14] mb-2">
                  {vendorData.legalName}
                </h1>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B]">Procinix Code:</span>
                    <span className="text-sm font-medium text-[#0A0F14]">{vendorData.procinixCode}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#E6EEF2]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B]">SAP:</span>
                    <span className="text-sm font-medium text-[#0A0F14]">{vendorData.erpCodes.sap}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#E6EEF2]"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#64748B]">Oracle:</span>
                    <span className="text-sm font-medium text-[#0A0F14]">{vendorData.erpCodes.oracle}</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#E6EEF2]"></div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#64748B]" />
                    <span className="text-sm text-[#0A0F14]">{vendorData.country}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status="info" label={vendorData.vendorType} />
                  <StatusBadge status="warning" label={`${vendorData.riskLevel} Risk`} />
                  <StatusBadge status="success" label={vendorData.status} />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 h-10">
                <Ban className="w-4 h-4" />
                Block Vendor
              </Button>
              <Button variant="outline" className="gap-2 h-10">
                <GitBranch className="w-4 h-4" />
                Create Change Request
              </Button>
              <Button variant="outline" className="gap-2 h-10">
                <ExternalLink className="w-4 h-4" />
                View in ERP
              </Button>
              <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96] h-10">
                <Download className="w-4 h-4" />
                Download Dossier
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex">
        {/* Left Vertical Tabs */}
        <div className="w-64 bg-white border-r border-[#E6EEF2] min-h-[calc(100vh-200px)]">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3 px-3">
              Governance Console
            </h3>
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all relative ${
                    activeTab === tab.id
                      ? "bg-[#E0F5F7] text-[#00A9B7] font-medium"
                      : "text-[#64748B] hover:text-[#0A0F14] hover:bg-[#F6F9FC]"
                  }`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute left-0 w-1 h-8 bg-[#00A9B7] rounded-r" />
                  )}
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Center Workspace */}
        <div className="flex-1 p-8" style={{ marginRight: "360px" }}>
          {activeTab === "overview" && <OverviewTab vendorData={vendorData} />}
          {activeTab === "compliance" && <ComplianceTab />}
          {activeTab === "banking" && <BankingTab />}
          {activeTab === "entity-mapping" && <EntityMappingTab entities={entityMappings} />}
          {activeTab === "documents" && <DocumentsTab documents={documents} />}
          {activeTab === "risk" && <RiskTab />}
          {activeTab === "erp-sync" && <ERPSyncTab syncData={erpSyncData} />}
          {activeTab === "change-history" && <ChangeHistoryTab changes={changeHistory} />}
          {activeTab === "audit-trail" && <AuditTrailTab audit={auditTrail} />}
        </div>

        {/* Right Intelligence Rail */}
        <div className="fixed right-0 top-[162px] w-[360px] h-[calc(100vh-186px)] bg-white border-l border-[#E6EEF2] overflow-y-auto p-6">
          <IntelligenceRail />
        </div>
      </div>

      {/* Bottom Lifecycle Timeline */}
      <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-[#E6EEF2] shadow-lg z-20">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {lifecycleSteps.map((step, index) => (
              <div key={index} className="flex items-center">
                <button className="flex flex-col items-center gap-2 group">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      step.status === "completed"
                        ? "bg-[#E0F5F7] text-[#00A9B7] border-2 border-[#00A9B7]"
                        : step.status === "current"
                        ? "bg-[#00A9B7] text-white shadow-lg scale-110"
                        : "bg-[#F6F9FC] text-[#94A3B8] border-2 border-[#E6EEF2]"
                    }`}
                  >
                    {step.status === "completed" && <CheckCircle2 className="w-5 h-5" />}
                    {step.status === "current" && <Activity className="w-5 h-5" />}
                    {step.status === "available" && <Clock className="w-5 h-5" />}
                  </div>
                  <div className="text-center">
                    <div
                      className={`text-sm font-medium ${
                        step.status === "current" ? "text-[#00A9B7]" : "text-[#64748B]"
                      }`}
                    >
                      {step.label}
                    </div>
                    <div className="text-xs text-[#94A3B8]">{step.date}</div>
                  </div>
                </button>
                {index < lifecycleSteps.length - 1 && (
                  <div
                    className={`w-24 h-0.5 mx-2 ${
                      step.status === "completed" ? "bg-[#00A9B7]" : "bg-[#E6EEF2]"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab Components

type VendorData = typeof vendorData;
function OverviewTab({ vendorData }: { vendorData: VendorData }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#0A0F14] mb-6">Vendor Overview</h2>
      </div>

      {/* Spend Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Spend YTD</p>
              <p className="text-2xl font-semibold text-[#0A0F14]">{vendorData.spendYTD}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#00A9B7]" />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4 text-[#16A34A]" />
            <span className="text-sm font-medium text-[#16A34A]">+33.4%</span>
            <span className="text-sm text-[#64748B]">vs last year</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Active Entities</p>
              <p className="text-2xl font-semibold text-[#0A0F14]">{vendorData.activeEntities}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[#00A9B7]" />
            </div>
          </div>
          <p className="text-sm text-[#64748B]">Across 3 countries</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Last Transaction</p>
              <p className="text-2xl font-semibold text-[#0A0F14]">4d ago</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
              <Calendar className="w-5 h-5 text-[#00A9B7]" />
            </div>
          </div>
          <p className="text-sm text-[#64748B]">{vendorData.lastTransaction}</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-[#64748B] mb-1">Compliance Health</p>
              <p className="text-2xl font-semibold text-[#0A0F14]">{vendorData.complianceScore}%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F0FDF4] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#16A34A]" />
            </div>
          </div>
          <StatusBadge status="success" label="Excellent" size="sm" />
        </div>
      </div>

      {/* Risk Trend Chart */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">Risk Trend (Last 6 Months)</h3>
        <div className="h-48 flex items-end justify-between gap-4">
          {[45, 52, 58, 62, 59, 62].map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full bg-[#F6F9FC] rounded-lg overflow-hidden relative" style={{ height: "150px" }}>
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-[#F59E0B] to-[#FDE68A] rounded-t-lg transition-all"
                  style={{ height: `${(value / 100) * 150}px` }}
                />
              </div>
              <span className="text-xs text-[#64748B]">
                {["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"][index]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Open Change Requests */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-[#0A0F14]">Open Change Requests</h3>
          <StatusBadge status="warning" label={`${vendorData.openChangeRequests} Pending`} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-[#F6F9FC] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                <Landmark className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A0F14]">Bank Account Update</p>
                <p className="text-xs text-[#64748B]">Requested 3 days ago • CR-2024-0245</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Review</Button>
          </div>
          <div className="flex items-center justify-between p-4 bg-[#F6F9FC] rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0A0F14]">GST Certificate Renewal</p>
                <p className="text-xs text-[#64748B]">Requested 1 day ago • CR-2024-0246</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Review</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComplianceTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#0A0F14]">Compliance & KYC</h2>

      {/* Compliance Score Card */}
      <div className="bg-gradient-to-br from-[#00A9B7] to-[#008A96] rounded-xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm opacity-90 mb-2">Overall Compliance Score</p>
            <p className="text-5xl font-bold mb-2">87/100</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span className="text-sm">Excellent Standing</span>
            </div>
          </div>
          <div className="w-32 h-32 rounded-full border-8 border-white/30 flex items-center justify-center">
            <Shield className="w-16 h-16" />
          </div>
        </div>
      </div>

      {/* Validation Cards Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">Tax Validation</h3>
              <p className="text-sm text-[#64748B]">All tax IDs verified</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">US Tax ID</span>
              <StatusBadge status="success" label="Verified" size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">UK VAT</span>
              <StatusBadge status="success" label="Verified" size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">Singapore GST</span>
              <StatusBadge status="success" label="Verified" size="sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">Sanctions Screening</h3>
              <p className="text-sm text-[#64748B]">Last checked 2 hours ago</p>
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#16A34A]" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">OFAC</span>
              <StatusBadge status="success" label="Clear" size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">UN Sanctions</span>
              <StatusBadge status="success" label="Clear" size="sm" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#64748B]">EU Sanctions</span>
              <StatusBadge status="success" label="Clear" size="sm" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">Document Completeness</h3>
              <p className="text-sm text-[#64748B]">18 of 20 documents</p>
            </div>
            <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
          </div>
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
              <span>Completion</span>
              <span>90%</span>
            </div>
            <div className="w-full h-2 bg-[#F6F9FC] rounded-full overflow-hidden">
              <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "90%" }} />
            </div>
          </div>
          <p className="text-xs text-[#F59E0B]">2 documents missing</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">Expiry Alerts</h3>
              <p className="text-sm text-[#64748B]">1 document expiring soon</p>
            </div>
            <AlertCircle className="w-6 h-6 text-[#DC2626]" />
          </div>
          <div className="p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
            <p className="text-sm font-medium text-[#DC2626] mb-1">Liability Insurance</p>
            <p className="text-xs text-[#64748B]">Expires in 24 days • 2026-03-15</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankingTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#0A0F14]">Banking & Payments</h2>

      {/* Bank Accounts Grid */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="p-6 border-b border-[#E6EEF2]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#0A0F14]">Verified Bank Accounts</h3>
            <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
              <Plus className="w-4 h-4" />
              Add Bank Account
            </Button>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="p-5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#00A9B7] flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[#0A0F14]">JPMorgan Chase Bank N.A.</h4>
                      <StatusBadge status="success" label="Primary" size="sm" />
                      <StatusBadge status="success" label="Verified" size="sm" />
                    </div>
                    <p className="text-sm text-[#64748B]">Account ending in ****4532</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#64748B] mb-1">Routing Number</p>
                  <p className="font-medium text-[#0A0F14]">021000021</p>
                </div>
                <div>
                  <p className="text-[#64748B] mb-1">SWIFT/BIC</p>
                  <p className="font-medium text-[#0A0F14]">CHASUS33</p>
                </div>
                <div>
                  <p className="text-[#64748B] mb-1">Currency</p>
                  <p className="font-medium text-[#0A0F14]">USD</p>
                </div>
              </div>
            </div>

            <div className="p-5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#00A9B7] flex items-center justify-center">
                    <Landmark className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-[#0A0F14]">HSBC Bank UK</h4>
                      <StatusBadge status="success" label="Verified" size="sm" />
                    </div>
                    <p className="text-sm text-[#64748B]">Account ending in ****7821</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-[#64748B] mb-1">Sort Code</p>
                  <p className="font-medium text-[#0A0F14]">40-47-61</p>
                </div>
                <div>
                  <p className="text-[#64748B] mb-1">SWIFT/BIC</p>
                  <p className="font-medium text-[#0A0F14]">HBUKGB4B</p>
                </div>
                <div>
                  <p className="text-[#64748B] mb-1">Currency</p>
                  <p className="font-medium text-[#0A0F14]">GBP</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">Payment Terms</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Standard Terms</span>
              <span className="text-sm font-medium text-[#0A0F14]">Net 30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Early Payment Discount</span>
              <span className="text-sm font-medium text-[#0A0F14]">2% 10 Net 30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Payment Method</span>
              <span className="text-sm font-medium text-[#0A0F14]">ACH/Wire</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">Currency Support</h3>
          <div className="flex flex-wrap gap-2">
            <div className="px-3 py-2 bg-[#E0F5F7] rounded-lg text-sm font-medium text-[#00A9B7]">USD</div>
            <div className="px-3 py-2 bg-[#E0F5F7] rounded-lg text-sm font-medium text-[#00A9B7]">GBP</div>
            <div className="px-3 py-2 bg-[#E0F5F7] rounded-lg text-sm font-medium text-[#00A9B7]">SGD</div>
            <div className="px-3 py-2 bg-[#E0F5F7] rounded-lg text-sm font-medium text-[#00A9B7]">INR</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityMappingTab({ entities }: { entities: typeof entityMappings }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#0A0F14]">Entity Mapping</h2>
        <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
          <Plus className="w-4 h-4" />
          Map New Entity
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Entity</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">ERP Vendor Code</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Tax ID</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Payment Terms</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Currency</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Status</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {entities.map((entity) => (
              <tr key={entity.id} className="hover:bg-[#F6F9FC] transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[#00A9B7]" />
                    </div>
                    <span className="text-sm font-medium text-[#0A0F14]">{entity.entity}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14] font-mono">{entity.erpCode}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14] font-mono">{entity.taxId}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14]">{entity.paymentTerms}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-medium text-[#0A0F14]">{entity.currency}</span>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge
                    status={entity.status === "Active" ? "success" : "neutral"}
                    label={entity.status}
                    size="sm"
                  />
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Documents = typeof documents;
function DocumentsTab({ documents }: { documents: Documents }) {
  const categories = ["All", "Tax Certificates", "Banking", "Insurance", "Compliance"];
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filteredDocs =
    selectedCategory === "All"
      ? documents
      : documents.filter((doc) => doc.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#0A0F14]">Documents Vault</h2>
        <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
          <Upload className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === category
                ? "bg-[#00A9B7] text-white"
                : "bg-white border border-[#E6EEF2] text-[#64748B] hover:text-[#0A0F14]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Documents List */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Document Name</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Category</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Upload Date</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Expiry Date</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Status</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Size</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {filteredDocs.map((doc) => (
              <tr key={doc.id} className="hover:bg-[#F6F9FC] transition-colors">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#00A9B7]" />
                    </div>
                    <span className="text-sm font-medium text-[#0A0F14]">{doc.name}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#64748B]">{doc.category}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14]">{doc.uploadDate}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14]">{doc.expiryDate}</span>
                </td>
                <td className="py-4 px-6">
                  <StatusBadge
                    status={
                      doc.status === "Valid"
                        ? "success"
                        : doc.status === "Expiring Soon"
                        ? "warning"
                        : "error"
                    }
                    label={doc.status}
                    size="sm"
                  />
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#64748B]">{doc.size}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <DownloadIcon className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Trash2 className="w-4 h-4 text-[#DC2626]" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RiskTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#0A0F14]">Risk & Scoring</h2>

      <div className="grid grid-cols-3 gap-6">
        {/* Large Risk Gauge */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-[#E6EEF2] p-8 text-center">
            <p className="text-sm text-[#64748B] mb-4">Current Risk Score</p>
            <div className="relative w-48 h-48 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#F6F9FC"
                  strokeWidth="16"
                  fill="none"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="#F59E0B"
                  strokeWidth="16"
                  fill="none"
                  strokeDasharray={`${(62 / 100) * 502} 502`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-[#F59E0B]">62</span>
                <span className="text-sm text-[#64748B]">Medium Risk</span>
              </div>
            </div>
            <StatusBadge status="warning" label="Monitor Closely" />
          </div>
        </div>

        {/* Risk Factor Breakdown */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
            <h3 className="text-lg font-semibold text-[#0A0F14] mb-6">Risk Factor Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Financial Stability</span>
                  <span className="text-sm font-medium text-[#16A34A]">85/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full"
                    style={{ width: "85%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Compliance Health</span>
                  <span className="text-sm font-medium text-[#16A34A]">87/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full"
                    style={{ width: "87%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Geographic Risk</span>
                  <span className="text-sm font-medium text-[#F59E0B]">45/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full"
                    style={{ width: "45%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Payment History</span>
                  <span className="text-sm font-medium text-[#16A34A]">92/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#16A34A] rounded-full"
                    style={{ width: "92%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Sanctions Exposure</span>
                  <span className="text-sm font-medium text-[#DC2626]">28/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#DC2626] rounded-full"
                    style={{ width: "28%" }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-[#64748B]">Documentation Quality</span>
                  <span className="text-sm font-medium text-[#F59E0B]">78/100</span>
                </div>
                <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B] rounded-full"
                    style={{ width: "78%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Trend */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="text-lg font-semibold text-[#0A0F14] mb-6">Historical Risk Trend (12 Months)</h3>
        <div className="h-64 flex items-end justify-between gap-2">
          {[45, 48, 52, 55, 58, 62, 59, 61, 64, 62, 60, 62].map((value, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-[#F6F9FC] rounded-t-lg overflow-hidden relative"
                style={{ height: "200px" }}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t-lg transition-all ${
                    value < 50
                      ? "bg-gradient-to-t from-[#16A34A] to-[#BBF7D0]"
                      : value < 70
                      ? "bg-gradient-to-t from-[#F59E0B] to-[#FDE68A]"
                      : "bg-gradient-to-t from-[#DC2626] to-[#FEE2E2]"
                  }`}
                  style={{ height: `${(value / 100) * 200}px` }}
                />
              </div>
              <span className="text-xs text-[#64748B]">
                {[
                  "Mar",
                  "Apr",
                  "May",
                  "Jun",
                  "Jul",
                  "Aug",
                  "Sep",
                  "Oct",
                  "Nov",
                  "Dec",
                  "Jan",
                  "Feb",
                ][index]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ERPSyncTab({ syncData }: { syncData: typeof erpSyncData }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-[#0A0F14]">ERP Sync</h2>
        <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
          <RefreshCw className="w-4 h-4" />
          Sync All Systems
        </Button>
      </div>

      <div className="grid gap-4">
        {syncData.map((system, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-[#E6EEF2] p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    system.status === "Success"
                      ? "bg-[#F0FDF4]"
                      : "bg-[#FEF2F2]"
                  }`}
                >
                  <RefreshCw
                    className={`w-6 h-6 ${
                      system.status === "Success"
                        ? "text-[#16A34A]"
                        : "text-[#DC2626]"
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">{system.system}</h3>
                  <p className="text-sm text-[#64748B]">Vendor Code: {system.vendorCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge
                  status={system.status === "Success" ? "success" : "error"}
                  label={system.status}
                />
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-[#64748B] mb-1">Last Sync</p>
                <p className="text-sm font-medium text-[#0A0F14]">{system.lastSync}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] mb-1">Records Synced</p>
                <p className="text-sm font-medium text-[#0A0F14]">{system.records}</p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] mb-1">Errors</p>
                <p
                  className={`text-sm font-medium ${
                    system.errors === 0 ? "text-[#16A34A]" : "text-[#DC2626]"
                  }`}
                >
                  {system.errors}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64748B] mb-1">Next Sync</p>
                <p className="text-sm font-medium text-[#0A0F14]">In 4 hours</p>
              </div>
            </div>

            {system.errors > 0 && (
              <div className="mt-4 p-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#DC2626] mb-1">Sync Errors Detected</p>
                    <p className="text-xs text-[#64748B]">
                      Connection timeout • Invalid vendor mapping
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">
                    View Log
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChangeHistoryTab({ changes }: { changes: typeof changeHistory }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#0A0F14]">Change History</h2>

      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <div className="space-y-6">
          {changes.map((change, index) => (
            <div key={change.id} className="relative">
              {index !== changes.length - 1 && (
                <div className="absolute left-6 top-14 w-0.5 h-full bg-[#E6EEF2]" />
              )}
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-full bg-[#E0F5F7] flex items-center justify-center flex-shrink-0 relative z-10">
                  <CheckCircle2 className="w-6 h-6 text-[#00A9B7]" />
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">{change.type}</h3>
                      <p className="text-sm text-[#64748B]">{change.details}</p>
                    </div>
                    <StatusBadge status="success" label="Approved" size="sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-[#64748B] mb-1">Requested</p>
                      <p className="text-[#0A0F14]">{change.requestDate} • {change.requestedBy}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B] mb-1">Approved</p>
                      <p className="text-[#0A0F14]">{change.approvedDate} • {change.approvedBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuditTrailTab({ audit }: { audit: typeof auditTrail }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-[#0A0F14]">Audit Trail</h2>

      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Timestamp</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">User</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Action</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Details</th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {audit.map((entry, index) => (
              <tr key={index} className="hover:bg-[#F6F9FC] transition-colors">
                <td className="py-4 px-6">
                  <span className="text-sm text-[#0A0F14] font-mono">{entry.timestamp}</span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#E0F5F7] flex items-center justify-center">
                      <span className="text-xs font-medium text-[#00A9B7]">
                        {entry.user === "System" ? "S" : entry.user.split(" ").map((n) => n[0]).join("")}
                      </span>
                    </div>
                    <span className="text-sm text-[#0A0F14]">{entry.user}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm font-medium text-[#0A0F14]">{entry.action}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#64748B]">{entry.details}</span>
                </td>
                <td className="py-4 px-6">
                  <span className="text-sm text-[#64748B] font-mono">{entry.ipAddress}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IntelligenceRail() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-3">
          Intelligence
        </h3>
      </div>

      {/* Risk Score */}
      <div className="bg-gradient-to-br from-[#F59E0B] to-[#F97316] rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm opacity-90">Current Risk Score</p>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <p className="text-4xl font-bold mb-2">62</p>
        <p className="text-sm opacity-90">Medium Risk</p>
      </div>

      {/* Compliance Alerts */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          <h4 className="text-sm font-semibold text-[#0A0F14]">Compliance Alerts</h4>
        </div>
        <div className="space-y-2">
          <div className="p-3 bg-[#FEF2F2] rounded-lg border border-[#FEE2E2]">
            <p className="text-xs font-medium text-[#DC2626]">Document Expiring</p>
            <p className="text-xs text-[#64748B] mt-1">Insurance cert in 24 days</p>
          </div>
        </div>
      </div>

      {/* Expiring Documents */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <h4 className="text-sm font-semibold text-[#0A0F14] mb-3">Expiring Documents</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#F59E0B] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#0A0F14]">Liability Insurance</p>
              <p className="text-xs text-[#64748B]">24 days remaining</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="w-4 h-4 text-[#DC2626] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#0A0F14]">GST Certificate</p>
              <p className="text-xs text-[#DC2626]">Expired 49 days ago</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <h4 className="text-sm font-semibold text-[#0A0F14] mb-3">Pending Approvals</h4>
        <div className="text-center py-4">
          <p className="text-3xl font-bold text-[#00A9B7] mb-1">2</p>
          <p className="text-xs text-[#64748B]">Change requests</p>
        </div>
        <Button variant="outline" className="w-full text-xs h-8">
          Review All
        </Button>
      </div>

      {/* ERP Sync Status */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <h4 className="text-sm font-semibold text-[#0A0F14] mb-3">ERP Sync Status</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">SAP</span>
            <StatusBadge status="success" label="Synced" size="sm" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Oracle</span>
            <StatusBadge status="success" label="Synced" size="sm" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">Workday</span>
            <StatusBadge status="error" label="Failed" size="sm" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <h4 className="text-sm font-semibold text-[#0A0F14] mb-3">Quick Actions</h4>
        <div className="space-y-2">
          <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
            <RefreshCw className="w-3 h-3" />
            Sync to ERP
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
            <GitBranch className="w-3 h-3" />
            Create Change Request
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs">
            <Download className="w-3 h-3" />
            Download Dossier
          </Button>
        </div>
      </div>
    </div>
  );
}
