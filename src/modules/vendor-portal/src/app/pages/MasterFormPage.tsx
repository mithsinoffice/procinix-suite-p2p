import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  ChevronRight,
  Info,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {  } from "../components/design-system/StatusBadge";

// Master configuration
const masterConfigs: Record<string, { title: string; description: string; icon: string }> = {
  "vendor-type": {
    title: "Vendor Type",
    description: "Classify vendors based on their business relationship and transaction characteristics",
    icon: "🏢",
  },
  "vendor-category": {
    title: "Vendor Category",
    description: "Group vendors by industry vertical or procurement category",
    icon: "📁",
  },
  country: {
    title: "Country",
    description: "Manage geographic locations with tax jurisdiction and compliance requirements",
    icon: "🌍",
  },
  currency: {
    title: "Currency",
    description: "Define currencies for international transactions and exchange rate management",
    icon: "💰",
  },
  "payment-terms": {
    title: "Payment Terms",
    description: "Configure credit periods and payment schedules for vendor transactions",
    icon: "📅",
  },
  "risk-factors": {
    title: "Risk Factors",
    description: "Define parameters used to calculate overall vendor risk scores",
    icon: "⚠️",
  },
  "workflow-types": {
    title: "Workflow Types",
    description: "Configure approval workflow types for different vendor processes",
    icon: "🔄",
  },
};

type FormStatus = "draft" | "under-review" | "approved" | "active";

