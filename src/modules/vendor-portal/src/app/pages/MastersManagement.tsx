import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Power,
  PowerOff,
  Eye,
  X,
  Save,
  AlertCircle,
  CheckCircle,
  Info,
  Settings,
  Globe,
  Shield,
  Zap,
  Database,
  FileText,
  CreditCard,
  Calendar,
  TrendingUp,
  Users,
  GitBranch,
  Bell,
  Activity,
  Building2,
  MapPin,
  DollarSign,
  FileCheck,
  ShieldAlert,
  Target,
  Clock,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { Textarea } from "../components/ui/textarea";

// Types
interface MasterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  items: MasterItem[];
}

interface MasterItem {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  lastUpdated: string;
  usageCount?: number;
}

const masterCategories: MasterCategory[] = [
  {
    id: "foundation",
    name: "Foundation",
    icon: <Database className="w-5 h-5" />,
    items: [
      { id: "vendor-type", name: "Vendor Type", icon: <Building2 className="w-4 h-4" /> },
      { id: "vendor-category", name: "Vendor Category", icon: <FileText className="w-4 h-4" /> },
      { id: "country", name: "Country", icon: <Globe className="w-4 h-4" /> },
      { id: "address-type", name: "Address Type", icon: <MapPin className="w-4 h-4" /> },
      { id: "currency", name: "Currency", icon: <DollarSign className="w-4 h-4" /> },
      { id: "payment-method", name: "Payment Method", icon: <CreditCard className="w-4 h-4" /> },
      { id: "payment-terms", name: "Payment Terms", icon: <Calendar className="w-4 h-4" /> },
    ],
  },
  {
    id: "compliance",
    name: "Compliance",
    icon: <Shield className="w-5 h-5" />,
    items: [
      { id: "tax-identifier", name: "Tax Identifier Types", icon: <FileCheck className="w-4 h-4" /> },
      { id: "compliance-doc", name: "Compliance Document Types", icon: <FileText className="w-4 h-4" /> },
      { id: "sanctions", name: "Sanctions Sources", icon: <ShieldAlert className="w-4 h-4" /> },
      { id: "kyc-sources", name: "KYC Validation Sources", icon: <Eye className="w-4 h-4" /> },
      { id: "tds-category", name: "TDS Categories", icon: <TrendingUp className="w-4 h-4" /> },
    ],
  },
  {
    id: "governance",
    name: "Governance",
    icon: <Settings className="w-5 h-5" />,
    items: [
      { id: "risk-factors", name: "Risk Factors", icon: <Target className="w-4 h-4" /> },
      { id: "risk-scoring", name: "Risk Scoring Rules", icon: <Activity className="w-4 h-4" /> },
      { id: "workflow-types", name: "Workflow Types", icon: <GitBranch className="w-4 h-4" /> },
      { id: "approval-roles", name: "Approval Roles", icon: <Users className="w-4 h-4" /> },
      { id: "sla-rules", name: "SLA Rules", icon: <Clock className="w-4 h-4" /> },
      { id: "change-types", name: "Change Request Types", icon: <Edit className="w-4 h-4" /> },
    ],
  },
  {
    id: "platform",
    name: "Platform",
    icon: <Zap className="w-5 h-5" />,
    items: [
      { id: "erp-systems", name: "ERP Systems", icon: <Database className="w-4 h-4" /> },
      { id: "entities", name: "Entities/Business Units", icon: <Building2 className="w-4 h-4" /> },
      { id: "departments", name: "Departments", icon: <Users className="w-4 h-4" /> },
      { id: "notification-templates", name: "Notification Templates", icon: <Bell className="w-4 h-4" /> },
      { id: "audit-events", name: "Audit Event Types", icon: <Activity className="w-4 h-4" /> },
    ],
  },
];

