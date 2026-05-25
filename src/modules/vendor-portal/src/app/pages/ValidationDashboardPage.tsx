import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  CreditCard,
  ShieldAlert,
  Users,
  Send,
} from "lucide-react";
import { RiskMeter } from "../components/design-system/RiskMeter";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { Button } from "../components/ui/button";
import { mockVendorRequests } from "../data/mockData";

export function ValidationDashboardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = mockVendorRequests.find((v) => v.id === id);

  const handleSendForApproval = () => {
    navigate(`/vendors/requests/${id}/approval`);
  };

  if (!vendor) {
    return <div className="p-8">Vendor not found</div>;
  }

  const validationResults = [
    {
      title: "Tax Validation",
      status: "success" as const,
      icon: FileCheck,
      checks: [
        { name: "GST Number Format", status: "passed", message: "Valid format" },
        { name: "GST Registration Status", status: "passed", message: "Active registration" },
        { name: "PAN Verification", status: "passed", message: "Verified with NSDL" },
        { name: "TAN Verification", status: "passed", message: "Valid TAN number" },
      ],
    },
    {
      title: "Bank Verification",
      status: "success" as const,
      icon: CreditCard,
      checks: [
        { name: "Penny Drop Test", status: "passed", message: "Account verified" },
        { name: "Account Status", status: "passed", message: "Active account" },
        { name: "Name Match", status: "passed", message: "98% match" },
        { name: "IFSC Code Validation", status: "passed", message: "Valid IFSC" },
      ],
    },
    {
      title: "Sanctions Screening",
      status: "success" as const,
      icon: ShieldAlert,
      checks: [
        { name: "OFAC Screening", status: "passed", message: "No matches found" },
        { name: "UN Sanctions List", status: "passed", message: "No matches found" },
        { name: "EU Sanctions List", status: "passed", message: "No matches found" },
        { name: "PEP Screening", status: "passed", message: "No matches found" },
      ],
    },
    {
      title: "Duplicate Vendor Detection",
      status: "warning" as const,
      icon: Users,
      checks: [
        { name: "Name Similarity", status: "warning", message: "Similar vendor found: Tech Innovators LLC" },
        { name: "Address Match", status: "passed", message: "No duplicate addresses" },
        { name: "Tax ID Match", status: "passed", message: "No duplicate tax IDs" },
        { name: "Bank Account Match", status: "passed", message: "No duplicate accounts" },
      ],
    },
    {
      title: "Document Completeness",
      status: "warning" as const,
      icon: FileCheck,
      checks: [
        { name: "Incorporation Certificate", status: "passed", message: "Uploaded" },
        { name: "Tax Certificate", status: "warning", message: "Missing" },
        { name: "Bank Proof", status: "warning", message: "Missing" },
        { name: "PAN Card", status: "passed", message: "Uploaded" },
      ],
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link to={`/vendors/requests/${id}/edit`} className="text-sm text-[#00A9B7] hover:underline mb-2 block">
                ← Back to Edit
              </Link>
              <h1 className="text-2xl font-semibold text-[#0A0F14]">Validation & Risk Intelligence</h1>
              <p className="text-sm text-[#64748B]">{vendor.legalName} • {vendor.requestId}</p>
            </div>

            <Button
              onClick={handleSendForApproval}
              className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
            >
              <Send className="w-4 h-4" />
              Send for Department Approval
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Risk Score Card */}
          <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm p-8 mb-6">
            <h2 className="text-xl font-semibold text-[#0A0F14] mb-6 text-center">Overall Risk Assessment</h2>
            <div className="flex justify-center">
              <RiskMeter score={vendor.validationScore || 25} size="lg" />
            </div>
          </div>

          {/* Validation Results Grid */}
          <div className="grid grid-cols-2 gap-6">
            {validationResults.map((result, index) => {
              const Icon = result.icon;
              const isSuccess = result.status === "success";
              const isWarning = result.status === "warning";
              
              return (
                <div key={index} className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
                  <div className={`p-6 ${isSuccess ? 'bg-green-50' : isWarning ? 'bg-amber-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        isSuccess ? 'bg-green-100' : isWarning ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        <Icon className={`w-6 h-6 ${
                          isSuccess ? 'text-green-600' : isWarning ? 'text-amber-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-[#0A0F14]">{result.title}</h3>
                        {isSuccess && <StatusBadge status="success" label="Passed" size="sm" />}
                        {isWarning && <StatusBadge status="warning" label="Needs Review" size="sm" />}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    {result.checks.map((check, checkIndex) => (
                      <div key={checkIndex} className="flex items-start gap-3">
                        {check.status === "passed" ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : check.status === "warning" ? (
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-[#0A0F14]">{check.name}</p>
                          <p className="text-xs text-[#64748B]">{check.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Section */}
          <div className="mt-8 bg-[#E0F5F7] border border-[#00A9B7] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="w-6 h-6 text-[#00A9B7] flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-[#0A0F14] mb-2">Validation Complete</h3>
                <p className="text-sm text-[#64748B] mb-4">
                  The vendor has passed all critical validations. Some non-critical items need review.
                  You can now proceed to send this vendor for department approvals.
                </p>
                <Button
                  onClick={handleSendForApproval}
                  className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
                >
                  <Send className="w-4 h-4" />
                  Send for Department Approval
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
