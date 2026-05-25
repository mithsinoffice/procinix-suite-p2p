import { Link } from "react-router-dom";
import {
  Clock,
  Users,
  FileText,
  ShieldAlert,
  Calendar,
  ArrowRight,
} from "lucide-react";
import { KPICard } from "../components/design-system/KPICard";
import { StatusBadge } from "../components/design-system/StatusBadge";

export function DashboardPage() {
  const recentRequests = [
    {
      id: "VR-2026-001",
      vendor: "Acme Industries",
      status: "Under Validation",
      date: "2026-02-19",
      risk: "low",
    },
    {
      id: "VR-2026-002",
      vendor: "Global Tech Solutions",
      status: "Under Approval",
      date: "2026-02-18",
      risk: "medium",
    },
    {
      id: "VR-2026-003",
      vendor: "Pacific Logistics",
      status: "Awaiting Vendor",
      date: "2026-02-17",
      risk: "low",
    },
  ];

  const upcomingTasks = [
    {
      type: "approval",
      vendor: "Delta Manufacturing",
      action: "Review & Approve",
      deadline: "Today",
    },
    {
      type: "validation",
      vendor: "Omega Services",
      action: "Complete Validation",
      deadline: "Tomorrow",
    },
    {
      type: "document",
      vendor: "Sigma Corp",
      action: "Request Missing Documents",
      deadline: "In 2 days",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0A0F14]">
            Vendor Governance Dashboard
          </h1>
          <p className="text-sm text-[#64748B] mt-1">
            Overview of vendor onboarding and compliance activities
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-[#64748B]">Last Updated</div>
          <div className="text-sm font-medium text-[#0A0F14]">
            Feb 19, 2026 • 10:30 AM
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Requests"
          value="247"
          trend={{ direction: "up", value: 12 }}
          icon={<FileText className="w-5 h-5" />}
        />
        <KPICard
          title="Active Vendors"
          value="1,342"
          trend={{ direction: "up", value: 8 }}
          icon={<Users className="w-5 h-5" />}
        />
        <KPICard
          title="Pending Approvals"
          value="23"
          trend={{ direction: "down", value: 5 }}
          icon={<Clock className="w-5 h-5" />}
        />
        <KPICard
          title="High Risk Vendors"
          value="8"
          trend={{ direction: "down", value: 3 }}
          icon={<ShieldAlert className="w-5 h-5" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Requests */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#0A0F14]">
              Recent Vendor Requests
            </h2>
            <Link
              to="/vendors/requests"
              className="text-sm text-[#00A9B7] hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {recentRequests.map((request) => (
              <Link
                key={request.id}
                to={`/vendors/requests/${request.id}/edit`}
                className="flex items-center justify-between p-4 bg-[#F6F9FC] rounded-lg hover:bg-[#E6EEF2] transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-10 h-10 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#00A9B7]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-[#0A0F14]">
                      {request.vendor}
                    </div>
                    <div className="text-sm text-[#64748B]">{request.id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <StatusBadge
                    status={
                      request.status === "Under Validation"
                        ? "warning"
                        : request.status === "Under Approval"
                        ? "info"
                        : "neutral"
                    }
                    label={request.status}
                  />
                  <div className="text-sm text-[#64748B]">{request.date}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Demo Portal Link */}
          <div className="mt-6 p-4 bg-gradient-to-r from-[#E0F5F7] to-[#F6F9FC] rounded-lg border border-[#00A9B7]/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0A0F14] mb-1">
                  Preview Vendor Self-Service Portal
                </p>
                <p className="text-xs text-[#64748B]">
                  See what vendors experience during onboarding
                </p>
              </div>
              <a
                href="/portal/onboarding/demo123"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#00A9B7] text-white rounded-lg text-sm font-medium hover:bg-[#008A96] transition-colors"
              >
                Open Portal
              </a>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#0A0F14]">
              Upcoming Tasks
            </h2>
            <Calendar className="w-5 h-5 text-[#64748B]" />
          </div>

          <div className="space-y-4">
            {upcomingTasks.map((task, index) => (
              <div
                key={index}
                className="p-4 bg-[#F6F9FC] rounded-lg border-l-4 border-[#00A9B7]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium text-[#0A0F14] text-sm">
                    {task.vendor}
                  </div>
                  <div className="text-xs text-[#F59E0B] font-medium">
                    {task.deadline}
                  </div>
                </div>
                <div className="text-xs text-[#64748B]">{task.action}</div>
              </div>
            ))}
          </div>

          <Link
            to="/vendors/requests"
            className="mt-4 block text-center text-sm text-[#00A9B7] hover:underline"
          >
            View All Tasks
          </Link>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <h2 className="text-lg font-semibold text-[#0A0F14] mb-6">
            Request Status Distribution
          </h2>
          <div className="space-y-4">
            <StatusRow
              label="Draft"
              count={45}
              percentage={18}
              color="bg-[#94A3B8]"
            />
            <StatusRow
              label="Awaiting Vendor"
              count={62}
              percentage={25}
              color="bg-[#F59E0B]"
            />
            <StatusRow
              label="Under Validation"
              count={38}
              percentage={15}
              color="bg-[#3B82F6]"
            />
            <StatusRow
              label="Under Approval"
              count={23}
              percentage={9}
              color="bg-[#8B5CF6]"
            />
            <StatusRow
              label="Approved"
              count={79}
              percentage={32}
              color="bg-[#16A34A]"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <h2 className="text-lg font-semibold text-[#0A0F14] mb-6">
            Risk Distribution
          </h2>
          <div className="space-y-4">
            <StatusRow
              label="Low Risk"
              count={1156}
              percentage={86}
              color="bg-[#16A34A]"
            />
            <StatusRow
              label="Medium Risk"
              count={178}
              percentage={13}
              color="bg-[#F59E0B]"
            />
            <StatusRow
              label="High Risk"
              count={8}
              percentage={1}
              color="bg-[#DC2626]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusRow({
  label,
  count,
  percentage,
  color,
}: {
  label: string;
  count: number;
  percentage: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-[#64748B]">{label}</div>
        <div className="text-sm font-medium text-[#0A0F14]">
          {count} ({percentage}%)
        </div>
      </div>
      <div className="w-full h-2 bg-[#F6F9FC] rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}