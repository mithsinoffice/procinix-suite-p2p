import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Save,
  Send,
  Download,
  HelpCircle,
  Edit,
  Check,
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Shield,
  Building2,
  CreditCard,
  FileCheck,
  Users,
  MessageSquare,
  Activity,
  ExternalLink,
  Plus,
  AlertTriangle,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { DocumentPreviewDrawer } from "../components/DocumentPreviewDrawer";

// Mock user permissions - in production this would come from auth context
const currentUserPermissions = {
  canEditCompanyProfile: true,
  canEditTax: true,
  canEditBanking: true,
  canUploadDocuments: true,
  canSubmitRequest: true,
  role: "Admin", // Admin, Finance Manager, Compliance Officer, etc.
};

type TabType =
  | "overview"
  | "company"
  | "tax"
  | "banking"
  | "documents"
  | "contacts"
  | "declarations"
  | "changes"
  | "activity";

type RequestStatus =
  | "Draft"
  | "In Progress"
  | "Submitted"
  | "Clarification Required"
  | "Approved"
  | "Rejected";

interface ComplianceDocument {
  id: string;
  type: string;
  required: boolean;
  status: "Missing" | "Uploaded" | "Verified" | "Rejected" | "Expired";
  expiryDate?: string;
  uploadedDate?: string;
  fileName?: string;
  uploadedBy?: string;
  versions?: Array<{
    version: number;
    uploadedOn: string;
    uploadedBy: string;
    status: string;
    fileName: string;
  }>;
}

type ValidationStatus = "Valid" | "Invalid" | "Not Checked";

interface SectionValidation {
  status: ValidationStatus;
  errors: string[];
  isDirty: boolean;
}

export function VendorPortalRequestDetailPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  // Mock request data - in production this would be fetched from API
  const [requestData, setRequestData] = useState({
    id: requestId || "REQ-2026-001",
    type: "Onboarding",
    status: "In Progress" as RequestStatus,
    vendorLegalName: "Acme Global Logistics Ltd.",
    vendorId: "VND-2025-00234",
    submittedOn: "2026-02-15",
    lastUpdated: "2026-02-20",
    slaDue: "2026-02-28",
    
    // Company Profile
    companyProfile: {
      legalName: "Acme Global Logistics Ltd.",
      tradeName: "Acme Logistics",
      registrationNumber: "CIN-U74999MH2024PTC123456",
      country: "India",
      registeredAddress: "123 Business Park, Mumbai, Maharashtra 400001, India",
      businessType: "Private Limited Company",
      website: "https://www.acmelogistics.com",
      industry: "Logistics & Transportation",
      entityScope: ["Procinix India", "Procinix APAC"],
    },
    
    // Tax & Registrations
    taxDetails: {
      country: "India",
      pan: "AABCA1234C",
      gstin: "27AABCA1234C1Z5",
      tan: "MUMA12345D",
      taxIdType: "PAN",
      panValidated: true,
      gstinValidated: false,
      lastValidated: "2026-02-20 10:30",
    },
    
    // Banking
    banking: {
      bankName: "HDFC Bank",
      accountNumber: "********1234",
      ifscSwift: "HDFC0001234",
      beneficiaryName: "Acme Global Logistics Ltd.",
      cancelledChequeUploaded: false,
      bankVerified: false,
    },
    
    // Compliance Documents
    documents: [
      {
        id: "DOC-001",
        type: "Certificate of Incorporation",
        required: true,
        status: "Verified" as const,
        expiryDate: undefined,
        uploadedDate: "2026-02-15",
        fileName: "incorporation_cert.pdf",
        uploadedBy: "Rajesh Kumar",
        versions: [
          { version: 1, uploadedOn: "2026-02-15", uploadedBy: "Rajesh Kumar", status: "Verified", fileName: "incorporation_cert.pdf" },
        ],
      },
      {
        id: "DOC-002",
        type: "PAN Card",
        required: true,
        status: "Verified" as const,
        expiryDate: undefined,
        uploadedDate: "2026-02-15",
        fileName: "pan_card.pdf",
        uploadedBy: "Rajesh Kumar",
        versions: [
          { version: 1, uploadedOn: "2026-02-15", uploadedBy: "Rajesh Kumar", status: "Verified", fileName: "pan_card.pdf" },
        ],
      },
      {
        id: "DOC-003",
        type: "GST Registration Certificate",
        required: true,
        status: "Uploaded" as const,
        expiryDate: undefined,
        uploadedDate: "2026-02-18",
        fileName: "gst_certificate.pdf",
        uploadedBy: "Priya Sharma",
        versions: [
          { version: 1, uploadedOn: "2026-02-18", uploadedBy: "Priya Sharma", status: "Uploaded", fileName: "gst_certificate.pdf" },
        ],
      },
      {
        id: "DOC-004",
        type: "Cancelled Cheque",
        required: true,
        status: "Missing" as const,
        expiryDate: undefined,
        uploadedDate: undefined,
        fileName: undefined,
        uploadedBy: undefined,
        versions: [],
      },
      {
        id: "DOC-005",
        type: "Professional Indemnity Insurance",
        required: false,
        status: "Expired" as const,
        expiryDate: "2026-01-15",
        uploadedDate: "2025-01-10",
        fileName: "insurance_cert.pdf",
        uploadedBy: "Amit Patel",
        versions: [
          { version: 1, uploadedOn: "2025-01-10", uploadedBy: "Amit Patel", status: "Expired", fileName: "insurance_cert.pdf" },
        ],
      },
    ] as ComplianceDocument[],
    
    // Contacts
    contacts: {
      primary: {
        name: "Rajesh Kumar",
        email: "rajesh.kumar@acmelogistics.com",
        phone: "+91 98765 43210",
        designation: "CFO",
      },
      additional: [
        {
          id: "C001",
          name: "Priya Sharma",
          email: "priya.sharma@acmelogistics.com",
          phone: "+91 98765 43211",
          designation: "Finance Manager",
        },
        {
          id: "C002",
          name: "Amit Patel",
          email: "amit.patel@acmelogistics.com",
          phone: "+91 98765 43212",
          designation: "Compliance Officer",
        },
      ],
    },
    
    // Declarations
    declarations: {
      antiCorruption: false,
      conflictOfInterest: false,
      sanctions: false,
      dataPrivacy: false,
    },
    
    // Validation & Risk
    completionScore: 75,
    riskTier: "Medium" as "Low" | "Medium" | "High" | "Critical",
    riskFactors: [
      "Missing mandatory document: Cancelled Cheque",
      "GST validation pending",
      "Bank verification not completed",
    ],
    
    // Workflow
    workflow: {
      currentStep: "Vendor Submitted",
      steps: [
        { name: "Vendor Submitted", status: "completed", assignee: "Vendor", timestamp: "2026-02-15 14:30" },
        { name: "Buyer Review", status: "current", assignee: "Procurement Team", timestamp: undefined },
        { name: "Finance Approval", status: "pending", assignee: "Finance Team", timestamp: undefined },
        { name: "Legal Approval", status: "pending", assignee: "Legal Team", timestamp: undefined },
        { name: "Compliance Approval", status: "pending", assignee: "Compliance Team", timestamp: undefined },
        { name: "Approved", status: "pending", assignee: undefined, timestamp: undefined },
      ],
    },
    
    // Clarification
    clarificationRequired: false,
    buyerMessage: "",
    
    // Activity Timeline
    activities: [
      {
        id: "A001",
        timestamp: "2026-02-20 11:15",
        type: "document_upload",
        user: "Rajesh Kumar",
        description: "Uploaded GST Registration Certificate",
      },
      {
        id: "A002",
        timestamp: "2026-02-18 16:45",
        type: "validation",
        user: "System",
        description: "PAN validation completed - Success",
      },
      {
        id: "A003",
        timestamp: "2026-02-15 14:30",
        type: "submission",
        user: "Rajesh Kumar",
        description: "Initial request submitted",
      },
    ],
  });

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [editingSections, setEditingSections] = useState<Record<string, boolean>>({});
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>("");
  const [showRiskDrawer, setShowRiskDrawer] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  // Section validation state
  const [sectionValidations, setSectionValidations] = useState<Record<string, SectionValidation>>({
    company: { status: "Not Checked", errors: [], isDirty: false },
    tax: { status: "Not Checked", errors: [], isDirty: false },
    banking: { status: "Not Checked", errors: [], isDirty: false },
    documents: { status: "Not Checked", errors: [], isDirty: false },
    contacts: { status: "Not Checked", errors: [], isDirty: false },
    declarations: { status: "Not Checked", errors: [], isDirty: false },
  });
  
  // Document preview drawer state
  const [showDocumentDrawer, setShowDocumentDrawer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ComplianceDocument | null>(null);
  const [] = useState(false);
  const [] = useState<File | null>(null);
  
  // Field highlight for jump-to functionality
  const [highlightedField, setHighlightedField] = useState<string | null>(null);

  // Calculate missing items for completion score
  const missingItems = useMemo(() => {
    const items: { section: string; item: string; tab: TabType; fieldId?: string }[] = [];
    
    if (!requestData.banking.cancelledChequeUploaded) {
      items.push({ section: "Banking", item: "Upload cancelled cheque", tab: "banking", fieldId: "cancelled-cheque-upload" });
    }
    
    if (!requestData.banking.bankVerified) {
      items.push({ section: "Banking", item: "Complete bank verification", tab: "banking", fieldId: "bank-verify-btn" });
    }
    
    requestData.documents.forEach((doc) => {
      if (doc.required && (doc.status === "Missing" || doc.status === "Rejected")) {
        items.push({ section: "Documents", item: `Upload ${doc.type}`, tab: "documents", fieldId: `doc-${doc.id}` });
      }
      if (doc.status === "Expired") {
        items.push({ section: "Documents", item: `Renew ${doc.type}`, tab: "documents", fieldId: `doc-${doc.id}` });
      }
    });
    
    if (!requestData.taxDetails.gstinValidated) {
      items.push({ section: "Tax", item: "Validate GSTIN", tab: "tax", fieldId: "gstin-field" });
    }
    
    const uncheckedDeclarations = Object.entries(requestData.declarations)
      .filter(([_, checked]) => !checked)
      .map(([key]) => key);
    
    if (uncheckedDeclarations.length > 0) {
      items.push({ section: "Declarations", item: "Complete all mandatory declarations", tab: "declarations", fieldId: "declarations-section" });
    }
    
    return items;
  }, [requestData]);

  // Check if submission is allowed
  const canSubmit = useMemo(() => {
    return (
      requestData.completionScore >= 80 &&
      requestData.documents.filter((d) => d.required && d.status === "Missing").length === 0 &&
      Object.values(requestData.declarations).every((checked) => checked) &&
      currentUserPermissions.canSubmitRequest
    );
  }, [requestData]);

  const handleSaveDraft = () => {
    toast.success("Draft saved successfully");
    setRequestData({ ...requestData, lastUpdated: new Date().toISOString() });
  };

  const handleSubmitForReview = () => {
    if (!canSubmit) {
      toast.error("Cannot submit: Please complete all required items");
      return;
    }
    
    setRequestData({
      ...requestData,
      status: "Submitted",
      lastUpdated: new Date().toISOString(),
    });
    
    toast.success("Request submitted for buyer review");
  };

  const handleDownloadSummary = () => {
    toast.success("Downloading request summary...");
  };

  const handleEditSection = (section: string) => {
    setEditingSections({ ...editingSections, [section]: true });
  };

  // Note: handleSaveSection and handleTabChange were generated as scaffolding
  // by the Figma export but never wired to any call site. Removed to satisfy
  // noUnusedLocals; reintroduce when the section-edit and tab-nav UI elements
  // are connected.

  const handleCancelEdit = (section: string) => {
    setEditingSections({ ...editingSections, [section]: false });
  };

  const handleValidateTax = (field: "pan" | "gstin") => {
    toast.info(`Validating ${field.toUpperCase()}...`);
    
    setTimeout(() => {
      if (field === "gstin") {
        setRequestData({
          ...requestData,
          taxDetails: {
            ...requestData.taxDetails,
            gstinValidated: true,
            lastValidated: new Date().toISOString(),
          },
          completionScore: Math.min(requestData.completionScore + 5, 100),
        });
      }
      toast.success(`${field.toUpperCase()} validation successful`);
    }, 1500);
  };

  const handleVerifyBank = () => {
    toast.info("Verifying bank details...");
    
    setTimeout(() => {
      setRequestData({
        ...requestData,
        banking: { ...requestData.banking, bankVerified: true },
        completionScore: Math.min(requestData.completionScore + 5, 100),
      });
      toast.success("Bank verification successful");
    }, 2000);
  };

  const handleUploadDocument = () => {
    if (!uploadFile || !selectedDocType) {
      toast.error("Please select a document and file");
      return;
    }
    
    const updatedDocs = requestData.documents.map((doc) =>
      doc.type === selectedDocType
        ? {
            ...doc,
            status: "Uploaded" as const,
            uploadedDate: new Date().toISOString().split("T")[0],
            fileName: uploadFile.name,
          }
        : doc
    );
    
    setRequestData({
      ...requestData,
      documents: updatedDocs,
      completionScore: Math.min(requestData.completionScore + 5, 100),
    });
    
    setShowUploadDialog(false);
    setUploadFile(null);
    setSelectedDocType("");
    toast.success("Document uploaded successfully");
  };

  // Add activity log entry
  const addActivityLog = (type: string, description: string) => {
    const newActivity = {
      id: `A${Date.now()}`,
      timestamp: new Date().toISOString(),
      type,
      user: requestData.contacts.primary.name,
      description,
    };
    
    setRequestData({
      ...requestData,
      activities: [newActivity, ...requestData.activities],
    });
  };

  // Update completion score based on weighted sections
  const updateCompletionScore = () => {
    const weights = {
      company: 20,
      tax: 20,
      banking: 20,
      documents: 20,
      declarations: 10,
      contacts: 10,
    };
    
    let score = 0;
    Object.entries(sectionValidations).forEach(([section, validation]) => {
      if (validation.status === "Valid") {
        score += weights[section as keyof typeof weights] || 0;
      }
    });
    
    setRequestData({
      ...requestData,
      completionScore: score,
    });
  };

  // Section validation handler
  const handleValidateSection = (section: string) => {
    const errors: string[] = [];
    
    // Validation logic for each section
    switch (section) {
      case "company":
        if (!requestData.companyProfile.legalName) errors.push("Legal name is required");
        if (!requestData.companyProfile.country) errors.push("Country is required");
        if (!requestData.companyProfile.registrationNumber) errors.push("Registration number is required");
        break;
      case "tax":
        if (!requestData.taxDetails.pan) errors.push("PAN is required");
        if (!requestData.taxDetails.gstin) errors.push("GSTIN is required");
        if (!requestData.taxDetails.panValidated) errors.push("PAN must be validated");
        if (!requestData.taxDetails.gstinValidated) errors.push("GSTIN must be validated");
        break;
      case "banking":
        if (!requestData.banking.bankName) errors.push("Bank name is required");
        if (!requestData.banking.accountNumber) errors.push("Account number is required");
        if (!requestData.banking.ifscSwift) errors.push("IFSC/SWIFT code is required");
        if (!requestData.banking.cancelledChequeUploaded) errors.push("Cancelled cheque must be uploaded");
        if (!requestData.banking.bankVerified) errors.push("Bank details must be verified");
        break;
      case "documents":
        const missingDocs = requestData.documents.filter((d) => d.required && d.status === "Missing");
        if (missingDocs.length > 0) {
          errors.push(`${missingDocs.length} required document(s) missing`);
        }
        break;
      case "declarations":
        const unchecked = Object.values(requestData.declarations).filter((v) => !v).length;
        if (unchecked > 0) errors.push("All declarations must be checked");
        break;
    }
    
    const status: ValidationStatus = errors.length === 0 ? "Valid" : "Invalid";
    
    setSectionValidations({
      ...sectionValidations,
      [section]: { status, errors, isDirty: false },
    });
    
    addActivityLog("validation", `${section.charAt(0).toUpperCase() + section.slice(1)} validation ${status === "Valid" ? "passed" : "failed"}`);
    updateCompletionScore();
    
    toast[status === "Valid" ? "success" : "error"](
      status === "Valid" ? `${section} validation passed` : `${section} validation failed: ${errors[0]}`
    );
  };

  // Section save handler with validation and activity log
  const handleSaveSectionEnhanced = (section: string) => {
    setEditingSections({ ...editingSections, [section]: false });
    
    setSectionValidations({
      ...sectionValidations,
      [section]: { ...sectionValidations[section], isDirty: false },
    });
    
    addActivityLog("section_save", `${section.charAt(0).toUpperCase() + section.slice(1)} updated by Vendor`);
    
    setRequestData({
      ...requestData,
      lastUpdated: new Date().toISOString(),
    });
    
    toast.success("Section saved successfully");
  };

  // Enhanced jump to section with field highlighting
  const handleJumpToSectionEnhanced = (tab: TabType, fieldId?: string) => {
    setActiveTab(tab);
    
    if (!editingSections[tab]) {
      setEditingSections({ ...editingSections, [tab]: true });
    }
    
    if (fieldId) {
      setHighlightedField(fieldId);
      setTimeout(() => {
        const element = document.getElementById(fieldId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          element.focus();
        }
        setTimeout(() => setHighlightedField(null), 2000);
      }, 100);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Document drawer handlers
  const handleViewDocument = (doc: ComplianceDocument) => {
    setSelectedDocument(doc);
    setShowDocumentDrawer(true);
  };

  const handleReplaceDocument = (file: File) => {
    if (!selectedDocument) return;
    
    const updatedDocs = requestData.documents.map((doc) => {
      if (doc.id === selectedDocument.id) {
        const newVersion = {
          version: (doc.versions?.length || 0) + 1,
          uploadedOn: new Date().toISOString().split("T")[0],
          uploadedBy: requestData.contacts.primary.name,
          status: "Uploaded",
          fileName: file.name,
        };
        
        return {
          ...doc,
          status: "Uploaded" as const,
          uploadedDate: new Date().toISOString().split("T")[0],
          fileName: file.name,
          uploadedBy: requestData.contacts.primary.name,
          versions: [...(doc.versions || []), newVersion],
        };
      }
      return doc;
    });
    
    setRequestData({
      ...requestData,
      documents: updatedDocs,
    });
    
    addActivityLog("document_replace", `Replaced ${selectedDocument.type} - Version ${(selectedDocument.versions?.length || 0) + 1}`);
    
    toast.success("New document version uploaded");
  };

  const handleDownloadDocument = (doc: ComplianceDocument) => {
    toast.success(`Downloading ${doc.fileName}...`);
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-700";
      case "In Progress":
        return "bg-blue-50 text-blue-700";
      case "Submitted":
        return "bg-purple-50 text-purple-700";
      case "Clarification Required":
        return "bg-yellow-50 text-yellow-700";
      case "Approved":
        return "bg-green-50 text-green-700";
      case "Rejected":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getRiskColor = (tier: string) => {
    switch (tier) {
      case "Low":
        return "bg-green-50 text-green-700";
      case "Medium":
        return "bg-yellow-50 text-yellow-700";
      case "High":
        return "bg-orange-50 text-orange-700";
      case "Critical":
        return "bg-red-50 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] overflow-x-hidden">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#E6EEF2]">
        <div className="w-full max-w-[1600px] mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
            <button
              onClick={() => navigate("/vendor-portal/home")}
              className="hover:text-[#00A9B7] transition-colors"
            >
              Vendor Portal
            </button>
            <ChevronRight className="w-4 h-4" />
            <span>Requests</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0A0F14] font-medium">{requestData.id}</span>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-xl lg:text-2xl font-semibold text-[#0A0F14] truncate">
                  {requestData.type} – {requestData.vendorLegalName}
                </h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(requestData.status)}`}>
                  {requestData.status}
                </span>
                {requestData.slaDue && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Due: {requestData.slaDue}
                  </span>
                )}
                <span className="text-sm text-[#64748B]">
                  Last updated: {requestData.lastUpdated}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:gap-3">
              <Button
                onClick={handleSaveDraft}
                variant="outline"
                className="border-[#00A9B7] text-[#00A9B7] hover:bg-[#00A9B7]/5"
                size="sm"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={handleSubmitForReview}
                disabled={!canSubmit || requestData.status === "Submitted"}
                className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                size="sm"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Review
              </Button>
              <Button onClick={handleDownloadSummary} variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="p-2" size="sm">
                <HelpCircle className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Column Workspace */}
      <div className="w-full max-w-[1600px] mx-auto px-6 py-8">
        <div className="flex flex-col xl:flex-row gap-0 items-start">
          {/* Left Side - Tabs & Content */}
          <div className="w-full xl:flex-1 xl:min-w-0 pr-5">
            <div className="bg-white rounded-xl border border-[#E6EEF2]">
              {/* Tabs */}
              <div className="border-b border-[#E6EEF2] relative">
                <div className="overflow-x-auto scrollbar-hide">
                  <div className="flex gap-1 px-6 min-w-max">
                    {[
                      { id: "overview", label: "Overview", icon: FileText },
                      { id: "company", label: "Company Profile", icon: Building2 },
                      { id: "tax", label: "Tax & Registrations", icon: FileCheck },
                      { id: "banking", label: "Banking", icon: CreditCard },
                      { id: "documents", label: "Compliance Documents", icon: FileText },
                      { id: "contacts", label: "Contacts & Users", icon: Users },
                      { id: "declarations", label: "Declarations", icon: CheckCircle2 },
                      ...(requestData.type === "Change Request"
                        ? [{ id: "changes" as const, label: "Change Requests", icon: Activity }]
                        : []),
                      { id: "activity", label: "Activity & Messages", icon: MessageSquare },
                    ].map((tab) => {
                      const validation = sectionValidations[tab.id];
                      return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as TabType)}
                        className={`flex items-center gap-2 px-3 py-2 border-b-2 transition-colors whitespace-nowrap relative ${
                          activeTab === tab.id
                            ? "border-[#00A9B7] text-[#00A9B7] font-medium"
                            : "border-transparent text-[#64748B] hover:text-[#0A0F14]"
                        }`}
                      >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                        {/* Validation indicator */}
                        {validation && validation.status === "Valid" && (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        )}
                        {validation && validation.status === "Invalid" && (
                          <div className="w-2 h-2 rounded-full bg-red-600" />
                        )}
                        {validation && validation.isDirty && (
                          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-500" />
                        )}
                      </button>
                    );
                    })}
                  </div>
                </div>
                {/* Right edge fade gradient for overflow indication */}
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
              </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Request Summary</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Request ID</div>
                        <div className="font-mono text-[#00A9B7] font-medium">{requestData.id}</div>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Request Type</div>
                        <div className="text-[#0A0F14] font-medium">{requestData.type}</div>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Status</div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(requestData.status)}`}>
                          {requestData.status}
                        </span>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Submitted On</div>
                        <div className="text-[#0A0F14]">{requestData.submittedOn}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Vendor Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Legal Name</div>
                        <div className="text-[#0A0F14] font-medium">{requestData.companyProfile.legalName}</div>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Country</div>
                        <div className="text-[#0A0F14]">{requestData.companyProfile.country}</div>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Primary Contact</div>
                        <div className="text-[#0A0F14] font-medium">{requestData.contacts.primary.name}</div>
                        <div className="text-sm text-[#64748B]">{requestData.contacts.primary.email}</div>
                      </div>
                      <div className="p-4 bg-[#F6F9FC] rounded-lg">
                        <div className="text-sm text-[#64748B] mb-1">Phone</div>
                        <div className="text-[#0A0F14]">{requestData.contacts.primary.phone}</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Document Status</h2>
                    <div className="space-y-2">
                      {requestData.documents.filter((d) => d.required).map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border border-[#E6EEF2] rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-[#64748B]" />
                            <span className="text-sm text-[#0A0F14]">{doc.type}</span>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              doc.status === "Verified"
                                ? "bg-green-50 text-green-700"
                                : doc.status === "Uploaded"
                                ? "bg-blue-50 text-blue-700"
                                : doc.status === "Missing"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {doc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Quick Actions</h2>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => {
                          setActiveTab("documents");
                          setShowUploadDialog(true);
                        }}
                        variant="outline"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Missing Document
                      </Button>
                      <Button
                        onClick={() => setActiveTab("banking")}
                        variant="outline"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Update Banking
                      </Button>
                      <Button
                        onClick={() => setActiveTab("activity")}
                        variant="outline"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Send Message
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Company Profile Tab */}
              {activeTab === "company" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0A0F14]">Company Profile</h2>
                    {!editingSections.company && currentUserPermissions.canEditCompanyProfile && (
                      <Button
                        onClick={() => handleEditSection("company")}
                        variant="outline"
                        size="sm"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Section
                      </Button>
                    )}
                    {editingSections.company && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveSectionEnhanced("company")}
                          size="sm"
                          className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save Section
                        </Button>
                        <Button
                          onClick={() => handleValidateSection("company")}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Validate Section
                        </Button>
                        <Button
                          onClick={() => handleCancelEdit("company")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Validation errors display */}
                  {sectionValidations.company.status === "Invalid" && sectionValidations.company.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {sectionValidations.company.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {!currentUserPermissions.canEditCompanyProfile && !editingSections.company && (
                    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
                      <AlertCircle className="w-4 h-4" />
                      You don't have access to edit this section.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Legal Name *</Label>
                      <Input
                        value={requestData.companyProfile.legalName}
                        disabled={!editingSections.company}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Trade Name</Label>
                      <Input
                        value={requestData.companyProfile.tradeName}
                        disabled={!editingSections.company}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Registration Number *</Label>
                      <Input
                        value={requestData.companyProfile.registrationNumber}
                        disabled={!editingSections.company}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Country of Incorporation *</Label>
                      <Select disabled={!editingSections.company} value={requestData.companyProfile.country}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="India">India</SelectItem>
                          <SelectItem value="USA">USA</SelectItem>
                          <SelectItem value="UK">UK</SelectItem>
                          <SelectItem value="Germany">Germany</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Registered Address *</Label>
                      <Textarea
                        value={requestData.companyProfile.registeredAddress}
                        disabled={!editingSections.company}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Business Type *</Label>
                      <Select disabled={!editingSections.company} value={requestData.companyProfile.businessType}>
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Private Limited Company">Private Limited Company</SelectItem>
                          <SelectItem value="Public Limited Company">Public Limited Company</SelectItem>
                          <SelectItem value="LLP">LLP</SelectItem>
                          <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Website</Label>
                      <Input
                        value={requestData.companyProfile.website}
                        disabled={!editingSections.company}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Industry</Label>
                      <Input
                        value={requestData.companyProfile.industry}
                        disabled={!editingSections.company}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Entity Scope *</Label>
                      <div className="mt-2 p-3 bg-[#F6F9FC] rounded-lg">
                        {requestData.companyProfile.entityScope.map((entity, idx) => (
                          <div key={idx} className="text-sm text-[#0A0F14]">
                            {entity}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tax & Registrations Tab */}
              {activeTab === "tax" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0A0F14]">Tax & Registrations</h2>
                    {!editingSections.tax && currentUserPermissions.canEditTax && (
                      <Button
                        onClick={() => handleEditSection("tax")}
                        variant="outline"
                        size="sm"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Section
                      </Button>
                    )}
                    {editingSections.tax && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveSectionEnhanced("tax")}
                          size="sm"
                          className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save Section
                        </Button>
                        <Button
                          onClick={() => handleValidateSection("tax")}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Validate Section
                        </Button>
                        <Button
                          onClick={() => handleCancelEdit("tax")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Validation errors display */}
                  {sectionValidations.tax.status === "Invalid" && sectionValidations.tax.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {sectionValidations.tax.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <div className="font-medium mb-1">Country-specific tax requirements</div>
                      <div>Based on your country of incorporation ({requestData.taxDetails.country}), the following tax identifiers are required.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>PAN (Permanent Account Number) *</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          value={requestData.taxDetails.pan}
                          disabled={!editingSections.tax}
                          className="flex-1"
                        />
                        {requestData.taxDetails.panValidated ? (
                          <div className="flex items-center gap-2 px-3 bg-green-50 border border-green-200 rounded-lg whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Verified</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleValidateTax("pan")}
                            variant="outline"
                            className="border-[#00A9B7] text-[#00A9B7] whitespace-nowrap"
                            size="sm"
                          >
                            Validate
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>GSTIN (GST Identification Number) *</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="gstin-field"
                          value={requestData.taxDetails.gstin}
                          disabled={!editingSections.tax}
                          className={`flex-1 ${highlightedField === "gstin-field" ? "field-highlight" : ""}`}
                        />
                        {requestData.taxDetails.gstinValidated ? (
                          <div className="flex items-center gap-2 px-3 bg-green-50 border border-green-200 rounded-lg whitespace-nowrap">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            <span className="text-sm text-green-700 font-medium">Verified</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleValidateTax("gstin")}
                            variant="outline"
                            className="border-[#00A9B7] text-[#00A9B7] whitespace-nowrap"
                            size="sm"
                          >
                            Validate
                          </Button>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>TAN (Tax Deduction Account Number)</Label>
                      <Input
                        value={requestData.taxDetails.tan}
                        disabled={!editingSections.tax}
                        className="mt-2"
                      />
                    </div>

                    <div>
                      <Label>Last Validated</Label>
                      <div className="mt-2 p-3 bg-[#F6F9FC] rounded-lg text-sm text-[#64748B]">
                        {requestData.taxDetails.lastValidated}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Banking Tab */}
              {activeTab === "banking" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0A0F14]">Banking Details</h2>
                    {!editingSections.banking && currentUserPermissions.canEditBanking && (
                      <Button
                        onClick={() => handleEditSection("banking")}
                        variant="outline"
                        size="sm"
                        className="border-[#00A9B7] text-[#00A9B7]"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Section
                      </Button>
                    )}
                    {editingSections.banking && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveSectionEnhanced("banking")}
                          size="sm"
                          className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Save Section
                        </Button>
                        <Button
                          onClick={() => handleValidateSection("banking")}
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Validate Section
                        </Button>
                        <Button
                          onClick={() => handleCancelEdit("banking")}
                          variant="outline"
                          size="sm"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Validation errors display */}
                  {sectionValidations.banking.status === "Invalid" && sectionValidations.banking.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {sectionValidations.banking.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Bank Name *</Label>
                      <Input
                        value={requestData.banking.bankName}
                        disabled={!editingSections.banking}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Account Number *</Label>
                      <Input
                        value={requestData.banking.accountNumber}
                        disabled={!editingSections.banking}
                        type="password"
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>IFSC / SWIFT Code *</Label>
                      <Input
                        value={requestData.banking.ifscSwift}
                        disabled={!editingSections.banking}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label>Beneficiary Name *</Label>
                      <Input
                        value={requestData.banking.beneficiaryName}
                        disabled={!editingSections.banking}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="border-t border-[#E6EEF2] pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-[#0A0F14]">Cancelled Cheque / Bank Statement</h3>
                        <p className="text-sm text-[#64748B]">Upload a cancelled cheque or bank statement for verification</p>
                      </div>
                      {!requestData.banking.cancelledChequeUploaded && (
                        <Button
                          id="cancelled-cheque-upload"
                          onClick={() => {
                            setSelectedDocType("Cancelled Cheque");
                            setShowUploadDialog(true);
                          }}
                          className={`bg-[#00A9B7] hover:bg-[#008A96] text-white ${highlightedField === "cancelled-cheque-upload" ? "field-highlight" : ""}`}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </Button>
                      )}
                    </div>
                    {requestData.banking.cancelledChequeUploaded ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-800 font-medium">Cancelled cheque uploaded</span>
                        </div>
                        <Button variant="outline" size="sm">View</Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-800">Cancelled cheque is required for bank verification</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-[#E6EEF2] pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[#0A0F14]">Bank Verification Status</h3>
                        <p className="text-sm text-[#64748B]">Verify bank account details with NPCI / SWIFT</p>
                      </div>
                      {requestData.banking.bankVerified ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-700 font-medium">Verified</span>
                        </div>
                      ) : (
                        <Button
                          id="bank-verify-btn"
                          onClick={handleVerifyBank}
                          disabled={!requestData.banking.cancelledChequeUploaded}
                          className={`bg-[#00A9B7] hover:bg-[#008A96] text-white ${highlightedField === "bank-verify-btn" ? "field-highlight" : ""}`}
                        >
                          Verify Bank
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Compliance Documents Tab */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0A0F14]">Compliance Documents</h2>
                    <Button
                      onClick={() => setShowUploadDialog(true)}
                      className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Upload Document
                    </Button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b border-[#E6EEF2]">
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Document Type</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Required</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Status</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Expiry Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Uploaded Date</th>
                          <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requestData.documents.map((doc) => (
                          <tr 
                            key={doc.id} 
                            id={`doc-${doc.id}`}
                            className={`border-b border-[#E6EEF2] hover:bg-[#F6F9FC] ${highlightedField === `doc-${doc.id}` ? "field-highlight" : ""}`}
                          >
                            <td className="py-3 px-4 text-sm text-[#0A0F14]">{doc.type}</td>
                            <td className="py-3 px-4">
                              {doc.required ? (
                                <span className="text-red-600 text-sm">Yes</span>
                              ) : (
                                <span className="text-[#64748B] text-sm">No</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  doc.status === "Verified"
                                    ? "bg-green-50 text-green-700"
                                    : doc.status === "Uploaded"
                                    ? "bg-blue-50 text-blue-700"
                                    : doc.status === "Missing"
                                    ? "bg-red-50 text-red-700"
                                    : doc.status === "Expired"
                                    ? "bg-orange-50 text-orange-700"
                                    : "bg-gray-100 text-gray-700"
                                }`}
                              >
                                {doc.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-[#64748B]">
                              {doc.expiryDate || "N/A"}
                            </td>
                            <td className="py-3 px-4 text-sm text-[#64748B]">
                              {doc.uploadedDate || "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                {doc.status === "Missing" || doc.status === "Rejected" ? (
                                  <Button
                                    onClick={() => {
                                      setSelectedDocType(doc.type);
                                      setShowUploadDialog(true);
                                    }}
                                    size="sm"
                                    className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                                  >
                                    <Upload className="w-3 h-3 mr-1" />
                                    Upload
                                  </Button>
                                ) : (
                                  <>
                                    <Button 
                                      onClick={() => handleViewDocument(doc)}
                                      variant="outline" 
                                      size="sm"
                                    >
                                      View
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setSelectedDocType(doc.type);
                                        setShowUploadDialog(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                    >
                                      Replace
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Contacts & Users Tab */}
              {activeTab === "contacts" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Primary Contact</h2>
                    <div className="p-6 bg-[#F6F9FC] rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name *</Label>
                        <Input value={requestData.contacts.primary.name} className="mt-2" />
                      </div>
                      <div>
                        <Label>Email *</Label>
                        <Input value={requestData.contacts.primary.email} className="mt-2" />
                      </div>
                      <div>
                        <Label>Phone *</Label>
                        <Input value={requestData.contacts.primary.phone} className="mt-2" />
                      </div>
                      <div>
                        <Label>Designation</Label>
                        <Input value={requestData.contacts.primary.designation} className="mt-2" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-[#0A0F14]">Additional Contacts</h2>
                      <Button variant="outline" className="border-[#00A9B7] text-[#00A9B7]">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Contact
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {requestData.contacts.additional.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-4 border border-[#E6EEF2] rounded-lg hover:bg-[#F6F9FC]"
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <div className="text-xs text-[#64748B]">Name</div>
                              <div className="text-sm text-[#0A0F14] font-medium">{contact.name}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#64748B]">Email</div>
                              <div className="text-sm text-[#0A0F14]">{contact.email}</div>
                            </div>
                            <div>
                              <div className="text-xs text-[#64748B]">Phone</div>
                              <div className="text-sm text-[#0A0F14]">{contact.phone}</div>
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-300">
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-lg font-semibold text-[#0A0F14]">Vendor Portal Users</h2>
                        <p className="text-sm text-[#64748B]">Users with access to vendor portal</p>
                      </div>
                      <Button variant="outline" className="border-[#00A9B7] text-[#00A9B7]">
                        <Plus className="w-4 h-4 mr-2" />
                        Invite User
                      </Button>
                    </div>
                    <div className="p-4 bg-[#F6F9FC] rounded-lg text-sm text-[#64748B]">
                      Vendor portal users can be managed from the Vendor Portal Users section.
                    </div>
                  </div>
                </div>
              )}

              {/* Declarations Tab */}
              {activeTab === "declarations" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-[#0A0F14]">Mandatory Declarations</h2>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveSectionEnhanced("declarations")}
                        size="sm"
                        className="bg-[#00A9B7] hover:bg-[#008A96] text-white"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Save Section
                      </Button>
                      <Button
                        onClick={() => handleValidateSection("declarations")}
                        size="sm"
                        variant="outline"
                        className="border-green-600 text-green-600 hover:bg-green-50"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Validate Section
                      </Button>
                    </div>
                  </div>

                  {/* Validation errors display */}
                  {sectionValidations.declarations.status === "Invalid" && sectionValidations.declarations.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-red-800 mb-1">Validation Errors</h4>
                          <ul className="text-sm text-red-700 space-y-1">
                            {sectionValidations.declarations.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3 mb-6" id="declarations-section">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      All declarations must be checked before submitting the request for review.
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-6 border border-[#E6EEF2] rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestData.declarations.antiCorruption}
                          onChange={(e) =>
                            setRequestData({
                              ...requestData,
                              declarations: {
                                ...requestData.declarations,
                                antiCorruption: e.target.checked,
                              },
                            })
                          }
                          className="mt-1 w-5 h-5 text-[#00A9B7] border-gray-300 rounded focus:ring-[#00A9B7]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0A0F14] mb-2">Anti-Corruption & Bribery</div>
                          <p className="text-sm text-[#64748B]">
                            I/We declare that our organization has not been involved in any corrupt practices,
                            bribery, or unethical business conduct. We comply with all applicable anti-corruption laws
                            and regulations.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="p-6 border border-[#E6EEF2] rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestData.declarations.conflictOfInterest}
                          onChange={(e) =>
                            setRequestData({
                              ...requestData,
                              declarations: {
                                ...requestData.declarations,
                                conflictOfInterest: e.target.checked,
                              },
                            })
                          }
                          className="mt-1 w-5 h-5 text-[#00A9B7] border-gray-300 rounded focus:ring-[#00A9B7]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0A0F14] mb-2">Conflict of Interest</div>
                          <p className="text-sm text-[#64748B]">
                            I/We declare that there is no conflict of interest between our organization and
                            Procinix or any of its subsidiaries, directors, or employees.
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="p-6 border border-[#E6EEF2] rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestData.declarations.sanctions}
                          onChange={(e) =>
                            setRequestData({
                              ...requestData,
                              declarations: {
                                ...requestData.declarations,
                                sanctions: e.target.checked,
                              },
                            })
                          }
                          className="mt-1 w-5 h-5 text-[#00A9B7] border-gray-300 rounded focus:ring-[#00A9B7]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0A0F14] mb-2">Sanctions Compliance</div>
                          <p className="text-sm text-[#64748B]">
                            I/We declare that our organization is not subject to any economic sanctions or
                            trade restrictions by any government or international body. We are not listed on
                            any sanctions lists (UN, EU, OFAC, etc.).
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="p-6 border border-[#E6EEF2] rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={requestData.declarations.dataPrivacy}
                          onChange={(e) =>
                            setRequestData({
                              ...requestData,
                              declarations: {
                                ...requestData.declarations,
                                dataPrivacy: e.target.checked,
                              },
                            })
                          }
                          className="mt-1 w-5 h-5 text-[#00A9B7] border-gray-300 rounded focus:ring-[#00A9B7]"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-[#0A0F14] mb-2">Data Privacy & Security</div>
                          <p className="text-sm text-[#64748B]">
                            I/We acknowledge that all information provided is accurate and complete. We understand
                            and consent to the processing of this data in accordance with applicable data protection
                            laws and Procinix's privacy policy.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
                    <div className="text-sm text-[#64748B]">
                      <span className="font-medium text-[#0A0F14]">Declaration Date:</span>{" "}
                      {new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-sm text-[#64748B] mt-1">
                      <span className="font-medium text-[#0A0F14]">Declared By:</span>{" "}
                      {requestData.contacts.primary.name}
                    </div>
                  </div>
                </div>
              )}

              {/* Activity & Messages Tab */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  <h2 className="text-lg font-semibold text-[#0A0F14] mb-4">Activity Timeline</h2>
                  <div className="space-y-4">
                    {requestData.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#00A9B7]/10 flex items-center justify-center">
                          <Activity className="w-5 h-5 text-[#00A9B7]" />
                        </div>
                        <div className="flex-1 pb-6 border-b border-[#E6EEF2] last:border-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="font-medium text-[#0A0F14]">{activity.description}</div>
                            <div className="text-sm text-[#64748B]">{activity.timestamp}</div>
                          </div>
                          <div className="text-sm text-[#64748B]">By {activity.user}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-[#E6EEF2] pt-6">
                    <h3 className="font-semibold text-[#0A0F14] mb-4">Send Message to Buyer</h3>
                    <div className="space-y-4">
                      <Textarea
                        placeholder="Type your message here..."
                        rows={5}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="outline">
                          <Upload className="w-4 h-4 mr-2" />
                          Attach File
                        </Button>
                        <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Validation & Workflow Panel */}
        <div className="w-full xl:min-w-[300px] xl:max-w-[340px] xl:w-[clamp(300px,28vw,340px)] xl:flex-shrink-0 border-l border-[#E5E7EB] pl-5">
          <div className="xl:sticky xl:top-24 space-y-6 max-h-[calc(100vh-120px)] xl:overflow-y-auto">
            {/* Completion Score */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
              <h3 className="font-semibold text-[#0A0F14] mb-4">Completion Score</h3>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-semibold text-[#0A0F14]">{requestData.completionScore}%</span>
                  <span
                    className={`text-sm font-medium ${
                      requestData.completionScore >= 80 ? "text-green-600" : "text-yellow-600"
                    }`}
                  >
                    {requestData.completionScore >= 80 ? "Ready to submit" : "In progress"}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      requestData.completionScore >= 80 ? "bg-green-600" : "bg-yellow-600"
                    }`}
                    style={{ width: `${requestData.completionScore}%` }}
                  />
                </div>
              </div>
              {missingItems.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-[#0A0F14] mb-2">Missing Items:</div>
                  <div className="space-y-2">
                    {missingItems.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleJumpToSectionEnhanced(item.tab, item.fieldId)}
                        className="w-full text-left p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors flex items-start gap-2 group"
                      >
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm text-[#0A0F14] group-hover:text-[#00A9B7]">{item.item}</div>
                          <div className="text-xs text-[#64748B]">{item.section}</div>
                        </div>
                        <ExternalLink className="w-3 h-3 text-[#64748B] opacity-0 group-hover:opacity-100 mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Summary */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
              <h3 className="font-semibold text-[#0A0F14] mb-4">Validation Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-[#0A0F14]">Tax ID Validation</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Pass</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-[#0A0F14]">Bank Verification</span>
                  </div>
                  <span className="text-xs text-yellow-600 font-medium">Pending</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-[#0A0F14]">Sanctions Screening</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Clear</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-[#0A0F14]">Document Checks</span>
                  </div>
                  <span className="text-xs text-yellow-600 font-medium">Missing</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#F6F9FC] rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-[#0A0F14]">Duplicate Check</span>
                  </div>
                  <span className="text-xs text-green-600 font-medium">No match</span>
                </div>
              </div>
            </div>

            {/* Risk Snapshot */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
              <h3 className="font-semibold text-[#0A0F14] mb-4">Risk Snapshot</h3>
              <div className="mb-4">
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getRiskColor(requestData.riskTier)}`}>
                  {requestData.riskTier} Risk
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-[#0A0F14]">Triggered Risk Factors:</div>
                {requestData.riskFactors.map((factor, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-[#64748B]">{factor}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setShowRiskDrawer(true)}
                variant="outline"
                className="w-full border-[#00A9B7] text-[#00A9B7]"
              >
                View Risk Details
              </Button>
            </div>

            {/* Workflow Timeline */}
            <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
              <h3 className="font-semibold text-[#0A0F14] mb-4">Workflow Timeline</h3>
              <div className="space-y-4">
                {requestData.workflow.steps.map((step, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          step.status === "completed"
                            ? "bg-green-100"
                            : step.status === "current"
                            ? "bg-blue-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {step.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : step.status === "current" ? (
                          <Clock className="w-5 h-5 text-blue-600" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-400" />
                        )}
                      </div>
                      {idx < requestData.workflow.steps.length - 1 && (
                        <div className={`w-0.5 h-8 ${step.status === "completed" ? "bg-green-200" : "bg-gray-200"}`} />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-sm font-medium text-[#0A0F14]">{step.name}</div>
                      {step.assignee && (
                        <div className="text-xs text-[#64748B] mt-1">Assigned to: {step.assignee}</div>
                      )}
                      {step.timestamp && <div className="text-xs text-[#64748B] mt-1">{step.timestamp}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clarification Box */}
            {requestData.clarificationRequired && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-yellow-900 mb-2">Clarification Required</h3>
                    <p className="text-sm text-yellow-800">{requestData.buyerMessage}</p>
                  </div>
                </div>
                <Button
                  onClick={() => setActiveTab("activity")}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Respond to Clarification
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>

      {/* Upload Document Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Select document type and upload file</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Type *</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {requestData.documents.map((doc) => (
                    <SelectItem key={doc.id} value={doc.type}>
                      {doc.type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Upload File *</Label>
              <Input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-2"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <div className="text-xs text-[#64748B] mt-1">Accepted formats: PDF, JPG, PNG (Max 10MB)</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUploadDocument} className="bg-[#00A9B7] hover:bg-[#008A96] text-white">
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Risk Details Drawer (inline panel) */}
      {showRiskDrawer && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={() => setShowRiskDrawer(false)}>
          <div
            className="bg-white h-full w-[600px] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-[#E6EEF2] p-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#0A0F14]">Risk Assessment Details</h2>
              <Button variant="outline" onClick={() => setShowRiskDrawer(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-[#0A0F14] mb-3">Overall Risk Tier</h3>
                <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getRiskColor(requestData.riskTier)}`}>
                  {requestData.riskTier} Risk
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-[#0A0F14] mb-3">Risk Factors Breakdown</h3>
                <div className="space-y-3">
                  {requestData.riskFactors.map((factor, idx) => (
                    <div key={idx} className="p-4 border border-[#E6EEF2] rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-medium text-[#0A0F14] mb-1">Risk Factor {idx + 1}</div>
                          <div className="text-sm text-[#64748B]">{factor}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[#0A0F14] mb-3">Mitigation Actions</h3>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    Complete all missing document uploads and validations to reduce risk level.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Drawer */}
      <DocumentPreviewDrawer
        isOpen={showDocumentDrawer}
        onClose={() => {
          setShowDocumentDrawer(false);
          setSelectedDocument(null);
        }}
        document={selectedDocument}
        onReplace={handleReplaceDocument}
        onDownload={handleDownloadDocument}
      />
    </div>
  );
}
