import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Upload,
  HelpCircle,
  Bell,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
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

const initialTasks = [
  {
    id: "TSK-001",
    task: "Complete bank details verification",
    relatedRequest: "REQ-2026-001",
    dueDate: "2026-02-25",
    status: "Pending",
    statusColor: "text-yellow-600 bg-yellow-50",
  },
  {
    id: "TSK-002",
    task: "Upload updated tax certificate",
    relatedRequest: "REQ-2026-003",
    dueDate: "2026-02-23",
    status: "Urgent",
    statusColor: "text-red-600 bg-red-50",
  },
  {
    id: "TSK-003",
    task: "Review change request approval",
    relatedRequest: "REQ-2025-456",
    dueDate: "2026-02-28",
    status: "In Progress",
    statusColor: "text-blue-600 bg-blue-50",
  },
];

const initialRequests = [
  {
    id: "REQ-2026-001",
    type: "Onboarding",
    status: "In Progress",
    statusColor: "text-blue-600 bg-blue-50",
    submittedOn: "2026-02-15",
    lastUpdated: "2026-02-20",
  },
  {
    id: "REQ-2026-003",
    type: "Tax Update",
    status: "Action Required",
    statusColor: "text-yellow-600 bg-yellow-50",
    submittedOn: "2026-02-10",
    lastUpdated: "2026-02-19",
  },
  {
    id: "REQ-2025-456",
    type: "Bank Change",
    status: "Pending Approval",
    statusColor: "text-purple-600 bg-purple-50",
    submittedOn: "2025-12-20",
    lastUpdated: "2026-02-18",
  },
];

const initialDocuments = [
  {
    id: "DOC-001",
    name: "Certificate of Incorporation",
    type: "Company Registration",
    status: "Verified",
    statusColor: "text-green-600 bg-green-50",
    expiryDate: "N/A",
    uploadedDate: "2025-11-15",
  },
  {
    id: "DOC-002",
    name: "Tax Registration Certificate",
    type: "Tax Document",
    status: "Expiring",
    statusColor: "text-orange-600 bg-orange-50",
    expiryDate: "2026-03-15",
    uploadedDate: "2025-03-10",
  },
  {
    id: "DOC-003",
    name: "Bank Account Proof",
    type: "Banking Document",
    status: "Required",
    statusColor: "text-red-600 bg-red-50",
    expiryDate: "N/A",
    uploadedDate: "N/A",
  },
  {
    id: "DOC-004",
    name: "Insurance Certificate",
    type: "Compliance",
    status: "Submitted",
    statusColor: "text-blue-600 bg-blue-50",
    expiryDate: "2027-01-20",
    uploadedDate: "2026-01-15",
  },
];

const alerts = [
  { id: 1, type: "request", message: "New buyer request: Update payment terms", time: "2 hours ago" },
  { id: 2, type: "compliance", message: "Tax certificate expiring in 23 days", time: "1 day ago" },
  { id: 3, type: "document", message: "Bank proof document rejected - resubmit", time: "2 days ago" },
  { id: 4, type: "approval", message: "Change request REQ-2025-456 approved", time: "3 days ago" },
];

