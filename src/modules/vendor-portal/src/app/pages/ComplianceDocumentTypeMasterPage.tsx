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
  Clock,
  FileCheck,
  Lock,
  Target,
  Upload,
  AlertTriangle,
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
  documentGroup: string;
  status: string;
  effectiveFrom: string;
  effectiveTo: string;
  
  // Applicability
  applicableCategories: string[];
  applicableVendorTypes: string[];
  applicableCountries: string[];
  applicableEntities: string[];
  
  // Requirement Rules
  mandatoryRuleType: string;
  conditionalCountry: string;
  conditionalCategory: string;
  conditionalVendorType: string;
  conditionalRiskCategory: string;
  minCompletenessContribution: number;
  
  // Expiry & Renewal
  expiryRequired: boolean;
  expiryCapture: string;
  renewalReminderDays: number;
  gracePeriodDays: number;
  autoBlockIfExpired: boolean;
  periodicRevalidation: string;
  
  // File Constraints
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  maxFilesAllowed: number;
  storageClass: string;
  encryptionRequired: boolean;
  
  // Validation & Review
  validationMode: string;
  validationSource: string;
  reviewerRole: string;
  autoFlagOnMismatch: boolean;
  
  // Risk & Actions
  riskImpactIfMissing: string;
  riskImpactIfExpired: string;
  defaultAction: string;
  exceptionApprovalRole: string;
  
  // Governance
  changeControlLevel: string;
  version: string;
  reasonForChange: string;
}

