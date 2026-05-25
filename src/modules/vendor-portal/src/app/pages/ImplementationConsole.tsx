import { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  Activity,
  Target,
  Upload,
  Download,
  RefreshCw,
  GitBranch,
  Circle,
  PlayCircle,
  ShieldCheck,
  Database,
  FileCheck,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/design-system/StatusBadge";

// Vendor Onboarding Implementation Tracker
// =========================================
// Repurposed from the original ERP go-live console. Same three-pane layout
// (phase navigator · workspace · risks panel + bottom activity timeline) but
// the content covers a four-phase vendor-onboarding programme:
//   1. Configuration & Setup    — tenant prep, workflow templates, role map
//   2. Pilot Onboarding         — 10–20 vendor sample, accuracy baseline
//   3. Bulk Migration           — mass import of existing vendor master
//   4. Go-Live & Hypercare      — production cutover + 30-day support window

type PhaseStatus = "completed" | "in-progress" | "blocked" | "pending";
type RiskLevel = "critical" | "high" | "medium" | "low";

interface Phase {
  id: "config" | "pilot" | "bulk" | "golive";
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
  {
    id: "config",
    name: "Configuration & Setup",
    status: "completed",
    progress: 100,
    icon: <Settings className="w-4 h-4" />,
  },
  {
    id: "pilot",
    name: "Pilot Onboarding",
    status: "in-progress",
    progress: 70,
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: "bulk",
    name: "Bulk Migration",
    status: "in-progress",
    progress: 35,
    icon: <Database className="w-4 h-4" />,
  },
  {
    id: "golive",
    name: "Go-Live & Hypercare",
    status: "pending",
    progress: 0,
    icon: <PlayCircle className="w-4 h-4" />,
  },
];

const readinessMetrics: ReadinessMetric[] = [
  {
    title: "Overall Readiness",
    value: "62%",
    target: "100%",
    status: "warning",
    icon: <Activity className="w-5 h-5" />,
    change: 14,
  },
  {
    title: "Pilot Vendors Onboarded",
    value: "14 / 20",
    status: "info",
    icon: <Users className="w-5 h-5" />,
    change: 40,
  },
  {
    title: "Critical Blockers",
    value: 3,
    status: "error",
    icon: <AlertCircle className="w-5 h-5" />,
    change: -1,
  },
  {
    title: "Data Quality Score",
    value: "91%",
    target: "95%",
    status: "warning",
    icon: <ShieldCheck className="w-5 h-5" />,
    change: 6,
  },
  {
    title: "Auto-Approval Rate",
    value: "78%",
    target: "85%",
    status: "warning",
    icon: <CheckCircle className="w-5 h-5" />,
  },
  {
    title: "Target Go-Live",
    value: "Apr 12",
    status: "info",
    icon: <Calendar className="w-5 h-5" />,
  },
];

const blockers: Blocker[] = [
  {
    id: "b1",
    title: "Sanctions screening API rate-limited",
    description:
      "OFAC API capping at 500 lookups/hour. Need bulk-screening contract before the 18,500-vendor migration batch starts.",
    severity: "critical",
    phase: "Bulk Migration",
    owner: "Michael Chen",
    createdDate: "2026-02-18",
  },
  {
    id: "b2",
    title: "1,247 vendors missing PAN/Tax ID",
    description:
      "Records exist in legacy system but tax fields are empty. Buyer ops chasing originals; bulk import blocked until cleared.",
    severity: "high",
    phase: "Bulk Migration",
    owner: "Sarah Johnson",
    createdDate: "2026-02-17",
  },
  {
    id: "b3",
    title: "CFO sign-off on auto-approval thresholds",
    description:
      "Workflow template proposes auto-approving vendors with risk score < 30. CFO review of policy still pending.",
    severity: "high",
    phase: "Configuration & Setup",
    createdDate: "2026-02-16",
  },
  {
    id: "b4",
    title: "Pilot vendor login issues — SSO config",
    description:
      "3 of 14 pilot vendors unable to access the self-service portal. SSO redirect URL mismatch suspected.",
    severity: "medium",
    phase: "Pilot Onboarding",
    owner: "David Wilson",
    createdDate: "2026-02-15",
  },
];

const activityLogs: ActivityLog[] = [
  {
    id: "a1",
    date: "2026-02-19 14:30",
    event:
      "Pilot batch 2 completed — 8 vendors fully onboarded, average time 3.2 days",
    owner: "Sarah Johnson",
    impact: "high",
    type: "success",
  },
  {
    id: "a2",
    date: "2026-02-19 11:15",
    event:
      "Sanctions screening API hit rate ceiling — 500 lookups/hour, bulk-screening contract draft circulated",
    owner: "System",
    impact: "high",
    type: "error",
  },
  {
    id: "a3",
    date: "2026-02-19 09:45",
    event:
      "Workflow template 'High-risk vendor (>= 70)' published — 4-step approval, CFO + Compliance + Procurement + Legal",
    owner: "Michael Chen",
    impact: "medium",
    type: "info",
  },
  {
    id: "a4",
    date: "2026-02-18 16:20",
    event: "Role mapping completed for Procurement (12 users) and Finance (8 users)",
    owner: "David Wilson",
    impact: "medium",
    type: "success",
  },
  {
    id: "a5",
    date: "2026-02-18 14:10",
    event:
      "Legacy vendor master export validation surfaced 1,247 records missing tax IDs (6.7% of total)",
    owner: "System",
    impact: "high",
    type: "warning",
  },
  {
    id: "a6",
    date: "2026-02-18 10:30",
    event: "Tenant configuration complete — buyer entity, currencies, GL codes verified",
    owner: "Emma Davis",
    impact: "high",
    type: "success",
  },
];

export function ImplementationConsole() {
  const [selectedPhase, setSelectedPhase] = useState<Phase>(phases[1]);
  const [showActivityTimeline, setShowActivityTimeline] = useState(true);

  const overallReadiness = 62;

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Top Readiness Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-[#0A0F14] mb-1">
                Vendor Onboarding Implementation Tracker
              </h1>
              <p className="text-sm text-[#64748B]">
                Programme overview — configuration through go-live and hypercare
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-[#FEF3C7] to-[#FEF3C7]/50 border-2 border-[#F59E0B] rounded-xl">
                <div className="relative">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#E6EEF2" strokeWidth="6" fill="none" />
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
              Onboarding Phases
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
          <ActivityTimeline logs={activityLogs} onClose={() => setShowActivityTimeline(false)} />
        </footer>
      )}
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

// ── Components ─────────────────────────────────────────────────────────────

function ReadinessKPICard({ metric }: { metric: ReadinessMetric }) {
  const statusStyles = {
    success: { bg: "bg-[#F0FDF4]", border: "border-[#16A34A]", text: "text-[#16A34A]" },
    warning: { bg: "bg-[#FEF3C7]", border: "border-[#F59E0B]", text: "text-[#F59E0B]" },
    error:   { bg: "bg-[#FEF2F2]", border: "border-[#DC2626]", text: "text-[#DC2626]" },
    info:    { bg: "bg-[#EFF6FF]", border: "border-[#3B82F6]", text: "text-[#3B82F6]" },
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
        {metric.target && <span className="text-sm text-[#64748B] font-normal ml-1">/ {metric.target}</span>}
      </div>
      <div className="text-xs text-[#64748B]">{metric.title}</div>
    </div>
  );
}

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
        <div className="flex-shrink-0">{statusIcons[phase.status]}</div>
        <div className="flex-1 text-left">
          <div className="font-medium text-[#0A0F14] text-sm mb-1">{phase.name}</div>
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
        <div className="flex-shrink-0 text-[#00A9B7]">{phase.icon}</div>
      </button>
      {!isLast && <div className="absolute left-9 top-full w-0.5 h-2 bg-[#E6EEF2]" />}
    </div>
  );
}