export function MasterFormPage() {
  const { masterType, recordId } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!recordId;

  const config = masterConfigs[masterType || ""] || {
    title: "Master Data",
    description: "Manage master data records",
    icon: "📄",
  };

  const [formStatus, setFormStatus] = useState<FormStatus>("draft");
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const handleSubmit = (saveType: "draft" | "submit") => {
    console.log("Submitting form:", { saveType, formData });
    // In real implementation, this would call an API
    if (saveType === "submit") {
      setFormStatus("under-review");
    }
    // Navigate back after a short delay (simulating API call)
    setTimeout(() => {
      navigate(`/masters/${masterType}`);
    }, 500);
  };

  const handleCancel = () => {
    navigate(`/masters/${masterType}`);
  };

  const getStatusConfig = (status: FormStatus) => {
    switch (status) {
      case "draft":
        return {
          label: "Draft",
          color: "bg-[#94A3B8]",
          icon: <FileText className="w-4 h-4" />,
          description: "Record is being prepared",
        };
      case "under-review":
        return {
          label: "Under Review",
          color: "bg-[#F59E0B]",
          icon: <Clock className="w-4 h-4" />,
          description: "Awaiting approval from administrators",
        };
      case "approved":
        return {
          label: "Approved",
          color: "bg-[#16A34A]",
          icon: <CheckCircle className="w-4 h-4" />,
          description: "Record approved, ready to activate",
        };
      case "active":
        return {
          label: "Active",
          color: "bg-[#00A9B7]",
          icon: <CheckCircle className="w-4 h-4" />,
          description: "Record is live and available for use",
        };
    }
  };

  const statusConfig = getStatusConfig(formStatus);

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-[#E6EEF2]">
        <div className="px-10 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-[#64748B] mb-3">
                <Link to="/vendors/dashboard" className="hover:text-[#00A9B7]">
                  Administration
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>Masters</span>
                <ChevronRight className="w-4 h-4" />
                <Link to={`/masters/${masterType}`} className="hover:text-[#00A9B7]">
                  {config.title}
                </Link>
                <ChevronRight className="w-4 h-4" />
                <span>{isEditMode ? "Edit" : "Create"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.icon}</span>
                <h1 className="text-3xl font-bold text-[#0A0F14]">
                  {isEditMode ? "Edit" : "Create"} {config.title}
                </h1>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-11 px-6 border-[#E6EEF2]"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>

          {/* Status Indicator */}
          <div className={`${statusConfig.color} text-white rounded-xl p-5 flex items-center gap-4`}>
            <div className="flex items-center gap-3 flex-1">
              {statusConfig.icon}
              <div>
                <div className="font-semibold text-base">{statusConfig.label}</div>
                <div className="text-sm text-white/90">{statusConfig.description}</div>
              </div>
            </div>
            {formStatus === "draft" && (
              <div className="text-sm text-white/90">Unsaved changes</div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-10 py-8">
        <div className="max-w-4xl">
          {/* Basic Information Section */}
          <section className="bg-white rounded-2xl border border-[#E6EEF2] p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
              <h2 className="text-xl font-bold text-[#0A0F14]">Basic Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                  Code <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value.toUpperCase() })
                  }
                  placeholder="e.g., DOM, IMP, SEZ"
                  className="border-[#E6EEF2] font-mono h-12"
                  required
                />
                <p className="text-xs text-[#64748B] mt-2">
                  Unique identifier code (uppercase alphanumeric, no spaces)
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                  Name <span className="text-[#DC2626]">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter display name"
                  className="border-[#E6EEF2] h-12"
                  required
                />
                <p className="text-xs text-[#64748B] mt-2">
                  Human-readable name displayed throughout the system
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium text-[#0A0F14] mb-2 block">
                  Description <span className="text-[#DC2626]">*</span>
                </Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed description for this master record"
                  className="border-[#E6EEF2] min-h-[120px]"
                  rows={5}
                  required
                />
                <p className="text-xs text-[#64748B] mt-2">
                  Provide clear explanation of purpose and usage guidelines
                </p>
              </div>
            </div>
          </section>

          {/* Status Configuration Section */}
          <section className="bg-white rounded-2xl border border-[#E6EEF2] p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-[#00A9B7] rounded-full" />
              <h2 className="text-xl font-bold text-[#0A0F14]">Status Configuration</h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label
                  className={`flex items-center gap-4 p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.status === "active"
                      ? "border-[#00A9B7] bg-[#E0F5F7]"
                      : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === "active"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-5 h-5 text-[#00A9B7]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#0A0F14] mb-1">Active</div>
                    <div className="text-xs text-[#64748B]">
                      Available for selection and use across the system
                    </div>
                  </div>
                  <CheckCircle className="w-6 h-6 text-[#16A34A]" />
                </label>

                <label
                  className={`flex items-center gap-4 p-6 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.status === "inactive"
                      ? "border-[#00A9B7] bg-[#E0F5F7]"
                      : "border-[#E6EEF2] hover:border-[#00A9B7]/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === "inactive"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as "active" | "inactive",
                      })
                    }
                    className="w-5 h-5 text-[#00A9B7]"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-[#0A0F14] mb-1">Inactive</div>
                    <div className="text-xs text-[#64748B]">
                      Hidden from selection menus and new transactions
                    </div>
                  </div>
                  <AlertCircle className="w-6 h-6 text-[#64748B]" />
                </label>
              </div>
            </div>
          </section>

          {/* Information Panel */}
          <div className="bg-[#EFF6FF] border border-[#3B82F6]/20 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-[#3B82F6] flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0A0F14] mb-2">Configuration Guidelines</h3>
                <ul className="text-sm text-[#64748B] space-y-2">
                  <li>• All fields marked with asterisk (*) are mandatory</li>
                  <li>• Code must be unique and cannot be changed after creation</li>
                  <li>
                    • Changes to active records may impact existing vendor data and transactions
                  </li>
                  <li>• Inactive records remain in the database but are hidden from selection</li>
                  <li>• Submit for approval to activate this master record system-wide</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Impact Warning (for Edit Mode) */}
          {isEditMode && (
            <div className="bg-[#FEF3C7] border border-[#F59E0B]/20 rounded-xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-[#0A0F14] mb-2">Impact Warning</h3>
                  <p className="text-sm text-[#64748B] leading-relaxed">
                    This master record is currently used by <strong>1,245 vendors</strong>.
                    Modifications will affect existing data and may require system-wide
                    reconfiguration. Review all changes carefully before submission.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="sticky bottom-0 bg-white border-t border-[#E6EEF2] px-10 py-6 shadow-2xl">
        <div className="max-w-4xl flex items-center justify-between">
          <div className="text-sm text-[#64748B]">
            <strong>Required fields:</strong> Code, Name, Description, Status
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="h-11 px-6 border-[#E6EEF2]"
            >
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
