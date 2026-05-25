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
  Zap,
  Link as LinkIcon,
  Globe,
  DollarSign,
  Tag,
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
}

interface RiskOverride {
  id: string;
  riskFactor: string;
  weight: number;
  appliesWhen: string;
  action: string;
}

interface ERPMapping {
  id: string;
  erpSystem: string;
  erpSupplierClass: string;
  erpAccountGroup: string;
  paymentTermsCode: string;
  withholdingCode: string;
}

interface FormData {
  // Basics
  code: string;
  name: string;
  description: string;
  categoryGroup: string;
  spendType: string;
  tags: string[];
  effectiveFrom: string;
  effectiveTo: string;
  status: string;
  changeControlLevel: string;
  
  // Scope & Applicability
  allowedVendorTypes: string[];
  geographyScope: string;
  allowedCountries: string[];
  entityApplicability: string[];
  
  // Onboarding Requirements
  onboardingModeAllowed: string;
  requiredSections: string[];
  minCompleteness: number;
  defaultChecklistTemplate: string;
  autoRequestClarification: boolean;
  
  // Compliance Defaults
  taxIdentifiers: TaxIdentifier[];
  documentRequirements: DocumentRequirement[];
  sanctionsScreeningRequired: boolean;
  kycValidationRequired: boolean;
  autoBlockExpiredDocs: boolean;
  periodicComplianceReviewCycle: string;
  
  // Risk Defaults
  defaultRiskCategory: string;
  baseRiskWeight: number;
  riskModel: string;
  eddRequired: boolean;
  eddThreshold: number;
  riskOverrides: RiskOverride[];
  
  // Approvals & SLA
  defaultOnboardingWorkflow: string;
  mandatoryApprovalDepartments: string[];
  approvalMode: string;
  slaClass: string;
  escalationRule: string;
  
  // Finance Defaults
  defaultPaymentTerms: string;
  allowedPaymentMethods: string[];
  defaultCurrency: string;
  multiCurrencyAllowed: boolean;
  withholdingTdsApplicable: boolean;
  defaultWithholdingCategory: string;
  lowerTdsAllowed: boolean;
  lowerTdsRequiresApproval: boolean;
  
  // ERP Mapping
  erpMappings: ERPMapping[];
  syncPolicy: string;
}