function PhaseWorkspace({ phase }: { phase: Phase }) {
  switch (phase.id) {
    case "config":   return <ConfigSetupWorkspace />;
    case "pilot":    return <PilotOnboardingWorkspace />;
    case "bulk":     return <BulkMigrationWorkspace />;
    case "golive":   return <GoLiveWorkspace />;
  }
}

// ── Workspace: Configuration & Setup ───────────────────────────────────────
function ConfigSetupWorkspace() {
  const checklist = [
    { item: "Tenant entities and base currency configured", status: "completed" as const },
    { item: "GL code + cost-centre + entity hierarchy imported", status: "completed" as const },
    { item: "Buyer + procurement + finance roles mapped", status: "completed" as const },
    { item: "Approval workflow templates published (4 of 4)", status: "completed" as const },
    { item: "Sanctions / KYC integration tokens provisioned", status: "completed" as const },
    { item: "Auto-approval thresholds (CFO sign-off pending)", status: "in-progress" as const },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Configuration & Setup</h2>
        <p className="text-sm text-[#64748B]">
          Tenant configuration, workflow templates, and access control for the onboarding programme.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E6EEF2] overflow-hidden">
        <div className="bg-[#F0FDF4] border-b border-[#16A34A]/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileCheck className="w-5 h-5 text-[#16A34A]" />
            <div>
              <h3 className="font-semibold text-[#0A0F14]">Setup Checklist</h3>
              <p className="text-sm text-[#64748B]">5 of 6 items complete</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-[#E6EEF2]">
          {checklist.map((c, i) => (
            <div key={i} className="px-6 py-4 flex items-center gap-3">
              {c.status === "completed" ? (
                <CheckCircle className="w-5 h-5 text-[#16A34A] flex-shrink-0" />
              ) : (
                <Clock className="w-5 h-5 text-[#F59E0B] flex-shrink-0" />
              )}
              <div className="flex-1 text-sm text-[#0A0F14]">{c.item}</div>
              {c.status === "in-progress" && (
                <StatusBadge status="warning" label="In Progress" size="sm" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Workspace: Pilot Onboarding ────────────────────────────────────────────
function PilotOnboardingWorkspace() {
  const pilotStats = [
    { metric: "Vendors invited",          value: 20, target: 20 },
    { metric: "Self-service completed",   value: 14, target: 20 },
    { metric: "Validation passed",        value: 11, target: 20 },
    { metric: "Approval workflow passed", value:  9, target: 20 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Pilot Onboarding</h2>
          <p className="text-sm text-[#64748B]">
            20-vendor sample to baseline onboarding time, data quality, and policy fit before scaling up.
          </p>
        </div>
        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <Users className="w-4 h-4 mr-2" />
          Invite Pilot Vendor
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {pilotStats.map((s) => (
          <div key={s.metric} className="bg-white rounded-xl border border-[#E6EEF2] p-6">
            <div className="text-sm text-[#64748B] mb-2">{s.metric}</div>
            <div className="text-3xl font-bold text-[#0A0F14] mb-3">
              {s.value} <span className="text-sm text-[#64748B] font-normal">/ {s.target}</span>
            </div>
            <div className="h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A9B7] rounded-full"
                style={{ width: `${(s.value / s.target) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="font-semibold text-[#0A0F14] mb-4">Pilot baseline (rolling)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A] mb-1">3.2d</div>
            <div className="text-sm text-[#64748B]">Avg. time to onboard</div>
          </div>
          <div className="p-4 bg-[#EFF6FF] rounded-lg border border-[#3B82F6]/20">
            <div className="text-2xl font-bold text-[#3B82F6] mb-1">91%</div>
            <div className="text-sm text-[#64748B]">Data accuracy</div>
          </div>
          <div className="p-4 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
            <div className="text-2xl font-bold text-[#F59E0B] mb-1">2.1</div>
            <div className="text-sm text-[#64748B]">Avg. clarifications per vendor</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workspace: Bulk Migration ──────────────────────────────────────────────
function BulkMigrationWorkspace() {
  const segments = [
    { segment: "Tier 1 — Strategic (top 5% spend)", migrated: 280,   total:   320, errors:   8 },
    { segment: "Tier 2 — Recurring",                migrated: 4_215, total: 6_400, errors: 312 },
    { segment: "Tier 3 — Long tail",                migrated: 1_980, total: 9_540, errors: 927 },
    { segment: "Inactive / pending review",         migrated:     0, total: 2_240, errors:   0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Bulk Migration</h2>
          <p className="text-sm text-[#64748B]">
            Migrate the existing vendor master into the governance pipeline in tiered batches.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Batch
          </Button>
          <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-run Validation
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {segments.map((s) => (
          <div key={s.segment} className="bg-white rounded-xl border border-[#E6EEF2] p-6">
            <div className="text-sm font-medium text-[#0A0F14] mb-3">{s.segment}</div>
            <div className="text-3xl font-bold text-[#0A0F14] mb-1">
              {s.migrated.toLocaleString()}
              <span className="text-base text-[#64748B] font-normal"> / {s.total.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#64748B]">Migrated</span>
              <span className="font-medium text-[#0A0F14]">
                {Math.round((s.migrated / s.total) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-[#E6EEF2] rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#00A9B7] rounded-full"
                style={{ width: `${(s.migrated / s.total) * 100}%` }}
              />
            </div>
            {s.errors > 0 && (
              <div className="flex items-center gap-2 px-2 py-1 bg-[#FEF2F2] rounded text-xs text-[#DC2626]">
                <AlertCircle className="w-3 h-3" />
                {s.errors.toLocaleString()} records need review
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="font-semibold text-[#0A0F14] mb-4">Migration health</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#16A34A]/20">
            <div className="text-2xl font-bold text-[#16A34A] mb-1">6,475</div>
            <div className="text-sm text-[#64748B]">Vendors migrated</div>
          </div>
          <div className="p-4 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
            <div className="text-2xl font-bold text-[#F59E0B] mb-1">1,247</div>
            <div className="text-sm text-[#64748B]">Errors awaiting cleanup</div>
          </div>
          <div className="p-4 bg-[#EFF6FF] rounded-lg border border-[#3B82F6]/20">
            <div className="text-2xl font-bold text-[#3B82F6] mb-1">18,500</div>
            <div className="text-sm text-[#64748B]">Total vendors to migrate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Workspace: Go-Live & Hypercare ─────────────────────────────────────────
function GoLiveWorkspace() {
  const checklist = [
    "Communication plan published (vendor + internal)",
    "Cutover runbook reviewed by Procurement + IT + Compliance",
    "Hypercare on-call rota staffed (30-day window post-cutover)",
    "Rollback criteria documented and signed off",
    "Legacy vendor master frozen for new additions",
    "Auto-approval thresholds live and monitored",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#0A0F14] mb-1">Go-Live & Hypercare</h2>
        <p className="text-sm text-[#64748B]">
          Production cutover plan and the 30-day support window that follows.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
        <h3 className="font-semibold text-[#0A0F14] mb-4">Cutover checklist</h3>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-[#F6F9FC] rounded-lg">
              <Circle className="w-5 h-5 text-[#94A3B8] flex-shrink-0" />
              <div className="text-sm text-[#0A0F14]">{item}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#EFF6FF] border border-[#3B82F6]/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <Calendar className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-1" />
          <div>
            <h3 className="font-semibold text-[#0A0F14] mb-1">Target cutover: April 12</h3>
            <p className="text-sm text-[#64748B]">
              Hypercare window runs through May 12. Daily standup at 09:30, rollback decision point at the end of week 1.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Risks & Blockers Panel ─────────────────────────────────────────────────
function RisksBlockersPanel({ blockers }: { blockers: Blocker[] }) {
  const sevStyles: Record<RiskLevel, { bg: string; text: string }> = {
    critical: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
    high:     { bg: "bg-[#FEF3C7]", text: "text-[#F59E0B]" },
    medium:   { bg: "bg-[#EFF6FF]", text: "text-[#3B82F6]" },
    low:      { bg: "bg-[#F0FDF4]", text: "text-[#16A34A]" },
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#0A0F14]">Risks & Blockers</h2>
        <span className="text-xs text-[#64748B]">{blockers.length} open</span>
      </div>
      <div className="space-y-3">
        {blockers.map((b) => (
          <div
            key={b.id}
            className="bg-white border border-[#E6EEF2] rounded-xl p-4 hover:border-[#00A9B7]/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="font-medium text-[#0A0F14] text-sm">{b.title}</div>
              <span
                className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded ${sevStyles[b.severity].bg} ${sevStyles[b.severity].text}`}
              >
                {b.severity}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mb-3">{b.description}</p>
            <div className="flex items-center gap-3 text-[11px] text-[#64748B]">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {b.phase}
              </span>
              {b.owner && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {b.owner}
                </span>
              )}
              <span className="ml-auto">{b.createdDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Timeline ──────────────────────────────────────────────────────
function ActivityTimeline({
  logs,
  onClose,
}: {
  logs: ActivityLog[];
  onClose: () => void;
}) {
  const typeIcon: Record<ActivityLog["type"], React.ReactNode> = {
    success: <CheckCircle className="w-4 h-4 text-[#16A34A]" />,
    warning: <AlertCircle className="w-4 h-4 text-[#F59E0B]" />,
    error:   <XCircle    className="w-4 h-4 text-[#DC2626]" />,
    info:    <Activity   className="w-4 h-4 text-[#3B82F6]" />,
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#0A0F14]">Activity Timeline</h3>
        <button
          onClick={onClose}
          className="text-xs text-[#64748B] hover:text-[#0A0F14]"
        >
          Hide
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex-shrink-0 w-72 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              {typeIcon[log.type]}
              <span className="text-[11px] text-[#64748B]">{log.date}</span>
            </div>
            <div className="text-xs text-[#0A0F14] mb-2">{log.event}</div>
            <div className="text-[11px] text-[#64748B]">{log.owner}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
