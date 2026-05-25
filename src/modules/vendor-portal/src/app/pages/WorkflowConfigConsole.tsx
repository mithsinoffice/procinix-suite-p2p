import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Play,
  Save,
  RotateCcw,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  User,
  Bell,
  Settings,
  Diamond,
  Circle,
  Square,
  Zap,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  History,
  Calendar,
  Code,
  Target,
  Layers,
  Info,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { Textarea } from "../components/ui/textarea";

// Types
type WorkflowStatus = "active" | "draft" | "inactive";

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  version: string;
  lastModified: string;
  modifiedBy: string;
  category: string;
}

type NodeType =
  | "start"
  | "approval"
  | "condition"
  | "notification"
  | "script"
  | "end";

interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  position: { x: number; y: number };
  config: {
    approvers?: string[];
    approverType?: "user" | "role" | "dynamic";
    slaHours?: number;
    escalationTo?: string;
    condition?: string;
    notificationType?: string;
    scriptCode?: string;
    parallelApproval?: boolean;
    requireAll?: boolean;
  };
}

interface WorkflowVersion {
  version: string;
  date: string;
  author: string;
  changes: string;
  status: "current" | "previous";
}

const mockWorkflows: Workflow[] = [
  {
    id: "wf-001",
    name: "Vendor Onboarding Approval",
    description: "Multi-level approval workflow for new vendor registration",
    status: "active",
    version: "v2.3",
    lastModified: "2026-02-15",
    modifiedBy: "Sarah Johnson",
    category: "Vendor Management",
  },
  {
    id: "wf-002",
    name: "Vendor Change Request",
    description: "Workflow for vendor master data change requests",
    status: "active",
    version: "v1.8",
    lastModified: "2026-02-10",
    modifiedBy: "Michael Chen",
    category: "Vendor Management",
  },
  {
    id: "wf-003",
    name: "High Risk Vendor Review",
    description: "Enhanced review process for high-risk vendors",
    status: "draft",
    version: "v1.0",
    lastModified: "2026-02-18",
    modifiedBy: "Emma Davis",
    category: "Risk & Compliance",
  },
  {
    id: "wf-004",
    name: "Document Expiry Notification",
    description: "Automated notifications for expiring vendor documents",
    status: "active",
    version: "v3.1",
    lastModified: "2026-01-28",
    modifiedBy: "David Wilson",
    category: "Compliance",
  },
  {
    id: "wf-005",
    name: "Payment Approval - High Value",
    description: "Special approval for payments exceeding threshold",
    status: "inactive",
    version: "v2.0",
    lastModified: "2025-12-15",
    modifiedBy: "Lisa Anderson",
    category: "Finance",
  },
];

const workflowVersions: WorkflowVersion[] = [
  {
    version: "v2.3",
    date: "2026-02-15 14:30",
    author: "Sarah Johnson",
    changes: "Added parallel approval for Compliance and Finance teams",
    status: "current",
  },
  {
    version: "v2.2",
    date: "2026-01-20 11:15",
    author: "Sarah Johnson",
    changes: "Updated SLA from 48h to 24h for Category Manager approval",
    status: "previous",
  },
  {
    version: "v2.1",
    date: "2025-12-10 09:45",
    author: "Michael Chen",
    changes: "Added risk-based routing for high-risk vendors",
    status: "previous",
  },
  {
    version: "v2.0",
    date: "2025-11-05 16:20",
    author: "Emma Davis",
    changes: "Major revision: Added conditional approval paths",
    status: "previous",
  },
];

const approverRoles = [
  "Category Manager",
  "Procurement Head",
  "Compliance Officer",
  "Finance Controller",
  "VP Operations",
  "CFO",
  "Legal Team",
  "Risk Manager",
];

const approverUsers = [
  "Sarah Johnson",
  "Michael Chen",
  "Emma Davis",
  "David Wilson",
  "Lisa Anderson",
  "Robert Brown",
  "Jennifer Lee",
  "Thomas Garcia",
];