// Mock data for different master types
const getMockData = (masterId: string): MasterRecord[] => {
  switch (masterId) {
    case "vendor-type":
      return [
        { id: "1", code: "DOM", name: "Domestic", description: "Indian vendors registered within country", status: "active", lastUpdated: "2026-02-15", usageCount: 1245 },
        { id: "2", code: "IMP", name: "Import", description: "International vendors for import transactions", status: "active", lastUpdated: "2026-02-10", usageCount: 342 },
        { id: "3", code: "SEZ", name: "SEZ", description: "Special Economic Zone vendors", status: "active", lastUpdated: "2026-01-20", usageCount: 89 },
        { id: "4", code: "MSME", name: "MSME", description: "Micro, Small & Medium Enterprises", status: "active", lastUpdated: "2026-02-01", usageCount: 567 },
        { id: "5", code: "GOV", name: "Government", description: "Government entities and PSUs", status: "inactive", lastUpdated: "2025-12-15", usageCount: 12 },
      ];
    case "country":
      return [
        { id: "1", code: "IN", name: "India", description: "Republic of India", status: "active", lastUpdated: "2026-02-15", usageCount: 1450 },
        { id: "2", code: "US", name: "United States", description: "United States of America", status: "active", lastUpdated: "2026-02-10", usageCount: 234 },
        { id: "3", code: "GB", name: "United Kingdom", description: "United Kingdom of Great Britain", status: "active", lastUpdated: "2026-01-25", usageCount: 156 },
        { id: "4", code: "SG", name: "Singapore", description: "Republic of Singapore", status: "active", lastUpdated: "2026-02-05", usageCount: 89 },
        { id: "5", code: "AE", name: "United Arab Emirates", description: "UAE", status: "active", lastUpdated: "2026-01-30", usageCount: 67 },
      ];
    case "payment-terms":
      return [
        { id: "1", code: "NET30", name: "Net 30", description: "Payment due in 30 days", status: "active", lastUpdated: "2026-02-15", usageCount: 890 },
        { id: "2", code: "NET60", name: "Net 60", description: "Payment due in 60 days", status: "active", lastUpdated: "2026-02-10", usageCount: 456 },
        { id: "3", code: "NET90", name: "Net 90", description: "Payment due in 90 days", status: "active", lastUpdated: "2026-02-05", usageCount: 234 },
        { id: "4", code: "IMM", name: "Immediate", description: "Payment due immediately", status: "active", lastUpdated: "2026-01-20", usageCount: 123 },
        { id: "5", code: "ADV", name: "Advance", description: "Payment in advance", status: "active", lastUpdated: "2026-01-15", usageCount: 89 },
      ];
    case "risk-factors":
      return [
        { id: "1", code: "GEO", name: "Geographic Risk", description: "High-risk country or region", status: "active", lastUpdated: "2026-02-15", usageCount: 234 },
        { id: "2", code: "FIN", name: "Financial Risk", description: "Poor financial health indicators", status: "active", lastUpdated: "2026-02-10", usageCount: 189 },
        { id: "3", code: "COM", name: "Compliance Risk", description: "Regulatory or compliance issues", status: "active", lastUpdated: "2026-02-05", usageCount: 156 },
        { id: "4", code: "OPR", name: "Operational Risk", description: "Delivery or performance issues", status: "active", lastUpdated: "2026-01-28", usageCount: 123 },
        { id: "5", code: "REP", name: "Reputational Risk", description: "Negative media or reputation", status: "active", lastUpdated: "2026-01-20", usageCount: 67 },
      ];
    default:
      return [
        { id: "1", code: "M001", name: "Sample Master 1", description: "Description for sample master 1", status: "active", lastUpdated: "2026-02-15", usageCount: 100 },
        { id: "2", code: "M002", name: "Sample Master 2", description: "Description for sample master 2", status: "active", lastUpdated: "2026-02-10", usageCount: 75 },
        { id: "3", code: "M003", name: "Sample Master 3", description: "Description for sample master 3", status: "inactive", lastUpdated: "2026-02-05", usageCount: 50 },
      ];
  }
};

const getMasterContext = (masterId: string) => {
  const contexts: Record<string, { title: string; description: string; impact: string; usage: string[] }> = {
    "vendor-type": {
      title: "Vendor Type Configuration",
      description: "Vendor types classify vendors based on their business relationship and transaction characteristics. This classification affects tax treatment, approval workflows, and compliance requirements.",
      impact: "Changing or deactivating a vendor type will affect all vendors assigned to this type. Ensure no active vendors are using this type before deactivation.",
      usage: ["Vendor onboarding workflow", "Tax calculation engine", "Risk assessment rules", "Approval routing logic"],
    },
    "country": {
      title: "Country Master Configuration",
      description: "Country master defines geographic locations and their associated attributes including tax jurisdiction, currency, and compliance requirements.",
      impact: "Country data is critical for tax compliance, sanctions screening, and regulatory reporting. Changes may require system-wide reconfiguration.",
      usage: ["Vendor address validation", "Tax identifier validation", "Sanctions screening", "Currency conversion", "Compliance document rules"],
    },
    "payment-terms": {
      title: "Payment Terms Configuration",
      description: "Payment terms define the credit period and payment schedule for vendor transactions. These terms are used in PO generation and payment processing.",
      impact: "Changes to payment terms affect cash flow projections and vendor agreements. Existing contracts may need renegotiation.",
      usage: ["Purchase order generation", "Invoice payment scheduling", "Cash flow forecasting", "Vendor contract management"],
    },
    "risk-factors": {
      title: "Risk Factor Configuration",
      description: "Risk factors are individual parameters used to calculate overall vendor risk scores. Each factor contributes to the composite risk assessment.",
      impact: "Adding or modifying risk factors will trigger risk score recalculation for all vendors. This may affect approval requirements and monitoring frequency.",
      usage: ["Vendor risk scoring engine", "Risk-based approval routing", "Enhanced due diligence triggers", "Monitoring frequency rules"],
    },
  };

  return contexts[masterId] || {
    title: "Master Configuration",
    description: "This master data is used throughout the system for consistent classification and processing.",
    impact: "Changes to this master may affect related records and business processes. Review dependencies before modification.",
    usage: ["General system operations"],
  };
};

