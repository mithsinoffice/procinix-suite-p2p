import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Upload,
  FileText,
  Globe,
  CreditCard,
  Shield,
  Eye,
  Send,
  Save,
  ChevronRight,
  HelpCircle,
  Mail,
  Phone,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Calendar,
  FileCheck,
  RefreshCw,
  Info,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Lock,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {  } from "../components/ui/textarea";
import { StatusBadge } from "../components/design-system/StatusBadge";

type PortalView =
  | "invitation"
  | "dashboard"
  | "onboarding"
  | "clarification"
  | "confirmation"
  | "approved";

type OnboardingStep =
  | "basic"
  | "tax"
  | "banking"
  | "classification"
  | "documents"
  | "review";

interface FormData {
  // Basic Information
  companyName: string;
  legalName: string;
  website: string;
  registrationNumber: string;
  incorporationDate: string;
  companyEmail: string;
  companyPhone: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  
  // Address
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  
  // Tax & Compliance
  taxId: string;
  gstNumber: string;
  vatNumber: string;
  panNumber: string;
  
  // Banking
  bankName: string;
  accountNumber: string;
  accountName: string;
  ifscCode: string;
  swiftCode: string;
  iban: string;
  
  // Classification
  businessType: string;
  industryType: string;
  companySize: string;
  annualRevenue: string;
  
  // Documents
  documents: Record<string, { name: string; uploadedDate: string; expiryDate?: string }>;
}

export function VendorSelfServicePortal() {
  const {  } = useParams();
  const [currentView, setCurrentView] = useState<PortalView>("invitation");
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("basic");
  const [formData, setFormData] = useState<FormData>({
    companyName: "",
    legalName: "",
    website: "",
    registrationNumber: "",
    incorporationDate: "",
    companyEmail: "",
    companyPhone: "",
    contactPerson: "",
    contactEmail: "",
    contactPhone: "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    taxId: "",
    gstNumber: "",
    vatNumber: "",
    panNumber: "",
    bankName: "",
    accountNumber: "",
    accountName: "",
    ifscCode: "",
    swiftCode: "",
    iban: "",
    businessType: "",
    industryType: "",
    companySize: "",
    annualRevenue: "",
    documents: {},
  });
  
  const [validationStates, setValidationStates] = useState<Record<string, "idle" | "validating" | "success" | "error">>({});
  const [validationMessages, setValidationMessages] = useState<Record<string, string>>({});
  const [assistancePanelOpen, setAssistancePanelOpen] = useState(true);

  const buyerCompany = "Acme Corporation";
  const invitationMessage = "You have been invited to register as a vendor for Acme Corporation. Please complete the onboarding process to start doing business with us.";

  // Progress calculation
  const calculateProgress = () => {
    const steps: OnboardingStep[] = ["basic", "tax", "banking", "classification", "documents", "review"];
    const completedSteps = steps.filter((step) => isStepCompleted(step)).length;
    return Math.round((completedSteps / steps.length) * 100);
  };

  const isStepCompleted = (step: OnboardingStep): boolean => {
    switch (step) {
      case "basic":
        return !!(formData.companyName && formData.contactPerson && formData.country);
      case "tax":
        return !!(formData.taxId || formData.gstNumber);
      case "banking":
        return !!(formData.bankName && formData.accountNumber);
      case "classification":
        return !!(formData.businessType && formData.industryType);
      case "documents":
        return Object.keys(formData.documents).length >= 2;
      case "review":
        return false;
      default:
        return false;
    }
  };

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateField = async (field: string, value: string) => {
    if (!value) return;

    setValidationStates((prev) => ({ ...prev, [field]: "validating" }));
    
    // Simulate API validation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    let isValid = true;
    let message = "";
    
    if (field === "gstNumber") {
      isValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
      message = isValid ? "GST Number verified" : "Invalid GST Number format";
    } else if (field === "panNumber") {
      isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value);
      message = isValid ? "PAN Number verified" : "Invalid PAN Number format";
    } else if (field === "ifscCode") {
      isValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(value);
      message = isValid ? "IFSC Code verified" : "Invalid IFSC Code format";
    } else if (field === "accountNumber") {
      isValid = value.length >= 9 && value.length <= 18;
      message = isValid ? "Bank account verified" : "Invalid account number";
    }
    
    setValidationStates((prev) => ({ ...prev, [field]: isValid ? "success" : "error" }));
    setValidationMessages((prev) => ({ ...prev, [field]: message }));
  };

  const handleDocumentUpload = (docType: string, file: File) => {
    setFormData((prev) => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: {
          name: file.name,
          uploadedDate: new Date().toISOString().split("T")[0],
        },
      },
    }));
  };

  if (currentView === "invitation") {
    return <InvitationScreen buyerCompany={buyerCompany} message={invitationMessage} onAccept={() => setCurrentView("dashboard")} />;
  }

  if (currentView === "dashboard") {
    return (
      <DashboardScreen
        progress={calculateProgress()}
        onStartOnboarding={() => setCurrentView("onboarding")}
        isStepCompleted={isStepCompleted}
      />
    );
  }

  if (currentView === "onboarding") {
    return (
      <OnboardingWizard
        currentStep={currentStep}
        setCurrentStep={setCurrentStep}
        formData={formData}
        handleFieldChange={handleFieldChange}
        validateField={validateField}
        validationStates={validationStates}
        validationMessages={validationMessages}
        isStepCompleted={isStepCompleted}
        handleDocumentUpload={handleDocumentUpload}
        onBackToDashboard={() => setCurrentView("dashboard")}
        onSubmit={() => setCurrentView("confirmation")}
        assistancePanelOpen={assistancePanelOpen}
        setAssistancePanelOpen={setAssistancePanelOpen}
      />
    );
  }

  if (currentView === "clarification") {
    return <ClarificationScreen onResubmit={() => setCurrentView("onboarding")} />;
  }

  if (currentView === "confirmation") {
    return <ConfirmationScreen formData={formData} onConfirm={() => setCurrentView("approved")} onBack={() => setCurrentView("onboarding")} />;
  }

  if (currentView === "approved") {
    return <ApprovedScreen />;
  }

  return null;
}

