import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Download,
  Mail,
  Users,
  Clock,
  CheckCircle2,
  FileCheck,
  AlertTriangle,
  Eye,
  Edit,
  CheckCheck,
  MoreHorizontal,
} from "lucide-react";
import { KPICard } from "../components/design-system/KPICard";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { mockVendorRequests, countries, vendorTypes, entities } from "../data/mockData";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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

export function VendorRequestsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedRisk, setSelectedRisk] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [inviteForm, setInviteForm] = useState({
    legalName: "",
    email: "",
    country: "",
    vendorType: "",
    entity: "",
  });

  const filteredRequests = mockVendorRequests.filter((request) => {
    const matchesSearch =
      searchQuery === "" ||
      request.legalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCountry = selectedCountry === "all" || request.country === selectedCountry;
    const matchesType = selectedType === "all" || request.vendorType === selectedType;
    const matchesRisk = selectedRisk === "all" || request.riskLevel === selectedRisk;
    const matchesStatus = selectedStatus === "all" || request.validationStatus === selectedStatus;
    
    return matchesSearch && matchesCountry && matchesType && matchesRisk && matchesStatus;
  });

  const kpiData = {
    total: mockVendorRequests.length,
    awaitingSubmission: mockVendorRequests.filter((r) => r.validationStatus === "Pending").length,
    underValidation: mockVendorRequests.filter((r) => r.validationStatus === "In Progress").length,
    pendingApproval: mockVendorRequests.filter((r) => r.approvalStatus === "Pending").length,
    highRisk: mockVendorRequests.filter((r) => r.riskLevel === "High").length,
  };

  const handleSendInvitation = () => {
    setShowInviteModal(false);
    setShowSuccessModal(true);
    setInviteForm({
      legalName: "",
      email: "",
      country: "",
      vendorType: "",
      entity: "",
    });
  };

  const getRiskBadge = (level: string) => {
    if (level === "Low") return <StatusBadge status="success" label="Low Risk" size="sm" />;
    if (level === "Medium") return <StatusBadge status="warning" label="Medium Risk" size="sm" />;
    return <StatusBadge status="error" label="High Risk" size="sm" />;
  };

  const getValidationBadge = (status: string) => {
    if (status === "Completed") return <StatusBadge status="success" label="Completed" size="sm" />;
    if (status === "In Progress") return <StatusBadge status="info" label="In Progress" size="sm" />;
    if (status === "Failed") return <StatusBadge status="error" label="Failed" size="sm" />;
    return <StatusBadge status="neutral" label="Pending" size="sm" />;
  };

  const getApprovalBadge = (status: string) => {
    if (status === "Approved") return <StatusBadge status="success" label="Approved" size="sm" />;
    if (status === "In Progress") return <StatusBadge status="info" label="In Progress" size="sm" />;
    if (status === "Rejected") return <StatusBadge status="error" label="Rejected" size="sm" />;
    return <StatusBadge status="neutral" label="Pending" size="sm" />;
  };

  const getSyncBadge = (status: string) => {
    if (status === "Synced") return <StatusBadge status="success" label="Synced" size="sm" />;
    if (status === "In Progress") return <StatusBadge status="info" label="Syncing" size="sm" />;
    if (status === "Failed") return <StatusBadge status="error" label="Failed" size="sm" />;
    return <StatusBadge status="neutral" label="Not Started" size="sm" />;
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Page Header - Control Tower Title */}
      <div className="bg-white border-b border-[#E6EEF2]">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-[#0A0F14] mb-2">
                Vendor Requests Control Tower
              </h1>
              <p className="text-sm text-[#64748B]">
                Manage onboarding lifecycle, validation, approvals, and ERP sync
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2 h-10">
                <Download className="w-4 h-4" />
                Export
              </Button>
              
              <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-[#00A9B7] hover:bg-[#008A96] h-10">
                    <Mail className="w-4 h-4" />
                    Invite Vendor
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Invite Vendor to Self-Service Portal</DialogTitle>
                    <DialogDescription>
                      Send a secure invitation link to the vendor's email address
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="legalName">Legal Name *</Label>
                      <Input
                        id="legalName"
                        placeholder="Enter vendor legal name"
                        value={inviteForm.legalName}
                        onChange={(e) => setInviteForm({ ...inviteForm, legalName: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="contact@vendor.com"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select value={inviteForm.country} onValueChange={(value) => setInviteForm({ ...inviteForm, country: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="vendorType">Vendor Type *</Label>
                      <Select value={inviteForm.vendorType} onValueChange={(value) => setInviteForm({ ...inviteForm, vendorType: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {vendorTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="entity">Entity Mapping *</Label>
                      <Select value={inviteForm.entity} onValueChange={(value) => setInviteForm({ ...inviteForm, entity: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select entity" />
                        </SelectTrigger>
                        <SelectContent>
                          {entities.map((entity) => (
                            <SelectItem key={entity} value={entity}>
                              {entity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowInviteModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-[#00A9B7] hover:bg-[#008A96]"
                      onClick={handleSendInvitation}
                      disabled={!inviteForm.legalName || !inviteForm.email || !inviteForm.country || !inviteForm.vendorType || !inviteForm.entity}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Send Secure Invitation
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent>
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-[#0A0F14] mb-2">Invitation Sent Successfully!</h3>
                    <p className="text-[#64748B] mb-6">
                      The vendor will receive a secure link to complete their onboarding.
                    </p>
                    <div className="bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-[#64748B]">Status</span>
                        <StatusBadge status="info" label="Sent" size="sm" />
                      </div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-[#64748B]">Opened</span>
                        <span className="text-[#0A0F14]">Not yet</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Submitted</span>
                        <span className="text-[#0A0F14]">Pending</span>
                      </div>
                    </div>
                    <Button className="w-full bg-[#00A9B7] hover:bg-[#008A96]" onClick={() => setShowSuccessModal(false)}>
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-5 gap-4">
            <KPICard
              title="Total Requests"
              value={kpiData.total}
              icon={<Users className="w-6 h-6" />}
              trend={{ value: 12, direction: "up" }}
            />
            <KPICard
              title="Awaiting Vendor Submission"
              value={kpiData.awaitingSubmission}
              icon={<Clock className="w-6 h-6" />}
            />
            <KPICard
              title="Under Validation"
              value={kpiData.underValidation}
              icon={<FileCheck className="w-6 h-6" />}
            />
            <KPICard
              title="Pending Approvals"
              value={kpiData.pendingApproval}
              icon={<CheckCircle2 className="w-6 h-6" />}
            />
            <KPICard
              title="High Risk Vendors"
              value={kpiData.highRisk}
              icon={<AlertTriangle className="w-6 h-6" />}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Filter Panel */}
        <div className="w-72 bg-white border-r border-[#E6EEF2] min-h-[calc(100vh-300px)] p-6">
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-[#00A9B7]" />
            <h3 className="font-semibold text-[#0A0F14]">Filters</h3>
          </div>

          <div className="space-y-6">
            <div>
              <Label className="mb-2 block">Country</Label>
              <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                <SelectTrigger>
                  <SelectValue placeholder="All Countries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Vendor Type</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {vendorTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Risk Level</Label>
              <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                <SelectTrigger>
                  <SelectValue placeholder="All Risk Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-2 block">Validation Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSelectedCountry("all");
                setSelectedType("all");
                setSelectedRisk("all");
                setSelectedStatus("all");
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Main Table Area */}
        <div className="flex-1 p-6">
          {/* Search and Actions */}
          <div className="bg-white rounded-xl border border-[#E6EEF2] shadow-sm p-4 mb-4 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <Input
                placeholder="Search by vendor name or request ID..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2">
              <CheckCheck className="w-4 h-4" />
              Bulk Validate
            </Button>
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-xl border border-[#E6EEF2] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
                  <tr>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">
                      <input type="checkbox" className="rounded border-[#E6EEF2]" />
                    </th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Request ID</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Vendor Legal Name</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Source</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Country</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Risk Level</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Validation</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Approval</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">ERP Sync</th>
                    <th className="text-left py-4 px-4 text-sm font-semibold text-[#0A0F14]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6EEF2]">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-[#F6F9FC] transition-colors">
                      <td className="py-4 px-4">
                        <input type="checkbox" className="rounded border-[#E6EEF2]" />
                      </td>
                      <td className="py-4 px-4">
                        <Link
                          to={`/vendors/requests/${request.id}/edit`}
                          className="text-sm font-medium text-[#00A9B7] hover:underline"
                        >
                          {request.requestId}
                        </Link>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">{request.legalName}</p>
                          <p className="text-xs text-[#64748B]">{request.entity}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#0A0F14]">{request.onboardingSource}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-sm text-[#0A0F14]">{request.country}</span>
                      </td>
                      <td className="py-4 px-4">{getRiskBadge(request.riskLevel)}</td>
                      <td className="py-4 px-4">{getValidationBadge(request.validationStatus)}</td>
                      <td className="py-4 px-4">{getApprovalBadge(request.approvalStatus)}</td>
                      <td className="py-4 px-4">{getSyncBadge(request.erpSyncStatus)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Link to={`/vendors/${request.id}/console`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="360° Console">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link to={`/vendors/requests/${request.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {request.validationStatus === "Completed" && request.approvalStatus === "Pending" && (
                            <Link to={`/vendors/requests/${request.id}/approval`}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <CheckCheck className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-[#64748B]">
              Showing {filteredRequests.length} of {mockVendorRequests.length} requests
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-[#00A9B7] text-white hover:bg-[#008A96]">
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