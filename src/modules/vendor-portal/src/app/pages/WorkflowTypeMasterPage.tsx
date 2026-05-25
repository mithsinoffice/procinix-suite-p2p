import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  X,
  CheckCircle,
  FileText,
  ChevronRight,
  Info,
  AlertCircle,
  Settings,
  Shield,
  Bell,
  Lock,
  GitBranch,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Route,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";

type FormStatus = "draft" | "under-review" | "approved" | "active";

interface WorkflowStep {
  id: string;
  stepNo: number;
  stepName: string;
  departmentRole: string;
  mode: string;
  slaDays: number;
  escalationRole: string;
  requiredFields: string;
}

interface RoutingCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  action: string;
  extraRoles: string[];
}

interface NotificationConfig {
  step: string;
  template: string;
  reminderFrequency: string;
  escalationMessage: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
}

interface FormData {
  // Basics
  code: string;
  name: string;
  description: string;
  appliesTo: string;
  approvalMode: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  
  // Steps & SLA
  steps: WorkflowStep[];
  
  // Parallel & Rules
  parallelGroupSetting: string;
  clarificationLoopEnabled: boolean;
  autoApproveEnabled: boolean;
  autoApproveCondition: string;
  
  // Routing Conditions
  routingConditions: RoutingCondition[];
  
  // Notifications
  notifications: NotificationConfig[];
  
  // Governance
  changeControlLevel: string;
  version: string;
  reasonForChange: string;
}

