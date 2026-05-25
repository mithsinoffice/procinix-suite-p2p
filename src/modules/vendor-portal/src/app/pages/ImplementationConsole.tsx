import { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Play,
  TrendingUp,
  Users,
  Database,
  Zap,
  Calendar,
  FileText,
  Settings,
  Activity,
  Target,
  Info,
  Upload,
  Download,
  RefreshCw,
  Eye,
  Edit,
  User,
  Send,
  Flag,
  GitBranch,
  CheckSquare,
  Circle,
  PlayCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/design-system/StatusBadge";

// Types
type PhaseStatus = "completed" | "in-progress" | "blocked" | "pending";
type RiskLevel = "critical" | "high" | "medium" | "low";

interface Phase {
  id: string;
  name: string;
  status: PhaseStatus;
  progress: number;
  icon: React.ReactNode;
}

interface ReadinessMetric {
  title: string;
  value: string | number;
  target?: string | number;
  status: "success" | "warning" | "error" | "info";
  icon: React.ReactNode;
  change?: number;
}

interface Blocker {
  id: string;
  title: string;
  description: string;
  severity: RiskLevel;
  phase: string;
  owner?: string;
  createdDate: string;
}

interface ActivityLog {
  id: string;
  date: string;
  event: string;
  owner: string;
  impact: "high" | "medium" | "low";
  type: "success" | "warning" | "error" | "info";
}

const phases: Phase[] = [
  { id: "tenant", name: "Tenant Setup", status: "completed", progress: 100, icon: <Settings className="w-4 h-4" /> },
  { id: "migration", name: "Master Migration", status: "in-progress", progress: 75, icon: <Database className="w-4 h-4" /> },
  { id: "workflows", name: "Workflow Setup", status: "in-progress", progress: 60, icon: <GitBranch className="w-4 h-4" /> },
  { id: "integrations", name: "Integrations", status: "blocked", progress: 45, icon: <Zap className="w-4 h-4" /> },
  { id: "users", name: "Users & Roles", status: "in-progress", progress: 80, icon: <Users className="w-4 h-4" /> },
  { id: "uat", name: "UAT Execution", status: "pending", progress: 0, icon: <Target className="w-4 h-4" /> },
  { id: "checklist", name: "Go-Live Checklist", status: "pending", progress: 0, icon: <CheckSquare className="w-4 h-4" /> },
  { id: "launch", name: "Production Launch", status: "pending", progress: 0, icon: <PlayCircle className="w-4 h-4" /> },
];

const readinessMetrics: ReadinessMetric[] = [
  { title: "Overall Readiness", value: "68%", target: "100%", status: "warning", icon: <Activity className="w-5 h-5" />, change: 12 },
  { title: "Critical Issues", value: 5, status: "error", icon: <AlertCircle className="w-5 h-5" />, change: -2 },
  { title: "Completed Phases", value: "1/8", status: "info", icon: <CheckCircle className="w-5 h-5" /> },
  { title: "Pending Approvals", value: 8, status: "warning", icon: <Clock className="w-5 h-5" /> },
  { title: "Integration Health", value: "82%", target: "100%", status: "warning", icon: <Zap className="w-5 h-5" /> },
  { title: "Target Go-Live", value: "Mar 15", status: "info", icon: <Calendar className="w-5 h-5" /> },
];

const blockers: Blocker[] = [
  {
    id: "b1",
    title: "SAP Integration Timeout",
    description: "Connection timing out after 30 seconds. Need network configuration update.",
    severity: "critical",
    phase: "Integrations",
    owner: "Michael Chen",
    createdDate: "2026-02-18",
  },
  {
    id: "b2",
    title: "Vendor Master Data Validation Errors",
    description: "3,245 records with missing GST numbers. Awaiting vendor data cleanup.",
    severity: "high",
    phase: "Master Migration",
    owner: "Sarah Johnson",
    createdDate: "2026-02-17",
  },
  {
    id: "b3",
    title: "CFO Sign-off Pending",
    description: "Approval workflow configuration requires CFO review and sign-off.",
    severity: "high",
    phase: "Workflow Setup",
    createdDate: "2026-02-16",
  },
  {
    id: "b4",
    title: "User Provisioning Incomplete",
    description: "125 users pending Active Directory sync. IT ticket raised.",
    severity: "medium",
    phase: "Users & Roles",
    owner: "David Wilson",
    createdDate: "2026-02-15",
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: "a1",
    date: "2026-02-19 14:30",
    event: "Vendor master migration batch 3 completed - 15,234 records",
    owner: "Sarah Johnson",
    impact: "high",
    type: "success",
  },
  {
    id: "a2",
    date: "2026-02-19 11:15",
    event: "SAP integration health check failed - timeout error",
    owner: "System",
    impact: "high",
    type: "error",
  },
  {
    id: "a3",
    date: "2026-02-19 09:45",
    event: "Workflow approval rules updated for high-value vendors",
    owner: "Michael Chen",
    impact: "medium",
    type: "info",
  },
  {
    id: "a4",
    date: "2026-02-18 16:20",
    event: "User role assignments completed for Finance department (45 users)",
    owner: "David Wilson",
    impact: "medium",
    type: "success",
  },
  {
    id: "a5",
    date: "2026-02-18 14:10",
    event: "Data validation errors detected in vendor master (3,245 records)",
    owner: "System",
    impact: "high",
    type: "warning",
  },
  {
    id: "a6",
    date: "2026-02-18 10:30",
    event: "Tenant configuration completed and verified",
    owner: "Emma Davis",
    impact: "high",
    type: "success",
  },
];

export function ImplementationConsole() {
  const [selectedPhase, setSelectedPhase] = useState<Phase>(phases[1]); // Default to Master Migration
  const [showActivityTimeline, setShowActivityTimeline] = useState(true);

  const overallReadiness = 68;

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Top Readiness Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          {/* Title & Status */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0A0F14] mb-1">
                Implementation & Go-Live Console
              </h1>
              <p className="text-sm text-[#64748B]">
                Procinix ERP - Executive Implementation Dashboard
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Readiness Indicator */}
              <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#FEF3C7] to-[#FEF3C7]/50 border-2 border-[#F59E0B] rounded-xl">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#E6EEF2"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke={overallReadiness >= 80 ? "#16A34A" : overallReadiness >= 50 ? "#F59E0B" : "#DC2626"}
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 28 * (overallReadiness / 100)} ${2 * Math.PI * 28}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-[#0A0F14]">{overallReadiness}%</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#64748B] mb-1">Go-Live Readiness</div>
                  <div className="font-semibold text-[#0A0F14]">
                    {overallReadiness >= 80 ? "Ready" : overallReadiness >= 50 ? "At Risk" : "Not Ready"}
                  </div>
                </div>
              </div>
              <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
                <Download className="w-4 h-4 mr-2" />
                Executive Summary
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-6 gap-4">
            {readinessMetrics.map((metric, index) => (
              <ReadinessKPICard key={index} metric={metric} />
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Phase Navigator */}
        <aside className="w-80 bg-white border-r border-[#E6EEF2] overflow-auto">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">
              Implementation Phases
            </h2>
            <div className="space-y-2">
              {phases.map((phase, index) => (
                <PhaseNavigatorItem
                  key={phase.id}
                  phase={phase}
                  isSelected={selectedPhase.id === phase.id}
                  onClick={() => setSelectedPhase(phase)}
                  isLast={index === phases.length - 1}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Center Phase Workspace */}
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <PhaseWorkspace phase={selectedPhase} />
          </div>
        </main>

        {/* Right Risks & Blockers Panel */}
        <aside className="w-96 bg-white border-l border-[#E6EEF2] overflow-auto">
          <RisksBlockersPanel blockers={blockers} />
        </aside>
      </div>

      {/* Bottom Activity Timeline */}
      {showActivityTimeline && (
        <footer className="bg-white border-t border-[#E6EEF2]">
          <ActivityTimeline
            logs={activityLogs}
            onClose={() => setShowActivityTimeline(false)}
          />
        </footer>
      )}

      {/* Timeline Toggle */}
      {!showActivityTimeline && (
        <button
          onClick={() => setShowActivityTimeline(true)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-[#00A9B7] text-white rounded-xl shadow-lg hover:bg-[#008A96] transition-colors"
        >
          <Activity className="w-4 h-4" />
          Show Activity Timeline
        </button>
      )}
    </div>
  );
}

// Component: Readiness KPI Card
function ReadinessKPICard({ metric }: { metric: ReadinessMetric }) {
  const statusStyles = {
    success: { bg: "bg-[#F0FDF4]", border: "border-[#16A34A]", text: "text-[#16A34A]" },
    warning: { bg: "bg-[#FEF3C7]", border: "border-[#F59E0B]", text: "text-[#F59E0B]" },
    error: { bg: "bg-[#FEF2F2]", border: "border-[#DC2626]", text: "text-[#DC2626]" },
    info: { bg: "bg-[#EFF6FF]", border: "border-[#3B82F6]", text: "text-[#3B82F6]" },
  };

  const style = statusStyles[metric.status];

  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${style.bg} rounded-lg flex items-center justify-center ${style.text}`}>
          {metric.icon}
        </div>
        {metric.change !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium ${metric.change >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
            {metric.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
            {Math.abs(metric.change)}%
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[#0A0F14] mb-1">
        {metric.value}
        {metric.target && (
          <span className="text-sm text-[#64748B] font-normal ml-1">/ {metric.target}</span>
        )}
      </div>
      <div className="text-xs text-[#64748B]">{metric.title}</div>
    </div>
  );
}

// Component: Phase Navigator Item
function PhaseNavigatorItem({
  phase,
  isSelected,
  onClick,
  isLast,
}: {
  phase: Phase;
  isSelected: boolean;
  onClick: () => void;
  isLast: boolean;
}) {
  const statusIcons = {
    completed: <CheckCircle className="w-5 h-5 text-[#16A34A]" />,
    "in-progress": <Clock className="w-5 h-5 text-[#F59E0B]" />,
    blocked: <XCircle className="w-5 h-5 text-[#DC2626]" />,
    pending: <Circle className="w-5 h-5 text-[#94A3B8]" />,
  };

  return (
    <div className="relative">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all ${
          isSelected
            ? "bg-[#E0F5F7] border-2 border-[#00A9B7]"
            : "bg-white border-2 border-[#E6EEF2] hover:border-[#00A9B7]/30 hover:bg-[#F6F9FC]"
        }`}
      >
        <div className="flex-shrink-0">
          {statusIcons[phase.status]}
        </div>
        <div className="flex-1 text-left">
          <div className="font-medium text-[#0A0F14] text-sm mb-1">
            {phase.name}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-[#E6EEF2] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  phase.status === "completed"
                    ? "bg-[#16A34A]"
                    : phase.status === "blocked"
                    ? "bg-[#DC2626]"
                    : "bg-[#F59E0B]"
                }`}
                style={{ width: `${phase.progress}%` }}
              />
            </div>
            <span className="text-xs text-[#64748B] font-medium">{phase.progress}%</span>
          </div>
        </div>
        <div className="flex-shrink-0 text-[#00A9B7]">
          {phase.icon}
        </div>
      </button>
      {!isLast && (
        <div className="absolute left-9 top-full w-0.5 h-2 bg-[#E6EEF2]" />
      )}
    </div>
  );
}

// Component: Phase Workspace
function PhaseWorkspace({ phase }: { phase: Phase }) {
  switch (phase.id) {
    case "migration":
      return <MasterMigrationWorkspace />;
    case "workflows":
      return <WorkflowSetupWorkspace />;
    case "integrations":
      return <IntegrationsWorkspace />;
    case "uat":
      return <UATWorkspace />;
    case "checklist":
      return <GoLiveChecklistWorkspace />;
    default:
      return <DefaultWorkspace phase={phase} />;
  }
}

// Workspace: Master Migration
function MasterMigrationWorkspace() {
  const migrationStats = [
    { entity: "Vendors", migrated: 15234, total: 18500, errors: 3245 },
    { entity: "Items", migrated: 45678, total: 48200, errors: 1122 },
    { entity: "Customers", migrated: 12890, total: 13000, errors: 110 },
    { entity: "GL Accounts", migrated: 1200, total: 1200, errors: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Master Data Migration</h2>
          <p className="text-sm text-[#64748B]">Track migration progress and data quality</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Upload Batch
          </Button>
          <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Validation
          </Button>
        </div>
      </div>

      {/* Migration Progress Cards */}
      <div className="grid grid-cols-4 gap-4">
        {migrationStats.map((stat) => (
          <div key={stat.entity} className="bg-white rounded-xl border border-[#E6EEF2] p-6">
            <div className="text-sm text-[#64748B] mb-2">{stat.entity}</div>
            <div className="text-3xl font-bold text-[#0A0F14] mb-3">
              {stat.migrated.toLocaleString()}
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#64748B]">Progress</span>
              <span className="font-medium text-[#0A0F14]">
                {Math.round((stat.migrated / stat.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#E6EEF2] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#00A9B7] rounded-full"
                style={{ width: `${(stat.migrated / stat.total) * 100}%` }}
              />
            </div>
            {stat.errors > 0 && (
              <div className="flex items-center gap-2 px-2 py-1 bg-[#FEF2F2] rounded text-xs text-[#DC2626]">
                <AlertCircle className="w-3 h-3" />
                {stat.errors} errors
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Error Records List */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="bg-[#FEF2F2] border-b border-[#DC2626]/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
            <div>
              <h3 className="font-semibold text-[#0A0F14]">Data Validation Errors</h3>
              <p className="text-sm text-[#64748B]">4,477 records require attention</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F6F9FC]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Entity</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Record ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Error Type</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Description</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-[#64748B] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6EEF2]">
              <tr className="hover:bg-[#F6F9FC]">
                <td className="px-6 py-4 text-sm text-[#0A0F14]">Vendor</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">VEN-12345</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] text-[#DC2626] rounded text-xs">
                    Missing GST
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">GST number field is empty</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
                </td>
              </tr>
              <tr className="hover:bg-[#F6F9FC]">
                <td className="px-6 py-4 text-sm text-[#0A0F14]">Item</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">ITM-67890</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] text-[#DC2626] rounded text-xs">
                    Invalid UOM
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">Unit of measure not in master list</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
                </td>
              </tr>
              <tr className="hover:bg-[#F6F9FC]">
                <td className="px-6 py-4 text-sm text-[#0A0F14]">Vendor</td>
                <td className="px-6 py-4 text-sm text-[#64748B]">VEN-45678</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#FEF2F2] text-[#DC2626] rounded text-xs">
                    Duplicate PAN
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-[#64748B]">PAN number already exists in system</td>
                <td className="px-6 py-4 text-right">
                  <Button variant="outline" size="sm">
                    <Edit className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-[#F6F9FC] px-6 py-4 border-t border-[#E6EEF2] flex items-center justify-between">
          <span className="text-sm text-[#64748B]">Showing 3 of 4,477 errors</span>
          <Button variant="outline" size="sm">
            View All Errors
          </Button>
        </div>
      </div>

      {/* Data Validation Summary */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="font-semibold text-[#0A0F14] mb-4">Validation Summary</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A] mb-1">74,002</div>
            <div className="text-sm text-[#64748B]">Valid Records</div>
          </div>
          <div className="p-4 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
            <div className="text-2xl font-bold text-[#F59E0B] mb-1">4,477</div>
            <div className="text-sm text-[#64748B]">Errors Found</div>
          </div>
          <div className="p-4 bg-[#EFF6FF] rounded-lg border border-[#3B82F6]/20">
            <div className="text-2xl font-bold text-[#3B82F6] mb-1">78,479</div>
            <div className="text-sm text-[#64748B]">Total Processed</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Workspace: Workflow Setup
function WorkflowSetupWorkspace() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Workflow Configuration</h2>
          <p className="text-sm text-[#64748B]">Configure and test approval workflows</p>
        </div>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <GitBranch className="w-4 h-4 mr-2" />
          Configure Workflow
        </Button>
      </div>

      {/* Workflow Status Cards */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-[#16A34A]" />
            </div>
            <StatusBadge status="success" label="Active" />
          </div>
          <div className="text-3xl font-bold text-[#0A0F14] mb-2">12</div>
          <div className="text-sm text-[#64748B]">Configured Workflows</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#FEF3C7] rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <StatusBadge status="warning" label="Pending" />
          </div>
          <div className="text-3xl font-bold text-[#0A0F14] mb-2">3</div>
          <div className="text-sm text-[#64748B]">Awaiting Approval</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center">
              <Target className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <StatusBadge status="info" label="Testing" />
          </div>
          <div className="text-3xl font-bold text-[#0A0F14] mb-2">8</div>
          <div className="text-sm text-[#64748B]">Test Scenarios Passed</div>
        </div>
      </div>

      {/* Workflow List */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
          <h3 className="font-semibold text-[#0A0F14]">Approval Workflows</h3>
        </div>
        <div className="divide-y divide-[#E6EEF2]">
          <WorkflowItem
            name="Vendor Onboarding Approval"
            version="v2.3"
            status="active"
            approvers={["Category Manager", "Finance Controller", "CFO"]}
            sla="48h"
            testStatus="passed"
          />
          <WorkflowItem
            name="Vendor Change Request"
            version="v1.8"
            status="active"
            approvers={["Category Manager", "Compliance Officer"]}
            sla="24h"
            testStatus="passed"
          />
          <WorkflowItem
            name="High Risk Vendor Review"
            version="v1.0"
            status="pending"
            approvers={["Risk Manager", "Legal", "CFO"]}
            sla="72h"
            testStatus="not-tested"
          />
        </div>
      </div>
    </div>
  );
}

function WorkflowItem({
  name,
  version,
  status,
  approvers,
  sla,
  testStatus,
}: {
  name: string;
  version: string;
  status: "active" | "pending" | "draft";
  approvers: string[];
  sla: string;
  testStatus: "passed" | "failed" | "not-tested";
}) {
  return (
    <div className="p-6 hover:bg-[#F6F9FC] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-semibold text-[#0A0F14]">{name}</h4>
            <span className="text-xs text-[#64748B] bg-[#F6F9FC] px-2 py-1 rounded">{version}</span>
            <StatusBadge
              status={status === "active" ? "success" : status === "pending" ? "warning" : "neutral"}
              label={status}
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-[#64748B]">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {approvers.length} approvers
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              SLA: {sla}
            </span>
            <span className="flex items-center gap-1">
              {testStatus === "passed" ? (
                <CheckCircle className="w-3 h-3 text-[#16A34A]" />
              ) : testStatus === "failed" ? (
                <XCircle className="w-3 h-3 text-[#DC2626]" />
              ) : (
                <Clock className="w-3 h-3 text-[#64748B]" />
              )}
              Test: {testStatus}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm">
            <Play className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-xs text-[#64748B]">Approvers:</div>
        <div className="flex gap-1">
          {approvers.map((approver, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-[#E0F5F7] text-[#00A9B7] rounded"
            >
              {approver}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Workspace: Integrations
function IntegrationsWorkspace() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">System Integrations</h2>
          <p className="text-sm text-[#64748B]">Monitor ERP and API connectivity</p>
        </div>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <RefreshCw className="w-4 h-4 mr-2" />
          Test All Connections
        </Button>
      </div>

      {/* Integration Health Cards */}
      <div className="grid grid-cols-2 gap-6">
        <IntegrationCard
          name="SAP S/4HANA"
          status="error"
          lastSync="2026-02-19 11:15"
          health={45}
          endpoint="https://sap.acme.com/api/v2"
        />
        <IntegrationCard
          name="Oracle ERP Cloud"
          status="success"
          lastSync="2026-02-19 14:30"
          health={98}
          endpoint="https://oracle.acme.com/fscmRestApi"
        />
        <IntegrationCard
          name="Active Directory"
          status="warning"
          lastSync="2026-02-19 13:00"
          health={75}
          endpoint="ldap://ad.acme.com:389"
        />
        <IntegrationCard
          name="Payment Gateway"
          status="success"
          lastSync="2026-02-19 14:45"
          health={100}
          endpoint="https://payments.acme.com/api"
        />
      </div>

      {/* Connection Test Log */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
          <h3 className="font-semibold text-[#0A0F14]">Connection Test History</h3>
        </div>
        <div className="divide-y divide-[#E6EEF2]">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FEF2F2] rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div>
                <div className="font-medium text-[#0A0F14]">SAP Connection Timeout</div>
                <div className="text-sm text-[#64748B]">2026-02-19 11:15 • Request timeout after 30s</div>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Retry
            </Button>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#F0FDF4] rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <div className="font-medium text-[#0A0F14]">Oracle ERP Sync Successful</div>
                <div className="text-sm text-[#64748B]">2026-02-19 14:30 • 15,234 records synced</div>
              </div>
            </div>
            <span className="text-xs text-[#64748B]">125ms</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#FEF3C7] rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div>
                <div className="font-medium text-[#0A0F14]">Active Directory Slow Response</div>
                <div className="text-sm text-[#64748B]">2026-02-19 13:00 • Connection successful but slow</div>
              </div>
            </div>
            <span className="text-xs text-[#64748B]">3,450ms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  name,
  status,
  lastSync,
  health,
  endpoint,
}: {
  name: string;
  status: "success" | "warning" | "error";
  lastSync: string;
  health: number;
  endpoint: string;
}) {
  const statusConfig = {
    success: { bg: "bg-[#F0FDF4]", icon: <CheckCircle className="w-6 h-6 text-[#16A34A]" />, badge: "success" },
    warning: { bg: "bg-[#FEF3C7]", icon: <AlertCircle className="w-6 h-6 text-[#F59E0B]" />, badge: "warning" },
    error: { bg: "bg-[#FEF2F2]", icon: <XCircle className="w-6 h-6 text-[#DC2626]" />, badge: "error" },
  };

  const config = statusConfig[status];

  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 ${config.bg} rounded-xl flex items-center justify-center`}>
          {config.icon}
        </div>
        <StatusBadge status={config.badge as any} label={status} />
      </div>
      <h3 className="font-semibold text-[#0A0F14] mb-2">{name}</h3>
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[#64748B]">Health</span>
          <span className="font-medium text-[#0A0F14]">{health}%</span>
        </div>
        <div className="h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              health >= 80 ? "bg-[#16A34A]" : health >= 50 ? "bg-[#F59E0B]" : "bg-[#DC2626]"
            }`}
            style={{ width: `${health}%` }}
          />
        </div>
      </div>
      <div className="text-xs text-[#64748B] mb-3">
        <div className="mb-1">Last sync: {lastSync}</div>
        <div className="font-mono bg-[#F6F9FC] px-2 py-1 rounded break-all">{endpoint}</div>
      </div>
      <Button variant="outline" size="sm" className="w-full">
        <Play className="w-3 h-3 mr-2" />
        Test Connection
      </Button>
    </div>
  );
}

// Workspace: UAT
function UATWorkspace() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">User Acceptance Testing</h2>
          <p className="text-sm text-[#64748B]">Track UAT scenarios and sign-offs</p>
        </div>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <FileText className="w-4 h-4 mr-2" />
          Request Sign-off
        </Button>
      </div>

      {/* UAT Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="text-3xl font-bold text-[#0A0F14] mb-2">42/50</div>
          <div className="text-sm text-[#64748B]">Test Scenarios</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="text-3xl font-bold text-[#16A34A] mb-2">35</div>
          <div className="text-sm text-[#64748B]">Passed</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="text-3xl font-bold text-[#DC2626] mb-2">7</div>
          <div className="text-sm text-[#64748B]">Failed</div>
        </div>
        <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
          <div className="text-3xl font-bold text-[#F59E0B] mb-2">8</div>
          <div className="text-sm text-[#64748B]">Pending</div>
        </div>
      </div>

      {/* Defect List */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
          <h3 className="font-semibold text-[#0A0F14]">Open Defects</h3>
        </div>
        <div className="divide-y divide-[#E6EEF2]">
          <DefectItem
            id="DEF-001"
            title="Vendor approval email notification not triggering"
            severity="high"
            status="in-progress"
            assignee="Michael Chen"
          />
          <DefectItem
            id="DEF-002"
            title="GST validation regex not matching 15-digit format"
            severity="medium"
            status="open"
            assignee="Sarah Johnson"
          />
          <DefectItem
            id="DEF-003"
            title="Dashboard KPI cards showing incorrect totals"
            severity="critical"
            status="in-progress"
            assignee="David Wilson"
          />
        </div>
      </div>
    </div>
  );
}

function DefectItem({
  id,
  title,
  severity,
  status,
  assignee,
}: {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved";
  assignee: string;
}) {
  return (
    <div className="p-4 hover:bg-[#F6F9FC] transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-[#64748B]">{id}</span>
            <span
              className={`text-xs px-2 py-1 rounded ${
                severity === "critical"
                  ? "bg-[#FEF2F2] text-[#DC2626]"
                  : severity === "high"
                  ? "bg-[#FEF3C7] text-[#F59E0B]"
                  : "bg-[#EFF6FF] text-[#3B82F6]"
              }`}
            >
              {severity}
            </span>
            <StatusBadge
              status={status === "resolved" ? "success" : status === "in-progress" ? "warning" : "neutral"}
              label={status}
            />
          </div>
          <div className="font-medium text-[#0A0F14] mb-2">{title}</div>
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <User className="w-3 h-3" />
            {assignee}
          </div>
        </div>
        <Button variant="outline" size="sm">
          View
        </Button>
      </div>
    </div>
  );
}

// Workspace: Go-Live Checklist
function GoLiveChecklistWorkspace() {
  const checklistItems = [
    { category: "Infrastructure", items: [
      { name: "Production environment provisioned", status: "complete" },
      { name: "Load balancer configured", status: "complete" },
      { name: "SSL certificates installed", status: "complete" },
      { name: "Backup systems verified", status: "in-progress" },
    ]},
    { category: "Data", items: [
      { name: "All master data migrated", status: "in-progress" },
      { name: "Data validation 100% clean", status: "blocked" },
      { name: "Historical data archived", status: "complete" },
    ]},
    { category: "Integrations", items: [
      { name: "SAP integration live and tested", status: "blocked" },
      { name: "Oracle ERP sync verified", status: "complete" },
      { name: "Payment gateway connected", status: "complete" },
    ]},
    { category: "Security & Access", items: [
      { name: "All users provisioned", status: "in-progress" },
      { name: "Role-based access configured", status: "complete" },
      { name: "Security audit passed", status: "pending" },
    ]},
    { category: "Training & Support", items: [
      { name: "User training completed", status: "in-progress" },
      { name: "Support team ready", status: "complete" },
      { name: "Documentation published", status: "complete" },
    ]},
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Go-Live Readiness Checklist</h2>
          <p className="text-sm text-[#64748B]">All items must be green before production launch</p>
        </div>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <Download className="w-4 h-4 mr-2" />
          Export Checklist
        </Button>
      </div>

      {/* Overall Progress */}
      <div className="bg-white rounded-xl border-2 border-[#F59E0B] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-[#64748B] mb-1">Overall Checklist Progress</div>
            <div className="text-3xl font-bold text-[#0A0F14]">68%</div>
          </div>
          <div className="px-4 py-2 bg-[#FEF3C7] rounded-lg">
            <div className="text-sm font-medium text-[#F59E0B]">5 Critical Items Pending</div>
          </div>
        </div>
        <div className="h-3 bg-[#E6EEF2] rounded-full overflow-hidden">
          <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: "68%" }} />
        </div>
      </div>

      {/* Checklist Categories */}
      <div className="space-y-4">
        {checklistItems.map((category) => (
          <div key={category.category} className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
            <div className="bg-[#F6F9FC] px-6 py-3 border-b border-[#E6EEF2]">
              <h3 className="font-semibold text-[#0A0F14]">{category.category}</h3>
            </div>
            <div className="divide-y divide-[#E6EEF2]">
              {category.items.map((item, index) => (
                <div key={index} className="px-6 py-4 flex items-center justify-between hover:bg-[#F6F9FC] transition-colors">
                  <div className="flex items-center gap-3">
                    {item.status === "complete" ? (
                      <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                    ) : item.status === "blocked" ? (
                      <XCircle className="w-5 h-5 text-[#DC2626]" />
                    ) : item.status === "in-progress" ? (
                      <Clock className="w-5 h-5 text-[#F59E0B]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#94A3B8]" />
                    )}
                    <span className="text-sm text-[#0A0F14]">{item.name}</span>
                  </div>
                  <StatusBadge
                    status={
                      item.status === "complete" ? "success" :
                      item.status === "blocked" ? "error" :
                      item.status === "in-progress" ? "warning" : "neutral"
                    }
                    label={item.status}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Workspace: Default
function DefaultWorkspace({ phase }: { phase: Phase }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-[#E0F5F7] rounded-2xl flex items-center justify-center mx-auto mb-6">
          {phase.icon}
        </div>
        <h2 className="text-2xl font-bold text-[#0A0F14] mb-2">{phase.name}</h2>
        <p className="text-[#64748B] mb-6">
          This phase workspace will be populated with relevant tasks and metrics.
        </p>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          Configure Phase
        </Button>
      </div>
    </div>
  );
}

// Component: Risks & Blockers Panel
function RisksBlockersPanel({ blockers }: { blockers: Blocker[] }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#0A0F14]">Risks & Blockers</h2>
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {blockers.map((blocker) => (
          <BlockerCard key={blocker.id} blocker={blocker} />
        ))}
      </div>
    </div>
  );
}

function BlockerCard({ blocker }: { blocker: Blocker }) {
  const severityConfig = {
    critical: { bg: "bg-[#FEF2F2]", border: "border-[#DC2626]", text: "text-[#DC2626]" },
    high: { bg: "bg-[#FEF3C7]", border: "border-[#F59E0B]", text: "text-[#F59E0B]" },
    medium: { bg: "bg-[#EFF6FF]", border: "border-[#3B82F6]", text: "text-[#3B82F6]" },
    low: { bg: "bg-[#F0FDF4]", border: "border-[#16A34A]", text: "text-[#16A34A]" },
  };

  const config = severityConfig[blocker.severity];

  return (
    <div className={`${config.bg} border-l-4 ${config.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between mb-2">
        <span className={`text-xs font-semibold ${config.text} uppercase`}>
          {blocker.severity}
        </span>
        <span className="text-xs text-[#64748B]">{blocker.createdDate}</span>
      </div>
      <h4 className="font-semibold text-[#0A0F14] mb-2">{blocker.title}</h4>
      <p className="text-sm text-[#64748B] mb-3">{blocker.description}</p>
      <div className="flex items-center gap-2 mb-3 text-xs text-[#64748B]">
        <span className="px-2 py-1 bg-white rounded">{blocker.phase}</span>
        {blocker.owner && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {blocker.owner}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="flex-1 text-xs">
          <Send className="w-3 h-3 mr-1" />
          Assign
        </Button>
        <Button size="sm" variant="outline" className="flex-1 text-xs">
          <Flag className="w-3 h-3 mr-1" />
          Escalate
        </Button>
      </div>
    </div>
  );
}

// Component: Activity Timeline
function ActivityTimeline({
  logs,
  onClose,
}: {
  logs: ActivityLog[];
  onClose: () => void;
}) {
  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#0A0F14] flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#00A9B7]" />
          Implementation Activity Timeline
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors"
        >
          <XCircle className="w-5 h-5 text-[#64748B]" />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#F6F9FC]">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Date</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Event</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Owner</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Impact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6EEF2]">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-[#F6F9FC] transition-colors">
                <td className="px-4 py-3 text-sm text-[#64748B] whitespace-nowrap">{log.date}</td>
                <td className="px-4 py-3 text-sm text-[#0A0F14]">{log.event}</td>
                <td className="px-4 py-3 text-sm text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {log.owner}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      log.impact === "high"
                        ? "bg-[#FEF2F2] text-[#DC2626]"
                        : log.impact === "medium"
                        ? "bg-[#FEF3C7] text-[#F59E0B]"
                        : "bg-[#EFF6FF] text-[#3B82F6]"
                    }`}
                  >
                    {log.impact}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {log.type === "success" ? (
                    <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                  ) : log.type === "error" ? (
                    <XCircle className="w-5 h-5 text-[#DC2626]" />
                  ) : log.type === "warning" ? (
                    <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  ) : (
                    <Info className="w-5 h-5 text-[#3B82F6]" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper: Plus icon
function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
