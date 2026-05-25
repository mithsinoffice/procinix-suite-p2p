import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  Building2,
  Shield,
  Eye,
  AlertCircle,
  Download,
  X,
  BarChart3,
  ExternalLink,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Label } from "../components/ui/label";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

type WorkflowStep = {
  id: string;
  label: string;
  status: "completed" | "current" | "pending";
  completedBy?: string;
  completedAt?: string;
  comments?: string;
};

// Read-only workspace — approve / reject / send-back actions live exclusively
// on the universal Approval Desk (/approvals). This page surfaces the full
// request context for review but routes the actual decision back there.
export function ApprovalWorkspacePage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [riskDrawerOpen, setRiskDrawerOpen] = useState(false);

  // Mock workflow data
  const workflowSteps: WorkflowStep[] = [
    {
      id: "1",
      label: "Vendor Submitted",
      status: "completed",
      completedBy: "Rajesh Kumar (Vendor Portal)",
      completedAt: "2026-02-18 10:30 AM",
      comments: "Initial submission with all required documents"
    },
    {
      id: "2",
      label: "Compliance Review",
      status: "completed",
      completedBy: "Priya Sharma (Compliance Officer)",
      completedAt: "2026-02-18 03:45 PM",
      comments: "KYC verification completed. All sanctions checks passed."
    },
    {
      id: "3",
      label: "Finance Review",
      status: "current",
      completedBy: undefined,
      completedAt: undefined,
    },
    {
      id: "4",
      label: "Legal Review",
      status: "pending",
    },
    {
      id: "5",
      label: "Final Approval",
      status: "pending",
    },
  ];

  // Vendor details
  const vendorDetails = {
    name: "ABC Manufacturing Pvt Ltd",
    category: "Raw Material",
    type: "Manufacturer",
    riskTier: "Medium",
    riskScore: 67,
    status: "Pending Finance Review",
    slaRemaining: "2 days",
    requestId: "VND-REQ-2026-00342",
    submittedDate: "2026-02-18",
  };

  // Risk score breakdown
  const riskBreakdown = [
    { name: "Geographic", value: 15, color: "#F59E0B" },
    { name: "Financial", value: 20, color: "#DC2626" },
    { name: "Compliance", value: 12, color: "#16A34A" },
    { name: "Operational", value: 20, color: "#F59E0B" },
  ];

  // Risk factors
  const triggeredRiskFactors = [
    { factor: "Geographic Risk", severity: "Medium", score: 15, reason: "Located in Tier-2 city with limited infrastructure" },
    { factor: "Financial Risk", severity: "High", score: 20, reason: "Revenue below ₹50 Cr, Working capital ratio below threshold" },
    { factor: "Operational Risk", severity: "Medium", score: 20, reason: "New vendor with no prior transaction history" },
  ];

  // Compliance data
  const complianceData = [
    { label: "Documents Submitted", value: 12, total: 12, status: "complete" },
    { label: "KYC Verified", value: 1, total: 1, status: "complete" },
    { label: "Sanctions Screening", value: 1, total: 1, status: "complete" },
    { label: "Bank Verification", value: 1, total: 1, status: "pending" },
  ];

  const getTierBadgeColor = (tier: string) => {
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

  const getRiskScoreColor = (score: number) => {
    if (score >= 76) return "text-[#DC2626]";
    if (score >= 51) return "text-[#F59E0B]";
    if (score >= 26) return "text-[#3B82F6]";
    return "text-[#16A34A]";
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC] flex flex-col">
      {/* Compact Header */}
      <header className="bg-white border-b border-[#E6EEF2] sticky top-0 z-30">
        <div className="px-8 py-4">
          <div className="flex items-center gap-2 text-sm text-[#64748B] mb-2">
            <Link to="/vendors/dashboard" className="hover:text-[#00A9B7]">
              Vendor Management
            </Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/vendors/requests" className="hover:text-[#00A9B7]">
              Approval Queue
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-[#0A0F14]">{vendorDetails.requestId}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0A0F14] mb-1">
                Vendor Onboarding Approval
              </h1>
              <div className="flex items-center gap-3 text-sm text-[#64748B]">
                <span className="font-medium text-[#0A0F14]">{vendorDetails.name}</span>
                <span>•</span>
                <span>{vendorDetails.category}</span>
                <span>•</span>
                <span>{vendorDetails.type}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm ${getTierBadgeColor(vendorDetails.riskTier)}`}>
                  <Shield className="w-4 h-4" />
                  {vendorDetails.riskTier} Risk
                </div>
                <div className={`text-xl font-bold ${getRiskScoreColor(vendorDetails.riskScore)}`}>
                  {vendorDetails.riskScore}/100
                </div>
              </div>

              <div className="w-px h-10 bg-[#E6EEF2]" />

              <div className="flex items-center gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#EFF6FF] text-[#3B82F6] font-medium text-sm">
                  <Clock className="w-4 h-4" />
                  {vendorDetails.status}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                  <span className="font-semibold text-[#F59E0B]">{vendorDetails.slaRemaining}</span>
                </div>
              </div>

              <div className="w-px h-10 bg-[#E6EEF2]" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setRiskDrawerOpen(!riskDrawerOpen)}
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                Risk Insights
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Horizontal Workflow Stage Bar */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-3">
          <TooltipProvider>
            <div className="flex items-center gap-2">
              {workflowSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          step.status === "completed"
                            ? "bg-[#DCFCE7] text-[#16A34A] hover:bg-[#BBF7D0]"
                            : step.status === "current"
                            ? "bg-[#E0F5F7] text-[#00A9B7] hover:bg-[#CCEEF2]"
                            : "bg-[#F6F9FC] text-[#94A3B8] hover:bg-[#E6EEF2]"
                        }`}
                      >
                        {step.status === "completed" && <CheckCircle className="w-4 h-4" />}
                        {step.status === "current" && <Clock className="w-4 h-4" />}
                        {step.label}
                      </button>
                    </TooltipTrigger>
                    {(step.completedBy || step.status === "current") && (
                      <TooltipContent className="max-w-xs">
                        <div className="space-y-1">
                          {step.completedBy && (
                            <>
                              <p className="font-semibold">{step.completedBy}</p>
                              <p className="text-xs text-[#64748B]">{step.completedAt}</p>
                              {step.comments && (
                                <p className="text-xs mt-2">{step.comments}</p>
                              )}
                            </>
                          )}
                          {step.status === "current" && !step.completedBy && (
                            <p className="font-semibold">⏳ Awaiting your approval</p>
                          )}
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                  {index < workflowSteps.length - 1 && (
                    <div className="w-8 h-0.5 mx-1 bg-[#E6EEF2]" />
                  )}
                </div>
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content - Full Width */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="px-8 py-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white border border-[#E6EEF2] p-1 rounded-xl mb-6 inline-flex flex-wrap">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="company"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Company & KYC
              </TabsTrigger>
              <TabsTrigger
                value="tax"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Tax Details
              </TabsTrigger>
              <TabsTrigger
                value="banking"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Banking
              </TabsTrigger>
              <TabsTrigger
                value="documents"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Documents
              </TabsTrigger>
              <TabsTrigger
                value="risk"
                className="data-[state=active]:bg-[#00A9B7] data-[state=active]:text-white px-4 py-2 rounded-lg"
              >
                Risk Analysis
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                  <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Request Summary</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium text-[#64748B]">Request ID</Label>
                      <p className="text-[#0A0F14] font-mono font-semibold">{vendorDetails.requestId}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#64748B]">Submitted Date</Label>
                      <p className="text-[#0A0F14]">{vendorDetails.submittedDate}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#64748B]">Vendor Name</Label>
                      <p className="text-[#0A0F14] font-semibold">{vendorDetails.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#64748B]">Category</Label>
                      <p className="text-[#0A0F14]">{vendorDetails.category}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-[#64748B]">Risk Tier</Label>
                      <div className={`inline-flex px-3 py-1 rounded-lg font-semibold text-sm ${getTierBadgeColor(vendorDetails.riskTier)}`}>
                        {vendorDetails.riskTier}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                  <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Key Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-[#F6F9FC] rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#E0F5F7] flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-[#00A9B7]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#0A0F14] text-sm mb-1">Business Details</h4>
                        <p className="text-xs text-[#64748B]">
                          Manufacturing company. Annual revenue: ₹45 Cr. Est. 2018. Pune, Maharashtra.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#DCFCE7] rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#BBF7D0] flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#0A0F14] text-sm mb-1">Compliance Status</h4>
                        <p className="text-xs text-[#64748B]">
                          KYC verified, sanctions cleared, GST/PAN validated. Banking verification pending.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-[#FEF2F2] rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-[#FEE2E2] flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-[#0A0F14] text-sm mb-1">Risk Alerts</h4>
                        <p className="text-xs text-[#64748B]">
                          Financial risk: Revenue below threshold. Operational risk: New vendor.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Company & KYC Tab */}
            <TabsContent value="company" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Company Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Legal Name</Label>
                    <p className="text-[#0A0F14]">ABC Manufacturing Private Limited</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Trade Name</Label>
                    <p className="text-[#0A0F14]">ABC Manufacturing</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Registration Number</Label>
                    <p className="text-[#0A0F14] font-mono">U25209MH2018PTC308642</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Date of Incorporation</Label>
                    <p className="text-[#0A0F14]">15-Mar-2018</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-[#64748B]">Registered Address</Label>
                    <p className="text-[#0A0F14]">
                      Plot No. 45, MIDC Industrial Area, Bhosari, Pune - 411026, Maharashtra, India
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Phone</Label>
                    <p className="text-[#0A0F14]">+91 20 2712 3456</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Email</Label>
                    <p className="text-[#0A0F14]">info@abcmfg.com</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">KYC Verification</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#DCFCE7] rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                      <div>
                        <p className="font-semibold text-[#0A0F14] text-sm">Identity Verification</p>
                        <p className="text-xs text-[#64748B]">PAN and GST validated successfully</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#16A34A]">Verified</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#DCFCE7] rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-[#16A34A]" />
                      <div>
                        <p className="font-semibold text-[#0A0F14] text-sm">Sanctions Screening</p>
                        <p className="text-xs text-[#64748B]">No matches found in sanctions lists</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#16A34A]">Clear</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#FEF3C7] rounded-xl">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#F59E0B]" />
                      <div>
                        <p className="font-semibold text-[#0A0F14] text-sm">Bank Account Verification</p>
                        <p className="text-xs text-[#64748B]">Verification in progress via penny drop</p>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-[#F59E0B]">Pending</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Tax Details Tab */}
            <TabsContent value="tax" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Tax Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">PAN Number</Label>
                    <p className="text-[#0A0F14] font-mono">AABCA1234F</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-[#DCFCE7] rounded-lg text-[#16A34A] text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">GST Number</Label>
                    <p className="text-[#0A0F14] font-mono">27AABCA1234F1Z5</p>
                    <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-[#DCFCE7] rounded-lg text-[#16A34A] text-xs font-medium">
                      <CheckCircle className="w-3 h-3" />
                      Verified
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">TDS Category</Label>
                    <p className="text-[#0A0F14]">194C - Contractors</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">TDS Rate</Label>
                    <p className="text-[#0A0F14]">2%</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">MSME Registration</Label>
                    <p className="text-[#0A0F14]">Not Registered</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">TAN</Label>
                    <p className="text-[#0A0F14]">PUNA01234E</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Banking Tab */}
            <TabsContent value="banking" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Primary Bank Account</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Bank Name</Label>
                    <p className="text-[#0A0F14] font-semibold">HDFC Bank</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Branch</Label>
                    <p className="text-[#0A0F14]">Pune MIDC Branch</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Account Number</Label>
                    <p className="text-[#0A0F14] font-mono">50200012345678</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">Account Type</Label>
                    <p className="text-[#0A0F14]">Current Account</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">IFSC Code</Label>
                    <p className="text-[#0A0F14] font-mono">HDFC0001234</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-[#64748B]">SWIFT Code</Label>
                    <p className="text-[#0A0F14] font-mono">HDFCINBBXXX</p>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-sm font-medium text-[#64748B] mb-2 block">Bank Verification Status</Label>
                    <div className="flex items-center gap-3 p-3 bg-[#FEF3C7] rounded-xl">
                      <Clock className="w-5 h-5 text-[#F59E0B]" />
                      <div>
                        <p className="font-medium text-[#0A0F14] text-sm">Verification in Progress</p>
                        <p className="text-xs text-[#64748B]">Penny drop transaction initiated. Expected completion in 24 hours.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Supporting Documents</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 border-2 border-[#E6EEF2] rounded-xl hover:border-[#00A9B7] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#00A9B7]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#0A0F14] text-sm">Cancelled Cheque</p>
                        <p className="text-xs text-[#64748B]">245 KB</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border-2 border-[#E6EEF2] rounded-xl hover:border-[#00A9B7] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                        <FileText className="w-4 h-4 text-[#00A9B7]" />
                      </div>
                      <div>
                        <p className="font-medium text-[#0A0F14] text-sm">Bank Statement</p>
                        <p className="text-xs text-[#64748B]">1.2 MB</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Submitted Documents</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "Company Registration Certificate", size: "1.5 MB" },
                    { name: "GST Registration Certificate", size: "890 KB" },
                    { name: "PAN Card", size: "245 KB" },
                    { name: "Address Proof", size: "1.1 MB" },
                    { name: "Board Resolution", size: "675 KB" },
                    { name: "Authorized Signatory List", size: "420 KB" },
                    { name: "Cancelled Cheque", size: "245 KB" },
                    { name: "Bank Statement (Last 6 months)", size: "3.2 MB" },
                    { name: "Quality Certificates", size: "2.1 MB" },
                    { name: "Compliance Declaration", size: "580 KB" },
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border-2 border-[#E6EEF2] rounded-xl hover:border-[#00A9B7] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#E0F5F7] flex items-center justify-center">
                          <FileText className="w-4 h-4 text-[#00A9B7]" />
                        </div>
                        <div>
                          <p className="font-medium text-[#0A0F14] text-sm">{doc.name}</p>
                          <p className="text-xs text-[#64748B]">{doc.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-[#DCFCE7] rounded text-[#16A34A] text-xs font-medium">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Risk Analysis Tab */}
            <TabsContent value="risk" className="space-y-6">
              <div className="bg-white rounded-2xl border border-[#E6EEF2] p-6">
                <h3 className="text-lg font-bold text-[#0A0F14] mb-4">Risk Assessment</h3>
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 bg-[#F6F9FC] rounded-xl">
                    <div className="text-3xl font-bold text-[#F59E0B] mb-2">{vendorDetails.riskScore}</div>
                    <div className="text-sm text-[#64748B]">Overall Risk Score</div>
                  </div>
                  <div className="text-center p-4 bg-[#F6F9FC] rounded-xl">
                    <div className={`text-xl font-bold mb-2 ${getTierBadgeColor(vendorDetails.riskTier)} inline-block px-3 py-1.5 rounded-lg`}>
                      {vendorDetails.riskTier}
                    </div>
                    <div className="text-sm text-[#64748B] mt-2">Risk Tier</div>
                  </div>
                  <div className="text-center p-4 bg-[#F6F9FC] rounded-xl">
                    <div className="text-3xl font-bold text-[#DC2626] mb-2">3</div>
                    <div className="text-sm text-[#64748B]">Risk Factors Triggered</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {triggeredRiskFactors.map((risk, index) => (
                    <div key={index} className="p-4 border-2 border-[#E6EEF2] rounded-xl">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-[#F59E0B]" />
                          <div>
                            <h4 className="font-semibold text-[#0A0F14]">{risk.factor}</h4>
                            <p className="text-sm text-[#64748B] mt-1">{risk.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className={`px-3 py-1 rounded-lg font-semibold text-sm ${
                            risk.severity === "High" ? "bg-[#DC2626] text-white" : "bg-[#F59E0B] text-white"
                          }`}>
                            {risk.severity}
                          </div>
                          <div className="text-xl font-bold text-[#F59E0B]">{risk.score}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Risk Insights Drawer */}
        {riskDrawerOpen && (
          <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-[#E6EEF2] shadow-2xl z-40 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-[#0A0F14]">Risk Insights</h2>
                <button
                  onClick={() => setRiskDrawerOpen(false)}
                  className="p-1 hover:bg-[#F6F9FC] rounded"
                >
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>

              {/* Risk Score Breakdown */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#0A0F14] mb-4">Risk Score Breakdown</h3>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {riskBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 mt-4">
                  {riskBreakdown.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-[#64748B]">{item.name}</span>
                      </div>
                      <span className="font-semibold text-[#0A0F14]">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Completeness */}
              <div className="mb-6 p-4 bg-[#F6F9FC] rounded-xl">
                <h3 className="text-sm font-semibold text-[#0A0F14] mb-4">Compliance Completeness</h3>
                <div className="space-y-3">
                  {complianceData.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-[#64748B]">{item.label}</span>
                        <span className="font-semibold text-[#0A0F14]">
                          {item.value}/{item.total}
                        </span>
                      </div>
                      <div className="h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.status === "complete" ? "bg-[#16A34A]" : "bg-[#F59E0B]"
                          }`}
                          style={{ width: `${(item.value / item.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Validation */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#0A0F14] mb-4">Quick Validation</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-[#DCFCE7] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                      <span className="text-sm text-[#0A0F14]">KYC Verified</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#DCFCE7] rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#16A34A]" />
                      <span className="text-sm text-[#0A0F14]">Sanctions Clear</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-[#FEF3C7] rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#F59E0B]" />
                      <span className="text-sm text-[#0A0F14]">Bank Pending</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="p-4 bg-[#FEF2F2] rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                  <h3 className="text-sm font-semibold text-[#0A0F14]">Alerts</h3>
                </div>
                <p className="text-xs text-[#64748B]">
                  No document expiry alerts or compliance issues detected.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Read-only banner — actions live on the universal Approval Desk */}
      <div className="sticky bottom-0 bg-[#F1F5F9] border-t border-[#E6EEF2] px-8 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#64748B] flex-shrink-0" />
            <div className="text-sm text-[#475569]">
              <span className="font-medium text-[#0A0F14]">Read-only view.</span>{" "}
              Approve, reject, send back, and escalate actions happen on the universal Approval Desk.
            </div>
          </div>
          <Link to="/approvals">
            <Button className="bg-[#00A9B7] hover:bg-[#008A96] text-white gap-2">
              Open Approval Desk
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}