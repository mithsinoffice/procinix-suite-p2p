import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  FileCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  ShieldAlert,
} from "lucide-react";
import { KPICard } from "../components/design-system/KPICard";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { RiskMeter } from "../components/design-system/RiskMeter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { mockVendorRequests } from "../data/mockData";

// Validation Dashboard — standalone list of every vendor currently in the
// validation pipeline (regardless of which buyer/department initiated it).
// Per-vendor drilldown lives on /vendor-portal/vendors/:id/profile; this
// page is the queue view that surfaces what needs attention across the
// portfolio.
export function ValidationDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "Pending" | "In Progress" | "Completed" | "Failed">("all");
  const [selectedRisk, setSelectedRisk] = useState<"all" | "Low" | "Medium" | "High">("all");

  const inValidation = mockVendorRequests.filter(
    (v) => v.validationStatus !== undefined,
  );

  const filtered = inValidation.filter((v) => {
    const matchesSearch =
      searchQuery === "" ||
      v.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.requestId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || v.validationStatus === selectedStatus;
    const matchesRisk = selectedRisk === "all" || v.riskLevel === selectedRisk;
    return matchesSearch && matchesStatus && matchesRisk;
  });

  const kpi = {
    inProgress: inValidation.filter((v) => v.validationStatus === "In Progress").length,
    pending: inValidation.filter((v) => v.validationStatus === "Pending").length,
    completed: inValidation.filter((v) => v.validationStatus === "Completed").length,
    failed: inValidation.filter((v) => v.validationStatus === "Failed").length,
  };

  const statusBadge = (s: string) => {
    if (s === "Completed") return <StatusBadge status="success" label="Completed" size="sm" />;
    if (s === "In Progress") return <StatusBadge status="info" label="In Progress" size="sm" />;
    if (s === "Failed") return <StatusBadge status="error" label="Failed" size="sm" />;
    return <StatusBadge status="neutral" label="Pending" size="sm" />;
  };

  const riskBadge = (level: string) => {
    if (level === "Low") return <StatusBadge status="success" label="Low" size="sm" />;
    if (level === "Medium") return <StatusBadge status="warning" label="Medium" size="sm" />;
    return <StatusBadge status="error" label="High" size="sm" />;
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A0F14]">Validation Dashboard</h1>
              <p className="text-sm text-[#64748B] mt-1">
                Real-time view of every vendor in tax, banking, sanctions, and document validation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="px-8 pt-6">
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            title="In Progress"
            value={kpi.inProgress}
            icon={<Clock className="w-5 h-5" />}
          />
          <KPICard
            title="Pending"
            value={kpi.pending}
            icon={<FileCheck className="w-5 h-5" />}
          />
          <KPICard
            title="Completed"
            value={kpi.completed}
            icon={<CheckCircle2 className="w-5 h-5" />}
          />
          <KPICard
            title="Failed"
            value={kpi.failed}
            icon={<XCircle className="w-5 h-5" />}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg border border-[#E6EEF2] p-4 mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
            <Input
              type="search"
              placeholder="Search by vendor name or request ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as typeof selectedStatus)
              }
              className="border border-[#E6EEF2] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Failed">Failed</option>
            </select>

            <select
              value={selectedRisk}
              onChange={(e) =>
                setSelectedRisk(e.target.value as typeof selectedRisk)
              }
              className="border border-[#E6EEF2] rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="all">All risk levels</option>
              <option value="Low">Low risk</option>
              <option value="Medium">Medium risk</option>
              <option value="High">High risk</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-[#E6EEF2] overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
              <tr>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Vendor
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Request ID
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Validation
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Risk
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Score
                </th>
                <th className="text-left py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="text-right py-3 px-6 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EEF2]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#64748B] text-sm">
                    No vendors match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-[#F6F9FC] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#E0F5F7] flex items-center justify-center text-[#00A9B7] text-sm font-semibold flex-shrink-0">
                          {vendor.legalName[0]}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-[#0A0F14]">{vendor.legalName}</div>
                          <div className="text-xs text-[#64748B]">{vendor.country} · {vendor.vendorType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#0A0F14] font-mono">{vendor.requestId}</td>
                    <td className="py-4 px-6">{statusBadge(vendor.validationStatus)}</td>
                    <td className="py-4 px-6">{riskBadge(vendor.riskLevel)}</td>
                    <td className="py-4 px-6">
                      <div className="w-16">
                        <RiskMeter score={vendor.validationScore ?? 0} size="sm" />
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-[#64748B]">{vendor.lastUpdated}</td>
                    <td className="py-4 px-6 text-right">
                      <Link to={`/vendor-portal/vendors/${vendor.id}/profile`}>
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Failed-validation callout */}
        {kpi.failed > 0 && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-red-900">
                {kpi.failed} vendor{kpi.failed === 1 ? "" : "s"} failed validation
              </div>
              <div className="text-xs text-red-700 mt-1">
                Sanctions hits, document forgery flags, or KYC mismatch usually require manual review by Compliance.
              </div>
            </div>
            <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          </div>
        )}
      </div>
    </div>
  );
}
