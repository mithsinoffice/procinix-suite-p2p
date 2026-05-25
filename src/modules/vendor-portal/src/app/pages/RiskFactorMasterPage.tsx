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
  Zap,
  FileCheck,
  Lock,
  Target,
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

interface FormData {
  // Basics
  code: string;
  name: string;
  description: string;
  riskDomain: string;
  severityDefault: string;
  defaultWeight: number;
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  
  // Trigger & Evaluation
  triggerType: string;
  evaluationMode: string;
  appliesDuring: string[];
  
  // Scope & Applicability
  appliesToCategories: string[];
  appliesToVendorTypes: string[];
  countryScope: string[];
  entityScope: string[];
  
  // Actions & SLA
  defaultAction: string;
  autoCreateTask: boolean;
  ownerRole: string;
  escalationRole: string;
  slaDays: number;
  
  // Evidence & Audit
  evidenceRequired: boolean;
  evidenceTypes: string[];
  auditNotesRequired: boolean;
  
  // Governance
  changeControlLevel: string;
  version: string;
  reasonForChange: string;
}

export function RiskFactorMasterPage() {
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
    riskDomain: "Compliance",
    severityDefault: "Medium",
    defaultWeight: 50,
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active",
    
    // Trigger & Evaluation
    triggerType: "Validation Result",
    evaluationMode: "Boolean",
    appliesDuring: ["Onboarding", "Change Request"],
    
    // Scope & Applicability
    appliesToCategories: ["All Categories"],
    appliesToVendorTypes: ["Domestic", "Import"],
    countryScope: ["All Countries"],
    entityScope: ["All Entities"],
    
    // Actions & SLA
    defaultAction: "Require Clarification",
    autoCreateTask: true,
    ownerRole: "Risk Manager",
    escalationRole: "VP Risk & Compliance",
    slaDays: 3,
    
    // Evidence & Audit
    evidenceRequired: true,
    evidenceTypes: ["Document", "Notes"],
    auditNotesRequired: true,
    
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
      navigate("/masters/risk-factors");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/risk-factors");
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "Low":
        return "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]";
      case "Medium":
        return "border-[#F59E0B] bg-[#FFF7ED] text-[#F59E0B]";
      case "High":
        return "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]";
      case "Critical":
        return "border-[#7C2D12] bg-[#FEF2F2] text-[#7C2D12]";
      default:
        return "border-[#E6EEF2] bg-[#F6F9FC] text-[#64748B]";
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
                <Link to="/masters/risk-factors" className="hover:text-[#00A9B7]">
                  Risk Factors
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Risk Factor</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Configure reusable risk signals that drive vendor risk scoring during onboarding, change requests, and monitoring.
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
            <TabsList className="bg-white border border-[#E6EEF2] p-1 rounded-xl mb-6 h-auto inline-flex">
              <TabsTrigger
                value="basics"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Basics
              </TabsTrigger>
              <TabsTrigger
                value="trigger"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Trigger & Evaluation
              </TabsTrigger>
              <TabsTrigger
                value="scope"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Scope
              </TabsTrigger>
              <TabsTrigger
                value="actions"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Actions & SLA
              </TabsTrigger>
              <TabsTrigger
                value="evidence"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Evidence
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
                      Risk Factor Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., RF-GEO-001, RF-FIN-002"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, recommended format: RF-DOMAIN-NNN)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Risk Factor Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., High Risk Country, Negative Media"
                      className="border-[#E6EEF2] h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Clear, descriptive name for the risk signal
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Description <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what this risk factor detects, why it matters, and what action should be taken..."
                      className="border-[#E6EEF2] min-h-[120px]"
                      rows={5}
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Provide clear guidance for users evaluating this risk
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Risk Domain
                    </Label>
                    <Select value={formData.riskDomain} onValueChange={(value) => setFormData({ ...formData, riskDomain: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Financial">Financial</SelectItem>
                        <SelectItem value="Geographic">Geographic</SelectItem>
                        <SelectItem value="Operational">Operational</SelectItem>
                        <SelectItem value="Fraud">Fraud</SelectItem>
                        <SelectItem value="ESG">ESG (Environmental, Social, Governance)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Primary risk category for classification
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Severity Default
                    </Label>
                    <div className="grid grid-cols-4 gap-3">
                      {["Low", "Medium", "High", "Critical"].map((severity) => (
                        <button
                          key={severity}
                          onClick={() => setFormData({ ...formData, severityDefault: severity })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.severityDefault === severity
                              ? getSeverityColor(severity)
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {severity}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Default severity level for this risk factor
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Weight (0-100)
                    </Label>
                    <div className="flex items-center gap-6">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={formData.defaultWeight}
                        onChange={(e) => setFormData({ ...formData, defaultWeight: parseInt(e.target.value) })}
                        className="flex-1 h-2 bg-[#E6EEF2] rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #00A9B7 0%, #00A9B7 ${formData.defaultWeight}%, #E6EEF2 ${formData.defaultWeight}%, #E6EEF2 100%)`
                        }}
                      />
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          value={formData.defaultWeight}
                          onChange={(e) => setFormData({ ...formData, defaultWeight: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                          min="0"
                          max="100"
                          className="border-[#E6EEF2] h-12 w-24 text-center font-mono font-semibold"
                        />
                        <span className="text-sm text-[#64748B]">/ 100</span>
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Contribution to overall risk score (higher weight = greater impact)
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

              {/* Risk Domain Info Panel */}
              <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Risk Domain Guidelines</h3>
                    <ul className="text-sm text-[#64748B] space-y-1">
                      <li>• <strong>Compliance:</strong> Regulatory, legal, sanctions, KYC, AML related risks</li>
                      <li>• <strong>Financial:</strong> Credit risk, payment history, financial stability</li>
                      <li>• <strong>Geographic:</strong> Country risk, political stability, trade restrictions</li>
                      <li>• <strong>Operational:</strong> Delivery capability, quality, business continuity</li>
                      <li>• <strong>Fraud:</strong> Suspicious activity, negative screening, fraud indicators</li>
                      <li>• <strong>ESG:</strong> Environmental, social responsibility, governance concerns</li>
                    </ul>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Trigger & Evaluation */}
            <TabsContent value="trigger" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Trigger & Evaluation Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Trigger Type
                    </Label>
                    <Select value={formData.triggerType} onValueChange={(value) => setFormData({ ...formData, triggerType: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual">Manual - User flags this risk</SelectItem>
                        <SelectItem value="Validation Result">Validation Result - Triggered by validation failure</SelectItem>
                        <SelectItem value="Document Condition">Document Condition - Triggered by document status</SelectItem>
                        <SelectItem value="API Signal">API Signal - Triggered by external API response</SelectItem>
                        <SelectItem value="ERP Sync Signal">ERP Sync Signal - Triggered by ERP data sync</SelectItem>
                        <SelectItem value="Periodic Review">Periodic Review - Triggered on schedule</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Defines when and how this risk factor is evaluated
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Evaluation Mode
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "Boolean", label: "Boolean", desc: "Pass/Fail" },
                        { value: "Score 0-100", label: "Score 0-100", desc: "Numeric score" },
                        { value: "Tier", label: "Tier", desc: "Low/Med/High" }
                      ].map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setFormData({ ...formData, evaluationMode: mode.value })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.evaluationMode === mode.value
                              ? "border-[#00A9B7] bg-[#E0F5F7]"
                              : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          <div className="font-medium text-[#0A0F14] mb-1">{mode.label}</div>
                          <div className="text-xs text-[#64748B]">{mode.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      How the risk is measured and scored
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applies During
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Onboarding", "Change Request", "Periodic Monitoring", "Transaction Review", "Renewal"].map((stage) => (
                        <button
                          key={stage}
                          onClick={() => setFormData({ ...formData, appliesDuring: toggleItem(formData.appliesDuring, stage) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.appliesDuring.includes(stage)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.appliesDuring.includes(stage) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {stage}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select when this risk factor should be evaluated in the vendor lifecycle
                    </p>
                  </div>
                </div>
              </div>

              {/* Trigger Logic Info */}
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <Zap className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Trigger Logic</h3>
                    <div className="text-sm text-[#64748B] space-y-2">
                      <p><strong>Current Configuration:</strong></p>
                      <p>• This risk factor will be <strong>{formData.triggerType}</strong></p>
                      <p>• Evaluation returns a <strong>{formData.evaluationMode}</strong> result</p>
                      <p>• Active during: <strong>{formData.appliesDuring.join(", ")}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Scope & Applicability */}
            <TabsContent value="scope" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Scope & Applicability</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applies to Vendor Categories
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Categories", "Raw Materials", "IT Services", "Consulting", "Logistics", "Manufacturing"].map((category) => (
                        <button
                          key={category}
                          onClick={() => setFormData({ ...formData, appliesToCategories: toggleItem(formData.appliesToCategories, category) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.appliesToCategories.includes(category)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.appliesToCategories.includes(category) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {category}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select vendor categories where this risk factor applies
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applies to Vendor Types
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Types", "Domestic", "Import", "SEZ", "MSME", "Government"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, appliesToVendorTypes: toggleItem(formData.appliesToVendorTypes, type) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.appliesToVendorTypes.includes(type)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.appliesToVendorTypes.includes(type) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select vendor types where this risk factor applies
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Country Scope
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Countries", "India", "United States", "United Kingdom", "China", "High Risk Countries"].map((country) => (
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
                    <p className="text-xs text-[#64748B] mt-2">
                      Select countries or regions where this risk applies
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Entity Scope
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Entities", "Manufacturing Division", "Services Division", "Retail Division", "Export Division"].map((entity) => (
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
                    <p className="text-xs text-[#64748B] mt-2">
                      Select organizational entities where this risk factor applies
                    </p>
                  </div>
                </div>
              </div>

              {/* Scope Summary */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-5 h-5 text-[#00A9B7]" />
                  <h3 className="font-semibold text-[#0A0F14]">Applicability Summary</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[#64748B] mb-1">Categories:</div>
                    <div className="font-medium text-[#0A0F14]">
                      {formData.appliesToCategories.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64748B] mb-1">Vendor Types:</div>
                    <div className="font-medium text-[#0A0F14]">
                      {formData.appliesToVendorTypes.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64748B] mb-1">Countries:</div>
                    <div className="font-medium text-[#0A0F14]">
                      {formData.countryScope.join(", ")}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#64748B] mb-1">Entities:</div>
                    <div className="font-medium text-[#0A0F14]">
                      {formData.entityScope.join(", ")}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Actions & SLA */}
            <TabsContent value="actions" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Actions & SLA Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Action
                    </Label>
                    <Select value={formData.defaultAction} onValueChange={(value) => setFormData({ ...formData, defaultAction: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Flag">Flag - Add to risk log only</SelectItem>
                        <SelectItem value="Require Clarification">Require Clarification - Request vendor input</SelectItem>
                        <SelectItem value="Require EDD">Require EDD - Trigger enhanced due diligence</SelectItem>
                        <SelectItem value="Block Submission">Block Submission - Prevent submission until resolved</SelectItem>
                        <SelectItem value="Block Vendor">Block Vendor - Immediately block vendor</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Automatic action taken when this risk factor is triggered
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Auto-create Task
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.autoCreateTask}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoCreateTask: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.autoCreateTask ? "Enabled" : "Disabled"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Automatically create a task when this risk is triggered
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Owner Role
                      </Label>
                      <Select value={formData.ownerRole} onValueChange={(value) => setFormData({ ...formData, ownerRole: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Risk Manager">Risk Manager</SelectItem>
                          <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                          <SelectItem value="Category Manager">Category Manager</SelectItem>
                          <SelectItem value="Procurement Lead">Procurement Lead</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-2">
                        Primary owner responsible for resolution
                      </p>
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
                          <SelectItem value="VP Procurement">VP Procurement</SelectItem>
                          <SelectItem value="General Counsel">General Counsel</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-2">
                        Escalation recipient if SLA is breached
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      SLA Days
                    </Label>
                    <div className="flex items-center gap-4 max-w-md">
                      <Input
                        type="number"
                        value={formData.slaDays}
                        onChange={(e) => setFormData({ ...formData, slaDays: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="border-[#E6EEF2] h-12"
                      />
                      <span className="text-sm text-[#64748B]">business days</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Expected time to resolution; auto-escalate if exceeded
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Workflow */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-5 h-5 text-[#00A9B7]" />
                  <h3 className="font-semibold text-[#0A0F14]">Action Workflow</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#F6F9FC] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#00A9B7] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0A0F14] text-sm">Risk Triggered</div>
                      <div className="text-xs text-[#64748B]">System detects risk condition</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F6F9FC] rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-[#00A9B7] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0A0F14] text-sm">Action: {formData.defaultAction}</div>
                      <div className="text-xs text-[#64748B]">Automatic system action</div>
                    </div>
                  </div>
                  {formData.autoCreateTask && (
                    <div className="flex items-start gap-3 p-3 bg-[#F6F9FC] rounded-lg">
                      <div className="w-6 h-6 rounded-full bg-[#00A9B7] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                        3
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-[#0A0F14] text-sm">Task Created for {formData.ownerRole}</div>
                        <div className="text-xs text-[#64748B]">Due in {formData.slaDays} business days</div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3 p-3 bg-[#FEF3C7] rounded-lg border border-[#F59E0B]/20">
                    <div className="w-6 h-6 rounded-full bg-[#F59E0B] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                      !
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-[#0A0F14] text-sm">Escalate to {formData.escalationRole}</div>
                      <div className="text-xs text-[#64748B]">If not resolved within SLA</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Evidence & Audit */}
            <TabsContent value="evidence" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Evidence & Audit Requirements</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Evidence Required
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.evidenceRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, evidenceRequired: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.evidenceRequired ? "Required" : "Optional"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Require supporting evidence when this risk is flagged
                        </span>
                      </div>
                    </div>
                  </div>

                  {formData.evidenceRequired && (
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Evidence Types
                      </Label>
                      <div className="flex flex-wrap gap-3">
                        {["Document", "Screenshot", "Notes", "External Reference", "API Response", "Email"].map((type) => (
                          <button
                            key={type}
                            onClick={() => setFormData({ ...formData, evidenceTypes: toggleItem(formData.evidenceTypes, type) })}
                            className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                              formData.evidenceTypes.includes(type)
                                ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                                : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                            }`}
                          >
                            {formData.evidenceTypes.includes(type) && (
                              <CheckCircle className="w-4 h-4 inline mr-2" />
                            )}
                            {type}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-[#64748B] mt-2">
                        Select acceptable types of supporting evidence
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Audit Notes Required
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.auditNotesRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, auditNotesRequired: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.auditNotesRequired ? "Required" : "Optional"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Require audit notes explaining the assessment and resolution
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Guidelines */}
              <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <FileCheck className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Evidence & Audit Trail</h3>
                    <ul className="text-sm text-[#64748B] space-y-1">
                      <li>• All evidence is timestamped and linked to the risk assessment</li>
                      <li>• Evidence cannot be deleted, only superseded with new submissions</li>
                      <li>• Audit notes create an immutable record of decision rationale</li>
                      <li>• Full audit trail is available for regulatory and internal review</li>
                      {formData.evidenceRequired && (
                        <li className="text-[#F59E0B]">• <strong>Evidence is mandatory</strong> before this risk can be marked as resolved</li>
                      )}
                    </ul>
                  </div>
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
                      <p className="text-xs text-[#64748B] mt-2">
                        System-managed version number
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                        Created / Modified
                      </Label>
                      <div className="h-12 px-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg flex items-center text-sm text-[#64748B]">
                        {isEditMode ? "Modified: 2026-02-19 14:30" : "New Record"}
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
                        placeholder="Provide a clear explanation for why this approved/active risk factor is being modified..."
                        className="border-[#E6EEF2] min-h-[100px]"
                        rows={4}
                        required
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Required when editing approved or active risk factors
                      </p>
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
                      <li>• Risk factors directly impact vendor risk scores and onboarding decisions</li>
                      <li>• Changes to active risk factors may trigger re-evaluation of existing vendors</li>
                      <li>• All modifications are logged and subject to audit review</li>
                      <li>• Deletion is not permitted; use "Inactive" status to disable</li>
                      {formData.changeControlLevel === "Locked" && (
                        <li className="text-[#DC2626]">• <strong>This risk factor is locked</strong> and cannot be modified without admin override</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Version History Preview */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#0A0F14]">Version History</h3>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View Full History
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 bg-[#F6F9FC] rounded-lg text-sm">
                    <div className="font-mono font-semibold text-[#00A9B7]">v1.0</div>
                    <div className="flex-1 text-[#64748B]">Initial creation</div>
                    <div className="text-[#64748B]">2026-01-15</div>
                    <div className="text-[#0A0F14] font-medium">System Admin</div>
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
