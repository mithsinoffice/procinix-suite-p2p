import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Power,
  PowerOff,
  Download,
  ChevronRight,
  BarChart3,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/design-system/StatusBadge";

// Types
interface MasterRecord {
  id: string;
  code: string;
  name: string;
  description: string;
  status: "active" | "inactive";
  lastUpdated: string;
  usageCount?: number;
}

type TableDensity = "comfortable" | "compact" | "condensed";

// Master configuration - Full Enterprise Universe
const masterConfigs: Record<string, { title: string; description: string; icon: string; group: string }> = {
  // Foundation Masters
  "vendor-type": {
    title: "Vendor Type",
    description: "Classify vendors based on their business relationship and transaction characteristics",
    icon: "🏢",
    group: "Foundation",
  },
  "vendor-category": {
    title: "Vendor Category",
    description: "Group vendors by industry vertical or procurement category",
    icon: "📁",
    group: "Foundation",
  },
  country: {
    title: "Country",
    description: "Manage geographic locations with tax jurisdiction and compliance requirements",
    icon: "🌍",
    group: "Foundation",
  },
  "address-type": {
    title: "Address Type",
    description: "Define different address classifications for vendor locations",
    icon: "📍",
    group: "Foundation",
  },
  currency: {
    title: "Currency",
    description: "Define currencies for international transactions and exchange rate management",
    icon: "💰",
    group: "Foundation",
  },
  "payment-method": {
    title: "Payment Method",
    description: "Configure payment methods and instrument types for vendor payments",
    icon: "💳",
    group: "Foundation",
  },
  "payment-terms": {
    title: "Payment Terms",
    description: "Configure credit periods and payment schedules for vendor transactions",
    icon: "📅",
    group: "Foundation",
  },
  // Compliance Masters
  "tax-identifier": {
    title: "Tax Identifier Types",
    description: "Define tax registration and identifier types by jurisdiction",
    icon: "📋",
    group: "Compliance",
  },
  "compliance-doc": {
    title: "Compliance Document Types",
    description: "Manage mandatory compliance document types and validation rules",
    icon: "📄",
    group: "Compliance",
  },
  sanctions: {
    title: "Sanctions Sources",
    description: "Configure sanctions screening databases and sources",
    icon: "🛡️",
    group: "Compliance",
  },
  "kyc-sources": {
    title: "KYC Validation Sources",
    description: "Define Know Your Customer validation data sources",
    icon: "👁️",
    group: "Compliance",
  },
  "tds-category": {
    title: "TDS Categories",
    description: "Configure Tax Deducted at Source categories and rates",
    icon: "📊",
    group: "Compliance",
  },
  // Governance Masters
  "risk-factors": {
    title: "Risk Factors",
    description: "Define parameters used to calculate overall vendor risk scores",
    icon: "⚠️",
    group: "Governance",
  },
  "risk-scoring": {
    title: "Risk Scoring Rules",
    description: "Configure risk calculation rules and scoring methodology",
    icon: "📈",
    group: "Governance",
  },
  "workflow-types": {
    title: "Workflow Types",
    description: "Configure approval workflow types for different vendor processes",
    icon: "🔄",
    group: "Governance",
  },
  "approval-roles": {
    title: "Approval Roles",
    description: "Define roles and responsibilities for approval hierarchies",
    icon: "👥",
    group: "Governance",
  },
  "sla-rules": {
    title: "SLA Rules",
    description: "Configure service level agreements and escalation rules",
    icon: "⏱️",
    group: "Governance",
  },
  "change-types": {
    title: "Change Request Types",
    description: "Define types of vendor change requests and approval requirements",
    icon: "✏️",
    group: "Governance",
  },
  // Platform Masters
  "erp-systems": {
    title: "ERP Systems",
    description: "Configure target ERP systems and integration endpoints",
    icon: "🖥️",
    group: "Platform",
  },
  entities: {
    title: "Entities / Business Units",
    description: "Manage organizational entities and business unit hierarchy",
    icon: "🏛️",
    group: "Platform",
  },
  departments: {
    title: "Departments",
    description: "Configure departments and cost center structures",
    icon: "🏢",
    group: "Platform",
  },
  "notification-templates": {
    title: "Notification Templates",
    description: "Manage email and system notification templates",
    icon: "📧",
    group: "Platform",
  },
  "audit-events": {
    title: "Audit Event Types",
    description: "Define audit trail event types and logging rules",
    icon: "📝",
    group: "Platform",
  },
};

