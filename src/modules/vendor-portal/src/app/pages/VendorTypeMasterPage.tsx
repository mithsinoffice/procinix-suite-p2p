import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  X,
  CheckCircle,
  FileText,
  ChevronRight,
  Info,
  AlertCircle,
  Plus,
  Trash2,
  Settings,
  Shield,
  Clock,
  FileCheck,
  Zap,
  Link as LinkIcon,
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

interface TaxIdentifier {
  id: string;
  type: string;
  mandatory: boolean;
  country: string;
  autoVerify: boolean;
}

interface DocumentRequirement {
  id: string;
  documentType: string;
  mandatory: boolean;
  expiryRequired: boolean;
  reminderDays: number;
  riskImpact: "Low" | "Medium" | "High";
}

interface RiskFactorOverride {
  id: string;
  riskFactor: string;
  weightOverride: number;
  condition: string;
}

interface ERPMapping {
  id: string;
  erpSystem: string;
  erpVendorTypeCode: string;
  erpAccountGroup: string;
  autoSyncOnActivation: boolean;
}

interface FormData {
  // Basics
  code: string;
  name: string;
  description: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
  changeControlLevel: string;
  
  // Onboarding Rules
  onboardingMode: string;
  requiredSections: string[];
  minDocumentCompleteness: number;
  autoBlockIfComplianceFails: boolean;
  
  // Approvals & SLA
  defaultWorkflowType: string;
  mandatoryApprovalDepartments: string[];
  parallelApprovalAllowed: boolean;
  slaClass: string;
  escalationAfter: number;
  
  // Compliance Requirements
  taxIdentifiers: TaxIdentifier[];
  documentRequirements: DocumentRequirement[];
  
  // Risk Defaults
  baseRiskWeight: number;
  riskCategory: string;
  enhancedDueDiligenceRequired: boolean;
  eddThreshold: number;
  riskFactorOverrides: RiskFactorOverride[];
  
  // ERP Mapping
  erpMappings: ERPMapping[];
}

