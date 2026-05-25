import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Calendar,
  Building2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {  } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card } from "../components/ui/card";
import { StatusBadge } from "../components/design-system/StatusBadge";
import {  } from "../components/design-system/ApprovalTimeline";
import { mockChangeRequests } from "../data/mockData";

export function VendorChangeRequestDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const changeRequest = mockChangeRequests.find((cr) => cr.id === id);

  const [comment, setComment] = useState("");

  if (!changeRequest) {
    return <div>Change request not found</div>;
  }

  // Mock data for Lower TDS Certificate
  const tdsData = {
    certificateNumber: "SEC197-2026-1234",
    issueDate: "2026-01-15",
    validFrom: "2026-04-01",
    validTo: "2027-03-31",
    approvedTdsRate: "2%",
    currentTdsRate: "10%",
    panNumber: "ABCDE1234F",
    assessmentYear: "2026-27",
    certificateFile: "Section_197_Certificate.pdf",
    uploadDate: "2026-02-17",
  };

  const approvalChain = [
    {
      department: "Finance",
      approver: "Michael Chen",
      status: "Approved",
      timestamp: "2026-02-17 10:30",
      comment: "Certificate verified and approved",
    },
    {
      department: "Compliance",
      approver: "Rebecca Adams",
      status: "In Progress",
      timestamp: null,
      comment: null,
    },
    {
      department: "IT",
      approver: "David Kumar",
      status: "Pending",
      timestamp: null,
      comment: null,
    },
  ];

  const auditHistory = [
    {
      action: "Change Request Created",
      user: "Sarah Mitchell",
      timestamp: "2026-02-17 09:00",
      details: "Lower TDS certificate change request initiated",
    },
    {
      action: "Document Uploaded",
      user: "Sarah Mitchell",
      timestamp: "2026-02-17 09:15",
      details: "Section 197 certificate uploaded",
    },
    {
      action: "PAN Validation Completed",
      user: "System",
      timestamp: "2026-02-17 09:20",
      details: "PAN number verified successfully",
    },
    {
      action: "Finance Approval",
      user: "Michael Chen",
      timestamp: "2026-02-17 10:30",
      details: "Approved by Finance department",
    },
    {
      action: "Sent to Compliance",
      user: "System",
      timestamp: "2026-02-17 10:32",
      details: "Forwarded to Compliance for review",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <Button
            variant="ghost"
            className="mb-4 -ml-2"
            onClick={() => navigate("/vendors/change-requests")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Change Requests
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-[#0A0F14]">
                  {changeRequest.changeRequestId}
                </h1>
                {changeRequest.status === "Approved" && (
                  <StatusBadge status="success" label="Approved" />
                )}
                {changeRequest.status === "In Progress" && (
                  <StatusBadge status="info" label="In Progress" />
                )}
                {changeRequest.status === "Rejected" && (
                  <StatusBadge status="error" label="Rejected" />
                )}
                {changeRequest.status === "Pending" && (
                  <StatusBadge status="pending" label="Pending" />
                )}
              </div>
              <p className="text-sm text-[#64748B] mb-4">
                {changeRequest.changeType} - {changeRequest.vendorName}
              </p>

              <div className="flex items-center gap-6 text-sm text-[#64748B]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Requested by: {changeRequest.requestedBy}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>Date: {changeRequest.requestDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Priority: {changeRequest.priority}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8 space-y-6">
            {/* Vendor Information */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Vendor Information
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Vendor Name</p>
                  <p className="text-sm text-[#0A0F14] font-medium">
                    {changeRequest.vendorName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Vendor Code</p>
                  <p className="text-sm text-[#0A0F14] font-medium">
                    V-2026-236
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B] mb-1">PAN Number</p>
                  <p className="text-sm text-[#0A0F14] font-medium">
                    {tdsData.panNumber}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Entity</p>
                  <p className="text-sm text-[#0A0F14] font-medium">
                    Procinix Europe
                  </p>
                </div>
              </div>
            </Card>

            {/* Lower TDS Certificate Details */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Section 197 Certificate Details
              </h3>
              
              <div className="grid grid-cols-2 gap-x-8 gap-y-6 mb-6">
                <div>
                  <Label htmlFor="certificateNumber" className="text-[#64748B]">
                    Certificate Number
                  </Label>
                  <div className="mt-2 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                    {tdsData.certificateNumber}
                  </div>
                </div>

                <div>
                  <Label htmlFor="issueDate" className="text-[#64748B]">
                    Issue Date
                  </Label>
                  <div className="mt-2 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                    {tdsData.issueDate}
                  </div>
                </div>

                <div>
                  <Label htmlFor="validFrom" className="text-[#64748B]">
                    Valid From
                  </Label>
                  <div className="mt-2 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                    {tdsData.validFrom}
                  </div>
                </div>

                <div>
                  <Label htmlFor="validTo" className="text-[#64748B]">
                    Valid To
                  </Label>
                  <div className="mt-2 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                    {tdsData.validTo}
                  </div>
                </div>

                <div>
                  <Label htmlFor="assessmentYear" className="text-[#64748B]">
                    Assessment Year
                  </Label>
                  <div className="mt-2 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                    {tdsData.assessmentYear}
                  </div>
                </div>

                <div>
                  <Label htmlFor="panNumber" className="text-[#64748B]">
                    PAN Number
                  </Label>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 px-4 py-2.5 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg text-sm text-[#0A0F14]">
                      {tdsData.panNumber}
                    </div>
                    <StatusBadge status="success" label="Verified" size="sm" />
                  </div>
                </div>
              </div>

              {/* TDS Rate Comparison */}
              <div className="bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg p-6">
                <h4 className="text-sm font-semibold text-[#0A0F14] mb-4">
                  Effective Tax Preview
                </h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Current TDS Rate</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-[#0A0F14]">
                        {tdsData.currentTdsRate}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Approved TDS Rate</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-[#16A34A]">
                        {tdsData.approvedTdsRate}
                      </span>
                      <StatusBadge status="success" label="Lower" size="sm" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-[#64748B] mb-2">Tax Savings</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-[#16A34A]">8%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-[#0A0F14]">
                        Certificate Valid
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        This certificate is valid from {tdsData.validFrom} to{" "}
                        {tdsData.validTo}. The reduced TDS rate will be applied
                        automatically upon approval.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Certificate Document */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Certificate Document
              </h3>
              <div className="flex items-center justify-between p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0A0F14]">
                      {tdsData.certificateFile}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Uploaded on {tdsData.uploadDate}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            </Card>

            {/* Audit History */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Audit History
              </h3>
              <div className="space-y-3">
                {auditHistory.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg"
                  >
                    <div className="w-8 h-8 bg-[#E0F5F7] rounded-full flex items-center justify-center flex-shrink-0">
                      {entry.action.includes("Approved") ? (
                        <CheckCircle2 className="w-4 h-4 text-[#00A9B7]" />
                      ) : (
                        <Clock className="w-4 h-4 text-[#00A9B7]" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm font-medium text-[#0A0F14]">
                          {entry.action}
                        </p>
                        <span className="text-xs text-[#64748B]">
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B] mb-1">
                        By: {entry.user}
                      </p>
                      <p className="text-xs text-[#64748B]">{entry.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Comments Section */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Comments & Discussion
              </h3>
              
              <div className="space-y-4 mb-4">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-[#00A9B7] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-medium">MC</span>
                  </div>
                  <div className="flex-1">
                    <div className="bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[#0A0F14]">
                          Michael Chen
                        </span>
                        <span className="text-xs text-[#64748B]">
                          2026-02-17 10:30
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B]">
                        Certificate has been verified with the Income Tax
                        Department portal. All details match. Approved from Finance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label htmlFor="comment">Add Comment</Label>
                <textarea
                  id="comment"
                  className="w-full min-h-[100px] px-3 py-2 border border-[#E6EEF2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
                  placeholder="Add your comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <Button className="bg-[#00A9B7] hover:bg-[#008A96]">
                  Post Comment
                </Button>
              </div>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Approval Chain */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Approval Chain
              </h3>
              <div className="space-y-4">
                {approvalChain.map((approval, index) => (
                  <div key={index} className="relative">
                    {index < approvalChain.length - 1 && (
                      <div className="absolute left-4 top-10 bottom-0 w-px bg-[#E6EEF2]" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="relative z-10">
                        {approval.status === "Approved" && (
                          <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        )}
                        {approval.status === "In Progress" && (
                          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        {approval.status === "Pending" && (
                          <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                            <Clock className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#0A0F14]">
                          {approval.department}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {approval.approver}
                        </p>
                        {approval.timestamp && (
                          <p className="text-xs text-[#64748B] mt-1">
                            {approval.timestamp}
                          </p>
                        )}
                        {approval.comment && (
                          <p className="text-xs text-[#64748B] mt-1 italic">
                            "{approval.comment}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            {changeRequest.status === "In Progress" && (
              <Card className="p-6 border-[#E6EEF2]">
                <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                  Actions
                </h3>
                <div className="space-y-3">
                  <Button className="w-full bg-[#16A34A] hover:bg-[#15803D]">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button className="w-full bg-[#DC2626] hover:bg-[#B91C1C] text-white">
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button variant="outline" className="w-full">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Request Clarification
                  </Button>
                </div>
              </Card>
            )}

            {/* Request Summary */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Request Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Status</span>
                  {changeRequest.status === "Approved" && (
                    <StatusBadge status="success" label="Approved" size="sm" />
                  )}
                  {changeRequest.status === "In Progress" && (
                    <StatusBadge status="info" label="In Progress" size="sm" />
                  )}
                  {changeRequest.status === "Rejected" && (
                    <StatusBadge status="error" label="Rejected" size="sm" />
                  )}
                  {changeRequest.status === "Pending" && (
                    <StatusBadge status="pending" label="Pending" size="sm" />
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Priority</span>
                  <span className="text-[#0A0F14] font-medium">
                    {changeRequest.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#64748B]">Request Date</span>
                  <span className="text-[#0A0F14] font-medium">
                    {changeRequest.requestDate}
                  </span>
                </div>
                {changeRequest.effectiveDate && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Effective Date</span>
                    <span className="text-[#0A0F14] font-medium">
                      {changeRequest.effectiveDate}
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* ERP Re-sync Status */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                ERP Re-sync
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <Building2 className="w-4 h-4" />
                  <span>SAP S/4HANA</span>
                </div>
                <StatusBadge
                  status="neutral"
                  label="Pending Approval"
                  size="sm"
                />
                <p className="text-xs text-[#64748B]">
                  ERP sync will be triggered automatically once all approvals are
                  complete.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}