// Mock data generator
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

export function MasterListingPage() {
  const { masterType } = useParams();
  const navigate = useNavigate();
  const config = masterConfigs[masterType || ""] || {
    title: "Master Data",
    description: "Manage master data records",
    icon: "📄",
    group: "General",
  };

  const [masterData, setMasterData] = useState<MasterRecord[]>(getMockData(masterType || ""));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [density, setDensity] = useState<TableDensity>("comfortable");

  const handleToggleStatus = (recordId: string) => {
    setMasterData((prev) =>
      prev.map((record) =>
        record.id === recordId
          ? { ...record, status: record.status === "active" ? "inactive" : "active" }
          : record
      )
    );
  };

  const handleEdit = (recordId: string) => {
    navigate(`/masters/${masterType}/edit/${recordId}`);
  };

  const handleCreate = () => {
    navigate(`/masters/${masterType}/create`);
  };

  const handleToggleSelect = (recordId: string) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId) ? prev.filter((id) => id !== recordId) : [...prev, recordId]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedRecords.length === filteredData.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(filteredData.map((r) => r.id));
    }
  };

  const filteredData = masterData.filter((record) => {
    const matchesSearch =
      record.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: masterData.length,
    active: masterData.filter((r) => r.status === "active").length,
    inactive: masterData.filter((r) => r.status === "inactive").length,
  };

  // Density classes
  const getDensityClasses = () => {
    switch (density) {
      case "compact":
        return "py-4"; // ~20% less than default py-6
      case "condensed":
        return "py-3"; // Tight ERP-style
      default:
        return "py-6"; // Comfortable default
    }
  };

  const getHeaderDensityClasses = () => {
    switch (density) {
      case "compact":
        return "py-4";
      case "condensed":
        return "py-3";
      default:
        return "py-5";
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-10 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
                <Link to="/vendors/dashboard" className="hover:text-[#00A9B7]">
                  Administration
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>Masters</span>
                <ChevronRight className="w-4 h-4" />
                <span>{config.title}</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{config.icon}</span>
                <h1 className="text-3xl font-bold text-[#0A0F14]">{config.title}</h1>
              </div>
              <p className="text-[#64748B]">{config.description}</p>
            </div>
            <Button
              onClick={handleCreate}
              className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-11 px-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
            {masterType === "vendor-type" && (
              <Button
                onClick={() => navigate("/masters/vendor-type/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
            {masterType === "vendor-category" && (
              <Button
                onClick={() => navigate("/masters/vendor-category/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
            {masterType === "risk-factors" && (
              <Button
                onClick={() => navigate("/masters/risk-factor/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
            {masterType === "compliance-doc" && (
              <Button
                onClick={() => navigate("/masters/compliance-document-type/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
            {masterType === "risk-scoring" && (
              <Button
                onClick={() => navigate("/masters/risk-rules/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
            {masterType === "workflow-types" && (
              <Button
                onClick={() => navigate("/masters/workflow-type/create-advanced")}
                className="bg-[#0A0F14] hover:bg-[#1A1F24] text-white h-11 px-6 ml-3"
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Advanced Configuration
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-10 py-8">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <Input
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 border-[#E6EEF2] rounded-xl"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
              className="h-12 px-4 bg-white border border-[#E6EEF2] rounded-xl text-[#0A0F14] font-medium focus:outline-none focus:ring-2 focus:ring-[#00A9B7] focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
            <Button variant="outline" className="h-12 px-6">
              <Filter className="w-4 h-4 mr-2" />
              More Filters
            </Button>
          </div>
          <div className="flex items-center gap-3">
            {/* Density Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#64748B]">Density:</span>
              <div className="flex items-center bg-white border border-[#E6EEF2] rounded-xl overflow-hidden">
                <button
                  onClick={() => setDensity("comfortable")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    density === "comfortable"
                      ? "bg-[#00A9B7] text-white"
                      : "text-[#64748B] hover:bg-[#F6F9FC]"
                  }`}
                  title="Comfortable - Default row height"
                >
                  Comfortable
                </button>
                <button
                  onClick={() => setDensity("compact")}
                  className={`px-4 h-10 text-sm font-medium transition-colors border-l border-r border-[#E6EEF2] ${
                    density === "compact"
                      ? "bg-[#00A9B7] text-white"
                      : "text-[#64748B] hover:bg-[#F6F9FC]"
                  }`}
                  title="Compact - 20% less padding"
                >
                  Compact
                </button>
                <button
                  onClick={() => setDensity("condensed")}
                  className={`px-4 h-10 text-sm font-medium transition-colors ${
                    density === "condensed"
                      ? "bg-[#00A9B7] text-white"
                      : "text-[#64748B] hover:bg-[#F6F9FC]"
                  }`}
                  title="Condensed - Tight ERP-style rows"
                >
                  Condensed
                </button>
              </div>
            </div>
            {selectedRecords.length > 0 && (
              <>
                <Button variant="outline" className="h-12 px-6">
                  <Power className="w-4 h-4 mr-2" />
                  Bulk Activate
                </Button>
                <Button variant="outline" className="h-12 px-6">
                  <PowerOff className="w-4 h-4 mr-2" />
                  Bulk Deactivate
                </Button>
              </>
            )}
            <Button variant="outline" className="h-12 px-6">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="flex items-center gap-6 mb-6 text-sm text-[#64748B]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#00A9B7]" />
            <span className="font-medium text-[#0A0F14]">{stats.total}</span>
            <span>Total Records</span>
          </div>
          <div className="w-px h-4 bg-[#E6EEF2]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#16A34A]" />
            <span className="font-medium text-[#0A0F14]">{stats.active}</span>
            <span>Active</span>
          </div>
          <div className="w-px h-4 bg-[#E6EEF2]" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#94A3B8]" />
            <span className="font-medium text-[#0A0F14]">{stats.inactive}</span>
            <span>Inactive</span>
          </div>
          {selectedRecords.length > 0 && (
            <>
              <div className="w-px h-4 bg-[#E6EEF2]" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00A9B7]" />
                <span className="font-medium text-[#0A0F14]">{selectedRecords.length}</span>
                <span>Selected</span>
              </div>
            </>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl border border-[#E6EEF2] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#E6EEF2]">
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} w-12`}>
                    <input
                      type="checkbox"
                      checked={selectedRecords.length === filteredData.length && filteredData.length > 0}
                      onChange={handleToggleSelectAll}
                      className="w-4 h-4 rounded border-[#E6EEF2] text-[#00A9B7] focus:ring-[#00A9B7]"
                    />
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Code
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Name
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Description
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Status
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Usage Count
                  </th>
                  <th className={`text-left px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
                    Last Updated
                  </th>
                  <th className={`text-right px-6 ${getHeaderDensityClasses()} text-xs font-semibold text-[#64748B] uppercase tracking-wider`}>
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
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={() => handleToggleSelect(record.id)}
                        className="w-4 h-4 rounded border-[#E6EEF2] text-[#00A9B7] focus:ring-[#00A9B7]"
                      />
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <span className="font-mono text-sm font-semibold text-[#0A0F14]">
                        {record.code}
                      </span>
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <span className="text-sm font-medium text-[#0A0F14]">{record.name}</span>
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <span className="text-sm text-[#64748B]">{record.description}</span>
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <StatusBadge
                        status={record.status === "active" ? "success" : "neutral"}
                        label={record.status}
                      />
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <BarChart3 className="w-4 h-4" />
                        <span>{record.usageCount} records</span>
                      </div>
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <span className="text-sm text-[#64748B]">{record.lastUpdated}</span>
                    </td>
                    <td className={`px-6 ${getDensityClasses()}`}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(record.id)}
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
                        <button
                          className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors group"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-[#64748B] group-hover:text-[#DC2626]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#E6EEF2] p-16 text-center">
            <div className="text-5xl mb-4">{config.icon}</div>
            <h3 className="text-xl font-semibold text-[#0A0F14] mb-2">No records found</h3>
            <p className="text-[#64748B] mb-6">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters or search query"
                : "Get started by creating your first record"}
            </p>
            {!searchQuery && statusFilter === "all" && (
              <Button onClick={handleCreate} className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create New Record
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}