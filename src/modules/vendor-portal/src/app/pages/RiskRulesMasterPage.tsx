import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  X,
  CheckCircle,
  FileText,
  ChevronRight,
  Info,
  Settings,
  Shield,
  Zap,
  Lock,
  Target,
  TrendingUp,
  Plus,
  Trash2,
  AlertTriangle,
  Activity,
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

interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  logicalOperator: "AND" | "OR";
}

interface ScoringFactor {
  id: string;
  riskFactor: string;
  weight: number;
  points: number;
  condition: string;
}

interface ActionRule {
  tier: string;
  action: string;
  extraApprovals: string[];
  autoCreateTask: boolean;
}

interface FormData {
  // Basics
  code: string;
  name: string;
  description: string;
  appliesTo: string;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  
  // Scope & Triggers
  vendorCategories: string[];
  vendorTypes: string[];
  countryScope: string[];
  entityScope: string[];
  triggerEvents: string[];
  
  // Rule Builder
  conditions: RuleCondition[];
  
  // Scoring Model
  scoringMode: string;
  scoringFactors: ScoringFactor[];
  maxScore: number;
  
  // Risk Thresholds
  lowMin: number;
  lowMax: number;
  mediumMin: number;
  mediumMax: number;
  highMin: number;
  highMax: number;
  criticalMin: number;
  criticalMax: number;
  
  // Actions & Automation
  actionRules: ActionRule[];
  ownerRole: string;
  escalationRole: string;
  slaDays: number;
  exceptionAllowed: boolean;
  exceptionApprovalRole: string;
  
  // Governance
  changeControlLevel: string;
  version: string;
  reasonForChange: string;
}