export function VendorPortalHomePage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"tasks" | "requests" | "documents">("tasks");
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedItem] = useState<any>(null);

  const [tasks] = useState(initialTasks);
  const [requests] = useState(initialRequests);
  const [documents, setDocuments] = useState(initialDocuments);

  const [uploadForm, setUploadForm] = useState({
    documentType: "",
    file: null as File | null,
    expiryDate: "",
    notes: "",
  });

  const kpiData = useMemo(() => ({
    activeRequests: requests.length,
    pendingActions: tasks.filter((t) => t.status === "Pending" || t.status === "Urgent").length,
    documentsExpiring: documents.filter((d) => d.status === "Expiring").length,
    riskStatus: "Low",
  }), [requests, tasks, documents]);

  const handleOpenTask = (task: any) => {
    // Navigate to the request detail page using the related request ID
    navigate(`/vendor-portal/requests/${task.relatedRequest}`);
  };

  const handleViewRequest = (request: any) => {
    // Navigate to the request detail page
    navigate(`/vendor-portal/requests/${request.id}`);
  };

  const handleUploadClick = (document?: any) => {
    if (document) {
      setUploadForm({ ...uploadForm, documentType: document.type });
    }
    setShowUploadDialog(true);
  };

  const handleUploadSubmit = () => {
    if (!uploadForm.documentType || !uploadForm.file) {
      toast.error("Please select document type and file");
      return;
    }

    // Update document status
    setDocuments(
      documents.map((doc) =>
        doc.type === uploadForm.documentType
          ? { ...doc, status: "Submitted", statusColor: "text-blue-600 bg-blue-50", uploadedDate: new Date().toISOString().split("T")[0] }
          : doc
      )
    );

    setShowUploadDialog(false);
    setUploadForm({ documentType: "", file: null, expiryDate: "", notes: "" });
    toast.success("Document uploaded successfully");
  };

  return (
    <div className="p-8 bg-[#F6F9FC] min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A0F14] mb-2">Vendor Portal</h1>
            <p className="text-[#64748B]">
              Complete onboarding, manage change requests, and track compliance in one place.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm text-[#64748B]">Acme Global Logistics Ltd.</div>
              <div className="text-xs font-mono text-[#00A9B7] font-medium">VND-2025-00234</div>
            </div>
            <button className="p-2 hover:bg-white rounded-lg transition-colors border border-[#E6EEF2]">
              <HelpCircle className="w-5 h-5 text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-[#E6EEF2]">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold text-[#0A0F14] mb-1">{kpiData.activeRequests}</div>
          <div className="text-sm text-[#64748B]">Active Requests</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EEF2]">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-yellow-50 p-3 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold text-[#0A0F14] mb-1">{kpiData.pendingActions}</div>
          <div className="text-sm text-[#64748B]">Pending Actions</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EEF2]">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-orange-50 p-3 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold text-[#0A0F14] mb-1">{kpiData.documentsExpiring}</div>
          <div className="text-sm text-[#64748B]">Documents Expiring</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E6EEF2]">
          <div className="flex items-center justify-between mb-3">
            <div className="bg-green-50 p-3 rounded-lg">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-semibold text-[#0A0F14] mb-1">{kpiData.riskStatus}</div>
          <div className="text-sm text-[#64748B]">Risk Status</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Work Queue - 2 columns */}
        <div className="col-span-2">
          <div className="bg-white rounded-xl border border-[#E6EEF2]">
            {/* Tabs */}
            <div className="border-b border-[#E6EEF2] px-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`py-4 border-b-2 transition-colors ${
                    activeTab === "tasks"
                      ? "border-[#00A9B7] text-[#00A9B7] font-medium"
                      : "border-transparent text-[#64748B] hover:text-[#0A0F14]"
                  }`}
                >
                  My Tasks
                </button>
                <button
                  onClick={() => setActiveTab("requests")}
                  className={`py-4 border-b-2 transition-colors ${
                    activeTab === "requests"
                      ? "border-[#00A9B7] text-[#00A9B7] font-medium"
                      : "border-transparent text-[#64748B] hover:text-[#0A0F14]"
                  }`}
                >
                  Requests
                </button>
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`py-4 border-b-2 transition-colors ${
                    activeTab === "documents"
                      ? "border-[#00A9B7] text-[#00A9B7] font-medium"
                      : "border-transparent text-[#64748B] hover:text-[#0A0F14]"
                  }`}
                >
                  Documents
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === "tasks" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E6EEF2]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Task</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Related Request</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Due Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task) => (
                        <tr key={task.id} className="border-b border-[#E6EEF2] last:border-0 hover:bg-[#F6F9FC] transition-colors">
                          <td className="py-3 px-4 text-sm text-[#0A0F14]">{task.task}</td>
                          <td className="py-3 px-4 text-sm font-mono text-[#00A9B7]">{task.relatedRequest}</td>
                          <td className="py-3 px-4 text-sm text-[#64748B]">{task.dueDate}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${task.statusColor}`}>
                              {task.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleOpenTask(task)}
                              className="text-sm text-[#00A9B7] hover:underline font-medium"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "requests" && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#E6EEF2]">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Request ID</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Submitted On</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Last Updated</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-[#0A0F14]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((request) => (
                        <tr key={request.id} className="border-b border-[#E6EEF2] last:border-0 hover:bg-[#F6F9FC] transition-colors">
                          <td className="py-3 px-4 text-sm font-mono text-[#00A9B7]">{request.id}</td>
                          <td className="py-3 px-4 text-sm text-[#0A0F14]">{request.type}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${request.statusColor}`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-[#64748B]">{request.submittedOn}</td>
                          <td className="py-3 px-4 text-sm text-[#64748B]">{request.lastUpdated}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleViewRequest(request)}
                              className="text-sm text-[#00A9B7] hover:underline font-medium"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "documents" && (
                <div className="space-y-4">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border border-[#E6EEF2] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 bg-blue-50 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-[#0A0F14]">{doc.name}</div>
                          <div className="text-xs text-[#64748B]">{doc.type}</div>
                        </div>
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${doc.statusColor}`}>
                            {doc.status}
                          </span>
                          {doc.expiryDate !== "N/A" && (
                            <div className="text-xs text-[#64748B] mt-1">Expires: {doc.expiryDate}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {doc.status === "Required" && (
                          <button
                            onClick={() => handleUploadClick(doc)}
                            className="px-3 py-1.5 bg-[#00A9B7] text-white rounded-lg hover:bg-[#008A96] transition-colors text-sm font-medium flex items-center gap-1"
                          >
                            <Upload className="w-4 h-4" />
                            Upload
                          </button>
                        )}
                        {doc.status !== "Required" && (
                          <button className="text-sm text-[#00A9B7] hover:underline font-medium">View</button>
                        )}
                        {(doc.status === "Expiring" || doc.status === "Submitted") && (
                          <button
                            onClick={() => handleUploadClick(doc)}
                            className="text-sm text-[#64748B] hover:underline"
                          >
                            Replace
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts Panel - 1 column */}
        <div className="col-span-1">
          <div className="bg-white rounded-xl border border-[#E6EEF2] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#0A0F14]">Alerts & Notifications</h3>
              <Bell className="w-5 h-5 text-[#64748B]" />
            </div>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 border border-[#E6EEF2] rounded-lg hover:bg-[#F6F9FC] transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {alert.type === "compliance" && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                      {alert.type === "request" && <FileText className="w-4 h-4 text-blue-600" />}
                      {alert.type === "document" && <FileText className="w-4 h-4 text-red-600" />}
                      {alert.type === "approval" && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#0A0F14]">{alert.message}</p>
                      <p className="text-xs text-[#64748B] mt-1">{alert.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedItem?.type === "task" ? "Task Details" : "Request Details"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem?.type === "task"
                ? `Complete the following task for ${selectedItem?.relatedRequest}`
                : `View and manage request ${selectedItem?.id}`}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                This is a placeholder dialog. Full request detail screens will be implemented in the Vendor Self-Service
                module.
              </p>
            </div>

            {selectedItem && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#64748B]">
                      {selectedItem.type === "task" ? "Task ID" : "Request ID"}
                    </Label>
                    <p className="font-mono text-[#00A9B7] font-medium">{selectedItem.id}</p>
                  </div>
                  <div>
                    <Label className="text-[#64748B]">Status</Label>
                    <div className="mt-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedItem.statusColor}`}>
                        {selectedItem.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>Upload a new document or replace an existing one</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="docType">Document Type *</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(value) => setUploadForm({ ...uploadForm, documentType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Company Registration">Company Registration</SelectItem>
                  <SelectItem value="Tax Document">Tax Document</SelectItem>
                  <SelectItem value="Banking Document">Banking Document</SelectItem>
                  <SelectItem value="Compliance">Compliance Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File *</Label>
              <Input
                id="file"
                type="file"
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, file: e.target.files ? e.target.files[0] : null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date (if applicable)</Label>
              <Input
                id="expiry"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm({ ...uploadForm, expiryDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={uploadForm.notes}
                onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                placeholder="Add any additional notes"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadDialog(false);
                setUploadForm({ documentType: "", file: null, expiryDate: "", notes: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUploadSubmit} className="bg-[#00A9B7] hover:bg-[#008A96]">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}