// Screen 1: Invitation Acceptance
function InvitationScreen({ buyerCompany, message, onAccept }: { buyerCompany: string; message: string; onAccept: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F9FC] via-white to-[#E0F5F7] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[#00A9B7] rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">P</span>
            </div>
            <span className="text-2xl font-bold text-[#0A0F14]">Procinix</span>
          </div>
          <p className="text-sm text-[#64748B]">Vendor Management Portal</p>
        </div>

        {/* Invitation Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-[#E6EEF2] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00A9B7] to-[#008A96] p-8 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Vendor Invitation</h1>
            <p className="text-white/90">You've been invited to join our vendor network</p>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="bg-[#F6F9FC] rounded-xl p-6 mb-6 border border-[#E6EEF2]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#E0F5F7] rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-[#00A9B7]" />
                </div>
                <div>
                  <div className="text-xs text-[#64748B]">From</div>
                  <div className="font-semibold text-[#0A0F14]">{buyerCompany}</div>
                </div>
              </div>
              <p className="text-sm text-[#64748B] leading-relaxed">{message}</p>
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <FeatureItem icon={<CheckCircle2 className="w-5 h-5" />} text="Simple onboarding process" />
              <FeatureItem icon={<Shield className="w-5 h-5" />} text="Secure data encryption" />
              <FeatureItem icon={<Clock className="w-5 h-5" />} text="Save progress anytime" />
              <FeatureItem icon={<HelpCircle className="w-5 h-5" />} text="24/7 support available" />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={onAccept} className="flex-1 h-12 bg-[#00A9B7] hover:bg-[#008A96] text-white rounded-xl font-medium shadow-lg shadow-[#00A9B7]/20">
                <Lock className="w-4 h-4 mr-2" />
                Accept Invitation & Start
              </Button>
            </div>

            <p className="text-xs text-[#64748B] text-center mt-4">
              By accepting, you agree to our{" "}
              <a href="#" className="text-[#00A9B7] hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#00A9B7] hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[#00A9B7]">{icon}</div>
      <span className="text-sm text-[#0A0F14]">{text}</span>
    </div>
  );
}

// Screen 2: Vendor Dashboard
function DashboardScreen({
  progress,
  onStartOnboarding,
  isStepCompleted,
}: {
  progress: number;
  onStartOnboarding: () => void;
  isStepCompleted: (step: OnboardingStep) => boolean;
}) {
  const sections = [
    { id: "basic", label: "Basic Information", icon: <Building2 className="w-5 h-5" /> },
    { id: "tax", label: "Tax & Compliance", icon: <FileText className="w-5 h-5" /> },
    { id: "banking", label: "Banking Details", icon: <CreditCard className="w-5 h-5" /> },
    { id: "classification", label: "Business Classification", icon: <Globe className="w-5 h-5" /> },
    { id: "documents", label: "Document Upload", icon: <Upload className="w-5 h-5" /> },
    { id: "review", label: "Review & Submit", icon: <Send className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00A9B7] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div>
              <div className="font-semibold text-[#0A0F14]">Procinix</div>
              <div className="text-xs text-[#64748B]">Vendor Portal</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <StatusBadge status="warning" label="Draft" />
            <button className="text-[#64748B] hover:text-[#0A0F14]">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0A0F14] mb-2">Welcome to Your Vendor Portal</h1>
          <p className="text-[#64748B]">Complete your profile to start doing business with Acme Corporation</p>
        </div>

        {/* Progress Card */}
        <div className="bg-white rounded-2xl border border-[#E6EEF2] p-8 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#0A0F14] mb-1">Profile Completion</h2>
              <p className="text-sm text-[#64748B]">Complete all sections to submit your application</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-[#00A9B7]">{progress}%</div>
              <div className="text-xs text-[#64748B]">Completed</div>
            </div>
          </div>
          <div className="w-full h-3 bg-[#F6F9FC] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#00A9B7] to-[#008A96] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Sections Checklist */}
        <div className="bg-white rounded-2xl border border-[#E6EEF2] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#E6EEF2]">
            <h2 className="text-lg font-semibold text-[#0A0F14]">Onboarding Checklist</h2>
          </div>
          <div className="divide-y divide-[#E6EEF2]">
            {sections.map((section) => {
              const completed = isStepCompleted(section.id as OnboardingStep);
              return (
                <div key={section.id} className="p-6 flex items-center justify-between hover:bg-[#F6F9FC] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${completed ? "bg-[#E0F5F7] text-[#00A9B7]" : "bg-[#F6F9FC] text-[#94A3B8]"}`}>
                      {section.icon}
                    </div>
                    <div>
                      <div className="font-medium text-[#0A0F14]">{section.label}</div>
                      <div className="text-sm text-[#64748B]">{completed ? "Completed" : "Not started"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {completed ? (
                      <div className="w-8 h-8 bg-[#16A34A] rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 border-2 border-[#E6EEF2] rounded-full" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-8 flex justify-center">
          <Button onClick={onStartOnboarding} className="h-12 px-8 bg-[#00A9B7] hover:bg-[#008A96] text-white rounded-xl font-medium shadow-lg shadow-[#00A9B7]/20">
            {progress > 0 ? "Continue Onboarding" : "Start Onboarding"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Screen 3-6: Multi-Step Onboarding Wizard
function OnboardingWizard({
  currentStep,
  setCurrentStep,
  formData,
  handleFieldChange,
  validateField,
  validationStates,
  validationMessages,
  isStepCompleted,
  handleDocumentUpload,
  onBackToDashboard,
  onSubmit,
  assistancePanelOpen,
  setAssistancePanelOpen,
}: {
  currentStep: OnboardingStep;
  setCurrentStep: (step: OnboardingStep) => void;
  formData: FormData;
  handleFieldChange: (field: keyof FormData, value: string) => void;
  validateField: (field: string, value: string) => void;
  validationStates: Record<string, "idle" | "validating" | "success" | "error">;
  validationMessages: Record<string, string>;
  isStepCompleted: (step: OnboardingStep) => boolean;
  handleDocumentUpload: (docType: string, file: File) => void;
  onBackToDashboard: () => void;
  onSubmit: () => void;
  assistancePanelOpen: boolean;
  setAssistancePanelOpen: (open: boolean) => void;
}) {
  const steps: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
    { id: "basic", label: "Basic Information", icon: <Building2 className="w-4 h-4" /> },
    { id: "tax", label: "Tax & Compliance", icon: <FileText className="w-4 h-4" /> },
    { id: "banking", label: "Banking Details", icon: <CreditCard className="w-4 h-4" /> },
    { id: "classification", label: "Business Classification", icon: <Globe className="w-4 h-4" /> },
    { id: "documents", label: "Documents Upload", icon: <Upload className="w-4 h-4" /> },
    { id: "review", label: "Review & Submit", icon: <Send className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id);
    } else {
      onSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex">
      {/* Left Sidebar - Stepper */}
      <aside className="w-80 bg-white border-r border-[#E6EEF2] flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#E6EEF2]">
          <button onClick={onBackToDashboard} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-[#00A9B7] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-[#0A0F14]">Procinix</div>
              <div className="text-xs text-[#64748B]">Vendor Onboarding</div>
            </div>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex-1 p-6">
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = isStepCompleted(step.id);
              const isPast = currentStepIndex > index;

              return (
                <div key={step.id}>
                  <button
                    onClick={() => setCurrentStep(step.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-[#E0F5F7] text-[#00A9B7]"
                        : isPast || isCompleted
                        ? "text-[#0A0F14] hover:bg-[#F6F9FC]"
                        : "text-[#94A3B8] hover:bg-[#F6F9FC]"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {isCompleted || isPast ? (
                        <div className="w-8 h-8 bg-[#16A34A] rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm ${
                            isActive
                              ? "bg-[#00A9B7] text-white"
                              : "bg-[#F6F9FC] text-[#94A3B8]"
                          }`}
                        >
                          {index + 1}
                        </div>
                      )}
                      {index < steps.length - 1 && (
                        <div className="absolute left-4 top-10 w-0.5 h-8 bg-[#E6EEF2]" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${isActive ? "text-[#00A9B7]" : ""}`}>
                        {step.label}
                      </div>
                      {isCompleted && !isActive && (
                        <div className="text-xs text-[#16A34A]">Completed</div>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#E6EEF2]">
          <div className="flex items-center gap-2 text-xs text-[#64748B] mb-3">
            <Shield className="w-4 h-4" />
            <span>Your data is encrypted and secure</span>
          </div>
          <Button variant="outline" className="w-full text-sm">
            <Save className="w-4 h-4 mr-2" />
            Save Draft
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-white border-b border-[#E6EEF2] px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#0A0F14]">{steps[currentStepIndex].label}</h1>
            <p className="text-sm text-[#64748B]">Step {currentStepIndex + 1} of {steps.length}</p>
          </div>
          <button
            onClick={() => setAssistancePanelOpen(!assistancePanelOpen)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#00A9B7] hover:bg-[#E0F5F7] rounded-lg transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            {assistancePanelOpen ? "Hide" : "Show"} Help
          </button>
        </header>

        {/* Form Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-8">
            {currentStep === "basic" && (
              <BasicInformationForm formData={formData} handleFieldChange={handleFieldChange} />
            )}
            {currentStep === "tax" && (
              <TaxComplianceForm
                formData={formData}
                handleFieldChange={handleFieldChange}
                validateField={validateField}
                validationStates={validationStates}
                validationMessages={validationMessages}
              />
            )}
            {currentStep === "banking" && (
              <BankingDetailsForm
                formData={formData}
                handleFieldChange={handleFieldChange}
                validateField={validateField}
                validationStates={validationStates}
                validationMessages={validationMessages}
              />
            )}
            {currentStep === "classification" && (
              <BusinessClassificationForm formData={formData} handleFieldChange={handleFieldChange} />
            )}
            {currentStep === "documents" && (
              <DocumentsUploadForm formData={formData} handleDocumentUpload={handleDocumentUpload} />
            )}
            {currentStep === "review" && <ReviewSubmitForm formData={formData} />}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white border-t border-[#E6EEF2] px-8 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStepIndex === 0}
              className="px-6"
            >
              Previous
            </Button>
            <div className="text-sm text-[#64748B]">
              {currentStepIndex + 1} of {steps.length}
            </div>
            <Button
              onClick={handleNext}
              className="px-6 bg-[#00A9B7] hover:bg-[#008A96] text-white"
            >
              {currentStepIndex === steps.length - 1 ? "Submit Application" : "Next Step"}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Right Assistance Panel */}
      {assistancePanelOpen && (
        <AssistancePanel currentStep={currentStep} onClose={() => setAssistancePanelOpen(false)} />
      )}
    </div>
  );
}

// Form Components
function BasicInformationForm({
  formData,
  handleFieldChange,
}: {
  formData: FormData;
  handleFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Company Details */}
      <FormSection title="Company Details" description="Enter your company's legal information">
        <div className="grid grid-cols-2 gap-6">
          <FormField
            label="Company Name"
            required
            value={formData.companyName}
            onChange={(value) => handleFieldChange("companyName", value)}
            placeholder="e.g., Acme Industries"
          />
          <FormField
            label="Legal Name"
            required
            value={formData.legalName}
            onChange={(value) => handleFieldChange("legalName", value)}
            placeholder="e.g., Acme Industries Private Limited"
          />
          <FormField
            label="Website"
            value={formData.website}
            onChange={(value) => handleFieldChange("website", value)}
            placeholder="https://www.example.com"
          />
          <FormField
            label="Registration Number"
            required
            value={formData.registrationNumber}
            onChange={(value) => handleFieldChange("registrationNumber", value)}
            placeholder="e.g., U12345AB2020PTC123456"
          />
          <FormField
            label="Incorporation Date"
            type="date"
            required
            value={formData.incorporationDate}
            onChange={(value) => handleFieldChange("incorporationDate", value)}
          />
          <FormField
            label="Country"
            required
            value={formData.country}
            onChange={(value) => handleFieldChange("country", value)}
            placeholder="Select country"
          />
        </div>
      </FormSection>

      {/* Contact Information */}
      <FormSection title="Contact Information" description="Primary contact details for communication">
        <div className="grid grid-cols-2 gap-6">
          <FormField
            label="Contact Person Name"
            required
            value={formData.contactPerson}
            onChange={(value) => handleFieldChange("contactPerson", value)}
            placeholder="John Doe"
          />
          <FormField
            label="Contact Email"
            type="email"
            required
            value={formData.contactEmail}
            onChange={(value) => handleFieldChange("contactEmail", value)}
            placeholder="john@example.com"
          />
          <FormField
            label="Contact Phone"
            required
            value={formData.contactPhone}
            onChange={(value) => handleFieldChange("contactPhone", value)}
            placeholder="+1 (555) 123-4567"
          />
          <FormField
            label="Company Email"
            type="email"
            value={formData.companyEmail}
            onChange={(value) => handleFieldChange("companyEmail", value)}
            placeholder="contact@example.com"
          />
        </div>
      </FormSection>

      {/* Address */}
      <FormSection title="Registered Address" description="Company's registered office address">
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-2">
            <FormField
              label="Street Address"
              required
              value={formData.street}
              onChange={(value) => handleFieldChange("street", value)}
              placeholder="123 Main Street"
            />
          </div>
          <FormField
            label="City"
            required
            value={formData.city}
            onChange={(value) => handleFieldChange("city", value)}
            placeholder="San Francisco"
          />
          <FormField
            label="State/Province"
            required
            value={formData.state}
            onChange={(value) => handleFieldChange("state", value)}
            placeholder="California"
          />
          <FormField
            label="Postal Code"
            required
            value={formData.postalCode}
            onChange={(value) => handleFieldChange("postalCode", value)}
            placeholder="94102"
          />
        </div>
      </FormSection>
    </div>
  );
}

function TaxComplianceForm({
  formData,
  handleFieldChange,
  validateField,
  validationStates,
  validationMessages,
}: {
  formData: FormData;
  handleFieldChange: (field: keyof FormData, value: string) => void;
  validateField: (field: string, value: string) => void;
  validationStates: Record<string, "idle" | "validating" | "success" | "error">;
  validationMessages: Record<string, string>;
}) {
  return (
    <div className="space-y-8">
      <FormSection title="Tax Registration" description="Enter your tax identification numbers">
        <div className="grid grid-cols-2 gap-6">
          <ValidatedFormField
            label="Tax ID / EIN"
            required
            value={formData.taxId}
            onChange={(value) => handleFieldChange("taxId", value)}
            onBlur={() => validateField("taxId", formData.taxId)}
            placeholder="XX-XXXXXXX"
            validationState={validationStates.taxId}
            validationMessage={validationMessages.taxId}
          />
          <ValidatedFormField
            label="GST Number"
            value={formData.gstNumber}
            onChange={(value) => handleFieldChange("gstNumber", value)}
            onBlur={() => validateField("gstNumber", formData.gstNumber)}
            placeholder="22AAAAA0000A1Z5"
            validationState={validationStates.gstNumber}
            validationMessage={validationMessages.gstNumber}
          />
          <ValidatedFormField
            label="PAN Number"
            value={formData.panNumber}
            onChange={(value) => handleFieldChange("panNumber", value)}
            onBlur={() => validateField("panNumber", formData.panNumber)}
            placeholder="ABCDE1234F"
            validationState={validationStates.panNumber}
            validationMessage={validationMessages.panNumber}
          />
          <FormField
            label="VAT Number"
            value={formData.vatNumber}
            onChange={(value) => handleFieldChange("vatNumber", value)}
            placeholder="GB123456789"
          />
        </div>
      </FormSection>

      <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#3B82F6]/10 rounded-lg flex items-center justify-center">
              <Info className="w-5 h-5 text-[#3B82F6]" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-[#0A0F14] mb-1">Tax Verification</h3>
            <p className="text-sm text-[#64748B] mb-3">
              We automatically verify your tax registration numbers with government databases to ensure accuracy.
            </p>
            <a href="#" className="text-sm text-[#3B82F6] hover:underline flex items-center gap-1">
              Learn more about verification
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankingDetailsForm({
  formData,
  handleFieldChange,
  validateField,
  validationStates,
  validationMessages,
}: {
  formData: FormData;
  handleFieldChange: (field: keyof FormData, value: string) => void;
  validateField: (field: string, value: string) => void;
  validationStates: Record<string, "idle" | "validating" | "success" | "error">;
  validationMessages: Record<string, string>;
}) {
  return (
    <div className="space-y-8">
      <FormSection title="Bank Account Information" description="Primary bank account for payments">
        <div className="grid grid-cols-2 gap-6">
          <FormField
            label="Bank Name"
            required
            value={formData.bankName}
            onChange={(value) => handleFieldChange("bankName", value)}
            placeholder="e.g., State Bank of India"
          />
          <FormField
            label="Account Holder Name"
            required
            value={formData.accountName}
            onChange={(value) => handleFieldChange("accountName", value)}
            placeholder="As per bank records"
          />
          <ValidatedFormField
            label="Account Number"
            required
            value={formData.accountNumber}
            onChange={(value) => handleFieldChange("accountNumber", value)}
            onBlur={() => validateField("accountNumber", formData.accountNumber)}
            placeholder="XXXXXXXXXXXX"
            validationState={validationStates.accountNumber}
            validationMessage={validationMessages.accountNumber}
          />
          <ValidatedFormField
            label="IFSC Code"
            value={formData.ifscCode}
            onChange={(value) => handleFieldChange("ifscCode", value)}
            onBlur={() => validateField("ifscCode", formData.ifscCode)}
            placeholder="SBIN0001234"
            validationState={validationStates.ifscCode}
            validationMessage={validationMessages.ifscCode}
          />
          <FormField
            label="SWIFT Code"
            value={formData.swiftCode}
            onChange={(value) => handleFieldChange("swiftCode", value)}
            placeholder="SBININBBXXX"
          />
          <FormField
            label="IBAN"
            value={formData.iban}
            onChange={(value) => handleFieldChange("iban", value)}
            placeholder="GB00 XXXX 0000 0000 0000 00"
          />
        </div>
      </FormSection>

      <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#F59E0B]" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-[#0A0F14] mb-1">Bank Verification</h3>
            <p className="text-sm text-[#64748B]">
              We'll verify your bank account through a micro-deposit (₹1) which will be refunded immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessClassificationForm({
  formData,
  handleFieldChange,
}: {
  formData: FormData;
  handleFieldChange: (field: keyof FormData, value: string) => void;
}) {
  return (
    <div className="space-y-8">
      <FormSection title="Business Classification" description="Help us understand your business better">
        <div className="grid grid-cols-2 gap-6">
          <SelectField
            label="Business Type"
            required
            value={formData.businessType}
            onChange={(value) => handleFieldChange("businessType", value)}
            options={[
              { value: "", label: "Select business type" },
              { value: "manufacturer", label: "Manufacturer" },
              { value: "distributor", label: "Distributor" },
              { value: "service_provider", label: "Service Provider" },
              { value: "reseller", label: "Reseller" },
              { value: "consultant", label: "Consultant" },
            ]}
          />
          <SelectField
            label="Industry Type"
            required
            value={formData.industryType}
            onChange={(value) => handleFieldChange("industryType", value)}
            options={[
              { value: "", label: "Select industry" },
              { value: "technology", label: "Technology" },
              { value: "manufacturing", label: "Manufacturing" },
              { value: "retail", label: "Retail" },
              { value: "healthcare", label: "Healthcare" },
              { value: "finance", label: "Finance" },
              { value: "logistics", label: "Logistics" },
            ]}
          />
          <SelectField
            label="Company Size"
            required
            value={formData.companySize}
            onChange={(value) => handleFieldChange("companySize", value)}
            options={[
              { value: "", label: "Select company size" },
              { value: "1-10", label: "1-10 employees" },
              { value: "11-50", label: "11-50 employees" },
              { value: "51-200", label: "51-200 employees" },
              { value: "201-500", label: "201-500 employees" },
              { value: "500+", label: "500+ employees" },
            ]}
          />
          <SelectField
            label="Annual Revenue"
            value={formData.annualRevenue}
            onChange={(value) => handleFieldChange("annualRevenue", value)}
            options={[
              { value: "", label: "Select revenue range" },
              { value: "0-1m", label: "Under $1M" },
              { value: "1-10m", label: "$1M - $10M" },
              { value: "10-50m", label: "$10M - $50M" },
              { value: "50-100m", label: "$50M - $100M" },
              { value: "100m+", label: "Over $100M" },
            ]}
          />
        </div>
      </FormSection>
    </div>
  );
}

function DocumentsUploadForm({
  formData,
  handleDocumentUpload,
}: {
  formData: FormData;
  handleDocumentUpload: (docType: string, file: File) => void;
}) {
  const requiredDocs = [
    { id: "certificate_of_incorporation", label: "Certificate of Incorporation", required: true },
    { id: "tax_registration", label: "Tax Registration Certificate", required: true },
    { id: "bank_statement", label: "Bank Statement (Last 3 months)", required: true },
    { id: "pan_card", label: "PAN Card", required: false },
    { id: "gst_certificate", label: "GST Registration Certificate", required: false },
    { id: "quality_certificate", label: "Quality Certification (ISO, etc.)", required: false },
  ];

  return (
    <div className="space-y-8">
      <FormSection
        title="Document Upload"
        description="Upload required documents to complete your profile"
      >
        <div className="space-y-4">
          {requiredDocs.map((doc) => {
            const isUploaded = !!formData.documents[doc.id];
            return (
              <DocumentUploadCard
                key={doc.id}
                label={doc.label}
                required={doc.required}
                isUploaded={isUploaded}
                uploadedFile={formData.documents[doc.id]}
                onUpload={(file) => handleDocumentUpload(doc.id, file)}
              />
            );
          })}
        </div>
      </FormSection>

      <div className="bg-[#F0FDF4] border border-[#16A34A]/20 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-[#16A34A]/10 rounded-lg flex items-center justify-center">
              <FileCheck className="w-5 h-5 text-[#16A34A]" />
            </div>
          </div>
          <div>
            <h3 className="font-medium text-[#0A0F14] mb-1">Accepted File Formats</h3>
            <p className="text-sm text-[#64748B]">
              PDF, JPG, PNG (Max 10MB per file)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DocumentUploadCard({
  label,
  required,
  isUploaded,
  uploadedFile,
  onUpload,
}: {
  label: string;
  required: boolean;
  isUploaded: boolean;
  uploadedFile?: { name: string; uploadedDate: string; expiryDate?: string };
  onUpload: (file: File) => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div className="border border-[#E6EEF2] rounded-xl p-6 hover:border-[#00A9B7]/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isUploaded ? "bg-[#E0F5F7]" : "bg-[#F6F9FC]"}`}>
            {isUploaded ? (
              <CheckCircle2 className="w-5 h-5 text-[#00A9B7]" />
            ) : (
              <FileText className="w-5 h-5 text-[#94A3B8]" />
            )}
          </div>
          <div>
            <div className="font-medium text-[#0A0F14] flex items-center gap-2">
              {label}
              {required && <span className="text-[#DC2626] text-xs">*</span>}
            </div>
            {isUploaded && uploadedFile && (
              <div className="text-sm text-[#64748B] mt-1">
                {uploadedFile.name} • Uploaded {uploadedFile.uploadedDate}
              </div>
            )}
          </div>
        </div>
        {isUploaded ? (
          <StatusBadge status="success" label="Uploaded" />
        ) : (
          <StatusBadge status="neutral" label="Pending" />
        )}
      </div>

      <div className="flex gap-3">
        <label className="flex-1">
          <input
            type="file"
            className="hidden"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
          />
          <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-[#E6EEF2] rounded-lg hover:border-[#00A9B7] hover:bg-[#E0F5F7]/30 transition-all cursor-pointer">
            <Upload className="w-4 h-4 text-[#00A9B7]" />
            <span className="text-sm font-medium text-[#00A9B7]">
              {isUploaded ? "Replace File" : "Upload File"}
            </span>
          </div>
        </label>
        {isUploaded && (
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ReviewSubmitForm({ formData }: { formData: FormData }) {
  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-[#E0F5F7] to-[#F6F9FC] rounded-2xl p-8 border border-[#00A9B7]/20">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-[#00A9B7] rounded-xl flex items-center justify-center">
            <Eye className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#0A0F14]">Review Your Information</h2>
            <p className="text-sm text-[#64748B]">Please review all details before submitting</p>
          </div>
        </div>
      </div>

      {/* Summary Sections */}
      <ReviewSection title="Basic Information" data={[
        { label: "Company Name", value: formData.companyName },
        { label: "Legal Name", value: formData.legalName },
        { label: "Contact Person", value: formData.contactPerson },
        { label: "Email", value: formData.contactEmail },
        { label: "Country", value: formData.country },
      ]} />

      <ReviewSection title="Tax & Compliance" data={[
        { label: "Tax ID", value: formData.taxId },
        { label: "GST Number", value: formData.gstNumber },
        { label: "PAN Number", value: formData.panNumber },
      ]} />

      <ReviewSection title="Banking Details" data={[
        { label: "Bank Name", value: formData.bankName },
        { label: "Account Number", value: formData.accountNumber ? "****" + formData.accountNumber.slice(-4) : "" },
        { label: "IFSC Code", value: formData.ifscCode },
      ]} />

      <ReviewSection title="Documents" data={[
        { label: "Uploaded Documents", value: `${Object.keys(formData.documents).length} files` },
      ]} />

      {/* Declaration */}
      <div className="bg-white border border-[#E6EEF2] rounded-xl p-6">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="declaration"
            className="mt-1 w-4 h-4 text-[#00A9B7] border-[#E6EEF2] rounded focus:ring-[#00A9B7]"
          />
          <label htmlFor="declaration" className="text-sm text-[#0A0F14]">
            I hereby declare that all the information provided is true and accurate to the best of my knowledge.
            I understand that any false information may result in rejection of my application.
          </label>
        </div>
      </div>
    </div>
  );
}

function ReviewSection({ title, data }: { title: string; data: { label: string; value: string }[] }) {
  return (
    <div className="bg-white border border-[#E6EEF2] rounded-xl overflow-hidden">
      <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
        <h3 className="font-semibold text-[#0A0F14]">{title}</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {data.map((item, index) => (
            <div key={index}>
              <div className="text-xs text-[#64748B] mb-1">{item.label}</div>
              <div className="text-sm font-medium text-[#0A0F14]">{item.value || "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Screen 7: Submission Confirmation
function ConfirmationScreen({ formData, onConfirm, onBack }: { formData: FormData; onConfirm: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F6F9FC] via-white to-[#E0F5F7] flex items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl border border-[#E6EEF2] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#00A9B7] to-[#008A96] p-8 text-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Send className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Ready to Submit</h1>
            <p className="text-white/90">Your application is complete and ready for review</p>
          </div>

          {/* Body */}
          <div className="p-8">
            {/* Validation Results */}
            <div className="space-y-3 mb-8">
              <ValidationResult status="success" text="All required fields completed" />
              <ValidationResult status="success" text="Tax information verified" />
              <ValidationResult status="success" text="Banking details validated" />
              <ValidationResult status="success" text="All documents uploaded" />
            </div>

            {/* What Happens Next */}
            <div className="bg-[#F6F9FC] rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-[#0A0F14] mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00A9B7]" />
                What Happens Next?
              </h3>
              <ol className="space-y-3">
                <li className="flex gap-3 text-sm text-[#64748B]">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#00A9B7] text-white rounded-full flex items-center justify-center text-xs font-medium">1</span>
                  <span>Your application will be reviewed by our compliance team</span>
                </li>
                <li className="flex gap-3 text-sm text-[#64748B]">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#00A9B7] text-white rounded-full flex items-center justify-center text-xs font-medium">2</span>
                  <span>You'll receive updates via email at {formData.contactEmail}</span>
                </li>
                <li className="flex gap-3 text-sm text-[#64748B]">
                  <span className="flex-shrink-0 w-6 h-6 bg-[#00A9B7] text-white rounded-full flex items-center justify-center text-xs font-medium">3</span>
                  <span>Approval typically takes 3-5 business days</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" onClick={onBack} className="flex-1">
                <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                Go Back
              </Button>
              <Button onClick={onConfirm} className="flex-1 bg-[#00A9B7] hover:bg-[#008A96] text-white shadow-lg shadow-[#00A9B7]/20">
                <Send className="w-4 h-4 mr-2" />
                Submit Application
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValidationResult({ status, text }: { status: "success" | "warning" | "error"; text: string }) {
  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />,
    warning: <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />,
    error: <AlertCircle className="w-5 h-5 text-[#DC2626]" />,
  };

  return (
    <div className="flex items-center gap-3 p-3 bg-white border border-[#E6EEF2] rounded-lg">
      {icons[status]}
      <span className="text-sm text-[#0A0F14]">{text}</span>
    </div>
  );
}

// Screen 8: Post-Approval Vendor View
function ApprovedScreen() {
  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00A9B7] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div>
              <div className="font-semibold text-[#0A0F14]">Procinix</div>
              <div className="text-xs text-[#64748B]">Vendor Portal</div>
            </div>
          </div>
          <StatusBadge status="success" label="Approved" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-[#16A34A] to-[#15803D] rounded-2xl p-8 text-white mb-8 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-1">Congratulations! 🎉</h1>
              <p className="text-white/90">Your vendor registration has been approved</p>
            </div>
          </div>
        </div>

        {/* Vendor Details */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <InfoCard
            title="Vendor Code"
            value="VEN-2026-001234"
            icon={<Building2 className="w-5 h-5" />}
          />
          <InfoCard
            title="Payment Terms"
            value="Net 30 Days"
            icon={<Calendar className="w-5 h-5" />}
          />
          <InfoCard
            title="Status"
            value="Active"
            icon={<CheckCircle2 className="w-5 h-5" />}
            valueColor="text-[#16A34A]"
          />
        </div>

        {/* Entity Mapping */}
        <div className="bg-white rounded-2xl border border-[#E6EEF2] overflow-hidden mb-6 shadow-sm">
          <div className="bg-[#F6F9FC] px-6 py-4 border-b border-[#E6EEF2]">
            <h2 className="font-semibold text-[#0A0F14]">Entity Mapping</h2>
          </div>
          <div className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-xs text-[#64748B] mb-1">Mapped to Company</div>
                <div className="text-sm font-medium text-[#0A0F14]">Acme Corporation</div>
              </div>
              <div>
                <div className="text-xs text-[#64748B] mb-1">Business Unit</div>
                <div className="text-sm font-medium text-[#0A0F14]">Procurement Division</div>
              </div>
              <div>
                <div className="text-xs text-[#64748B] mb-1">Category</div>
                <div className="text-sm font-medium text-[#0A0F14]">IT Services</div>
              </div>
              <div>
                <div className="text-xs text-[#64748B] mb-1">Buyer Contact</div>
                <div className="text-sm font-medium text-[#0A0F14]">John Smith (john@acme.com)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Button className="flex-1 bg-[#00A9B7] hover:bg-[#008A96] text-white">
            <FileText className="w-4 h-4 mr-2" />
            View Full Profile
          </Button>
          <Button variant="outline" className="flex-1">
            <RefreshCw className="w-4 h-4 mr-2" />
            Request Profile Change
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  icon,
  valueColor = "text-[#0A0F14]",
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  valueColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-[#E0F5F7] rounded-lg flex items-center justify-center text-[#00A9B7]">
          {icon}
        </div>
      </div>
      <div className="text-xs text-[#64748B] mb-1">{title}</div>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
    </div>
  );
}

// Screen 6: Clarification Response
function ClarificationScreen({ onResubmit }: { onResubmit: () => void }) {
  const clarifications = [
    {
      field: "GST Number",
      issue: "GST Number format appears incorrect",
      buyerComment: "Please verify and re-enter your GST number. It should be in format: 22AAAAA0000A1Z5",
    },
    {
      field: "Bank Statement",
      issue: "Document not readable",
      buyerComment: "The uploaded bank statement is not clear. Please upload a better quality PDF or image.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#00A9B7] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div>
              <div className="font-semibold text-[#0A0F14]">Procinix</div>
              <div className="text-xs text-[#64748B]">Vendor Portal</div>
            </div>
          </div>
          <StatusBadge status="warning" label="Clarification Needed" />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Alert Banner */}
        <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#F59E0B]/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-[#F59E0B]" />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#0A0F14] mb-1">Action Required</h2>
              <p className="text-sm text-[#64748B]">
                Our team has reviewed your application and needs clarification on a few items. Please address the issues below and resubmit.
              </p>
            </div>
          </div>
        </div>

        {/* Clarification Items */}
        <div className="space-y-6 mb-8">
          {clarifications.map((item, index) => (
            <div key={index} className="bg-white border-2 border-[#F59E0B]/30 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-[#F59E0B] text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-[#0A0F14]">{item.field}</span>
                    <span className="text-xs bg-[#FEF3C7] text-[#F59E0B] px-2 py-1 rounded">
                      {item.issue}
                    </span>
                  </div>
                  <div className="bg-[#F6F9FC] rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 text-[#64748B] mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-xs text-[#64748B] mb-1">Buyer Comment</div>
                        <p className="text-sm text-[#0A0F14]">{item.buyerComment}</p>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-2" />
                    Update This Field
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resubmit Button */}
        <div className="flex justify-center">
          <Button onClick={onResubmit} className="px-8 bg-[#00A9B7] hover:bg-[#008A96] text-white">
            <Send className="w-4 h-4 mr-2" />
            Resubmit Application
          </Button>
        </div>
      </div>
    </div>
  );
}

// Right Assistance Panel
function AssistancePanel({ currentStep, onClose }: { currentStep: OnboardingStep; onClose: () => void }) {
  const helpContent: Record<OnboardingStep, { title: string; tips: string[]; faqs: { q: string; a: string }[] }> = {
    basic: {
      title: "Basic Information Help",
      tips: [
        "Enter your company name exactly as it appears on official documents",
        "Legal name should match your certificate of incorporation",
        "Contact person should be authorized to complete this registration",
      ],
      faqs: [
        { q: "What is the difference between company name and legal name?", a: "Company name is your trading name, while legal name is the registered name on incorporation documents." },
        { q: "Can I change information later?", a: "Yes, you can request changes after approval through the change request process." },
      ],
    },
    tax: {
      title: "Tax & Compliance Help",
      tips: [
        "GST format: 22AAAAA0000A1Z5 (15 characters)",
        "PAN format: AAAAA9999A (10 characters)",
        "We automatically verify tax numbers with government databases",
      ],
      faqs: [
        { q: "What if my company is not GST registered?", a: "You can skip the GST field if not applicable to your business." },
        { q: "How long does verification take?", a: "Tax verification typically completes within 1-2 seconds." },
      ],
    },
    banking: {
      title: "Banking Details Help",
      tips: [
        "Account name should match your company's legal name",
        "Double-check account number before submitting",
        "IFSC code uniquely identifies your bank branch",
      ],
      faqs: [
        { q: "Is my banking information secure?", a: "Yes, all data is encrypted and stored securely per PCI-DSS standards." },
        { q: "Can I add multiple bank accounts?", a: "You can add additional accounts after initial approval." },
      ],
    },
    classification: {
      title: "Business Classification Help",
      tips: [
        "Choose the category that best describes your primary business",
        "This helps us match you with relevant opportunities",
        "Industry classification impacts your risk assessment",
      ],
      faqs: [
        { q: "What if my business spans multiple industries?", a: "Select your primary industry. You can add secondary industries later." },
      ],
    },
    documents: {
      title: "Document Upload Help",
      tips: [
        "Accepted formats: PDF, JPG, PNG (Max 10MB)",
        "Ensure documents are clear and readable",
        "Documents should be current and not expired",
      ],
      faqs: [
        { q: "What if I don't have all documents now?", a: "You can save as draft and upload remaining documents later." },
        { q: "How long are documents stored?", a: "Documents are securely stored for the duration of our business relationship." },
      ],
    },
    review: {
      title: "Review & Submit Help",
      tips: [
        "Carefully review all entered information",
        "Check that all required documents are uploaded",
        "Declaration is legally binding",
      ],
      faqs: [
        { q: "How long does approval take?", a: "Typically 3-5 business days after submission." },
        { q: "Will I be notified of status updates?", a: "Yes, you'll receive email notifications at each stage." },
      ],
    },
  };

  const content = helpContent[currentStep];

  return (
    <aside className="w-96 bg-white border-l border-[#E6EEF2] flex flex-col shadow-xl">
      {/* Header */}
      <div className="p-6 border-b border-[#E6EEF2] flex items-center justify-between">
        <h3 className="font-semibold text-[#0A0F14] flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#00A9B7]" />
          Help & Support
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-[#F6F9FC] rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-[#64748B]" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Tips Section */}
        <div>
          <h4 className="font-semibold text-[#0A0F14] mb-3 text-sm">{content.title}</h4>
          <div className="space-y-2">
            {content.tips.map((tip, index) => (
              <div key={index} className="flex gap-2 text-sm text-[#64748B]">
                <Sparkles className="w-4 h-4 text-[#00A9B7] flex-shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h4 className="font-semibold text-[#0A0F14] mb-3 text-sm">Frequently Asked Questions</h4>
          <div className="space-y-4">
            {content.faqs.map((faq, index) => (
              <div key={index} className="bg-[#F6F9FC] rounded-lg p-4">
                <div className="font-medium text-[#0A0F14] text-sm mb-2">{faq.q}</div>
                <div className="text-sm text-[#64748B]">{faq.a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-gradient-to-br from-[#E0F5F7] to-[#F6F9FC] rounded-xl p-6 border border-[#00A9B7]/20">
          <h4 className="font-semibold text-[#0A0F14] mb-3 text-sm">Need More Help?</h4>
          <div className="space-y-3">
            <a
              href="mailto:support@procinix.com"
              className="flex items-center gap-3 text-sm text-[#0A0F14] hover:text-[#00A9B7] transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#00A9B7]" />
              </div>
              <div>
                <div className="font-medium">Email Support</div>
                <div className="text-xs text-[#64748B]">support@procinix.com</div>
              </div>
            </a>
            <a
              href="tel:+15551234567"
              className="flex items-center gap-3 text-sm text-[#0A0F14] hover:text-[#00A9B7] transition-colors"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#00A9B7]" />
              </div>
              <div>
                <div className="font-medium">Phone Support</div>
                <div className="text-xs text-[#64748B]">+1 (555) 123-4567</div>
              </div>
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

// Form Components
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E6EEF2] p-8">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#0A0F14] mb-1">{title}</h3>
        <p className="text-sm text-[#64748B]">{description}</p>
      </div>
      {children}
    </div>
  );
}

function FormField({
  label,
  required = false,
  type = "text",
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-[#0A0F14] mb-2 flex items-center gap-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 border-[#E6EEF2] focus:border-[#00A9B7] focus:ring-[#00A9B7]"
      />
    </div>
  );
}

function ValidatedFormField({
  label,
  required = false,
  value,
  onChange,
  onBlur,
  placeholder,
  validationState,
  validationMessage,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  validationState?: "idle" | "validating" | "success" | "error";
  validationMessage?: string;
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-[#0A0F14] mb-2 flex items-center gap-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`h-11 pr-10 ${
            validationState === "success"
              ? "border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]"
              : validationState === "error"
              ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]"
              : "border-[#E6EEF2] focus:border-[#00A9B7] focus:ring-[#00A9B7]"
          }`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validationState === "validating" && (
            <Loader2 className="w-4 h-4 text-[#00A9B7] animate-spin" />
          )}
          {validationState === "success" && (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
          )}
          {validationState === "error" && (
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
          )}
        </div>
      </div>
      {validationMessage && (
        <p
          className={`text-xs mt-1 ${
            validationState === "success" ? "text-[#16A34A]" : "text-[#DC2626]"
          }`}
        >
          {validationMessage}
        </p>
      )}
    </div>
  );
}

function SelectField({
  label,
  required = false,
  value,
  onChange,
  options,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label className="text-sm font-medium text-[#0A0F14] mb-2 flex items-center gap-1">
        {label}
        {required && <span className="text-[#DC2626]">*</span>}
      </Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 px-3 bg-white border border-[#E6EEF2] rounded-lg text-sm focus:outline-none focus:border-[#00A9B7] focus:ring-2 focus:ring-[#00A9B7]/20"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Edit({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Clock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
