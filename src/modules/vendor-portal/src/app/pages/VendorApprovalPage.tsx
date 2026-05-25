import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
} from "lucide-react";
import { RiskMeter } from "../components/design-system/RiskMeter";
import { ApprovalTimeline } from "../components/design-system/ApprovalTimeline";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { mockVendorRequests, departments } from "../data/mockData";

export function VendorApprovalPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = mockVendorRequests.find((v) => v.id === id);
  const [selectedDept, setSelectedDept] = useState("legal");
  const [comment, setComment] = useState("");

  if (!vendor) {
    return <div className="p-8">Vendor not found</div>;
  }

  const approvalHistory = [
    {
      department: "Legal",
      approver: "Jennifer Cooper",
      status: "approved" as const,
      timestamp: "2026-02-18 10:30 AM",
      comment: "All legal documents verified. Company registration is valid.",
    },
    {
      department: "Finance",
      approver: "Michael Chen",
      status: "pending" as const,
      timestamp: "",
    },
    {
      department: "Compliance",
      approver: "Rebecca Adams",
      status: "waiting" as const,
      timestamp: "",
    },
    {
      department: "IT Security",
      approver: "David Kumar",
      status: "waiting" as const,
      timestamp: "",
    },
    {
      department: "Procurement",
      approver: "Sarah Mitchell",
      status: "waiting" as const,
      timestamp: "",
    },
  ];

  const deptData = {
    legal: {
      name: "Legal Review",
      fields: [
        { label: "Legal Name", value: vendor.legalName, editable: false },
        { label: "Registration Number", value: "REG123456789", editable: true },
        { label: "Incorporation Date", value: "2015-03-15", editable: false },
        { label: "Legal Status", value: "Active", editable: false },
      ],
    },
    finance: {
      name: "Finance Review",
      fields: [
        { label: "Bank Name", value: vendor.bankName, editable: true },
        { label: "Account Number", value: vendor.accountNumber, editable: true },
        { label: "IFSC Code", value: vendor.ifscCode, editable: true },
        { label: "Payment Terms", value: "Net 30", editable: true },
      ],
    },
    compliance: {
      name: "Compliance Review",
      fields: [
        { label: "Tax ID", value: vendor.taxId, editable: true },
        { label: "GST Number", value: "29ABCDE1234F1Z5", editable: true },
        { label: "MSME Status", value: "Registered", editable: false },
        { label: "Sanctions Screening", value: "Clear", editable: false },
      ],
    },
    it: {
      name: "IT Security Review",
      fields: [
        { label: "Email Domain", value: vendor.email?.split("@")[1], editable: false },
        { label: "Cybersecurity Rating", value: "B+", editable: false },
        { label: "Data Classification", value: "Standard", editable: true },
        { label: "Access Level", value: "Basic", editable: true },
      ],
    },
    procurement: {
      name: "Procurement Review",
      fields: [
        { label: "Vendor Type", value: vendor.vendorType, editable: true },
        { label: "Category", value: "Services", editable: true },
        { label: "Preferred Status", value: "Standard", editable: true },
        { label: "Credit Limit", value: "$100,000", editable: true },
      ],
    },
  };

  const currentDept = deptData[selectedDept as keyof typeof deptData];

  const handleApprove = () => {
    alert("Vendor approved for " + currentDept.name);
    navigate(`/vendors/requests/${id}/success`);
  };

  const handleReject = () => {
    if (comment) {
      alert("Vendor rejected with comment: " + comment);
    } else {
      alert("Please add a comment for rejection");
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <Link to="/vendors/requests" className="text-sm text-[#00A9B7] hover:underline mb-2 block">
            ← Back to Requests
          </Link>
          <h1 className="text-2xl font-semibold text-[#0A0F14]">Multi-Department Approval Workspace</h1>
          <p className="text-sm text-[#64748B]">{vendor.legalName} • {vendor.requestId}</p>
        </div>
      </div>

      <div className="flex">
        {/* Left: Department Navigator */}
        <div className="w-64 bg-white border-r border-[#E6EEF2] min-h-screen">
          <div className="p-4">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Departments</h3>
            <div className="space-y-1">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => setSelectedDept(dept.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedDept === dept.id
                      ? "bg-[#E0F5F7] text-[#00A9B7] font-medium"
                      : "text-[#64748B] hover:bg-[#F6F9FC]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{dept.name}</span>
                    {dept.id === "legal" && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                    {dept.id === "finance" && (
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                    )}
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">{dept.approver}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center: Editable Form */}
        <div className="flex-1 p-8">
          <div className="max-w-3xl">
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm p-8">
              <h2 className="text-xl font-semibold text-[#0A0F14] mb-6">{currentDept.name}</h2>

              <div className="space-y-6 mb-8">
                {currentDept.fields.map((field, index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 items-center">
                    <Label className="text-right">{field.label}</Label>
                    <div className="col-span-2">
                      {field.editable ? (
                        <input
                          type="text"
                          defaultValue={field.value}
                          className="w-full px-3 py-2 border border-[#E6EEF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
                        />
                      ) : (
                        <p className="text-[#0A0F14]">{field.value}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="comment">Comments / Notes</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Add your approval comments or request clarification..."
                    rows={4}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Summary Sidebar */}
        <div className="w-96 bg-[#F6F9FC] border-l border-[#E6EEF2] p-6 space-y-6">
          {/* Risk Score */}
          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4 text-center">Risk Score</h3>
            <div className="flex justify-center">
              <RiskMeter score={vendor.validationScore || 25} size="sm" />
            </div>
          </div>

          {/* Vendor Snapshot */}
          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Vendor Snapshot</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-[#64748B]">Legal Name</p>
                <p className="font-medium text-[#0A0F14]">{vendor.legalName}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Country</p>
                <p className="font-medium text-[#0A0F14]">{vendor.country}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Vendor Type</p>
                <p className="font-medium text-[#0A0F14]">{vendor.vendorType}</p>
              </div>
              <div>
                <p className="text-[#64748B]">Entity</p>
                <p className="font-medium text-[#0A0F14]">{vendor.entity}</p>
              </div>
            </div>
          </div>

          {/* Validation Summary */}
          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Validation Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Tax Validation</span>
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Bank Verification</span>
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Sanctions Check</span>
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Documents</span>
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              </div>
            </div>
          </div>

          {/* Approval Timeline */}
          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Approval Timeline</h3>
            <ApprovalTimeline items={approvalHistory} />
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E6EEF2] shadow-lg">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[#0A0F14]">
              Reviewing as: {departments.find((d) => d.id === selectedDept)?.name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Request Clarification
            </Button>
            <Button variant="outline" className="gap-2 text-[#DC2626] border-[#DC2626] hover:bg-red-50" onClick={handleReject}>
              <ThumbsDown className="w-4 h-4" />
              Reject
            </Button>
            <Button className="gap-2 bg-[#16A34A] hover:bg-[#15803D]" onClick={handleApprove}>
              <ThumbsUp className="w-4 h-4" />
              Approve
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