export function ComplianceDocumentTypeMasterPage() {
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
    documentGroup: "Legal",
    status: "Active",
    effectiveFrom: "",
    effectiveTo: "",
    
    // Applicability
    applicableCategories: ["All Categories"],
    applicableVendorTypes: ["Domestic", "Import"],
    applicableCountries: ["All Countries"],
    applicableEntities: ["All Entities"],
    
    // Requirement Rules
    mandatoryRuleType: "Always Mandatory",
    conditionalCountry: "",
    conditionalCategory: "",
    conditionalVendorType: "",
    conditionalRiskCategory: "",
    minCompletenessContribution: 10,
    
    // Expiry & Renewal
    expiryRequired: true,
    expiryCapture: "Expiry Date Only",
    renewalReminderDays: 30,
    gracePeriodDays: 7,
    autoBlockIfExpired: true,
    periodicRevalidation: "Annual",
    
    // File Constraints
    allowedFileTypes: ["PDF", "JPG"],
    maxFileSizeMB: 10,
    maxFilesAllowed: 5,
    storageClass: "Standard",
    encryptionRequired: false,
    
    // Validation & Review
    validationMode: "Manual Review",
    validationSource: "KYC Validation Source",
    reviewerRole: "Compliance Officer",
    autoFlagOnMismatch: true,
    
    // Risk & Actions
    riskImpactIfMissing: "High",
    riskImpactIfExpired: "Medium",
    defaultAction: "Block submission",
    exceptionApprovalRole: "VP Compliance",
    
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
      navigate("/masters/compliance-doc");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/compliance-doc");
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

  const getRiskColor = (risk: string) => {
    switch (risk) {
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
                <Link to="/masters/compliance-doc" className="hover:text-[#00A9B7]">
                  Compliance Document Types
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Compliance Document Type</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Define document requirements, expiry rules, validation, and risk actions for vendor onboarding and changes.
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
                value="applicability"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Target className="w-4 h-4 mr-2" />
                Applicability
              </TabsTrigger>
              <TabsTrigger
                value="requirements"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Requirements
              </TabsTrigger>
              <TabsTrigger
                value="expiry"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Expiry
              </TabsTrigger>
              <TabsTrigger
                value="files"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger
                value="validation"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <FileCheck className="w-4 h-4 mr-2" />
                Validation
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Risk
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
                      Document Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., DOC-PAN, DOC-GST, DOC-INC"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, recommended format: DOC-XXX)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Document Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., PAN Card, GST Certificate"
                      className="border-[#E6EEF2] h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Human-readable document name
                    </p>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Description <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe the purpose, content requirements, and acceptance criteria for this document..."
                      className="border-[#E6EEF2] min-h-[120px]"
                      rows={5}
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Provide clear guidance on what this document should contain
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Document Group
                    </Label>
                    <Select value={formData.documentGroup} onValueChange={(value) => setFormData({ ...formData, documentGroup: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Tax">Tax</SelectItem>
                        <SelectItem value="Banking">Banking</SelectItem>
                        <SelectItem value="Compliance">Compliance</SelectItem>
                        <SelectItem value="Quality-ISO">Quality / ISO</SelectItem>
                        <SelectItem value="Contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Primary document classification
                    </p>
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

            {/* Tab 2: Applicability */}
            <TabsContent value="applicability" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Applicability Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applicable Vendor Categories
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Categories", "Raw Materials", "IT Services", "Consulting", "Logistics", "Manufacturing"].map((category) => (
                        <button
                          key={category}
                          onClick={() => setFormData({ ...formData, applicableCategories: toggleItem(formData.applicableCategories, category) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.applicableCategories.includes(category)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.applicableCategories.includes(category) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {category}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select vendor categories that require this document
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applicable Vendor Types
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Types", "Domestic", "Import", "SEZ", "MSME", "Government"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, applicableVendorTypes: toggleItem(formData.applicableVendorTypes, type) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.applicableVendorTypes.includes(type)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.applicableVendorTypes.includes(type) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select vendor types that require this document
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applicable Countries
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Countries", "India", "United States", "United Kingdom", "China", "High Risk Countries"].map((country) => (
                        <button
                          key={country}
                          onClick={() => setFormData({ ...formData, applicableCountries: toggleItem(formData.applicableCountries, country) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.applicableCountries.includes(country)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.applicableCountries.includes(country) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {country}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select countries or regions where this document is required
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Applicable Entities
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Entities", "Manufacturing Division", "Services Division", "Retail Division", "Export Division"].map((entity) => (
                        <button
                          key={entity}
                          onClick={() => setFormData({ ...formData, applicableEntities: toggleItem(formData.applicableEntities, entity) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.applicableEntities.includes(entity)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.applicableEntities.includes(entity) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {entity}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select organizational entities that require this document
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Requirement Rules */}
            <TabsContent value="requirements" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Requirement Rules Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Mandatory Rule Type
                    </Label>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { value: "Always Mandatory", label: "Always Mandatory", desc: "Required for all vendors", icon: "✓" },
                        { value: "Conditional", label: "Conditional", desc: "Required based on conditions", icon: "?" },
                        { value: "Optional", label: "Optional", desc: "Not mandatory", icon: "○" }
                      ].map((rule) => (
                        <button
                          key={rule.value}
                          onClick={() => setFormData({ ...formData, mandatoryRuleType: rule.value })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.mandatoryRuleType === rule.value
                              ? "border-[#00A9B7] bg-[#E0F5F7]"
                              : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          <div className="text-2xl mb-2">{rule.icon}</div>
                          <div className="font-medium text-[#0A0F14] mb-1">{rule.label}</div>
                          <div className="text-xs text-[#64748B]">{rule.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.mandatoryRuleType === "Conditional" && (
                    <div className="p-6 bg-[#FFF7ED] border border-[#F59E0B]/20 rounded-xl">
                      <div className="flex items-center gap-3 mb-4">
                        <Info className="w-5 h-5 text-[#F59E0B]" />
                        <h3 className="font-semibold text-[#0A0F14]">Conditional Requirement Builder</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                            If Country is
                          </Label>
                          <Select value={formData.conditionalCountry} onValueChange={(value) => setFormData({ ...formData, conditionalCountry: value })}>
                            <SelectTrigger className="border-[#E6EEF2] h-12 bg-white">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="India">India</SelectItem>
                              <SelectItem value="USA">United States</SelectItem>
                              <SelectItem value="UK">United Kingdom</SelectItem>
                              <SelectItem value="High-Risk">High Risk Countries</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                            And Vendor Category is
                          </Label>
                          <Select value={formData.conditionalCategory} onValueChange={(value) => setFormData({ ...formData, conditionalCategory: value })}>
                            <SelectTrigger className="border-[#E6EEF2] h-12 bg-white">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                              <SelectItem value="IT Services">IT Services</SelectItem>
                              <SelectItem value="Consulting">Consulting</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                            And Vendor Type is
                          </Label>
                          <Select value={formData.conditionalVendorType} onValueChange={(value) => setFormData({ ...formData, conditionalVendorType: value })}>
                            <SelectTrigger className="border-[#E6EEF2] h-12 bg-white">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Domestic">Domestic</SelectItem>
                              <SelectItem value="Import">Import</SelectItem>
                              <SelectItem value="SEZ">SEZ</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                            And Risk Category is
                          </Label>
                          <Select value={formData.conditionalRiskCategory} onValueChange={(value) => setFormData({ ...formData, conditionalRiskCategory: value })}>
                            <SelectTrigger className="border-[#E6EEF2] h-12 bg-white">
                              <SelectValue placeholder="Select risk" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Low">Low</SelectItem>
                              <SelectItem value="Medium">Medium</SelectItem>
                              <SelectItem value="High">High</SelectItem>
                              <SelectItem value="Critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="text-xs text-[#64748B] mt-4">
                        Document is mandatory when any of the selected conditions are met
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Minimum Completeness Contribution (%)
                    </Label>
                    <div className="flex items-center gap-4 max-w-md">
                      <Input
                        type="number"
                        value={formData.minCompletenessContribution}
                        onChange={(e) => setFormData({ ...formData, minCompletenessContribution: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                        min="0"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <span className="text-sm text-[#64748B]">%</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Weight of this document towards overall onboarding completeness score
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Expiry & Renewal */}
            <TabsContent value="expiry" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Expiry & Renewal Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Expiry Required
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.expiryRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, expiryRequired: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.expiryRequired ? "Required" : "Not Required"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Does this document have an expiry date?
                        </span>
                      </div>
                    </div>
                  </div>

                  {formData.expiryRequired && (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Expiry Capture
                        </Label>
                        <Select value={formData.expiryCapture} onValueChange={(value) => setFormData({ ...formData, expiryCapture: value })}>
                          <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Expiry Date Only">Expiry Date Only</SelectItem>
                            <SelectItem value="Issue + Expiry Date">Issue Date + Expiry Date</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[#64748B] mt-2">
                          What date information should be captured?
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                            Renewal Reminder Days
                          </Label>
                          <Select value={formData.renewalReminderDays.toString()} onValueChange={(value) => setFormData({ ...formData, renewalReminderDays: parseInt(value) })}>
                            <SelectTrigger className="border-[#E6EEF2] h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="30">30 days before</SelectItem>
                              <SelectItem value="60">60 days before</SelectItem>
                              <SelectItem value="90">90 days before</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-[#64748B] mt-2">
                            Send reminder notification before expiry
                          </p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                            Grace Period Days
                          </Label>
                          <Input
                            type="number"
                            value={formData.gracePeriodDays}
                            onChange={(e) => setFormData({ ...formData, gracePeriodDays: parseInt(e.target.value) || 0 })}
                            min="0"
                            className="border-[#E6EEF2] h-12"
                          />
                          <p className="text-xs text-[#64748B] mt-2">
                            Grace period after expiry before action
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Auto-block if Expired
                        </Label>
                        <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                          <Switch
                            checked={formData.autoBlockIfExpired}
                            onCheckedChange={(checked) => setFormData({ ...formData, autoBlockIfExpired: checked })}
                          />
                          <div className="flex-1">
                            <span className="text-sm text-[#0A0F14] font-medium block">
                              {formData.autoBlockIfExpired ? "Enabled" : "Disabled"}
                            </span>
                            <span className="text-xs text-[#64748B]">
                              Automatically block vendor when document expires
                            </span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Periodic Revalidation
                        </Label>
                        <Select value={formData.periodicRevalidation} onValueChange={(value) => setFormData({ ...formData, periodicRevalidation: value })}>
                          <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="None">None</SelectItem>
                            <SelectItem value="Annual">Annual</SelectItem>
                            <SelectItem value="Every 2 years">Every 2 Years</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-[#64748B] mt-2">
                          Require document revalidation on schedule
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 5: File Constraints */}
            <TabsContent value="files" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">File Constraints Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Allowed File Types
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["PDF", "JPG", "PNG", "DOCX", "XLSX"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, allowedFileTypes: toggleItem(formData.allowedFileTypes, type) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.allowedFileTypes.includes(type)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.allowedFileTypes.includes(type) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select acceptable file formats for this document
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Max File Size (MB)
                      </Label>
                      <Input
                        type="number"
                        value={formData.maxFileSizeMB}
                        onChange={(e) => setFormData({ ...formData, maxFileSizeMB: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Maximum size per file in megabytes
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Max Files Allowed
                      </Label>
                      <Input
                        type="number"
                        value={formData.maxFilesAllowed}
                        onChange={(e) => setFormData({ ...formData, maxFilesAllowed: parseInt(e.target.value) || 0 })}
                        min="1"
                        max="20"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Maximum number of files that can be uploaded
                      </p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Storage Class
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { value: "Standard", label: "Standard", desc: "Regular storage" },
                        { value: "Restricted-PII", label: "Restricted (PII)", desc: "Contains personal data" }
                      ].map((storage) => (
                        <button
                          key={storage.value}
                          onClick={() => setFormData({ ...formData, storageClass: storage.value })}
                          className={`p-4 rounded-lg border-2 transition-all text-left ${
                            formData.storageClass === storage.value
                              ? "border-[#00A9B7] bg-[#E0F5F7]"
                              : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          <div className="font-medium text-[#0A0F14] mb-1">{storage.label}</div>
                          <div className="text-xs text-[#64748B]">{storage.desc}</div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Classification for data protection and compliance
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Encryption Required
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.encryptionRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, encryptionRequired: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.encryptionRequired ? "Required" : "Not Required"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Encrypt files at rest and in transit
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Validation & Review */}
            <TabsContent value="validation" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Validation & Review Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Validation Mode
                    </Label>
                    <Select value={formData.validationMode} onValueChange={(value) => setFormData({ ...formData, validationMode: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manual Review">Manual Review</SelectItem>
                        <SelectItem value="API Auto-Validation">API Auto-Validation</SelectItem>
                        <SelectItem value="Hybrid">Hybrid (API + Manual)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      How should this document be validated?
                    </p>
                  </div>

                  {formData.validationMode !== "Manual Review" && (
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Validation Source
                      </Label>
                      <Select value={formData.validationSource} onValueChange={(value) => setFormData({ ...formData, validationSource: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="KYC Validation Source">KYC Validation Source</SelectItem>
                          <SelectItem value="Government Registry API">Government Registry API</SelectItem>
                          <SelectItem value="Third-party Verification">Third-party Verification</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-2">
                        External system for automated validation
                      </p>
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Reviewer Role
                    </Label>
                    <Select value={formData.reviewerRole} onValueChange={(value) => setFormData({ ...formData, reviewerRole: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Compliance Officer">Compliance Officer</SelectItem>
                        <SelectItem value="Risk Manager">Risk Manager</SelectItem>
                        <SelectItem value="Category Manager">Category Manager</SelectItem>
                        <SelectItem value="Legal Team">Legal Team</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Who should review and approve this document?
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Auto-flag on Mismatch
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.autoFlagOnMismatch}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoFlagOnMismatch: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.autoFlagOnMismatch ? "Enabled" : "Disabled"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Automatically flag document when validation fails
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Risk & Actions */}
            <TabsContent value="risk" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Risk & Actions Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Risk Impact if Missing
                    </Label>
                    <div className="grid grid-cols-4 gap-3">
                      {["Low", "Medium", "High", "Critical"].map((risk) => (
                        <button
                          key={risk}
                          onClick={() => setFormData({ ...formData, riskImpactIfMissing: risk })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.riskImpactIfMissing === risk
                              ? getRiskColor(risk)
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {risk}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Risk severity when this document is not provided
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Risk Impact if Expired
                    </Label>
                    <div className="grid grid-cols-4 gap-3">
                      {["Low", "Medium", "High", "Critical"].map((risk) => (
                        <button
                          key={risk}
                          onClick={() => setFormData({ ...formData, riskImpactIfExpired: risk })}
                          className={`px-4 py-3 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.riskImpactIfExpired === risk
                              ? getRiskColor(risk)
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {risk}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Risk severity when this document has expired
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Action
                    </Label>
                    <Select value={formData.defaultAction} onValueChange={(value) => setFormData({ ...formData, defaultAction: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Block submission">Block Submission</SelectItem>
                        <SelectItem value="Request clarification">Request Clarification</SelectItem>
                        <SelectItem value="Allow with exception approval">Allow with Exception Approval</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Action taken when document is missing or invalid
                    </p>
                  </div>

                  {formData.defaultAction === "Allow with exception approval" && (
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Exception Approval Role
                      </Label>
                      <Select value={formData.exceptionApprovalRole} onValueChange={(value) => setFormData({ ...formData, exceptionApprovalRole: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VP Compliance">VP Compliance</SelectItem>
                          <SelectItem value="Chief Risk Officer">Chief Risk Officer</SelectItem>
                          <SelectItem value="General Counsel">General Counsel</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-[#64748B] mt-2">
                        Who can approve exceptions for this document?
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Risk Summary */}
              <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-[#0A0F14] mb-2">Risk Configuration Summary</h3>
                    <div className="text-sm text-[#64748B] space-y-1">
                      <p>• If document is <strong>missing</strong>: <span className="font-semibold text-[#0A0F14]">{formData.riskImpactIfMissing} risk</span></p>
                      <p>• If document is <strong>expired</strong>: <span className="font-semibold text-[#0A0F14]">{formData.riskImpactIfExpired} risk</span></p>
                      <p>• Default action: <strong>{formData.defaultAction}</strong></p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 8: Governance */}
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
                        {isEditMode ? "Modified: 2026-02-19 15:45" : "New Record"}
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
                        placeholder="Provide a clear explanation for why this approved/active document type is being modified..."
                        className="border-[#E6EEF2] min-h-[100px]"
                        rows={4}
                        required
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Required when editing approved or active document types
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
                      <li>• Document types directly control vendor onboarding requirements</li>
                      <li>• Changes to active types may affect in-progress vendor requests</li>
                      <li>• All modifications are logged and subject to audit review</li>
                      <li>• Deletion is not permitted; use "Inactive" status to disable</li>
                      {formData.changeControlLevel === "Locked" && (
                        <li className="text-[#DC2626]">• <strong>This document type is locked</strong> and cannot be modified without admin override</li>
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
