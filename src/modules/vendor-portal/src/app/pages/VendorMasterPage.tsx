import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Eye,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Building2,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/design-system/StatusBadge";

export function VendorMasterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");

  const vendors = [
    {
      id: "V-000123",
      code: "VEN123",
      name: "Acme Industries Inc.",
      legalName: "Acme Industries Incorporated",
      country: "United States",
      city: "San Francisco, CA",
      email: "contact@acme.com",
      phone: "+1 (555) 123-4567",
      status: "Active",
      riskLevel: "Low",
      activeContracts: 12,
      totalSpend: "$2.4M",
      onboardDate: "2024-06-15",
      lastActivity: "2026-02-18",
    },
    {
      id: "V-000124",
      code: "VEN124",
      name: "Global Tech Solutions",
      legalName: "Global Tech Solutions Ltd",
      country: "United Kingdom",
      city: "London",
      email: "info@globaltech.co.uk",
      phone: "+44 20 7123 4567",
      status: "Active",
      riskLevel: "Low",
      activeContracts: 8,
      totalSpend: "$1.8M",
      onboardDate: "2024-09-22",
      lastActivity: "2026-02-19",
    },
    {
      id: "V-000125",
      code: "VEN125",
      name: "Pacific Logistics Corp",
      legalName: "Pacific Logistics Corporation",
      country: "Singapore",
      city: "Singapore",
      email: "contact@pacificlog.sg",
      phone: "+65 6234 5678",
      status: "Active",
      riskLevel: "Medium",
      activeContracts: 15,
      totalSpend: "$3.2M",
      onboardDate: "2023-03-10",
      lastActivity: "2026-02-17",
    },
    {
      id: "V-000126",
      code: "VEN126",
      name: "Delta Manufacturing",
      legalName: "Delta Manufacturing Pvt Ltd",
      country: "India",
      city: "Mumbai",
      email: "sales@deltamfg.in",
      phone: "+91 22 1234 5678",
      status: "Active",
      riskLevel: "Low",
      activeContracts: 6,
      totalSpend: "$980K",
      onboardDate: "2024-11-05",
      lastActivity: "2026-02-16",
    },
    {
      id: "V-000127",
      code: "VEN127",
      name: "Omega Services Ltd",
      legalName: "Omega Professional Services Limited",
      country: "Canada",
      city: "Toronto, ON",
      email: "hello@omegaservices.ca",
      phone: "+1 (416) 555-7890",
      status: "Active",
      riskLevel: "Low",
      activeContracts: 4,
      totalSpend: "$650K",
      onboardDate: "2025-01-20",
      lastActivity: "2026-02-19",
    },
  ];

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0F14]">
            Active Vendor Master
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Manage and monitor all active vendors in the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          label="Total Active Vendors"
          value="1,342"
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          label="Low Risk"
          value="1,156"
          icon={<ShieldCheck className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          label="Medium Risk"
          value="178"
          icon={<AlertTriangle className="w-5 h-5" />}
          color="orange"
        />
        <StatCard
          label="Total Spend (YTD)"
          value="$48.2M"
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by vendor name or code..."
              className="pl-10 h-11"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={selectedFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("all")}
              className={selectedFilter === "all" ? "bg-[#00A9B7]" : ""}
            >
              All
            </Button>
            <Button
              variant={selectedFilter === "low" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("low")}
              className={selectedFilter === "low" ? "bg-[#16A34A]" : ""}
            >
              Low Risk
            </Button>
            <Button
              variant={selectedFilter === "medium" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedFilter("medium")}
              className={selectedFilter === "medium" ? "bg-[#F59E0B]" : ""}
            >
              Medium Risk
            </Button>
          </div>
        </div>
      </div>

      {/* Vendor Table */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Vendor
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Risk Level
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Contracts
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Total Spend
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EEF2]">
              {filteredVendors.map((vendor) => (
                <tr
                  key={vendor.id}
                  className="hover:bg-[#F6F9FC] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#00A9B7]" />
                      </div>
                      <div>
                        <div className="font-medium text-[#0A0F14]">
                          {vendor.name}
                        </div>
                        <div className="text-sm text-[#64748B]">
                          {vendor.code}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-sm text-[#0A0F14]">
                          {vendor.city}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          {vendor.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#64748B]">
                        <Mail className="w-3 h-3" />
                        {vendor.email}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#64748B]">
                        <Phone className="w-3 h-3" />
                        {vendor.phone}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={
                        vendor.riskLevel === "Low"
                          ? "success"
                          : vendor.riskLevel === "Medium"
                          ? "warning"
                          : "error"
                      }
                      label={vendor.riskLevel}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-[#0A0F14]">
                      {vendor.activeContracts}
                    </div>
                    <div className="text-xs text-[#64748B]">active</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-[#0A0F14]">
                      {vendor.totalSpend}
                    </div>
                    <div className="text-xs text-[#64748B]">YTD</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-[#0A0F14]">
                      {vendor.lastActivity}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/vendors/${vendor.id}/console`}
                        className="p-2 hover:bg-[#E0F5F7] rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-[#00A9B7]" />
                      </Link>
                      <button
                        className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors"
                        title="More Actions"
                      >
                        <MoreVertical className="w-4 h-4 text-[#64748B]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#E6EEF2] flex items-center justify-between">
          <div className="text-sm text-[#64748B]">
            Showing {filteredVendors.length} of {vendors.length} vendors
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Previous
            </Button>
            <Button variant="outline" size="sm" className="bg-[#00A9B7] text-white">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              3
            </Button>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: "teal" | "green" | "orange" | "blue";
}) {
  const colorClasses = {
    teal: "bg-[#E0F5F7] text-[#00A9B7]",
    green: "bg-[#F0FDF4] text-[#16A34A]",
    orange: "bg-[#FEF3C7] text-[#F59E0B]",
    blue: "bg-[#EFF6FF] text-[#3B82F6]",
  };

  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0A0F14] mb-1">{value}</div>
      <div className="text-sm text-[#64748B]">{label}</div>
    </div>
  );
}