export function WorkflowTypeMasterPage() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!recordId;

  const [formStatus, setFormStatus] = useState<FormStatus>("draft");
  const [activeTab, setActiveTab] = useState("basics");
  
  const [formData, setFormData] = useState<FormData>({
    // Basics
    code: "",
    name: "",
    description: "",
    appliesTo: "Vendor Onboarding",
    approvalMode: "Sequential",
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active",
    
    // Steps & SLA
    steps: [
      { id: "1", stepNo: 1, stepName: "Procurement Review", departmentRole: "Procurement Manager", mode: "Sequential", slaDays: 2, escalationRole: "VP Procurement", requiredFields: "Basic Info" },
      { id: "2", stepNo: 2, stepName: "Finance Approval", departmentRole: "Finance Manager", mode: "Sequential", slaDays: 2, escalationRole: "CFO", requiredFields: "Banking Details" },
      { id: "3", stepNo: 3, stepName: "Risk & Compliance", departmentRole: "Risk Manager", mode: "Parallel Group 1", slaDays: 3, escalationRole: "VP Risk & Compliance", requiredFields: "Risk Assessment" },
      { id: "4", stepNo: 4, stepName: "Legal Review", departmentRole: "Legal Counsel", mode: "Parallel Group 1", slaDays: 3, escalationRole: "General Counsel", requiredFields: "Contracts" },
    ],
    
    // Parallel & Rules
    parallelGroupSetting: "All must approve",
    clarificationLoopEnabled: true,
    autoApproveEnabled: false,
    autoApproveCondition: "",
    
    // Routing Conditions
    routingConditions: [
      { id: "1", field: "Risk Tier", operator: "equals", value: "High", action: "Add extra approval", extraRoles: ["VP Risk & Compliance", "Chief Risk Officer"] }
    ],
    
    // Notifications
    notifications: [
      { step: "Step 1", template: "Approval Request - Procurement", reminderFrequency: "Daily", escalationMessage: "Pending approval - immediate action required", emailEnabled: true, inAppEnabled: true },
      { step: "Step 2", template: "Approval Request - Finance", reminderFrequency: "Daily", escalationMessage: "Financial approval pending", emailEnabled: true, inAppEnabled: true },
    ],
    
    // Governance
    changeControlLevel: "Approval Required",
    version: "1.0",
    reasonForChange: "",
  });

  const handleSubmit = (saveType: "draft" | "submit") => {
    console.log("Submitting form:", { saveType, formData });
    if (saveType === "submit") {
      setFormStatus("under-review");
    }
    setTimeout(() => {
      navigate("/masters/workflow-types");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/workflow-types");
  };

  const getStatusConfig = (status: FormStatus) => {
    switch (status) {
      case "draft":
        return { label: "Draft", color: "bg-[#94A3B8]", textColor: "text-[#94A3B8]" };
      case "under-review":
        return { label: "Under Review", color: "bg-[#F59E0B]", textColor: "text-[#F59E0B]" };
      case "approved":
        return { label: "Approved", color: "bg-[#16A34A]", textColor: "text-[#16A34A]" };
      case "active":
        return { label: "Active", color: "bg-[#00A9B7]", textColor: "text-[#00A9B7]" };
    }
  };

  const statusConfig = getStatusConfig(formStatus);

  const addStep = () => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      stepNo: formData.steps.length + 1,
      stepName: "New Step",
      departmentRole: "Select Role",
      mode: "Sequential",
      slaDays: 2,
      escalationRole: "Select Role",
      requiredFields: ""
    };
    setFormData({ ...formData, steps: [...formData.steps, newStep] });
  };

  const removeStep = (id: string) => {
    const newSteps = formData.steps.filter(s => s.id !== id);
    // Renumber steps
    const renumberedSteps = newSteps.map((step, index) => ({
      ...step,
      stepNo: index + 1
    }));
    setFormData({ ...formData, steps: renumberedSteps });
  };

  const moveStep = (id: string, direction: "up" | "down") => {
    const index = formData.steps.findIndex(s => s.id === id);
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === formData.steps.length - 1)
    ) {
      return;
    }
    
    const newSteps = [...formData.steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newSteps[index], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[index]];
    
    // Renumber steps
    const renumberedSteps = newSteps.map((step, idx) => ({
      ...step,
      stepNo: idx + 1
    }));
    
    setFormData({ ...formData, steps: renumberedSteps });
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setFormData({
      ...formData,
      steps: formData.steps.map(s =>
        s.id === id ? { ...s, ...updates } : s
      )
    });
  };

  const addRoutingCondition = () => {
    const newCondition: RoutingCondition = {
      id: Date.now().toString(),
      field: "Risk Tier",
      operator: "equals",
      value: "",
      action: "Add extra approval",
      extraRoles: []
    };
    setFormData({ ...formData, routingConditions: [...formData.routingConditions, newCondition] });
  };

  const removeRoutingCondition = (id: string) => {
    setFormData({
      ...formData,
      routingConditions: formData.routingConditions.filter(c => c.id !== id)
    });
  };

  const updateRoutingCondition = (id: string, updates: Partial<RoutingCondition>) => {
    setFormData({
      ...formData,
      routingConditions: formData.routingConditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const toggleExtraRole = (conditionId: string, role: string) => {
    setFormData({
      ...formData,
      routingConditions: formData.routingConditions.map(c => {
        if (c.id === conditionId) {
          const newRoles = c.extraRoles.includes(role)
            ? c.extraRoles.filter(r => r !== role)
            : [...c.extraRoles, role];
          return { ...c, extraRoles: newRoles };
        }
        return c;
      })
    });
  };

  const updateNotification = (step: string, updates: Partial<NotificationConfig>) => {
    setFormData({
      ...formData,
      notifications: formData.notifications.map(n =>
        n.step === step ? { ...n, ...updates } : n
      )
    });
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-10 py-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
                <Link to="/vendors/dashboard" className="hover:text-[#00A9B7]">
                  Administration
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>Masters</span>
                <ChevronRight className="w-4 h-4" />
                <Link to="/masters/workflow-types" className="hover:text-[#00A9B7]">
                  Workflow Types
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Workflow Type</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Configure reusable approval templates for vendor onboarding and change governance across departments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${statusConfig.color} text-white font-medium`}>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                {statusConfig.label}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs Content */}
      <main className="flex-1 px-10 py-8">
        <div className="max-w-7xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-white border border-[#E6EEF2] p-1 rounded-xl mb-6 h-auto inline-flex flex-wrap">
              <TabsTrigger
                value="basics"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Basics
              </TabsTrigger>
              <TabsTrigger
                value="steps"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Steps & SLA
              </TabsTrigger>
              <TabsTrigger
                value="parallel"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Route className="w-4 h-4 mr-2" />
                Parallel & Rules
              </TabsTrigger>
              <TabsTrigger
                value="routing"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Routing
              </TabsTrigger>
              <TabsTrigger
                value="notifications"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger
                value="governance"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Lock className="w-4 h-4 mr-2" />
                Governance
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Basics */}
            <TabsContent value="basics" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Basic Information</h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Workflow Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., WF-ONBOARD-001, WF-CHANGE-002"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, recommended format: WF-PROCESS-NNN)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Workflow Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Onboarding Approval"
                      className="border-[#E6EEF2] h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Clear, descriptive name for this workflow
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Description <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose and scope of this workflow template..."
                      className="border-[#E6EEF2] min-h-[120px]"
                      rows={5}
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Provide clear guidance on when and how this workflow should be used
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applies To
                    </Label>
                    <Select value={formData.appliesTo} onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vendor Onboarding">Vendor Onboarding</SelectItem>
                        <SelectItem value="Change Request">Change Request</SelectItem>
                        <SelectItem value="Exception Approval">Exception Approval</SelectItem>
                        <SelectItem value="Vendor Block-Unblock">Vendor Block-Unblock</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Which process does this workflow apply to?
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Approval Mode
                    </Label>
                    <Select value={formData.approvalMode} onValueChange={(value) => setFormData({ ...formData, approvalMode: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sequential">Sequential (One after another)</SelectItem>
                        <SelectItem value="Parallel">Parallel (All at once)</SelectItem>
                        <SelectItem value="Hybrid">Hybrid (Mix of both)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Default flow pattern for approvals
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Effective From
                    </Label>
                    <Input
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => setFormData({ ...formData, effectiveFrom: e.target.value })}
                      className="border-[#E6EEF2] h-12"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Effective To
                    </Label>
                    <Input
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => setFormData({ ...formData, effectiveTo: e.target.value })}
                      className="border-[#E6EEF2] h-12"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Status
                    </Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                        <SelectItem value="Draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Steps & SLA */}
            <TabsContent value="steps" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Workflow Steps Configuration</h2>
                  </div>
                  <Button
                    onClick={addStep}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Step
                  </Button>
                </div>

                <div className="border border-[#E6EEF2] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F6F9FC]">
                        <tr>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-[#64748B] uppercase w-16">
                            Order
                          </th>
                          <th className="text-center px-3 py-3 text-xs font-semibold text-[#64748B] uppercase w-20">
                            Step No
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                            Step Name
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                            Department/Role
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                            Mode
                          </th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase w-28">
                            SLA Days
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                            Escalation Role
                          </th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                            Required Fields
                          </th>
                          <th className="w-24"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.steps.map((step, index) => (
                          <tr
                            key={step.id}
                            className={`border-t border-[#E6EEF2] ${
                              index % 2 === 0 ? "bg-white" : "bg-[#F6F9FC]/50"
                            }`}
                          >
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => moveStep(step.id, "up")}
                                  disabled={index === 0}
                                  className="p-1 hover:bg-[#E6EEF2] rounded disabled:opacity-30"
                                >
                                  <ArrowUp className="w-4 h-4 text-[#64748B]" />
                                </button>
                                <button
                                  onClick={() => moveStep(step.id, "down")}
                                  disabled={index === formData.steps.length - 1}
                                  className="p-1 hover:bg-[#E6EEF2] rounded disabled:opacity-30"
                                >
                                  <ArrowDown className="w-4 h-4 text-[#64748B]" />
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-[#00A9B7] text-white flex items-center justify-center font-semibold text-sm">
                                  {step.stepNo}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                value={step.stepName}
                                onChange={(e) => updateStep(step.id, { stepName: e.target.value })}
                                className="border-[#E6EEF2] h-10"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Select
                                value={step.departmentRole}
                                onValueChange={(value) => updateStep(step.id, { departmentRole: value })}
                              >
                                <SelectTrigger className="border-[#E6EEF2] h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                                  <SelectItem value="Finance Manager">Finance Manager</SelectItem>
                                  <SelectItem value="Risk Manager">Risk Manager</SelectItem>
                                  <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                                  <SelectItem value="Legal Counsel">Legal Counsel</SelectItem>
                                  <SelectItem value="IT Manager">IT Manager</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-4">
                              <Select
                                value={step.mode}
                                onValueChange={(value) => updateStep(step.id, { mode: value })}
                              >
                                <SelectTrigger className="border-[#E6EEF2] h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Sequential">Sequential</SelectItem>
                                  <SelectItem value="Parallel Group 1">Parallel Group 1</SelectItem>
                                  <SelectItem value="Parallel Group 2">Parallel Group 2</SelectItem>
                                  <SelectItem value="Parallel Group 3">Parallel Group 3</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                type="number"
                                value={step.slaDays}
                                onChange={(e) => updateStep(step.id, { slaDays: parseInt(e.target.value) || 0 })}
                                min="1"
                                className="border-[#E6EEF2] h-10 text-center"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <Select
                                value={step.escalationRole}
                                onValueChange={(value) => updateStep(step.id, { escalationRole: value })}
                              >
                                <SelectTrigger className="border-[#E6EEF2] h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="VP Procurement">VP Procurement</SelectItem>
                                  <SelectItem value="CFO">CFO</SelectItem>
                                  <SelectItem value="VP Risk & Compliance">VP Risk & Compliance</SelectItem>
                                  <SelectItem value="General Counsel">General Counsel</SelectItem>
                                  <SelectItem value="CIO">CIO</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-4">
                              <Input
                                value={step.requiredFields}
                                onChange={(e) => updateStep(step.id, { requiredFields: e.target.value })}
                                placeholder="e.g., Banking Details"
                                className="border-[#E6EEF2] h-10"
                              />
                            </td>
                            <td className="px-4 py-4 text-center">
                              <button
                                onClick={() => removeStep(step.id)}
                                className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4 text-[#DC2626]" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Workflow Visualization */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <h3 className="font-semibold text-[#0A0F14] mb-4">Workflow Visualization</h3>
                <div className="flex items-center gap-4 flex-wrap">
                  {formData.steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div className="px-4 py-3 bg-[#E0F5F7] border-2 border-[#00A9B7] rounded-lg text-center min-w-[180px]">
                          <div className="text-xs font-semibold text-[#00A9B7] mb-1">STEP {step.stepNo}</div>
                          <div className="text-sm font-medium text-[#0A0F14] mb-1">{step.stepName}</div>
                          <div className="text-xs text-[#64748B]">{step.departmentRole}</div>
                          <div className="text-xs text-[#64748B] mt-1">SLA: {step.slaDays} days</div>
                        </div>
                        <div className="text-xs text-[#64748B] mt-2 px-2 py-1 bg-[#F6F9FC] rounded">
                          {step.mode}
                        </div>
                      </div>
                      {index < formData.steps.length - 1 && (
                        <ChevronRight className="w-6 h-6 text-[#00A9B7]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Parallel & Rules */}
            <TabsContent value="parallel" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Parallel Approval & Rules Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Parallel Group Approval Setting
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "All must approve", label: "All Must Approve", desc: "Requires unanimous approval" },
                        { value: "Any one", label: "Any One", desc: "First approval proceeds" },
                        { value: "Majority", label: "Majority", desc: "51% must approve" }
                      ].map((setting) => (
                        <button
                          key={setting.value}
                          onClick={() => setFormData({ ...formData, parallelGroupSetting: setting.value })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.parallelGroupSetting === setting.value
                              ? "border-[#00A9B7] bg-[#E0F5F7]"
                              : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          <div className="font-medium text-[#0A0F14] mb-1">{setting.label}</div>
                          <div className="text-xs text-[#64748B]">{setting.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      How should parallel approval groups be resolved?
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Clarification Loop
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.clarificationLoopEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, clarificationLoopEnabled: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.clarificationLoopEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Allow approvers to send requests back to requester/vendor for clarification
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Auto-approve Conditions
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2] mb-3">
                      <Switch
                        checked={formData.autoApproveEnabled}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoApproveEnabled: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.autoApproveEnabled ? "Enabled" : "Disabled"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Automatically approve when certain conditions are met
                        </span>
                      </div>
                    </div>
                    {formData.autoApproveEnabled && (
                      <Input
                        value={formData.autoApproveCondition}
                        onChange={(e) => setFormData({ ...formData, autoApproveCondition: e.target.value })}
                        placeholder="e.g., Risk Score < 25 AND Vendor Type = MSME"
                        className="border-[#E6EEF2] h-12"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Parallel Group Info */}
              <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Parallel Approval Groups</h3>
                    <ul className="text-sm text-[#64748B] space-y-1">
                      <li>• Steps marked with the same "Parallel Group" execute simultaneously</li>
                      <li>• Group resolution behavior: <strong>{formData.parallelGroupSetting}</strong></li>
                      <li>• Sequential steps wait for previous step/group to complete</li>
                      <li>• Example: Legal and Risk can review in parallel (Parallel Group 1)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Routing Conditions */}
            <TabsContent value="routing" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Conditional Routing Rules</h2>
                  </div>
                  <Button
                    onClick={addRoutingCondition}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Condition
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.routingConditions.map((condition) => (
                    <div key={condition.id} className="p-6 bg-[#F6F9FC] border-2 border-[#E6EEF2] rounded-xl">
                      <div className="grid grid-cols-12 gap-4 mb-4">
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Field
                          </Label>
                          <Select
                            value={condition.field}
                            onValueChange={(value) => updateRoutingCondition(condition.id, { field: value })}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Risk Tier">Risk Tier</SelectItem>
                              <SelectItem value="Country">Country</SelectItem>
                              <SelectItem value="Vendor Category">Vendor Category</SelectItem>
                              <SelectItem value="Vendor Type">Vendor Type</SelectItem>
                              <SelectItem value="Transaction Value">Transaction Value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Operator
                          </Label>
                          <Select
                            value={condition.operator}
                            onValueChange={(value) => updateRoutingCondition(condition.id, { operator: value })}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">equals</SelectItem>
                              <SelectItem value="not equals">not equals</SelectItem>
                              <SelectItem value="contains">contains</SelectItem>
                              <SelectItem value="greater than">{">"}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Value
                          </Label>
                          <Input
                            value={condition.value}
                            onChange={(e) => updateRoutingCondition(condition.id, { value: e.target.value })}
                            placeholder="Enter value..."
                            className="border-[#E6EEF2] h-10 bg-white"
                          />
                        </div>

                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Action
                          </Label>
                          <Select
                            value={condition.action}
                            onValueChange={(value) => updateRoutingCondition(condition.id, { action: value })}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10 bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Add extra approval">Add Extra Approval</SelectItem>
                              <SelectItem value="Skip step">Skip Step</SelectItem>
                              <SelectItem value="Require additional documents">Require Additional Docs</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="col-span-1 flex items-end">
                          <button
                            onClick={() => removeRoutingCondition(condition.id)}
                            className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-[#DC2626]" />
                          </button>
                        </div>
                      </div>

                      {condition.action === "Add extra approval" && (
                        <div>
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Extra Approval Roles
                          </Label>
                          <div className="flex flex-wrap gap-2">
                            {["VP Risk & Compliance", "Chief Risk Officer", "General Counsel", "CFO", "CEO"].map((role) => (
                              <button
                                key={role}
                                onClick={() => toggleExtraRole(condition.id, role)}
                                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  condition.extraRoles.includes(role)
                                    ? "bg-[#00A9B7] text-white"
                                    : "bg-white border border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                                }`}
                              >
                                {condition.extraRoles.includes(role) && (
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                )}
                                {role}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Routing Example */}
              <div className="bg-[#FFF7ED] border border-[#F59E0B]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Route className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Active Routing Rules</h3>
                    <div className="text-sm text-[#64748B] space-y-1">
                      {formData.routingConditions.map((condition) => (
                        <p key={condition.id}>
                          • IF <strong>{condition.field}</strong> {condition.operator} "<strong>{condition.value}</strong>" 
                          THEN <strong>{condition.action}</strong>
                          {condition.extraRoles.length > 0 && ` (${condition.extraRoles.join(", ")})`}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Notifications */}
            <TabsContent value="notifications" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Notification Configuration</h2>
                </div>

                <div className="border border-[#E6EEF2] rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-[#F6F9FC]">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                          Step
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                          Template
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                          Reminder
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                          Escalation Message
                        </th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase w-32">
                          Channels
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.notifications.map((notification, index) => (
                        <tr
                          key={notification.step}
                          className={`border-t border-[#E6EEF2] ${
                            index % 2 === 0 ? "bg-white" : "bg-[#F6F9FC]/50"
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-[#0A0F14]">{notification.step}</div>
                          </td>
                          <td className="px-4 py-4">
                            <Select
                              value={notification.template}
                              onValueChange={(value) => updateNotification(notification.step, { template: value })}
                            >
                              <SelectTrigger className="border-[#E6EEF2] h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Approval Request - Procurement">Approval Request - Procurement</SelectItem>
                                <SelectItem value="Approval Request - Finance">Approval Request - Finance</SelectItem>
                                <SelectItem value="Approval Request - Risk">Approval Request - Risk</SelectItem>
                                <SelectItem value="Approval Request - Legal">Approval Request - Legal</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4">
                            <Select
                              value={notification.reminderFrequency}
                              onValueChange={(value) => updateNotification(notification.step, { reminderFrequency: value })}
                            >
                              <SelectTrigger className="border-[#E6EEF2] h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="None">None</SelectItem>
                                <SelectItem value="Daily">Daily</SelectItem>
                                <SelectItem value="Every 2 days">Every 2 Days</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-4 py-4">
                            <Input
                              value={notification.escalationMessage}
                              onChange={(e) => updateNotification(notification.step, { escalationMessage: e.target.value })}
                              className="border-[#E6EEF2] h-10"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex flex-col items-center">
                                <Switch
                                  checked={notification.emailEnabled}
                                  onCheckedChange={(checked) => updateNotification(notification.step, { emailEnabled: checked })}
                                />
                                <span className="text-xs text-[#64748B] mt-1">Email</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <Switch
                                  checked={notification.inAppEnabled}
                                  onCheckedChange={(checked) => updateNotification(notification.step, { inAppEnabled: checked })}
                                />
                                <span className="text-xs text-[#64748B] mt-1">In-App</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Governance */}
            <TabsContent value="governance" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Governance & Change Control</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Change Control Level
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "Free Edit", label: "Free Edit", desc: "No approval required", icon: "✓" },
                        { value: "Approval Required", label: "Approval Required", desc: "Requires admin approval", icon: "👤" },
                        { value: "Locked", label: "Locked", desc: "Cannot be modified", icon: "🔒" }
                      ].map((level) => (
                        <button
                          key={level.value}
                          onClick={() => setFormData({ ...formData, changeControlLevel: level.value })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.changeControlLevel === level.value
                              ? "border-[#00A9B7] bg-[#E0F5F7]"
                              : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          <div className="text-2xl mb-2">{level.icon}</div>
                          <div className="font-medium text-[#0A0F14] mb-1">{level.label}</div>
                          <div className="text-xs text-[#64748B]">{level.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                        Version (Read-only)
                      </Label>
                      <Input
                        value={formData.version}
                        disabled
                        className="border-[#E6EEF2] h-12 bg-[#F6F9FC] text-[#64748B] font-mono"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                        Created / Modified
                      </Label>
                      <div className="h-12 px-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg flex items-center text-sm text-[#64748B]">
                        {isEditMode ? "Modified: 2026-02-20 09:15" : "New Record"}
                      </div>
                    </div>
                  </div>

                  {(isEditMode && (formStatus === "approved" || formStatus === "active")) && (
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                        Reason for Change <span className="text-[#DC2626]">*</span>
                      </Label>
                      <Textarea
                        value={formData.reasonForChange}
                        onChange={(e) => setFormData({ ...formData, reasonForChange: e.target.value })}
                        placeholder="Provide a clear explanation for why this approved/active workflow is being modified..."
                        className="border-[#E6EEF2] min-h-[100px]"
                        rows={4}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Governance Info */}
              <div className="bg-[#FEF2F2] border border-[#DC2626]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Shield className="w-6 h-6 text-[#DC2626] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Critical Configuration Object</h3>
                    <ul className="text-sm text-[#64748B] space-y-1">
                      <li>• Workflow templates control approval processes across the organization</li>
                      <li>• Changes to active workflows may affect in-progress vendor requests</li>
                      <li>• All modifications are logged and subject to audit review</li>
                      <li>• Deletion is not permitted; use "Inactive" status to disable</li>
                      {formData.changeControlLevel === "Locked" && (
                        <li className="text-[#DC2626]">• <strong>This workflow is locked</strong> and cannot be modified without admin override</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-[#E6EEF2] px-10 py-5 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-[#64748B]">
            <strong>Last saved:</strong> {new Date().toLocaleTimeString()} (Auto-save enabled)
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-11 px-6 border-[#E6EEF2]"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSubmit("draft")}
              className="h-11 px-6 border-[#E6EEF2]"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
            <Button
              onClick={() => handleSubmit("submit")}
              className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-11 px-6"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