export function RiskRulesMasterPage() {
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
    priority: 10,
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active",
    
    // Scope & Triggers
    vendorCategories: ["All Categories"],
    vendorTypes: ["Domestic", "Import"],
    countryScope: ["All Countries"],
    entityScope: ["All Entities"],
    triggerEvents: ["On Submit", "After Approval"],
    
    // Rule Builder
    conditions: [
      { id: "1", field: "Risk Factor triggered", operator: "equals", value: "Geographic Risk", logicalOperator: "AND" }
    ],
    
    // Scoring Model
    scoringMode: "Weighted Sum",
    scoringFactors: [
      { id: "1", riskFactor: "Geographic Risk", weight: 30, points: 30, condition: "" },
      { id: "2", riskFactor: "Financial Risk", weight: 25, points: 25, condition: "" },
      { id: "3", riskFactor: "Compliance Risk", weight: 25, points: 25, condition: "" },
      { id: "4", riskFactor: "Operational Risk", weight: 20, points: 20, condition: "" },
    ],
    maxScore: 100,
    
    // Risk Thresholds
    lowMin: 0,
    lowMax: 25,
    mediumMin: 26,
    mediumMax: 50,
    highMin: 51,
    highMax: 75,
    criticalMin: 76,
    criticalMax: 100,
    
    // Actions & Automation
    actionRules: [
      { tier: "Low", action: "Allow", extraApprovals: [], autoCreateTask: false },
      { tier: "Medium", action: "Flag", extraApprovals: ["Risk Manager"], autoCreateTask: true },
      { tier: "High", action: "Require EDD", extraApprovals: ["Risk Manager", "Compliance Officer"], autoCreateTask: true },
      { tier: "Critical", action: "Block", extraApprovals: ["VP Risk & Compliance"], autoCreateTask: true },
    ],
    ownerRole: "Risk Manager",
    escalationRole: "VP Risk & Compliance",
    slaDays: 3,
    exceptionAllowed: true,
    exceptionApprovalRole: "Chief Risk Officer",
    
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
      navigate("/masters/risk-scoring");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/risk-scoring");
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

  const toggleItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const addCondition = () => {
    const newCondition: RuleCondition = {
      id: Date.now().toString(),
      field: "Risk Factor triggered",
      operator: "equals",
      value: "",
      logicalOperator: "AND"
    };
    setFormData({ ...formData, conditions: [...formData.conditions, newCondition] });
  };

  const removeCondition = (id: string) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.filter(c => c.id !== id)
    });
  };

  const updateCondition = (id: string, updates: Partial<RuleCondition>) => {
    setFormData({
      ...formData,
      conditions: formData.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    });
  };

  const addScoringFactor = () => {
    const newFactor: ScoringFactor = {
      id: Date.now().toString(),
      riskFactor: "Select Risk Factor",
      weight: 10,
      points: 10,
      condition: ""
    };
    setFormData({ ...formData, scoringFactors: [...formData.scoringFactors, newFactor] });
  };

  const removeScoringFactor = (id: string) => {
    setFormData({
      ...formData,
      scoringFactors: formData.scoringFactors.filter(f => f.id !== id)
    });
  };

  const updateScoringFactor = (id: string, updates: Partial<ScoringFactor>) => {
    setFormData({
      ...formData,
      scoringFactors: formData.scoringFactors.map(f =>
        f.id === id ? { ...f, ...updates } : f
      )
    });
  };

  const updateActionRule = (tier: string, updates: Partial<ActionRule>) => {
    setFormData({
      ...formData,
      actionRules: formData.actionRules.map(rule =>
        rule.tier === tier ? { ...rule, ...updates } : rule
      )
    });
  };

  const toggleExtraApproval = (tier: string, role: string) => {
    setFormData({
      ...formData,
      actionRules: formData.actionRules.map(rule => {
        if (rule.tier === tier) {
          const newApprovals = rule.extraApprovals.includes(role)
            ? rule.extraApprovals.filter(r => r !== role)
            : [...rule.extraApprovals, role];
          return { ...rule, extraApprovals: newApprovals };
        }
        return rule;
      })
    });
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "Low":
        return "bg-[#16A34A] text-white";
      case "Medium":
        return "bg-[#F59E0B] text-white";
      case "High":
        return "bg-[#DC2626] text-white";
      case "Critical":
        return "bg-[#7C2D12] text-white";
      default:
        return "bg-[#94A3B8] text-white";
    }
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
                <Link to="/masters/risk-scoring" className="hover:text-[#00A9B7]">
                  Risk Rules
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Risk Rule</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Configure how risk factors convert into vendor risk scores, tiers, and governance actions.
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
                value="scope"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Scope & Triggers
              </TabsTrigger>
              <TabsTrigger
                value="builder"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Rule Builder
              </TabsTrigger>
              <TabsTrigger
                value="scoring"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Scoring Model
              </TabsTrigger>
              <TabsTrigger
                value="thresholds"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Activity className="w-4 h-4 mr-2" />
                Thresholds
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Actions
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
                      Rule Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., RR-ONBOARD-001, RR-MONITOR-002"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, recommended format: RR-PROCESS-NNN)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Rule Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., High Risk Country Onboarding Rule"
                      className="border-[#E6EEF2] h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Clear, descriptive name for this risk rule
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Description <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe when this rule applies, what it evaluates, and what actions it triggers..."
                      className="border-[#E6EEF2] min-h-[120px]"
                      rows={5}
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Provide clear guidance on the purpose and scope of this risk rule
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applies To Process
                    </Label>
                    <Select value={formData.appliesTo} onValueChange={(value) => setFormData({ ...formData, appliesTo: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vendor Onboarding">Vendor Onboarding</SelectItem>
                        <SelectItem value="Vendor Change Request">Vendor Change Request</SelectItem>
                        <SelectItem value="Periodic Monitoring">Periodic Monitoring</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Which vendor lifecycle process does this rule apply to?
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Priority
                    </Label>
                    <Input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      min="1"
                      max="100"
                      className="border-[#E6EEF2] h-12"
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Execution priority (lower number = higher priority)
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

            {/* Tab 2: Scope & Triggers */}
            <TabsContent value="scope" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Scope & Triggers Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Vendor Categories
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Categories", "Raw Materials", "IT Services", "Consulting", "Logistics", "Manufacturing"].map((category) => (
                        <button
                          key={category}
                          onClick={() => setFormData({ ...formData, vendorCategories: toggleItem(formData.vendorCategories, category) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.vendorCategories.includes(category)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.vendorCategories.includes(category) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {category}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Vendor Types
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Types", "Domestic", "Import", "SEZ", "MSME", "Government"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, vendorTypes: toggleItem(formData.vendorTypes, type) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.vendorTypes.includes(type)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.vendorTypes.includes(type) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Country Scope
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Countries", "India", "United States", "United Kingdom", "High Risk Countries"].map((country) => (
                        <button
                          key={country}
                          onClick={() => setFormData({ ...formData, countryScope: toggleItem(formData.countryScope, country) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.countryScope.includes(country)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.countryScope.includes(country) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {country}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Entity Scope
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Entities", "Manufacturing Division", "Services Division", "Retail Division"].map((entity) => (
                        <button
                          key={entity}
                          onClick={() => setFormData({ ...formData, entityScope: toggleItem(formData.entityScope, entity) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.entityScope.includes(entity)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.entityScope.includes(entity) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {entity}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Trigger Events
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Before Submit", "On Submit", "After Approval", "On ERP Sync", "Daily Monitor"].map((event) => (
                        <button
                          key={event}
                          onClick={() => setFormData({ ...formData, triggerEvents: toggleItem(formData.triggerEvents, event) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.triggerEvents.includes(event)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.triggerEvents.includes(event) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {event}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select when this risk rule should be evaluated
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Rule Builder */}
            <TabsContent value="builder" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">IF/THEN Rule Builder</h2>
                  </div>
                  <Button
                    onClick={addCondition}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Condition
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                    <span className="font-semibold text-[#0A0F14] text-lg">IF</span>
                    <span className="text-sm text-[#64748B]">any of the following conditions are met:</span>
                  </div>

                  {formData.conditions.map((condition, index) => (
                    <div key={condition.id} className="space-y-3">
                      <div className="flex items-start gap-3 p-6 bg-white border-2 border-[#E6EEF2] rounded-xl hover:border-[#00A9B7]/30 transition-colors">
                        <div className="flex-1 grid grid-cols-12 gap-4">
                          {/* Field Selector */}
                          <div className="col-span-4">
                            <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                              Field
                            </Label>
                            <Select
                              value={condition.field}
                              onValueChange={(value) => updateCondition(condition.id, { field: value })}
                            >
                              <SelectTrigger className="border-[#E6EEF2] h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Risk Factor triggered">Risk Factor triggered</SelectItem>
                                <SelectItem value="Document missing">Document missing</SelectItem>
                                <SelectItem value="Document expired">Document expired</SelectItem>
                                <SelectItem value="KYC failed">KYC failed</SelectItem>
                                <SelectItem value="Bank verification failed">Bank verification failed</SelectItem>
                                <SelectItem value="Sanctions match">Sanctions match</SelectItem>
                                <SelectItem value="Score >= threshold">Score {">="} threshold</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Operator */}
                          <div className="col-span-3">
                            <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                              Operator
                            </Label>
                            <Select
                              value={condition.operator}
                              onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                            >
                              <SelectTrigger className="border-[#E6EEF2] h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="equals">equals</SelectItem>
                                <SelectItem value="not equals">not equals</SelectItem>
                                <SelectItem value="contains">contains</SelectItem>
                                <SelectItem value="greater than">greater than</SelectItem>
                                <SelectItem value="less than">less than</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Value */}
                          <div className="col-span-4">
                            <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                              Value
                            </Label>
                            <Input
                              value={condition.value}
                              onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                              placeholder="Enter value..."
                              className="border-[#E6EEF2] h-10"
                            />
                          </div>

                          {/* Delete Button */}
                          <div className="col-span-1 flex items-end">
                            <button
                              onClick={() => removeCondition(condition.id)}
                              className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors"
                              title="Remove condition"
                            >
                              <Trash2 className="w-4 h-4 text-[#DC2626]" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Logical Operator (AND/OR) */}
                      {index < formData.conditions.length - 1 && (
                        <div className="flex items-center justify-center">
                          <div className="flex items-center bg-white border-2 border-[#E6EEF2] rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateCondition(condition.id, { logicalOperator: "AND" })}
                              className={`px-4 py-2 text-sm font-medium transition-colors ${
                                condition.logicalOperator === "AND"
                                  ? "bg-[#00A9B7] text-white"
                                  : "text-[#64748B] hover:bg-[#F6F9FC]"
                              }`}
                            >
                              AND
                            </button>
                            <button
                              onClick={() => updateCondition(condition.id, { logicalOperator: "OR" })}
                              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-[#E6EEF2] ${
                                condition.logicalOperator === "OR"
                                  ? "bg-[#00A9B7] text-white"
                                  : "text-[#64748B] hover:bg-[#F6F9FC]"
                              }`}
                            >
                              OR
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center gap-3 p-4 bg-[#E0F5F7] rounded-lg border border-[#00A9B7]/20">
                    <span className="font-semibold text-[#0A0F14] text-lg">THEN</span>
                    <span className="text-sm text-[#64748B]">Execute scoring model and apply risk tier actions</span>
                  </div>
                </div>
              </div>

              {/* Rule Logic Preview */}
              <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Rule Logic Summary</h3>
                    <div className="text-sm text-[#64748B] space-y-1">
                      <p><strong>IF</strong> any condition matches:</p>
                      {formData.conditions.map((condition, index) => (
                        <p key={condition.id} className="ml-4">
                          • {condition.field} {condition.operator} "{condition.value}"
                          {index < formData.conditions.length - 1 && ` (${condition.logicalOperator})`}
                        </p>
                      ))}
                      <p className="mt-2"><strong>THEN</strong> Calculate risk score and apply tier-based actions</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Scoring Model */}
            <TabsContent value="scoring" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Scoring Model Configuration</h2>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Scoring Mode
                    </Label>
                    <Select value={formData.scoringMode} onValueChange={(value) => setFormData({ ...formData, scoringMode: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Weighted Sum">Weighted Sum</SelectItem>
                        <SelectItem value="Threshold-based">Threshold-based</SelectItem>
                        <SelectItem value="Tier mapping">Tier Mapping</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Method used to calculate the overall risk score
                    </p>
                  </div>

                  {formData.scoringMode === "Weighted Sum" && (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <Label className="text-sm font-medium text-[#0A0F14]">
                            Risk Factors & Weights
                          </Label>
                          <Button
                            onClick={addScoringFactor}
                            size="sm"
                            variant="outline"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Factor
                          </Button>
                        </div>

                        <div className="border border-[#E6EEF2] rounded-xl overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-[#F6F9FC]">
                              <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                                  Risk Factor
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase w-32">
                                  Weight (%)
                                </th>
                                <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase w-32">
                                  Points
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                                  Condition
                                </th>
                                <th className="w-16"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {formData.scoringFactors.map((factor, index) => (
                                <tr
                                  key={factor.id}
                                  className={`border-t border-[#E6EEF2] ${
                                    index % 2 === 0 ? "bg-white" : "bg-[#F6F9FC]/50"
                                  }`}
                                >
                                  <td className="px-4 py-4">
                                    <Select
                                      value={factor.riskFactor}
                                      onValueChange={(value) => updateScoringFactor(factor.id, { riskFactor: value })}
                                    >
                                      <SelectTrigger className="border-[#E6EEF2] h-10">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Geographic Risk">Geographic Risk</SelectItem>
                                        <SelectItem value="Financial Risk">Financial Risk</SelectItem>
                                        <SelectItem value="Compliance Risk">Compliance Risk</SelectItem>
                                        <SelectItem value="Operational Risk">Operational Risk</SelectItem>
                                        <SelectItem value="Reputational Risk">Reputational Risk</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-4">
                                    <Input
                                      type="number"
                                      value={factor.weight}
                                      onChange={(e) => updateScoringFactor(factor.id, { weight: parseInt(e.target.value) || 0 })}
                                      min="0"
                                      max="100"
                                      className="border-[#E6EEF2] h-10 text-center"
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <Input
                                      type="number"
                                      value={factor.points}
                                      onChange={(e) => updateScoringFactor(factor.id, { points: parseInt(e.target.value) || 0 })}
                                      min="0"
                                      max="100"
                                      className="border-[#E6EEF2] h-10 text-center"
                                    />
                                  </td>
                                  <td className="px-4 py-4">
                                    <Input
                                      value={factor.condition}
                                      onChange={(e) => updateScoringFactor(factor.id, { condition: e.target.value })}
                                      placeholder="Optional condition..."
                                      className="border-[#E6EEF2] h-10"
                                    />
                                  </td>
                                  <td className="px-4 py-4 text-center">
                                    <button
                                      onClick={() => removeScoringFactor(factor.id)}
                                      className="p-2 hover:bg-[#FEE2E2] rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4 text-[#DC2626]" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-[#F6F9FC] border-t-2 border-[#E6EEF2]">
                              <tr>
                                <td className="px-4 py-3 font-semibold text-[#0A0F14]">Total</td>
                                <td className="px-4 py-3 text-center font-bold text-[#00A9B7]">
                                  {formData.scoringFactors.reduce((sum, f) => sum + f.weight, 0)}%
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-[#00A9B7]">
                                  {formData.scoringFactors.reduce((sum, f) => sum + f.points, 0)}
                                </td>
                                <td colSpan={2}></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Maximum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.maxScore}
                          onChange={(e) => setFormData({ ...formData, maxScore: parseInt(e.target.value) || 100 })}
                          min="1"
                          className="border-[#E6EEF2] h-12 max-w-xs"
                        />
                        <p className="text-xs text-[#64748B] mt-2">
                          Maximum possible risk score (default: 100)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Scoring Summary */}
              {formData.scoringMode === "Weighted Sum" && (
                <div className="bg-[#FFF7ED] border border-[#F59E0B]/20 rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <TrendingUp className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[#0A0F14] mb-2">Scoring Summary</h3>
                      <div className="text-sm text-[#64748B] space-y-1">
                        <p>• Total weight: <strong>{formData.scoringFactors.reduce((sum, f) => sum + f.weight, 0)}%</strong> (should equal 100%)</p>
                        <p>• Total points: <strong>{formData.scoringFactors.reduce((sum, f) => sum + f.points, 0)}</strong> out of {formData.maxScore}</p>
                        <p>• {formData.scoringFactors.length} risk factors configured</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Tab 5: Risk Thresholds */}
            <TabsContent value="thresholds" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Risk Tier Thresholds</h2>
                </div>

                <div className="space-y-8">
                  {/* Low */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 rounded-lg bg-[#16A34A] text-white font-semibold text-sm">
                        Low Risk
                      </div>
                      <span className="text-sm text-[#64748B]">Acceptable risk level, minimal oversight required</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Minimum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.lowMin}
                          onChange={(e) => setFormData({ ...formData, lowMin: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Maximum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.lowMax}
                          onChange={(e) => setFormData({ ...formData, lowMax: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#16A34A]"
                        style={{ width: `${(formData.lowMax / formData.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Medium */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 rounded-lg bg-[#F59E0B] text-white font-semibold text-sm">
                        Medium Risk
                      </div>
                      <span className="text-sm text-[#64748B]">Moderate risk, standard review process</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Minimum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.mediumMin}
                          onChange={(e) => setFormData({ ...formData, mediumMin: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Maximum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.mediumMax}
                          onChange={(e) => setFormData({ ...formData, mediumMax: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#F59E0B]"
                        style={{ 
                          marginLeft: `${(formData.mediumMin / formData.maxScore) * 100}%`,
                          width: `${((formData.mediumMax - formData.mediumMin) / formData.maxScore) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* High */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 rounded-lg bg-[#DC2626] text-white font-semibold text-sm">
                        High Risk
                      </div>
                      <span className="text-sm text-[#64748B]">Elevated risk, enhanced due diligence required</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Minimum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.highMin}
                          onChange={(e) => setFormData({ ...formData, highMin: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Maximum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.highMax}
                          onChange={(e) => setFormData({ ...formData, highMax: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#DC2626]"
                        style={{ 
                          marginLeft: `${(formData.highMin / formData.maxScore) * 100}%`,
                          width: `${((formData.highMax - formData.highMin) / formData.maxScore) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Critical */}
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="px-3 py-1 rounded-lg bg-[#7C2D12] text-white font-semibold text-sm">
                        Critical Risk
                      </div>
                      <span className="text-sm text-[#64748B]">Unacceptable risk, blocking action required</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Minimum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.criticalMin}
                          onChange={(e) => setFormData({ ...formData, criticalMin: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                          Maximum Score
                        </Label>
                        <Input
                          type="number"
                          value={formData.criticalMax}
                          onChange={(e) => setFormData({ ...formData, criticalMax: parseInt(e.target.value) || 0 })}
                          className="border-[#E6EEF2] h-12"
                        />
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#7C2D12]"
                        style={{ 
                          marginLeft: `${(formData.criticalMin / formData.maxScore) * 100}%`,
                          width: `${((formData.criticalMax - formData.criticalMin) / formData.maxScore) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Threshold Visualization */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <h3 className="font-semibold text-[#0A0F14] mb-4">Risk Score Range Visualization</h3>
                <div className="relative h-16 bg-gradient-to-r from-[#16A34A] via-[#F59E0B] via-[#DC2626] to-[#7C2D12] rounded-xl">
                  <div className="absolute inset-0 flex items-center justify-between px-4 text-white font-semibold text-sm">
                    <span>0</span>
                    <span>{formData.lowMax}</span>
                    <span>{formData.mediumMax}</span>
                    <span>{formData.highMax}</span>
                    <span>{formData.maxScore}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-xs text-[#64748B]">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Actions & Automation */}
            <TabsContent value="actions" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Actions & Automation Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-4 block">
                      Tier-based Actions
                    </Label>
                    <div className="border border-[#E6EEF2] rounded-xl overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-[#F6F9FC]">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                              Risk Tier
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                              Action
                            </th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase">
                              Extra Approvals
                            </th>
                            <th className="text-center px-4 py-3 text-xs font-semibold text-[#64748B] uppercase w-40">
                              Auto-create Task
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.actionRules.map((rule, index) => (
                            <tr
                              key={rule.tier}
                              className={`border-t border-[#E6EEF2] ${
                                index % 2 === 0 ? "bg-white" : "bg-[#F6F9FC]/50"
                              }`}
                            >
                              <td className="px-4 py-4">
                                <div className={`inline-flex px-3 py-1 rounded-lg font-semibold text-sm ${getTierColor(rule.tier)}`}>
                                  {rule.tier}
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <Select
                                  value={rule.action}
                                  onValueChange={(value) => updateActionRule(rule.tier, { action: value })}
                                >
                                  <SelectTrigger className="border-[#E6EEF2] h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Allow">Allow</SelectItem>
                                    <SelectItem value="Flag">Flag for Review</SelectItem>
                                    <SelectItem value="Require Clarification">Require Clarification</SelectItem>
                                    <SelectItem value="Require EDD">Require Enhanced Due Diligence</SelectItem>
                                    <SelectItem value="Block">Block Submission</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-wrap gap-2">
                                  {["Risk Manager", "Compliance Officer", "VP Risk & Compliance"].map((role) => (
                                    <button
                                      key={role}
                                      onClick={() => toggleExtraApproval(rule.tier, role)}
                                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                                        rule.extraApprovals.includes(role)
                                          ? "bg-[#00A9B7] text-white"
                                          : "bg-[#F6F9FC] text-[#64748B] hover:bg-[#E6EEF2]"
                                      }`}
                                    >
                                      {role}
                                    </button>
                                  ))}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <Switch
                                  checked={rule.autoCreateTask}
                                  onCheckedChange={(checked) => updateActionRule(rule.tier, { autoCreateTask: checked })}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Default Owner Role
                      </Label>
                      <Select value={formData.ownerRole} onValueChange={(value) => setFormData({ ...formData, ownerRole: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Risk Manager">Risk Manager</SelectItem>
                          <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                          <SelectItem value="Category Manager">Category Manager</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Escalation Role
                      </Label>
                      <Select value={formData.escalationRole} onValueChange={(value) => setFormData({ ...formData, escalationRole: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VP Risk & Compliance">VP Risk & Compliance</SelectItem>
                          <SelectItem value="Chief Risk Officer">Chief Risk Officer</SelectItem>
                          <SelectItem value="General Counsel">General Counsel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      SLA Days
                    </Label>
                    <Input
                      type="number"
                      value={formData.slaDays}
                      onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) || 0 })}
                      min="1"
                      className="border-[#E6EEF2] h-12 max-w-xs"
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Expected time to resolution in business days
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Exception Approval
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.exceptionAllowed}
                        onCheckedChange={(checked) => setFormData({ ...formData, exceptionAllowed: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.exceptionAllowed ? "Exceptions Allowed" : "No Exceptions"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Allow authorized users to override risk actions
                        </span>
                      </div>
                    </div>
                  </div>

                  {formData.exceptionAllowed && (
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Exception Approval Role
                      </Label>
                      <Select value={formData.exceptionApprovalRole} onValueChange={(value) => setFormData({ ...formData, exceptionApprovalRole: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Chief Risk Officer">Chief Risk Officer</SelectItem>
                          <SelectItem value="VP Risk & Compliance">VP Risk & Compliance</SelectItem>
                          <SelectItem value="General Counsel">General Counsel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Governance */}
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
                        {isEditMode ? "Modified: 2026-02-19 16:00" : "New Record"}
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
                        placeholder="Provide a clear explanation for why this approved/active risk rule is being modified..."
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
                      <li>• Risk rules directly control vendor risk scoring and governance actions</li>
                      <li>• Changes to active rules may affect in-progress vendor evaluations</li>
                      <li>• All modifications are logged and subject to audit review</li>
                      <li>• Deletion is not permitted; use "Inactive" status to disable</li>
                      {formData.changeControlLevel === "Locked" && (
                        <li className="text-[#DC2626]">• <strong>This risk rule is locked</strong> and cannot be modified without admin override</li>
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
