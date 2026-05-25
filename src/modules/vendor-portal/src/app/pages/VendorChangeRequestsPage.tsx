import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Plus,
  GitBranch,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { mockChangeRequests } from "../data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

const changeTypes = [
  "Bank Account Change",
  "GST Number Update",
  "Address Change",
  "Contact Person Update",
  "Lower TDS Certificate",
  "Payment Terms Change",
  "Block Vendor",
  "Unblock Vendor",
];

export function VendorChangeRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    vendorName: "",
    changeType: "",
    reason: "",
    priority: "Medium",
  });

  const filteredRequests = mockChangeRequests.filter((request) => {
    const matchesSearch =
      searchQuery === "" ||
      request.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.changeRequestId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = selectedStatus === "all" || request.status === selectedStatus;
    const matchesType = selectedType === "all" || request.changeType === selectedType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const stats = {
    total: mockChangeRequests.length,
    pending: mockChangeRequests.filter((r) => r.status === "Pending").length,
    inProgress: mockChangeRequests.filter((r) => r.status === "In Progress").length,
    approved: mockChangeRequests.filter((r) => r.status === "Approved").length,
    rejected: mockChangeRequests.filter((r) => r.status === "Rejected").length,
  };

  const getStatusBadge = (status: string) => {
    if (status === "Approved") return <StatusBadge status="success" label="Approved" size="sm" />;
    if (status === "In Progress") return <StatusBadge status="info" label="In Progress" size="sm" />;
    if (status === "Rejected") return <StatusBadge status="error" label="Rejected" size="sm" />;
    return <StatusBadge status="pending" label="Pending" size="sm" />;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === "High") return <StatusBadge status="error" label="High" size="sm" />;
    if (priority === "Medium") return <StatusBadge status="warning" label="Medium" size="sm" />;
    return <StatusBadge status="neutral" label="Low" size="sm" />;
  };

  const handleCreateRequest = () => {
    // Handle create logic here
    setShowCreateModal(false);
    setCreateForm({
      vendorName: "",
      changeType: "",
      reason: "",
      priority: "Medium",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-[#0A0F14] mb-1">
                Vendor Change Requests
              </h1>
              <p className="text-sm text-[#64748B]">
                Manage vendor master data change requests
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </Button>
              
              <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
                    <Plus className="w-4 h-4" />
                    Create Change Request
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Vendor Change Request</DialogTitle>
                    <DialogDescription>
                      Submit a change request for vendor master data updates
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="vendorName">Vendor Name *</Label>
                      <Input
                        id="vendorName"
                        placeholder="Select or search vendor"
                        value={createForm.vendorName}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, vendorName: e.target.value })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="changeType">Change Type *</Label>
                      <Select
                        value={createForm.changeType}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, changeType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select change type" />
                        </SelectTrigger>
                        <SelectContent>
                          {changeTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={createForm.priority}
                        onValueChange={(value) =>
                          setCreateForm({ ...createForm, priority: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reason">Reason for Change *</Label>
                      <textarea
                        id="reason"
                        className="w-full min-h-[100px] px-3 py-2 border border-[#E6EEF2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00A9B7]"
                        placeholder="Provide detailed reason for this change"
                        value={createForm.reason}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, reason: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#00A9B7] hover:bg-[#008A96]"
                      onClick={handleCreateRequest}
                      disabled={
                        !createForm.vendorName ||
                        !createForm.changeType ||
                        !createForm.reason
                      }
                    >
                      Submit Request
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-white border border-[#E6EEF2] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Total Requests</p>
                  <p className="text-2xl font-semibold text-[#0A0F14]">{stats.total}</p>
                </div>
                <div className="w-10 h-10 bg-[#E0F5F7] rounded-lg flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-[#00A9B7]" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E6EEF2] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Pending</p>
                  <p className="text-2xl font-semibold text-[#0A0F14]">{stats.pending}</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E6EEF2] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">In Progress</p>
                  <p className="text-2xl font-semibold text-[#0A0F14]">{stats.inProgress}</p>
                </div>
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E6EEF2] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Approved</p>
                  <p className="text-2xl font-semibold text-[#0A0F14]">{stats.approved}</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E6EEF2] rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#64748B] mb-1">Rejected</p>
                  <p className="text-2xl font-semibold text-[#0A0F14]">{stats.rejected}</p>
                </div>
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Table */}
      <div className="px-8 py-6">
        <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm">
          {/* Search and Filters */}
          <div className="p-4 border-b border-[#E6EEF2]">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#64748B]" />
                <Input
                  placeholder="Search by vendor name or request ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {changeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button variant="outline" className="gap-2">
                <Filter className="w-4 h-4" />
                More Filters
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    <input type="checkbox" className="rounded border-[#E6EEF2]" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Request ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Vendor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Change Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Requested By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Request Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Approval Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-[#E6EEF2]">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-[#F6F9FC] transition-colors">
                    <td className="px-6 py-4">
                      <input type="checkbox" className="rounded border-[#E6EEF2]" />
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/vendors/change-requests/${request.id}`}
                        className="text-sm font-medium text-[#00A9B7] hover:underline"
                      >
                        {request.changeRequestId}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#0A0F14]">
                        {request.vendorName}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-[#0A0F14]">
                        {request.changeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">
                      {request.requestedBy}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#64748B]">
                      {request.requestDate}
                    </td>
                    <td className="px-6 py-4">
                      {getPriorityBadge(request.priority)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-[#64748B]">
                        {request.approvalStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/vendors/change-requests/${request.id}`}>
                          <Button variant="ghost" size="sm" className="gap-2">
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-[#E6EEF2] flex items-center justify-between">
            <p className="text-sm text-[#64748B]">
              Showing {filteredRequests.length} of {mockChangeRequests.length} requests
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-[#00A9B7] text-white">
                1
              </Button>
              <Button variant="outline" size="sm">
                2
              </Button>
              <Button variant="outline" size="sm">
                3
              </Button>
              <Button variant="outline" size="sm">
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