export function MastersManagement() {
  const [selectedCategory, setSelectedCategory] = useState<MasterCategory>(masterCategories[0]);
  const [selectedMaster, setSelectedMaster] = useState<MasterItem>(masterCategories[0].items[0]);
  const [masterData, setMasterData] = useState<MasterRecord[]>(getMockData("vendor-type"));
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<MasterRecord | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<MasterRecord | null>(null);
  const [showContextDrawer, setShowContextDrawer] = useState(false);

  const handleSelectCategory = (category: MasterCategory) => {
    setSelectedCategory(category);
    setSelectedMaster(category.items[0]);
    setMasterData(getMockData(category.items[0].id));
    setSelectedRecord(null);
    setShowContextDrawer(false);
  };

  const handleSelectMaster = (master: MasterItem) => {
    setSelectedMaster(master);
    setMasterData(getMockData(master.id));
    setSelectedRecord(null);
    setShowContextDrawer(false);
  };

  const handleEdit = (record: MasterRecord) => {
    setEditingRecord(record);
    setShowEditModal(true);
  };

  const handleToggleStatus = (recordId: string) => {
    setMasterData((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? { ...record, status: record.status === "active" ? "inactive" : "active" }
          : record
      )
    );
  };

  const handleViewUsage = (record: MasterRecord) => {
    setSelectedRecord(record);
    setShowContextDrawer(true);
  };

  const filteredData = masterData.filter(
    (record) =>
      record.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const context = getMasterContext(selectedMaster.id);

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-10 py-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
                <span>Administration</span>
                <ChevronRight className="w-4 h-4" />
                <span>Masters</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Masters Management</h1>
              <p className="text-[#64748B]">
                Configure foundation, compliance, governance, and platform master data
              </p>
            </div>
            <Button
              className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-11 px-6"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-10">
          <div className="flex gap-1 border-b border-[#E6EEF2]">
            {masterCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleSelectCategory(category)}
                className={`flex items-center gap-3 px-6 py-4 border-b-2 transition-all ${
                  selectedCategory.id === category.id
                    ? "border-[#00A9B7] text-[#00A9B7]"
                    : "border-transparent text-[#64748B] hover:text-[#0A0F14] hover:bg-[#F6F9FC]"
                }`}
              >
                <span className="flex-shrink-0">{category.icon}</span>
                <span className="font-medium">{category.name}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        <main className="px-10 py-8">
          {/* Master Selector & Search Bar */}
          <div className="flex items-center gap-4 mb-8">
            <div className="flex-1">
              <select
                value={selectedMaster.id}
                onChange={(e) => {
                  const master = selectedCategory.items.find((m) => m.id === e.target.value);
                  if (master) handleSelectMaster(master);
                }}
                className="w-full max-w-md h-12 px-4 bg-white border border-[#E6EEF2] rounded-xl text-[#0A0F14] font-medium focus:outline-none focus:ring-2 focus:ring-[#00A9B7] focus:border-transparent"
              >
                {selectedCategory.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 border-[#E6EEF2] rounded-xl"
              />
            </div>
            <Button variant="outline" className="h-12 px-6">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Stats Summary */}
          <div className="flex items-center gap-6 mb-6 text-sm text-[#64748B]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#00A9B7]" />
              <span className="font-medium text-[#0A0F14]">{masterData.length}</span>
              <span>Total Records</span>
            </div>
            <div className="w-px h-4 bg-[#E6EEF2]" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
              <span className="font-medium text-[#0A0F14]">
                {masterData.filter((r) => r.status === "active").length}
              </span>
              <span>Active</span>
            </div>
            <div className="w-px h-4 bg-[#E6EEF2]" />
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#94A3B8]" />
              <span className="font-medium text-[#0A0F14]">
                {masterData.filter((r) => r.status === "inactive").length}
              </span>
              <span>Inactive</span>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-[#E6EEF2] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#E6EEF2]">
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="text-left px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Last Updated
                    </th>
                    <th className="text-right px-8 py-5 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((record, index) => (
                    <tr
                      key={record.id}
                      className={`border-b border-[#E6EEF2] hover:bg-[#F6F9FC] transition-colors ${
                        index === filteredData.length - 1 ? "border-b-0" : ""
                      }`}
                    >
                      <td className="px-8 py-6">
                        <span className="font-mono text-sm font-semibold text-[#0A0F14]">
                          {record.code}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm font-medium text-[#0A0F14]">
                          {record.name}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm text-[#64748B]">
                          {record.description}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <StatusBadge
                          status={record.status === "active" ? "success" : "neutral"}
                          label={record.status}
                        />
                      </td>
                      <td className="px-8 py-6">
                        <button
                          onClick={() => handleViewUsage(record)}
                          className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#00A9B7] transition-colors"
                        >
                          <BarChart3 className="w-4 h-4" />
                          <span>{record.usageCount} records</span>
                        </button>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-sm text-[#64748B]">
                          {record.lastUpdated}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(record)}
                            className="p-2 hover:bg-[#E0F5F7] rounded-lg transition-colors group"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-[#64748B] group-hover:text-[#00A9B7]" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(record.id)}
                            className={`p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors group ${
                              record.status === "active" ? "text-[#16A34A]" : "text-[#64748B]"
                            }`}
                            title={record.status === "active" ? "Deactivate" : "Activate"}
                          >
                            {record.status === "active" ? (
                              <Power className="w-4 h-4 group-hover:text-[#F59E0B]" />
                            ) : (
                              <PowerOff className="w-4 h-4 group-hover:text-[#16A34A]" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {/* Context Drawer */}
        {showContextDrawer && (
          <ContextDrawer
            context={context}
            selectedRecord={selectedRecord}
            onClose={() => setShowContextDrawer(false)}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <MasterFormModal
          title={`Create ${selectedMaster.name}`}
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSave={(data) => {
            setMasterData((prev) => [
              ...prev,
              {
                id: String(prev.length + 1),
                ...data,
                lastUpdated: new Date().toISOString().split("T")[0],
                usageCount: 0,
              } as MasterRecord,
            ]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingRecord && (
        <MasterFormModal
          title={`Edit ${selectedMaster.name}`}
          mode="edit"
          initialData={editingRecord}
          onClose={() => {
            setShowEditModal(false);
            setEditingRecord(null);
          }}
          onSave={(data) => {
            setMasterData((prev) =>
              prev.map((record) =>
                record.id === editingRecord.id
                  ? { ...record, ...data, lastUpdated: new Date().toISOString().split("T")[0] }
                  : record
              )
            );
            setShowEditModal(false);
            setEditingRecord(null);
          }}
        />
      )}
    </div>
  );
}

// Component: Context Drawer
function ContextDrawer({
  context,
  selectedRecord,
  onClose,
}: {
  context: { title: string; description: string; impact: string; usage: string[] };
  selectedRecord: MasterRecord | null;
  onClose: () => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-[#E6EEF2] shadow-2xl z-50 overflow-auto animate-slideInRight">
        {/* Drawer Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF2] px-8 py-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#0A0F14]">Configuration Guide</h3>
              <p className="text-sm text-[#64748B] mt-1">Usage and impact analysis</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>
        </div>

        {/* Drawer Content */}
        <div className="p-8 space-y-8">
          {/* Selected Record Details */}
          {selectedRecord && (
            <div>
              <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
                Selected Record
              </h4>
              <div className="bg-[#F6F9FC] rounded-xl p-6 space-y-4">
                <div>
                  <div className="text-xs text-[#64748B] mb-1.5">Code</div>
                  <div className="font-mono text-base font-semibold text-[#0A0F14]">
                    {selectedRecord.code}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B] mb-1.5">Name</div>
                  <div className="text-base text-[#0A0F14] font-medium">{selectedRecord.name}</div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B] mb-1.5">Description</div>
                  <div className="text-sm text-[#0A0F14]">
                    {selectedRecord.description}
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#E6EEF2]">
                  <div>
                    <div className="text-xs text-[#64748B] mb-1.5">Status</div>
                    <StatusBadge
                      status={selectedRecord.status === "active" ? "success" : "neutral"}
                      label={selectedRecord.status}
                    />
                  </div>
                  <div>
                    <div className="text-xs text-[#64748B] mb-1.5">Usage Count</div>
                    <div className="text-base font-semibold text-[#0A0F14]">
                      {selectedRecord.usageCount}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Field Explanation */}
          <div>
            <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
              About This Master
            </h4>
            <div className="bg-[#EFF6FF] rounded-xl p-6">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-[#0A0F14] mb-2">
                    {context.title}
                  </h5>
                  <p className="text-sm text-[#64748B] leading-relaxed">{context.description}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Across System */}
          <div>
            <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
              Used In System
            </h4>
            <div className="space-y-3">
              {context.usage.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-4 bg-[#F6F9FC] rounded-xl hover:bg-[#E0F5F7] transition-colors cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5 text-[#16A34A] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm text-[#0A0F14] font-medium">{item}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#64748B]" />
                </div>
              ))}
            </div>
          </div>

          {/* Impact Warning */}
          <div>
            <h4 className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-4">
              Impact Warning
            </h4>
            <div className="bg-[#FEF3C7] rounded-xl p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-semibold text-[#0A0F14] mb-2">
                    Review Before Changing
                  </h5>
                  <p className="text-sm text-[#64748B] leading-relaxed">{context.impact}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Component: Master Form Modal
function MasterFormModal({
  title,
  mode,
  initialData,
  onClose,
  onSave,
}: {
  title: string;
  mode: "create" | "edit";
  initialData?: MasterRecord;
  onClose: () => void;
  onSave: (data: Partial<MasterRecord>) => void;
}) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    name: initialData?.name || "",
    description: initialData?.description || "",
    status: initialData?.status || "active",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as Partial<MasterRecord>);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
        {/* Modal Header */}
        <div className="bg-[#F6F9FC] border-b border-[#E6EEF2] px-8 py-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#0A0F14]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#E6EEF2] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-auto p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <div>
              <h3 className="font-semibold text-[#0A0F14] mb-6 text-lg">Basic Information</h3>
              <div className="space-y-6">
                <div>
                  <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                    Code <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., DOM, IMP, SEZ"
                    className="border-[#E6EEF2] font-mono h-12"
                    required
                  />
                  <p className="text-xs text-[#64748B] mt-2">
                    Unique identifier code (uppercase alphanumeric)
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                    Name <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter master name"
                    className="border-[#E6EEF2] h-12"
                    required
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                    Description <span className="text-[#DC2626]">*</span>
                  </Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Enter detailed description"
                    className="border-[#E6EEF2] min-h-[100px]"
                    rows={4}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="font-semibold text-[#0A0F14] mb-6 text-lg">Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center gap-4 p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.status === "active"
                    ? "border-[#00A9B7] bg-[#E0F5F7]"
                    : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                }`}>
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === "active"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-5 h-5 text-[#00A9B7]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#0A0F14] mb-1">Active</div>
                    <div className="text-xs text-[#64748B]">Available for use</div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-[#16A34A]" />
                </label>
                <label className={`flex items-center gap-4 p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  formData.status === "inactive"
                    ? "border-[#00A9B7] bg-[#E0F5F7]"
                    : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                }`}>
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === "inactive"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as "active" | "inactive" })
                    }
                    className="w-5 h-5 text-[#00A9B7]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#0A0F14] mb-1">Inactive</div>
                    <div className="text-xs text-[#64748B]">Hidden from selection</div>
                  </div>
                  <PowerOff className="w-6 h-6 text-[#64748B]" />
                </label>
              </div>
            </div>

            {/* Warning for Edit Mode */}
            {mode === "edit" && initialData && initialData.usageCount && initialData.usageCount > 0 && (
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-[#F59E0B] flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-[#0A0F14] mb-2">
                      Impact Warning
                    </div>
                    <p className="text-sm text-[#64748B] leading-relaxed">
                      This master is currently used by {initialData.usageCount} records. Changes may
                      affect existing data and business processes.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#F6F9FC] border-t border-[#E6EEF2] px-8 py-6 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose} className="h-11 px-6">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-11 px-6"
          >
            <Save className="w-4 h-4 mr-2" />
            {mode === "create" ? "Create Master" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