export function WorkflowConfigConsole() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow>(
    mockWorkflows[0]
  );
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    {
      id: "node-1",
      type: "start",
      label: "Start: Vendor Request Created",
      position: { x: 100, y: 50 },
      config: {},
    },
    {
      id: "node-2",
      type: "approval",
      label: "Category Manager Approval",
      position: { x: 100, y: 150 },
      config: {
        approvers: ["Category Manager"],
        approverType: "role",
        slaHours: 24,
        escalationTo: "Procurement Head",
        parallelApproval: false,
      },
    },
    {
      id: "node-3",
      type: "condition",
      label: "Risk Level Check",
      position: { x: 100, y: 270 },
      config: {
        condition: "riskScore >= 70",
      },
    },
    {
      id: "node-4",
      type: "approval",
      label: "Compliance & Finance (Parallel)",
      position: { x: 300, y: 350 },
      config: {
        approvers: ["Compliance Officer", "Finance Controller"],
        approverType: "role",
        slaHours: 48,
        escalationTo: "VP Operations",
        parallelApproval: true,
        requireAll: true,
      },
    },
    {
      id: "node-5",
      type: "approval",
      label: "Standard Finance Approval",
      position: { x: 100, y: 450 },
      config: {
        approvers: ["Finance Controller"],
        approverType: "role",
        slaHours: 24,
        parallelApproval: false,
      },
    },
    {
      id: "node-6",
      type: "notification",
      label: "Send Approval Email",
      position: { x: 300, y: 550 },
      config: {
        notificationType: "email",
      },
    },
    {
      id: "node-7",
      type: "end",
      label: "End: Vendor Approved",
      position: { x: 300, y: 650 },
      config: {},
    },
  ]);

  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const filteredWorkflows = mockWorkflows.filter(
    (wf) =>
      wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNodeClick = (node: WorkflowNode) => {
    setSelectedNode(node);
  };

  const handleNodeConfigUpdate = (
    field: string,
    value: any,
    nestedField?: string
  ) => {
    if (!selectedNode) return;

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === selectedNode.id) {
          if (nestedField) {
            return {
              ...node,
              config: {
                ...node.config,
                [field]: {
                  ...(node.config as any)[field],
                  [nestedField]: value,
                },
              },
            };
          }
          return {
            ...node,
            config: {
              ...node.config,
              [field]: value,
            },
          };
        }
        return node;
      })
    );

    setSelectedNode((prev) => {
      if (!prev) return null;
      if (nestedField) {
        return {
          ...prev,
          config: {
            ...prev.config,
            [field]: {
              ...(prev.config as any)[field],
              [nestedField]: value,
            },
          },
        };
      }
      return {
        ...prev,
        config: {
          ...prev.config,
          [field]: value,
        },
      };
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-[#E6EEF2] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0A0F14] mb-1">
              Workflow Configuration Console
            </h1>
            <p className="text-sm text-[#64748B]">
              Design and manage approval workflows with visual builder
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <GitBranch className="w-4 h-4" />
              Version History
            </Button>
            <Button variant="outline" className="gap-2">
              <Play className="w-4 h-4" />
              Test Workflow
            </Button>
            <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96] text-white">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Workflow Library */}
        <aside className="w-80 bg-white border-r border-[#E6EEF2] flex flex-col">
          {/* Library Header */}
          <div className="p-6 border-b border-[#E6EEF2]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0A0F14]">
                Workflow Library
              </h2>
              <Button size="sm" className="gap-2 bg-[#00A9B7] hover:bg-[#008A96] text-white">
                <Plus className="w-4 h-4" />
                New
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
              <Input
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 border-[#E6EEF2]"
              />
            </div>
          </div>

          {/* Workflow List */}
          <div className="flex-1 overflow-auto p-4">
            <div className="space-y-2">
              {filteredWorkflows.map((workflow) => (
                <WorkflowCard
                  key={workflow.id}
                  workflow={workflow}
                  isSelected={selectedWorkflow.id === workflow.id}
                  onClick={() => setSelectedWorkflow(workflow)}
                />
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div className="p-4 border-t border-[#E6EEF2]">
            <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-[#F6F9FC] transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#64748B]" />
                <span className="text-sm text-[#0A0F14]">All Categories</span>
              </div>
              <ChevronDown className="w-4 h-4 text-[#64748B]" />
            </button>
          </div>
        </aside>

        {/* Center Visual Designer */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Designer Header */}
          <div className="bg-white border-b border-[#E6EEF2] px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#0A0F14]">
                  {selectedWorkflow.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <StatusBadge
                    status={
                      selectedWorkflow.status === "active"
                        ? "success"
                        : selectedWorkflow.status === "draft"
                        ? "warning"
                        : "neutral"
                    }
                    label={selectedWorkflow.status}
                  />
                  <span className="text-sm text-[#64748B]">
                    {selectedWorkflow.version}
                  </span>
                  <span className="text-sm text-[#64748B]">•</span>
                  <span className="text-sm text-[#64748B]">
                    Modified {selectedWorkflow.lastModified} by{" "}
                    {selectedWorkflow.modifiedBy}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Layers className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Target className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-auto bg-[#F6F9FC] p-8">
            <div className="bg-white rounded-xl border-2 border-dashed border-[#E6EEF2] min-h-[800px] p-8 relative">
              {/* Workflow Nodes */}
              <div className="relative">
                {nodes.map((node, index) => (
                  <div key={node.id}>
                    <WorkflowNodeComponent
                      node={node}
                      isSelected={selectedNode?.id === node.id}
                      onClick={() => handleNodeClick(node)}
                    />
                    {/* Connector Line */}
                    {index < nodes.length - 1 && (
                      <div
                        className="absolute left-1/2 -translate-x-1/2 w-0.5 bg-[#E6EEF2]"
                        style={{
                          top: node.position.y + 80,
                          height: nodes[index + 1].position.y - node.position.y - 80,
                        }}
                      >
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#E6EEF2] rounded-full" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Node Buttons */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                <AddNodeButton icon={<CheckCircle className="w-4 h-4" />} label="Approval" />
                <AddNodeButton icon={<Diamond className="w-4 h-4" />} label="Condition" />
                <AddNodeButton icon={<Bell className="w-4 h-4" />} label="Notification" />
                <AddNodeButton icon={<Code className="w-4 h-4" />} label="Script" />
              </div>
            </div>
          </div>

          {/* Version History Panel */}
          {showVersionHistory && (
            <div className="bg-white border-t border-[#E6EEF2] p-6">
              <VersionHistoryPanel
                versions={workflowVersions}
                onClose={() => setShowVersionHistory(false)}
              />
            </div>
          )}
        </main>

        {/* Right Configuration Panel */}
        {selectedNode && (
          <aside className="w-96 bg-white border-l border-[#E6EEF2] overflow-auto">
            <NodeConfigPanel
              node={selectedNode}
              onUpdate={handleNodeConfigUpdate}
              approverRoles={approverRoles}
              approverUsers={approverUsers}
              onClose={() => setSelectedNode(null)}
            />
          </aside>
        )}
      </div>

      {/* Bottom Version History Bar */}
      <footer className="bg-white border-t border-[#E6EEF2] px-8 py-3">
        <button
          onClick={() => setShowVersionHistory(!showVersionHistory)}
          className="flex items-center gap-2 text-sm text-[#64748B] hover:text-[#00A9B7] transition-colors"
        >
          <History className="w-4 h-4" />
          <span>Version History ({workflowVersions.length})</span>
          {showVersionHistory ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </footer>
    </div>
  );
}

// Component: Workflow Card
function WorkflowCard({
  workflow,
  isSelected,
  onClick,
}: {
  workflow: Workflow;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
        isSelected
          ? "border-[#00A9B7] bg-[#E0F5F7]"
          : "border-[#E6EEF2] bg-white hover:border-[#00A9B7]/30 hover:bg-[#F6F9FC]"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-[#0A0F14] text-sm mb-1">
            {workflow.name}
          </h3>
          <p className="text-xs text-[#64748B] line-clamp-2">
            {workflow.description}
          </p>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            // Handle menu action
          }}
          className="p-1 hover:bg-white/50 rounded cursor-pointer"
        >
          <MoreVertical className="w-4 h-4 text-[#64748B]" />
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3">
        <StatusBadge
          status={
            workflow.status === "active"
              ? "success"
              : workflow.status === "draft"
              ? "warning"
              : "neutral"
          }
          label={workflow.status}
        />
        <span className="text-xs text-[#64748B]">{workflow.version}</span>
      </div>

      <div className="text-xs text-[#64748B] mt-2">
        {workflow.category}
      </div>
    </button>
  );
}

// Component: Workflow Node
function WorkflowNodeComponent({
  node,
  isSelected,
  onClick,
}: {
  node: WorkflowNode;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getNodeStyle = () => {
    switch (node.type) {
      case "start":
        return {
          bg: "bg-[#F0FDF4]",
          border: "border-[#16A34A]",
          icon: <Circle className="w-5 h-5 text-[#16A34A]" />,
          iconBg: "bg-[#16A34A]/10",
        };
      case "approval":
        return {
          bg: "bg-[#EFF6FF]",
          border: "border-[#3B82F6]",
          icon: <CheckCircle className="w-5 h-5 text-[#3B82F6]" />,
          iconBg: "bg-[#3B82F6]/10",
        };
      case "condition":
        return {
          bg: "bg-[#FEF3C7]",
          border: "border-[#F59E0B]",
          icon: <Diamond className="w-5 h-5 text-[#F59E0B]" />,
          iconBg: "bg-[#F59E0B]/10",
        };
      case "notification":
        return {
          bg: "bg-[#F5F3FF]",
          border: "border-[#8B5CF6]",
          icon: <Bell className="w-5 h-5 text-[#8B5CF6]" />,
          iconBg: "bg-[#8B5CF6]/10",
        };
      case "script":
        return {
          bg: "bg-[#FEF2F2]",
          border: "border-[#DC2626]",
          icon: <Code className="w-5 h-5 text-[#DC2626]" />,
          iconBg: "bg-[#DC2626]/10",
        };
      case "end":
        return {
          bg: "bg-[#F6F9FC]",
          border: "border-[#64748B]",
          icon: <XCircle className="w-5 h-5 text-[#64748B]" />,
          iconBg: "bg-[#64748B]/10",
        };
      default:
        return {
          bg: "bg-white",
          border: "border-[#E6EEF2]",
          icon: <Square className="w-5 h-5 text-[#64748B]" />,
          iconBg: "bg-[#E6EEF2]",
        };
    }
  };

  const style = getNodeStyle();

  return (
    <div
      onClick={onClick}
      className={`absolute w-80 ${style.bg} border-2 ${
        isSelected ? "border-[#00A9B7] shadow-lg shadow-[#00A9B7]/20" : style.border
      } rounded-xl p-4 transition-all hover:shadow-md cursor-pointer`}
      style={{ left: node.position.x, top: node.position.y }}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${style.iconBg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          {style.icon}
        </div>
        <div className="flex-1 text-left">
          <div className="font-semibold text-[#0A0F14] text-sm mb-1">
            {node.label}
          </div>
          {node.config.approvers && (
            <div className="flex items-center gap-1 text-xs text-[#64748B]">
              <Users className="w-3 h-3" />
              <span>{node.config.approvers.join(", ")}</span>
            </div>
          )}
          {node.config.slaHours && (
            <div className="flex items-center gap-1 text-xs text-[#64748B] mt-1">
              <Clock className="w-3 h-3" />
              <span>SLA: {node.config.slaHours}h</span>
            </div>
          )}
          {node.config.parallelApproval && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E0F5F7] text-[#00A9B7] rounded text-xs mt-2">
              <Zap className="w-3 h-3" />
              Parallel
            </div>
          )}
        </div>
        <button
          className="p-1 hover:bg-white/50 rounded"
          onClick={(e) => {
            e.stopPropagation();
            // Settings action
          }}
        >
          <Settings className="w-4 h-4 text-[#64748B]" />
        </button>
      </div>
    </div>
  );
}

// Component: Add Node Button
function AddNodeButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-dashed border-[#E6EEF2] rounded-lg hover:border-[#00A9B7] hover:bg-[#E0F5F7] transition-all text-sm text-[#64748B] hover:text-[#00A9B7]">
      {icon}
      <span>{label}</span>
    </button>
  );
}

// Component: Node Configuration Panel
function NodeConfigPanel({
  node,
  onUpdate,
  approverRoles,
  approverUsers,
  onClose,
}: {
  node: WorkflowNode;
  onUpdate: (field: string, value: any, nestedField?: string) => void;
  approverRoles: string[];
  approverUsers: string[];
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"general" | "approvers" | "sla" | "advanced">(
    "general"
  );

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="p-6 border-b border-[#E6EEF2]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-[#0A0F14]">Node Configuration</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#F6F9FC] rounded transition-colors"
          >
            <XCircle className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>
        <p className="text-sm text-[#64748B]">{node.label}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E6EEF2] px-6">
        <TabButton
          label="General"
          isActive={activeTab === "general"}
          onClick={() => setActiveTab("general")}
        />
        {node.type === "approval" && (
          <>
            <TabButton
              label="Approvers"
              isActive={activeTab === "approvers"}
              onClick={() => setActiveTab("approvers")}
            />
            <TabButton
              label="SLA"
              isActive={activeTab === "sla"}
              onClick={() => setActiveTab("sla")}
            />
          </>
        )}
        <TabButton
          label="Advanced"
          isActive={activeTab === "advanced"}
          onClick={() => setActiveTab("advanced")}
        />
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "general" && (
          <GeneralConfigTab node={node} onUpdate={onUpdate} />
        )}
        {activeTab === "approvers" && node.type === "approval" && (
          <ApproversConfigTab
            node={node}
            onUpdate={onUpdate}
            approverRoles={approverRoles}
            approverUsers={approverUsers}
          />
        )}
        {activeTab === "sla" && node.type === "approval" && (
          <SLAConfigTab node={node} onUpdate={onUpdate} />
        )}
        {activeTab === "advanced" && (
          <AdvancedConfigTab node={node} onUpdate={onUpdate} />
        )}
      </div>

      {/* Panel Footer */}
      <div className="p-6 border-t border-[#E6EEF2]">
        <Button className="w-full bg-[#00A9B7] hover:bg-[#008A96] text-white">
          <Save className="w-4 h-4 mr-2" />
          Apply Changes
        </Button>
      </div>
    </div>
  );
}

// Component: Tab Button
function TabButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
        isActive
          ? "text-[#00A9B7]"
          : "text-[#64748B] hover:text-[#0A0F14]"
      }`}
    >
      {label}
      {isActive && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00A9B7]" />
      )}
    </button>
  );
}

// Component: General Config Tab
function GeneralConfigTab({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <ConfigSection title="Basic Information" icon={<Info className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#0A0F14] mb-2">
              Node Label
            </Label>
            <Input
              value={node.label}
              onChange={(e) => onUpdate("label", e.target.value)}
              className="border-[#E6EEF2]"
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-[#0A0F14] mb-2">
              Node Type
            </Label>
            <div className="p-3 bg-[#F6F9FC] rounded-lg text-sm text-[#64748B]">
              {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
            </div>
          </div>
        </div>
      </ConfigSection>

      {node.type === "condition" && (
        <ConfigSection title="Condition Logic" icon={<Diamond className="w-4 h-4" />}>
          <div>
            <Label className="text-sm font-medium text-[#0A0F14] mb-2">
              Condition Expression
            </Label>
            <Textarea
              value={node.config.condition || ""}
              onChange={(e) => onUpdate("condition", e.target.value)}
              placeholder="e.g., riskScore >= 70 || amount > 100000"
              className="border-[#E6EEF2] font-mono text-sm"
              rows={4}
            />
            <p className="text-xs text-[#64748B] mt-2">
              Use JavaScript-like expressions. Available fields: riskScore, amount, country, category
            </p>
          </div>
        </ConfigSection>
      )}

      {node.type === "notification" && (
        <ConfigSection title="Notification Settings" icon={<Bell className="w-4 h-4" />}>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-[#0A0F14] mb-2">
                Notification Type
              </Label>
              <select
                value={node.config.notificationType || "email"}
                onChange={(e) => onUpdate("notificationType", e.target.value)}
                className="w-full h-10 px-3 bg-white border border-[#E6EEF2] rounded-lg text-sm"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="in-app">In-App Notification</option>
                <option value="all">All Channels</option>
              </select>
            </div>
          </div>
        </ConfigSection>
      )}
    </div>
  );
}

// Component: Approvers Config Tab
function ApproversConfigTab({
  node,
  onUpdate,
  approverRoles,
  approverUsers,
}: {
  node: WorkflowNode;
  onUpdate: (field: string, value: any) => void;
  approverRoles: string[];
  approverUsers: string[];
}) {
  return (
    <div className="space-y-6">
      <ConfigSection title="Approver Type" icon={<Users className="w-4 h-4" />}>
        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border-2 border-[#E6EEF2] rounded-lg cursor-pointer hover:border-[#00A9B7] transition-colors">
            <input
              type="radio"
              name="approverType"
              value="role"
              checked={node.config.approverType === "role"}
              onChange={(e) => onUpdate("approverType", e.target.value)}
              className="w-4 h-4 text-[#00A9B7]"
            />
            <div className="flex-1">
              <div className="font-medium text-[#0A0F14] text-sm">Role-based</div>
              <div className="text-xs text-[#64748B]">Assign by role (e.g., Category Manager)</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border-2 border-[#E6EEF2] rounded-lg cursor-pointer hover:border-[#00A9B7] transition-colors">
            <input
              type="radio"
              name="approverType"
              value="user"
              checked={node.config.approverType === "user"}
              onChange={(e) => onUpdate("approverType", e.target.value)}
              className="w-4 h-4 text-[#00A9B7]"
            />
            <div className="flex-1">
              <div className="font-medium text-[#0A0F14] text-sm">Specific User</div>
              <div className="text-xs text-[#64748B]">Assign to specific person</div>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 border-2 border-[#E6EEF2] rounded-lg cursor-pointer hover:border-[#00A9B7] transition-colors">
            <input
              type="radio"
              name="approverType"
              value="dynamic"
              checked={node.config.approverType === "dynamic"}
              onChange={(e) => onUpdate("approverType", e.target.value)}
              className="w-4 h-4 text-[#00A9B7]"
            />
            <div className="flex-1">
              <div className="font-medium text-[#0A0F14] text-sm">Dynamic</div>
              <div className="text-xs text-[#64748B]">Determine based on rules</div>
            </div>
          </label>
        </div>
      </ConfigSection>

      <ConfigSection title="Select Approvers" icon={<User className="w-4 h-4" />}>
        <div className="space-y-3">
          {node.config.approverType === "role" ? (
            approverRoles.map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 p-3 border border-[#E6EEF2] rounded-lg cursor-pointer hover:bg-[#F6F9FC] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={node.config.approvers?.includes(role) || false}
                  onChange={(e) => {
                    const current = node.config.approvers || [];
                    const updated = e.target.checked
                      ? [...current, role]
                      : current.filter((a) => a !== role);
                    onUpdate("approvers", updated);
                  }}
                  className="w-4 h-4 text-[#00A9B7]"
                />
                <div className="flex-1">
                  <div className="text-sm text-[#0A0F14]">{role}</div>
                </div>
              </label>
            ))
          ) : (
            approverUsers.map((user) => (
              <label
                key={user}
                className="flex items-center gap-3 p-3 border border-[#E6EEF2] rounded-lg cursor-pointer hover:bg-[#F6F9FC] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={node.config.approvers?.includes(user) || false}
                  onChange={(e) => {
                    const current = node.config.approvers || [];
                    const updated = e.target.checked
                      ? [...current, user]
                      : current.filter((a) => a !== user);
                    onUpdate("approvers", updated);
                  }}
                  className="w-4 h-4 text-[#00A9B7]"
                />
                <div className="flex-1">
                  <div className="text-sm text-[#0A0F14]">{user}</div>
                </div>
              </label>
            ))
          )}
        </div>
      </ConfigSection>

      <ConfigSection title="Approval Mode" icon={<Zap className="w-4 h-4" />}>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-4 border-2 border-[#E6EEF2] rounded-lg">
            <div>
              <div className="font-medium text-[#0A0F14] text-sm mb-1">
                Parallel Approval
              </div>
              <div className="text-xs text-[#64748B]">
                All approvers review simultaneously
              </div>
            </div>
            <input
              type="checkbox"
              checked={node.config.parallelApproval || false}
              onChange={(e) => onUpdate("parallelApproval", e.target.checked)}
              className="w-5 h-5 text-[#00A9B7]"
            />
          </label>
          {node.config.parallelApproval && (
            <label className="flex items-center justify-between p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
              <div>
                <div className="font-medium text-[#0A0F14] text-sm mb-1">
                  Require All Approvals
                </div>
                <div className="text-xs text-[#64748B]">
                  All approvers must approve (vs. any one)
                </div>
              </div>
              <input
                type="checkbox"
                checked={node.config.requireAll || false}
                onChange={(e) => onUpdate("requireAll", e.target.checked)}
                className="w-5 h-5 text-[#00A9B7]"
              />
            </label>
          )}
        </div>
      </ConfigSection>
    </div>
  );
}

// Component: SLA Config Tab
function SLAConfigTab({
  node,
  onUpdate,
}: {
  node: WorkflowNode;
  onUpdate: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <ConfigSection title="SLA Settings" icon={<Clock className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#0A0F14] mb-2">
              SLA Duration (Hours)
            </Label>
            <Input
              type="number"
              value={node.config.slaHours || ""}
              onChange={(e) => onUpdate("slaHours", parseInt(e.target.value))}
              placeholder="24"
              className="border-[#E6EEF2]"
            />
            <p className="text-xs text-[#64748B] mt-2">
              Time allowed for approval before escalation
            </p>
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="Escalation" icon={<AlertCircle className="w-4 h-4" />}>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-[#0A0F14] mb-2">
              Escalate To
            </Label>
            <select
              value={node.config.escalationTo || ""}
              onChange={(e) => onUpdate("escalationTo", e.target.value)}
              className="w-full h-10 px-3 bg-white border border-[#E6EEF2] rounded-lg text-sm"
            >
              <option value="">Select escalation target</option>
              <option value="Procurement Head">Procurement Head</option>
              <option value="VP Operations">VP Operations</option>
              <option value="CFO">CFO</option>
              <option value="CEO">CEO</option>
            </select>
          </div>
          <div className="p-4 bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-lg">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
              <div>
                <div className="font-medium text-[#0A0F14] text-sm mb-1">
                  Auto-escalation
                </div>
                <div className="text-xs text-[#64748B]">
                  When SLA expires, request automatically escalates to the selected role
                </div>
              </div>
            </div>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

// Component: Advanced Config Tab
function AdvancedConfigTab(_props: {
  node: WorkflowNode;
  onUpdate: (field: string, value: any) => void;
}) {
  return (
    <div className="space-y-6">
      <ConfigSection title="Advanced Options" icon={<Settings className="w-4 h-4" />}>
        <div className="space-y-3">
          <div className="p-4 border border-[#E6EEF2] rounded-lg">
            <div className="font-medium text-[#0A0F14] text-sm mb-2">
              Risk-based Routing
            </div>
            <p className="text-xs text-[#64748B] mb-3">
              Automatically route based on vendor risk score
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-[#00A9B7]"
              />
              <span className="text-sm text-[#0A0F14]">Enable risk-based routing</span>
            </div>
          </div>

          <div className="p-4 border border-[#E6EEF2] rounded-lg">
            <div className="font-medium text-[#0A0F14] text-sm mb-2">
              Auto-reminder
            </div>
            <p className="text-xs text-[#64748B] mb-3">
              Send reminder to approvers before SLA expires
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-[#00A9B7]"
              />
              <span className="text-sm text-[#0A0F14]">Enable auto-reminder</span>
            </div>
          </div>

          <div className="p-4 border border-[#E6EEF2] rounded-lg">
            <div className="font-medium text-[#0A0F14] text-sm mb-2">
              Delegate Support
            </div>
            <p className="text-xs text-[#64748B] mb-3">
              Allow approvers to delegate to another user
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 text-[#00A9B7]"
              />
              <span className="text-sm text-[#0A0F14]">Allow delegation</span>
            </div>
          </div>
        </div>
      </ConfigSection>
    </div>
  );
}

// Component: Config Section
function ConfigSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E6EEF2] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[#00A9B7]">{icon}</div>
        <h4 className="font-semibold text-[#0A0F14] text-sm">{title}</h4>
      </div>
      {children}
    </div>
  );
}

// Component: Version History Panel
function VersionHistoryPanel({
  versions,
  onClose,
}: {
  versions: WorkflowVersion[];
  onClose: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-[#0A0F14]">Version History</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#F6F9FC] rounded transition-colors"
        >
          <XCircle className="w-5 h-5 text-[#64748B]" />
        </button>
      </div>

      <div className="space-y-4">
        {versions.map((version) => (
          <div
            key={version.version}
            className="flex items-start gap-4 p-4 border border-[#E6EEF2] rounded-xl hover:border-[#00A9B7]/30 hover:bg-[#F6F9FC] transition-all"
          >
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-[#E0F5F7] rounded-full flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-[#00A9B7]" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-[#0A0F14]">{version.version}</span>
                {version.status === "current" && (
                  <StatusBadge status="success" label="Current" />
                )}
              </div>
              <p className="text-sm text-[#0A0F14] mb-2">{version.changes}</p>
              <div className="flex items-center gap-4 text-xs text-[#64748B]">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {version.date}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {version.author}
                </span>
              </div>
            </div>
            {version.status !== "current" && (
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <RotateCcw className="w-4 h-4 mr-2" />
                Rollback
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}