export function VendorTypeMasterPage() {
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
    status: "Active",
    effectiveFrom: "",
    effectiveTo: "",
    changeControlLevel: "Approval Required",
    
    // Onboarding Rules
    onboardingMode: "Both",
    requiredSections: ["Tax & Compliance", "Banking", "Documents"],
    minDocumentCompleteness: 85,
    autoBlockIfComplianceFails: true,
    
    // Approvals & SLA
    defaultWorkflowType: "Standard 3-Tier",
    mandatoryApprovalDepartments: ["Procurement", "Finance"],
    parallelApprovalAllowed: true,
    slaClass: "Standard - 5 Business Days",
    escalationAfter: 3,
    
    // Compliance Requirements
    taxIdentifiers: [
      { id: "1", type: "PAN", mandatory: true, country: "India", autoVerify: true },
      { id: "2", type: "GST Number", mandatory: true, country: "India", autoVerify: true },
    ],
    documentRequirements: [
      { id: "1", documentType: "Certificate of Incorporation", mandatory: true, expiryRequired: false, reminderDays: 0, riskImpact: "High" },
      { id: "2", documentType: "PAN Card", mandatory: true, expiryRequired: false, reminderDays: 0, riskImpact: "High" },
    ],
    
    // Risk Defaults
    baseRiskWeight: 50,
    riskCategory: "Medium",
    enhancedDueDiligenceRequired: false,
    eddThreshold: 75,
    riskFactorOverrides: [],
    
    // ERP Mapping
    erpMappings: [
      { id: "1", erpSystem: "SAP S/4HANA", erpVendorTypeCode: "DOM", erpAccountGroup: "VG01", autoSyncOnActivation: true },
    ],
  });

  const handleSubmit = (saveType: "draft" | "submit") => {
    console.log("Submitting form:", { saveType, formData });
    if (saveType === "submit") {
      setFormStatus("under-review");
    }
    setTimeout(() => {
      navigate("/masters/vendor-type");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/vendor-type");
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

  // Handler functions
  const addTaxIdentifier = () => {
    const newId = (formData.taxIdentifiers.length + 1).toString();
    setFormData({
      ...formData,
      taxIdentifiers: [...formData.taxIdentifiers, {
        id: newId,
        type: "",
        mandatory: false,
        country: "",
        autoVerify: false,
      }],
    });
  };

  const removeTaxIdentifier = (id: string) => {
    setFormData({
      ...formData,
      taxIdentifiers: formData.taxIdentifiers.filter(item => item.id !== id),
    });
  };

  const updateTaxIdentifier = (id: string, field: keyof TaxIdentifier, value: any) => {
    setFormData({
      ...formData,
      taxIdentifiers: formData.taxIdentifiers.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const addDocumentRequirement = () => {
    const newId = (formData.documentRequirements.length + 1).toString();
    setFormData({
      ...formData,
      documentRequirements: [...formData.documentRequirements, {
        id: newId,
        documentType: "",
        mandatory: false,
        expiryRequired: false,
        reminderDays: 30,
        riskImpact: "Low",
      }],
    });
  };

  const removeDocumentRequirement = (id: string) => {
    setFormData({
      ...formData,
      documentRequirements: formData.documentRequirements.filter(item => item.id !== id),
    });
  };

  const updateDocumentRequirement = (id: string, field: keyof DocumentRequirement, value: any) => {
    setFormData({
      ...formData,
      documentRequirements: formData.documentRequirements.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const addRiskFactorOverride = () => {
    const newId = (formData.riskFactorOverrides.length + 1).toString();
    setFormData({
      ...formData,
      riskFactorOverrides: [...formData.riskFactorOverrides, {
        id: newId,
        riskFactor: "",
        weightOverride: 0,
        condition: "",
      }],
    });
  };

  const removeRiskFactorOverride = (id: string) => {
    setFormData({
      ...formData,
      riskFactorOverrides: formData.riskFactorOverrides.filter(item => item.id !== id),
    });
  };

  const updateRiskFactorOverride = (id: string, field: keyof RiskFactorOverride, value: any) => {
    setFormData({
      ...formData,
      riskFactorOverrides: formData.riskFactorOverrides.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const addERPMapping = () => {
    const newId = (formData.erpMappings.length + 1).toString();
    setFormData({
      ...formData,
      erpMappings: [...formData.erpMappings, {
        id: newId,
        erpSystem: "",
        erpVendorTypeCode: "",
        erpAccountGroup: "",
        autoSyncOnActivation: false,
      }],
    });
  };

  const removeERPMapping = (id: string) => {
    setFormData({
      ...formData,
      erpMappings: formData.erpMappings.filter(item => item.id !== id),
    });
  };

  const updateERPMapping = (id: string, field: keyof ERPMapping, value: any) => {
    setFormData({
      ...formData,
      erpMappings: formData.erpMappings.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    });
  };

  const toggleRequiredSection = (section: string) => {
    const sections = formData.requiredSections.includes(section)
      ? formData.requiredSections.filter(s => s !== section)
      : [...formData.requiredSections, section];
    setFormData({ ...formData, requiredSections: sections });
  };

  const toggleMandatoryDepartment = (dept: string) => {
    const departments = formData.mandatoryApprovalDepartments.includes(dept)
      ? formData.mandatoryApprovalDepartments.filter(d => d !== dept)
      : [...formData.mandatoryApprovalDepartments, dept];
    setFormData({ ...formData, mandatoryApprovalDepartments: departments });
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
                <Link to="/masters/vendor-type" className="hover:text-[#00A9B7]">
                  Vendor Type
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Vendor Type</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Define classification, workflow, compliance, and risk defaults for vendor onboarding.
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
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Basics
              </TabsTrigger>
              <TabsTrigger
                value="onboarding"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Onboarding Rules
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Approvals & SLA
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Compliance Requirements
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Risk Defaults
              </TabsTrigger>
              <TabsTrigger
                value="erp"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-6 py-3 rounded-lg font-medium text-sm"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                ERP Mapping
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
                      Vendor Type Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., DOM, IMP, SERVICE"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, no spaces)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Vendor Type Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Domestic Vendor, Import Vendor"
                      className="border-[#E6EEF2] h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Human-readable display name
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Description <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose and scope of this vendor type..."
                      className="border-[#E6EEF2] min-h-[100px]"
                      rows={4}
                      required
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

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Change Control Level
                    </Label>
                    <Select value={formData.changeControlLevel} onValueChange={(value) => setFormData({ ...formData, changeControlLevel: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Free Edit">Free Edit</SelectItem>
                        <SelectItem value="Approval Required">Approval Required</SelectItem>
                        <SelectItem value="Locked">Locked</SelectItem>
                      </SelectContent>
                    </Select>
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
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Onboarding Rules */}
            <TabsContent value="onboarding" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Onboarding Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Onboarding Mode
                    </Label>
                    <Select value={formData.onboardingMode} onValueChange={(value) => setFormData({ ...formData, onboardingMode: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self-Service">Self-Service</SelectItem>
                        <SelectItem value="Buyer-Assisted">Buyer-Assisted</SelectItem>
                        <SelectItem value="Both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Determines how vendors can initiate and complete onboarding
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Required Sections
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Tax & Compliance", "Banking", "Documents", "Entity Mapping", "Contracts"].map((section) => (
                        <button
                          key={section}
                          onClick={() => toggleRequiredSection(section)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.requiredSections.includes(section)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.requiredSections.includes(section) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {section}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select all sections that must be completed during onboarding
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Minimum Document Completeness (%)
                      </Label>
                      <Input
                        type="number"
                        value={formData.minDocumentCompleteness}
                        onChange={(e) => setFormData({ ...formData, minDocumentCompleteness: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Required document upload percentage to proceed
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Auto-Block if Compliance Fails
                      </Label>
                      <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                        <Switch
                          checked={formData.autoBlockIfComplianceFails}
                          onCheckedChange={(checked) => setFormData({ ...formData, autoBlockIfComplianceFails: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          {formData.autoBlockIfComplianceFails ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-2">
                        Automatically block vendor if compliance validation fails
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Approvals & SLA */}
            <TabsContent value="approvals" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Approval & SLA Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Workflow Type
                    </Label>
                    <Select value={formData.defaultWorkflowType} onValueChange={(value) => setFormData({ ...formData, defaultWorkflowType: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard 3-Tier">Standard 3-Tier</SelectItem>
                        <SelectItem value="Fast Track">Fast Track</SelectItem>
                        <SelectItem value="Enhanced Due Diligence">Enhanced Due Diligence</SelectItem>
                        <SelectItem value="Executive Review">Executive Review</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Default approval workflow for this vendor type
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Mandatory Approval Departments
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Procurement", "Finance", "Legal", "Compliance", "IT Security", "Risk Management"].map((dept) => (
                        <button
                          key={dept}
                          onClick={() => toggleMandatoryDepartment(dept)}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.mandatoryApprovalDepartments.includes(dept)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.mandatoryApprovalDepartments.includes(dept) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {dept}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select departments that must approve vendor requests
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Parallel Approval Allowed
                      </Label>
                      <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                        <Switch
                          checked={formData.parallelApprovalAllowed}
                          onCheckedChange={(checked) => setFormData({ ...formData, parallelApprovalAllowed: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          {formData.parallelApprovalAllowed ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-2">
                        Allow multiple departments to approve simultaneously
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        SLA Class
                      </Label>
                      <Select value={formData.slaClass} onValueChange={(value) => setFormData({ ...formData, slaClass: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Express - 2 Business Days">Express - 2 Business Days</SelectItem>
                          <SelectItem value="Standard - 5 Business Days">Standard - 5 Business Days</SelectItem>
                          <SelectItem value="Extended - 10 Business Days">Extended - 10 Business Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Escalation After (Days)
                      </Label>
                      <Input
                        type="number"
                        value={formData.escalationAfter}
                        onChange={(e) => setFormData({ ...formData, escalationAfter: parseInt(e.target.value) || 0 })}
                        min="0"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Auto-escalate if not approved within specified days
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Compliance Requirements */}
            <TabsContent value="compliance" className="space-y-6">
              {/* Tax Identifiers */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Required Tax Identifiers</h2>
                  </div>
                  <Button
                    onClick={addTaxIdentifier}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tax Identifier
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.taxIdentifiers.map((item) => (
                    <div key={item.id} className="p-6 bg-[#F6F9FC] rounded-xl border border-[#E6EEF2]">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Tax Identifier Type
                          </Label>
                          <Input
                            value={item.type}
                            onChange={(e) => updateTaxIdentifier(item.id, "type", e.target.value)}
                            placeholder="e.g., PAN, GST, VAT"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Country Scope
                          </Label>
                          <Input
                            value={item.country}
                            onChange={(e) => updateTaxIdentifier(item.id, "country", e.target.value)}
                            placeholder="e.g., India, USA"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Mandatory
                          </Label>
                          <div className="flex items-center h-10">
                            <Switch
                              checked={item.mandatory}
                              onCheckedChange={(checked) => updateTaxIdentifier(item.id, "mandatory", checked)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Auto-Verify
                          </Label>
                          <div className="flex items-center h-10">
                            <Switch
                              checked={item.autoVerify}
                              onCheckedChange={(checked) => updateTaxIdentifier(item.id, "autoVerify", checked)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2 flex items-end">
                          <Button
                            variant="ghost"
                            onClick={() => removeTaxIdentifier(item.id)}
                            className="h-10 w-full text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.taxIdentifiers.length === 0 && (
                    <div className="text-center py-12 text-[#64748B]">
                      <FileCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No tax identifiers configured yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Requirements */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Required Documents</h2>
                  </div>
                  <Button
                    onClick={addDocumentRequirement}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Document
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.documentRequirements.map((item) => (
                    <div key={item.id} className="p-6 bg-[#F6F9FC] rounded-xl border border-[#E6EEF2]">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Document Type
                          </Label>
                          <Input
                            value={item.documentType}
                            onChange={(e) => updateDocumentRequirement(item.id, "documentType", e.target.value)}
                            placeholder="e.g., Certificate"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Mandatory
                          </Label>
                          <div className="flex items-center h-10">
                            <Switch
                              checked={item.mandatory}
                              onCheckedChange={(checked) => updateDocumentRequirement(item.id, "mandatory", checked)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Expiry Required
                          </Label>
                          <div className="flex items-center h-10">
                            <Switch
                              checked={item.expiryRequired}
                              onCheckedChange={(checked) => updateDocumentRequirement(item.id, "expiryRequired", checked)}
                            />
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Reminder Days
                          </Label>
                          <Input
                            type="number"
                            value={item.reminderDays}
                            onChange={(e) => updateDocumentRequirement(item.id, "reminderDays", parseInt(e.target.value) || 0)}
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Risk Impact
                          </Label>
                          <Select
                            value={item.riskImpact}
                            onValueChange={(value: "Low" | "Medium" | "High") => updateDocumentRequirement(item.id, "riskImpact", value)}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            onClick={() => removeDocumentRequirement(item.id)}
                            className="h-10 w-full text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.documentRequirements.length === 0 && (
                    <div className="text-center py-12 text-[#64748B]">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No document requirements configured yet</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: Risk Defaults */}
            <TabsContent value="risk" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Risk Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Base Risk Weight
                      </Label>
                      <Input
                        type="number"
                        value={formData.baseRiskWeight}
                        onChange={(e) => setFormData({ ...formData, baseRiskWeight: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Base risk score (0-100) for this vendor type
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Risk Category
                      </Label>
                      <Select value={formData.riskCategory} onValueChange={(value) => setFormData({ ...formData, riskCategory: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Enhanced Due Diligence Required
                      </Label>
                      <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                        <Switch
                          checked={formData.enhancedDueDiligenceRequired}
                          onCheckedChange={(checked) => setFormData({ ...formData, enhancedDueDiligenceRequired: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          {formData.enhancedDueDiligenceRequired ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mt-2">
                        Trigger enhanced verification process
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        EDD Threshold
                      </Label>
                      <Input
                        type="number"
                        value={formData.eddThreshold}
                        onChange={(e) => setFormData({ ...formData, eddThreshold: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Risk score threshold to trigger EDD
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factor Overrides */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Risk Factor Overrides</h2>
                  </div>
                  <Button
                    onClick={addRiskFactorOverride}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Override
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.riskFactorOverrides.map((item) => (
                    <div key={item.id} className="p-6 bg-[#F6F9FC] rounded-xl border border-[#E6EEF2]">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-4">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Risk Factor
                          </Label>
                          <Input
                            value={item.riskFactor}
                            onChange={(e) => updateRiskFactorOverride(item.id, "riskFactor", e.target.value)}
                            placeholder="e.g., Country Risk"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Weight Override
                          </Label>
                          <Input
                            type="number"
                            value={item.weightOverride}
                            onChange={(e) => updateRiskFactorOverride(item.id, "weightOverride", parseInt(e.target.value) || 0)}
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-5">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Condition
                          </Label>
                          <Input
                            value={item.condition}
                            onChange={(e) => updateRiskFactorOverride(item.id, "condition", e.target.value)}
                            placeholder="e.g., If country = High Risk"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            onClick={() => removeRiskFactorOverride(item.id)}
                            className="h-10 w-full text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.riskFactorOverrides.length === 0 && (
                    <div className="text-center py-12 text-[#64748B]">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No risk factor overrides configured</p>
                      <p className="text-xs mt-2">Add overrides to customize risk calculation for specific conditions</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: ERP Mapping */}
            <TabsContent value="erp" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">ERP System Mappings</h2>
                  </div>
                  <Button
                    onClick={addERPMapping}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mapping
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.erpMappings.map((item) => (
                    <div key={item.id} className="p-6 bg-[#F6F9FC] rounded-xl border border-[#E6EEF2]">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            ERP System
                          </Label>
                          <Select
                            value={item.erpSystem}
                            onValueChange={(value) => updateERPMapping(item.id, "erpSystem", value)}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10">
                              <SelectValue placeholder="Select ERP" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAP S/4HANA">SAP S/4HANA</SelectItem>
                              <SelectItem value="Oracle Fusion">Oracle Fusion</SelectItem>
                              <SelectItem value="Microsoft Dynamics">Microsoft Dynamics</SelectItem>
                              <SelectItem value="NetSuite">NetSuite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            ERP Vendor Type Code
                          </Label>
                          <Input
                            value={item.erpVendorTypeCode}
                            onChange={(e) => updateERPMapping(item.id, "erpVendorTypeCode", e.target.value)}
                            placeholder="e.g., DOM"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            ERP Account Group
                          </Label>
                          <Input
                            value={item.erpAccountGroup}
                            onChange={(e) => updateERPMapping(item.id, "erpAccountGroup", e.target.value)}
                            placeholder="e.g., VG01"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Auto Sync On Activation
                          </Label>
                          <div className="flex items-center h-10">
                            <Switch
                              checked={item.autoSyncOnActivation}
                              onCheckedChange={(checked) => updateERPMapping(item.id, "autoSyncOnActivation", checked)}
                            />
                            <span className="text-xs text-[#64748B] ml-3">
                              {item.autoSyncOnActivation ? "Enabled" : "Disabled"}
                            </span>
                          </div>
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            onClick={() => removeERPMapping(item.id)}
                            className="h-10 w-full text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.erpMappings.length === 0 && (
                    <div className="text-center py-12 text-[#64748B]">
                      <LinkIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No ERP mappings configured yet</p>
                      <p className="text-xs mt-2">Add mappings to sync vendor types with external ERP systems</p>
                    </div>
                  )}
                </div>

                <div className="mt-8 p-6 bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl">
                  <div className="flex items-start gap-4">
                    <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[#0A0F14] mb-2">ERP Integration Notes</h3>
                      <ul className="text-sm text-[#64748B] space-y-1">
                        <li>• Mappings define how this vendor type syncs to external ERP systems</li>
                        <li>• ERP codes must match exactly with target system configuration</li>
                        <li>• Auto-sync pushes vendor type changes to ERP in real-time</li>
                      </ul>
                    </div>
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