export function VendorCategoryMasterPage() {
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
    categoryGroup: "Goods",
    spendType: "Direct",
    tags: [],
    effectiveFrom: "",
    effectiveTo: "",
    status: "Active",
    changeControlLevel: "Approval Required",
    
    // Scope & Applicability
    allowedVendorTypes: ["Domestic", "Import"],
    geographyScope: "Both",
    allowedCountries: ["India", "United States"],
    entityApplicability: ["All Entities"],
    
    // Onboarding Requirements
    onboardingModeAllowed: "Both",
    requiredSections: ["Tax & Compliance", "Banking", "Documents"],
    minCompleteness: 85,
    defaultChecklistTemplate: "Standard Category Checklist",
    autoRequestClarification: true,
    
    // Compliance Defaults
    taxIdentifiers: [
      { id: "1", type: "PAN", mandatory: true, country: "India", autoVerify: true },
      { id: "2", type: "GST Number", mandatory: true, country: "India", autoVerify: true },
    ],
    documentRequirements: [
      { id: "1", documentType: "Certificate of Incorporation", mandatory: true, expiryRequired: false, reminderDays: 0 },
      { id: "2", documentType: "Bank Statement", mandatory: false, expiryRequired: true, reminderDays: 30 },
    ],
    sanctionsScreeningRequired: true,
    kycValidationRequired: true,
    autoBlockExpiredDocs: true,
    periodicComplianceReviewCycle: "Quarterly",
    
    // Risk Defaults
    defaultRiskCategory: "Medium",
    baseRiskWeight: 50,
    riskModel: "Standard Risk Model v2.0",
    eddRequired: false,
    eddThreshold: 70,
    riskOverrides: [],
    
    // Approvals & SLA
    defaultOnboardingWorkflow: "Standard 3-Tier",
    mandatoryApprovalDepartments: ["Procurement", "Finance"],
    approvalMode: "Sequential",
    slaClass: "Standard - 5 Business Days",
    escalationRule: "Escalate to VP after 3 days",
    
    // Finance Defaults
    defaultPaymentTerms: "Net 30",
    allowedPaymentMethods: ["Wire Transfer", "ACH", "Check"],
    defaultCurrency: "INR",
    multiCurrencyAllowed: true,
    withholdingTdsApplicable: true,
    defaultWithholdingCategory: "TDS 194C",
    lowerTdsAllowed: true,
    lowerTdsRequiresApproval: true,
    
    // ERP Mapping
    erpMappings: [
      { id: "1", erpSystem: "SAP S/4HANA", erpSupplierClass: "MAT", erpAccountGroup: "VG01", paymentTermsCode: "NT30", withholdingCode: "IN01" },
    ],
    syncPolicy: "Auto",
  });

  const [newTag, setNewTag] = useState("");

  const handleSubmit = (saveType: "draft" | "submit") => {
    console.log("Submitting form:", { saveType, formData });
    if (saveType === "submit") {
      setFormStatus("under-review");
    }
    setTimeout(() => {
      navigate("/masters/vendor-category");
    }, 500);
  };

  const handleCancel = () => {
    navigate("/masters/vendor-category");
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
  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const toggleItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

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

  const addRiskOverride = () => {
    const newId = (formData.riskOverrides.length + 1).toString();
    setFormData({
      ...formData,
      riskOverrides: [...formData.riskOverrides, {
        id: newId,
        riskFactor: "",
        weight: 0,
        appliesWhen: "",
        action: "",
      }],
    });
  };

  const removeRiskOverride = (id: string) => {
    setFormData({
      ...formData,
      riskOverrides: formData.riskOverrides.filter(item => item.id !== id),
    });
  };

  const updateRiskOverride = (id: string, field: keyof RiskOverride, value: any) => {
    setFormData({
      ...formData,
      riskOverrides: formData.riskOverrides.map(item =>
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
        erpSupplierClass: "",
        erpAccountGroup: "",
        paymentTermsCode: "",
        withholdingCode: "",
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
                <Link to="/masters/vendor-category" className="hover:text-[#00A9B7]">
                  Vendor Category
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span className="text-[#0A0F14]">{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Vendor Category</h1>
              <p className="text-[#64748B] text-sm leading-relaxed max-w-3xl">
                Configure onboarding, compliance, workflow, risk, finance, and ERP mapping defaults for this vendor category.
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
                value="scope"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Globe className="w-4 h-4 mr-2" />
                Scope
              </TabsTrigger>
              <TabsTrigger
                value="onboarding"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Onboarding
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Shield className="w-4 h-4 mr-2" />
                Compliance
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Risk
              </TabsTrigger>
              <TabsTrigger
                value="approvals"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <Clock className="w-4 h-4 mr-2" />
                Approvals
              </TabsTrigger>
              <TabsTrigger
                value="finance"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Finance
              </TabsTrigger>
              <TabsTrigger
                value="erp"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-3 rounded-lg font-medium text-sm"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                ERP
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
                      Category Code <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g., RAW-MAT, IT-SVCS, CONSULT"
                      className="border-[#E6EEF2] font-mono h-12"
                      required
                    />
                    <p className="text-xs text-[#64748B] mt-2">
                      Unique identifier code (uppercase, no spaces)
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Category Name <span className="text-[#DC2626]">*</span>
                    </Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Raw Materials, IT Services"
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
                      placeholder="Describe the scope, purpose, and procurement guidelines for this category..."
                      className="border-[#E6EEF2] min-h-[100px]"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Category Group
                    </Label>
                    <Select value={formData.categoryGroup} onValueChange={(value) => setFormData({ ...formData, categoryGroup: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Goods">Goods</SelectItem>
                        <SelectItem value="Services">Services</SelectItem>
                        <SelectItem value="Logistics">Logistics</SelectItem>
                        <SelectItem value="Capex">Capex</SelectItem>
                        <SelectItem value="Opex">Opex</SelectItem>
                        <SelectItem value="Marketplace">Marketplace</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Spend Type
                    </Label>
                    <Select value={formData.spendType} onValueChange={(value) => setFormData({ ...formData, spendType: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direct">Direct</SelectItem>
                        <SelectItem value="Indirect">Indirect</SelectItem>
                        <SelectItem value="Capex">Capex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                      Tags
                    </Label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map((tag) => (
                        <div key={tag} className="inline-flex items-center gap-2 px-3 py-1 bg-[#E0F5F7] text-[#00A9B7] rounded-lg text-sm font-medium">
                          <Tag className="w-3 h-3" />
                          {tag}
                          <button onClick={() => removeTag(tag)} className="hover:text-[#DC2626]">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addTag()}
                        placeholder="Add tag (e.g., Critical, Regulated, High-Value)"
                        className="border-[#E6EEF2] h-10"
                      />
                      <Button onClick={addTag} variant="outline" className="h-10">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Add searchable tags for classification and filtering
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
                </div>
              </div>
            </TabsContent>

            {/* Tab 2: Scope & Applicability */}
            <TabsContent value="scope" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Scope & Applicability Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Allowed Vendor Types
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Domestic", "Import", "SEZ", "MSME", "Government", "Marketplace"].map((type) => (
                        <button
                          key={type}
                          onClick={() => setFormData({ ...formData, allowedVendorTypes: toggleItem(formData.allowedVendorTypes, type) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.allowedVendorTypes.includes(type)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.allowedVendorTypes.includes(type) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {type}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select which vendor types can be associated with this category
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Geography Scope
                    </Label>
                    <Select value={formData.geographyScope} onValueChange={(value) => setFormData({ ...formData, geographyScope: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Domestic">Domestic Only</SelectItem>
                        <SelectItem value="International">International Only</SelectItem>
                        <SelectItem value="Both">Both Domestic & International</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Define geographic reach for this category
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Allowed Countries
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["India", "United States", "United Kingdom", "Singapore", "UAE", "Germany", "China", "Japan"].map((country) => (
                        <button
                          key={country}
                          onClick={() => setFormData({ ...formData, allowedCountries: toggleItem(formData.allowedCountries, country) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.allowedCountries.includes(country)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.allowedCountries.includes(country) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {country}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select countries where vendors in this category can operate
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Entity Applicability
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["All Entities", "Manufacturing Division", "Services Division", "Retail Division", "Export Division"].map((entity) => (
                        <button
                          key={entity}
                          onClick={() => setFormData({ ...formData, entityApplicability: toggleItem(formData.entityApplicability, entity) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.entityApplicability.includes(entity)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.entityApplicability.includes(entity) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {entity}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-[#64748B] mt-2">
                      Select organizational entities that can use this category
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 3: Onboarding Requirements */}
            <TabsContent value="onboarding" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Onboarding Requirements Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Onboarding Mode Allowed
                    </Label>
                    <Select value={formData.onboardingModeAllowed} onValueChange={(value) => setFormData({ ...formData, onboardingModeAllowed: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Self-Service">Self-Service Only</SelectItem>
                        <SelectItem value="Buyer-Assisted">Buyer-Assisted Only</SelectItem>
                        <SelectItem value="Both">Both Modes Allowed</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-[#64748B] mt-2">
                      Determines how vendors in this category can onboard
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Required Sections
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Tax & Compliance", "Banking", "Documents", "Entity Mapping", "Contracts", "References", "Insurance"].map((section) => (
                        <button
                          key={section}
                          onClick={() => setFormData({ ...formData, requiredSections: toggleItem(formData.requiredSections, section) })}
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
                        Minimum Completeness (%)
                      </Label>
                      <Input
                        type="number"
                        value={formData.minCompleteness}
                        onChange={(e) => setFormData({ ...formData, minCompleteness: parseInt(e.target.value) || 0 })}
                        min="0"
                        max="100"
                        className="border-[#E6EEF2] h-12"
                      />
                      <p className="text-xs text-[#64748B] mt-2">
                        Required completion percentage to submit for approval
                      </p>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Default Checklist Template
                      </Label>
                      <Select value={formData.defaultChecklistTemplate} onValueChange={(value) => setFormData({ ...formData, defaultChecklistTemplate: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard Category Checklist">Standard Category Checklist</SelectItem>
                          <SelectItem value="Enhanced Due Diligence Checklist">Enhanced Due Diligence Checklist</SelectItem>
                          <SelectItem value="Quick Onboard Checklist">Quick Onboard Checklist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Auto-Request Clarification
                    </Label>
                    <div className="flex items-center gap-3 p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <Switch
                        checked={formData.autoRequestClarification}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoRequestClarification: checked })}
                      />
                      <div className="flex-1">
                        <span className="text-sm text-[#0A0F14] font-medium block">
                          {formData.autoRequestClarification ? "Enabled" : "Disabled"}
                        </span>
                        <span className="text-xs text-[#64748B]">
                          Automatically send clarification request for incomplete sections
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 4: Compliance Defaults */}
            <TabsContent value="compliance" className="space-y-6">
              {/* Tax Identifiers */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Tax Identifiers</h2>
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
                            Tax ID Type
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
                </div>
              </div>

              {/* Document Requirements */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Document Requirements</h2>
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
                        <div className="col-span-4">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Document Type
                          </Label>
                          <Input
                            value={item.documentType}
                            onChange={(e) => updateDocumentRequirement(item.id, "documentType", e.target.value)}
                            placeholder="e.g., License, Certificate"
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
                        <div className="col-span-2 flex items-end">
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
                </div>
              </div>

              {/* Compliance Toggles */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Compliance Controls</h2>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                    <div className="flex items-center gap-3 mb-2">
                      <Switch
                        checked={formData.sanctionsScreeningRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, sanctionsScreeningRequired: checked })}
                      />
                      <span className="text-sm text-[#0A0F14] font-medium">
                        Sanctions Screening Required
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] ml-11">
                      Automatically screen vendors against sanctions lists
                    </p>
                  </div>

                  <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                    <div className="flex items-center gap-3 mb-2">
                      <Switch
                        checked={formData.kycValidationRequired}
                        onCheckedChange={(checked) => setFormData({ ...formData, kycValidationRequired: checked })}
                      />
                      <span className="text-sm text-[#0A0F14] font-medium">
                        KYC Validation Required
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] ml-11">
                      Perform Know Your Customer validation checks
                    </p>
                  </div>

                  <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                    <div className="flex items-center gap-3 mb-2">
                      <Switch
                        checked={formData.autoBlockExpiredDocs}
                        onCheckedChange={(checked) => setFormData({ ...formData, autoBlockExpiredDocs: checked })}
                      />
                      <span className="text-sm text-[#0A0F14] font-medium">
                        Auto-Block When Docs Expired
                      </span>
                    </div>
                    <p className="text-xs text-[#64748B] ml-11">
                      Automatically block vendor when documents expire
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Periodic Compliance Review Cycle
                    </Label>
                    <Select value={formData.periodicComplianceReviewCycle} onValueChange={(value) => setFormData({ ...formData, periodicComplianceReviewCycle: value })}>
                      <SelectTrigger className="border-[#E6EEF2] h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Semi-Annual">Semi-Annual</SelectItem>
                        <SelectItem value="Annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Default Risk Category
                      </Label>
                      <Select value={formData.defaultRiskCategory} onValueChange={(value) => setFormData({ ...formData, defaultRiskCategory: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                          <SelectItem value="Critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

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
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Risk Model
                      </Label>
                      <Select value={formData.riskModel} onValueChange={(value) => setFormData({ ...formData, riskModel: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Standard Risk Model v2.0">Standard Risk Model v2.0</SelectItem>
                          <SelectItem value="Enhanced Risk Model">Enhanced Risk Model</SelectItem>
                          <SelectItem value="Simplified Risk Model">Simplified Risk Model</SelectItem>
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
                          checked={formData.eddRequired}
                          onCheckedChange={(checked) => setFormData({ ...formData, eddRequired: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          {formData.eddRequired ? "Enabled" : "Disabled"}
                        </span>
                      </div>
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

              {/* Risk Overrides */}
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                    <h2 className="text-xl font-bold text-[#0A0F14]">Risk Overrides</h2>
                  </div>
                  <Button
                    onClick={addRiskOverride}
                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white h-10"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Override
                  </Button>
                </div>

                <div className="space-y-4">
                  {formData.riskOverrides.map((item) => (
                    <div key={item.id} className="p-6 bg-[#F6F9FC] rounded-xl border border-[#E6EEF2]">
                      <div className="grid grid-cols-12 gap-4 items-start">
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Risk Factor
                          </Label>
                          <Input
                            value={item.riskFactor}
                            onChange={(e) => updateRiskOverride(item.id, "riskFactor", e.target.value)}
                            placeholder="e.g., Country Risk"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Weight
                          </Label>
                          <Input
                            type="number"
                            value={item.weight}
                            onChange={(e) => updateRiskOverride(item.id, "weight", parseInt(e.target.value) || 0)}
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Applies When
                          </Label>
                          <Input
                            value={item.appliesWhen}
                            onChange={(e) => updateRiskOverride(item.id, "appliesWhen", e.target.value)}
                            placeholder="Condition"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Action
                          </Label>
                          <Input
                            value={item.action}
                            onChange={(e) => updateRiskOverride(item.id, "action", e.target.value)}
                            placeholder="Action to take"
                            className="border-[#E6EEF2] h-10"
                          />
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            onClick={() => removeRiskOverride(item.id)}
                            className="h-10 w-full text-[#DC2626] hover:bg-[#DC2626]/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {formData.riskOverrides.length === 0 && (
                    <div className="text-center py-12 text-[#64748B]">
                      <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No risk overrides configured</p>
                      <p className="text-xs mt-2">Add overrides to customize risk calculation for specific conditions</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 6: Approvals & SLA */}
            <TabsContent value="approvals" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Approval & SLA Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Default Onboarding Workflow
                    </Label>
                    <Select value={formData.defaultOnboardingWorkflow} onValueChange={(value) => setFormData({ ...formData, defaultOnboardingWorkflow: value })}>
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
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Mandatory Approval Departments
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Procurement", "Finance", "Legal", "Compliance", "IT Security", "Risk Management", "Operations"].map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setFormData({ ...formData, mandatoryApprovalDepartments: toggleItem(formData.mandatoryApprovalDepartments, dept) })}
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
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Approval Mode
                      </Label>
                      <Select value={formData.approvalMode} onValueChange={(value) => setFormData({ ...formData, approvalMode: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Sequential">Sequential</SelectItem>
                          <SelectItem value="Parallel">Parallel</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        SLA Class
                      </Label>
                      <Select value={formData.slaClass} onValueChange={(value) => setFormData({ ...formData, slaClass: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Express - 2 Business Days">Express - 2 Days</SelectItem>
                          <SelectItem value="Standard - 5 Business Days">Standard - 5 Days</SelectItem>
                          <SelectItem value="Extended - 10 Business Days">Extended - 10 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Escalation Rule
                      </Label>
                      <Select value={formData.escalationRule} onValueChange={(value) => setFormData({ ...formData, escalationRule: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Escalate to VP after 3 days">Escalate to VP after 3 days</SelectItem>
                          <SelectItem value="Escalate to Director after 2 days">Escalate to Director after 2 days</SelectItem>
                          <SelectItem value="No auto-escalation">No auto-escalation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tab 7: Finance Defaults */}
            <TabsContent value="finance" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Finance & Payment Configuration</h2>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Default Payment Terms
                      </Label>
                      <Select value={formData.defaultPaymentTerms} onValueChange={(value) => setFormData({ ...formData, defaultPaymentTerms: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Net 30">Net 30</SelectItem>
                          <SelectItem value="Net 60">Net 60</SelectItem>
                          <SelectItem value="Net 90">Net 90</SelectItem>
                          <SelectItem value="Immediate">Immediate</SelectItem>
                          <SelectItem value="Advance">Advance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                        Default Currency
                      </Label>
                      <Select value={formData.defaultCurrency} onValueChange={(value) => setFormData({ ...formData, defaultCurrency: value })}>
                        <SelectTrigger className="border-[#E6EEF2] h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                      Allowed Payment Methods
                    </Label>
                    <div className="flex flex-wrap gap-3">
                      {["Wire Transfer", "ACH", "Check", "Credit Card", "PayPal", "Letter of Credit", "Cash"].map((method) => (
                        <button
                          key={method}
                          onClick={() => setFormData({ ...formData, allowedPaymentMethods: toggleItem(formData.allowedPaymentMethods, method) })}
                          className={`px-4 py-2 rounded-lg border-2 transition-all font-medium text-sm ${
                            formData.allowedPaymentMethods.includes(method)
                              ? "border-[#00A9B7] bg-[#E0F5F7] text-[#00A9B7]"
                              : "border-[#E6EEF2] text-[#64748B] hover:border-[#00A9B7]/30"
                          }`}
                        >
                          {formData.allowedPaymentMethods.includes(method) && (
                            <CheckCircle className="w-4 h-4 inline mr-2" />
                          )}
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <div className="flex items-center gap-3 mb-2">
                        <Switch
                          checked={formData.multiCurrencyAllowed}
                          onCheckedChange={(checked) => setFormData({ ...formData, multiCurrencyAllowed: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          Multi-Currency Allowed
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] ml-11">
                        Allow vendors to transact in multiple currencies
                      </p>
                    </div>

                    <div className="p-4 bg-[#F6F9FC] rounded-lg border border-[#E6EEF2]">
                      <div className="flex items-center gap-3 mb-2">
                        <Switch
                          checked={formData.withholdingTdsApplicable}
                          onCheckedChange={(checked) => setFormData({ ...formData, withholdingTdsApplicable: checked })}
                        />
                        <span className="text-sm text-[#0A0F14] font-medium">
                          Withholding/TDS Applicable
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] ml-11">
                        Apply tax deduction at source for this category
                      </p>
                    </div>
                  </div>

                  {formData.withholdingTdsApplicable && (
                    <div className="grid grid-cols-3 gap-6 p-6 bg-[#FFF7ED] rounded-xl border border-[#F59E0B]/20">
                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Default Withholding Category
                        </Label>
                        <Select value={formData.defaultWithholdingCategory} onValueChange={(value) => setFormData({ ...formData, defaultWithholdingCategory: value })}>
                          <SelectTrigger className="border-[#E6EEF2] h-12 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TDS 194C">TDS 194C - Contractor</SelectItem>
                            <SelectItem value="TDS 194J">TDS 194J - Professional Services</SelectItem>
                            <SelectItem value="TDS 194I">TDS 194I - Rent</SelectItem>
                            <SelectItem value="TDS 194H">TDS 194H - Commission</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Lower TDS Allowed
                        </Label>
                        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-[#E6EEF2] h-12">
                          <Switch
                            checked={formData.lowerTdsAllowed}
                            onCheckedChange={(checked) => setFormData({ ...formData, lowerTdsAllowed: checked })}
                          />
                          <span className="text-sm text-[#0A0F14] font-medium">
                            {formData.lowerTdsAllowed ? "Allowed" : "Not Allowed"}
                          </span>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                          Lower TDS Requires Approval
                        </Label>
                        <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-[#E6EEF2] h-12">
                          <Switch
                            checked={formData.lowerTdsRequiresApproval}
                            onCheckedChange={(checked) => setFormData({ ...formData, lowerTdsRequiresApproval: checked })}
                          />
                          <span className="text-sm text-[#0A0F14] font-medium">
                            {formData.lowerTdsRequiresApproval ? "Required" : "Not Required"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Tab 8: ERP Mapping */}
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
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            ERP System
                          </Label>
                          <Select
                            value={item.erpSystem}
                            onValueChange={(value) => updateERPMapping(item.id, "erpSystem", value)}
                          >
                            <SelectTrigger className="border-[#E6EEF2] h-10">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SAP S/4HANA">SAP S/4HANA</SelectItem>
                              <SelectItem value="Oracle Fusion">Oracle Fusion</SelectItem>
                              <SelectItem value="Microsoft Dynamics">MS Dynamics</SelectItem>
                              <SelectItem value="NetSuite">NetSuite</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Supplier Class/Group
                          </Label>
                          <Input
                            value={item.erpSupplierClass}
                            onChange={(e) => updateERPMapping(item.id, "erpSupplierClass", e.target.value)}
                            placeholder="e.g., MAT, SERV"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Account Group
                          </Label>
                          <Input
                            value={item.erpAccountGroup}
                            onChange={(e) => updateERPMapping(item.id, "erpAccountGroup", e.target.value)}
                            placeholder="e.g., VG01"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Payment Terms Code
                          </Label>
                          <Input
                            value={item.paymentTermsCode}
                            onChange={(e) => updateERPMapping(item.id, "paymentTermsCode", e.target.value)}
                            placeholder="e.g., NT30"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs font-medium text-[#64748B] mb-2 block">
                            Withholding Code
                          </Label>
                          <Input
                            value={item.withholdingCode}
                            onChange={(e) => updateERPMapping(item.id, "withholdingCode", e.target.value)}
                            placeholder="e.g., IN01"
                            className="border-[#E6EEF2] h-10 font-mono"
                          />
                        </div>
                        <div className="col-span-2 flex items-end">
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
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
                  <h2 className="text-xl font-bold text-[#0A0F14]">Sync Policy</h2>
                </div>

                <div>
                  <Label className="text-sm font-medium text-[#0A0F14] mb-3 block">
                    Synchronization Policy
                  </Label>
                  <Select value={formData.syncPolicy} onValueChange={(value) => setFormData({ ...formData, syncPolicy: value })}>
                    <SelectTrigger className="border-[#E6EEF2] h-12 max-w-md">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Auto">Auto - Real-time sync on changes</SelectItem>
                      <SelectItem value="Manual">Manual - Sync on user request</SelectItem>
                      <SelectItem value="Batch">Batch - Scheduled batch sync</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#64748B] mt-2">
                    Controls how vendor data syncs to ERP systems
                  </p>
                </div>

                <div className="mt-8 p-6 bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl">
                  <div className="flex items-start gap-4">
                    <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-[#0A0F14] mb-2">ERP Integration Guidelines</h3>
                      <ul className="text-sm text-[#64748B] space-y-1">
                        <li>• All ERP codes must match exactly with target system configuration</li>
                        <li>• Supplier class determines which transaction types are available</li>
                        <li>• Withholding codes are country and tax-jurisdiction specific</li>
                        <li>• Auto-sync pushes category changes to ERP in real-time</li>
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
