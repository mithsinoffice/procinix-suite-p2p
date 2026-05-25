import { useState, useMemo } from "react";
import { Plus, Mail, Search, Filter, Download, RefreshCw, CheckCircle2, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";
import {
  useVendorInvitations,
  useCreateInvitation,
  type InvitationRow,
} from "../../../../../hooks/vendor-portal/useVendorInvitations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
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

// Adapter: server returns InvitationRow rows; the existing UI was authored
// against a richer mock shape. Map what we have today, leave the rest as
// '—'. Country / vendorType / category enrichment lands in Sprint 2 when
// the list endpoint joins through to the matrix-rule context.
type UiInvitation = {
  id:          string
  vendorName:  string
  email:       string
  invitedBy:   string
  invitedDate: string
  status:      'Pending' | 'Accepted' | 'Expired'
  statusColor: string
  expiresIn:   string
  country:     string
  vendorType:  string
  category:    string
  // Real keys we keep so other actions (resend, etc.) can target server rows.
  _serverId:   string
  _requestId:  string
}

function adaptInvitation(row: InvitationRow): UiInvitation {
  const uiStatus =
    row.status === 'ACCEPTED' ? 'Accepted' :
    row.status === 'PENDING'  ? 'Pending'  :
                                'Expired'
  const statusColor =
    uiStatus === 'Accepted' ? 'text-green-600 bg-green-50' :
    uiStatus === 'Pending'  ? 'text-yellow-600 bg-yellow-50' :
                              'text-red-600 bg-red-50'

  const msRemaining = new Date(row.expiresAt).getTime() - Date.now()
  const expiresIn = msRemaining <= 0
    ? 'Expired'
    : `${Math.ceil(msRemaining / 86_400_000)} days`

  return {
    id:          row.requestCode,
    vendorName:  row.vendorLegalName ?? '(unnamed)',
    email:       row.vendorEmail,
    invitedBy:   '—',
    invitedDate: row.sentAt.slice(0, 10),
    status:      uiStatus,
    statusColor,
    expiresIn,
    country:     '—',
    vendorType:  '—',
    category:    '—',
    _serverId:   row.id,
    _requestId:  row.requestId,
  }
}

const countries = ["United States", "India", "China", "Germany", "United Kingdom", "Singapore", "Japan", "Australia"];
const vendorTypes = ["Logistics Provider", "IT Services", "Supplier", "Manufacturer", "Consultant", "Service Provider"];
const categories = ["Transportation", "Technology", "Manufacturing", "Professional Services", "Facilities"];
const entities = ["Procinix USA Inc.", "Procinix EMEA GmbH", "Procinix APAC Pte Ltd", "Procinix Global"];

export function VendorInvitationsPage() {
  const invitationsQuery = useVendorInvitations({ limit: 100 });
  const createInvitation = useCreateInvitation();
  const invitations: UiInvitation[] = useMemo(
    () => (invitationsQuery.data?.rows ?? []).map(adaptInvitation),
    [invitationsQuery.data],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const loading = invitationsQuery.isLoading || invitationsQuery.isFetching;
  
  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<any>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [countryFilter, setCountryFilter] = useState("All");
  
  // Form state
  const [inviteForm, setInviteForm] = useState({
    legalName: "",
    email: "",
    country: "",
    vendorType: "",
    category: "",
    entity: "",
    expiryDays: "7",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});

  // Filtering and pagination
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const matchesSearch =
        searchQuery === "" ||
        inv.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
      const matchesCountry = countryFilter === "All" || inv.country === countryFilter;
      
      return matchesSearch && matchesStatus && matchesCountry;
    });
  }, [invitations, searchQuery, statusFilter, countryFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filteredInvitations.length / pageSize);
  const paginatedInvitations = filteredInvitations.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    return {
      total: invitations.length,
      pending: invitations.filter((i) => i.status === "Pending").length,
      accepted: invitations.filter((i) => i.status === "Accepted").length,
      expired: invitations.filter((i) => i.status === "Expired").length,
    };
  }, [invitations]);

  const statsData = [
    { label: "Total Sent", value: stats.total.toString(), icon: <Mail className="w-5 h-5 text-blue-600" />, bgColor: "bg-blue-50" },
    { label: "Pending", value: stats.pending.toString(), icon: <Clock className="w-5 h-5 text-yellow-600" />, bgColor: "bg-yellow-50" },
    { label: "Accepted", value: stats.accepted.toString(), icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bgColor: "bg-green-50" },
    { label: "Expired", value: stats.expired.toString(), icon: <XCircle className="w-5 h-5 text-red-600" />, bgColor: "bg-red-50" },
  ];

  const handleRefresh = async () => {
    await invitationsQuery.refetch();
    toast.success("Invitations refreshed");
  };

  const handleExport = () => {
    const csvContent = [
      ["Invitation ID", "Vendor Name", "Email", "Status", "Invited By", "Invited Date", "Expires In"].join(","),
      ...filteredInvitations.map((inv) =>
        [inv.id, inv.vendorName, inv.email, inv.status, inv.invitedBy, inv.invitedDate, inv.expiresIn].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invitations-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported invitations CSV");
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!inviteForm.legalName.trim()) errors.legalName = "Legal name is required";
    if (!inviteForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) {
      errors.email = "Invalid email format";
    }
    if (!inviteForm.country) errors.country = "Country is required";
    if (!inviteForm.vendorType) errors.vendorType = "Vendor type is required";
    if (!inviteForm.category) errors.category = "Category is required";
    if (!inviteForm.entity) errors.entity = "Entity is required";
    
    // Check for duplicate email with active invitation
    const duplicate = invitations.find(
      (inv) => inv.email.toLowerCase() === inviteForm.email.toLowerCase() && 
      (inv.status === "Pending" || inv.status === "Accepted")
    );
    if (duplicate) {
      errors.email = `An active invitation already exists for this email (${duplicate.id})`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendInvitation = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await createInvitation.mutateAsync({
        vendorLegalName:   inviteForm.legalName,
        vendorEmail:       inviteForm.email,
        // The form takes a country *name*; the API takes ISO-2. We don't have
        // a name→code lookup wired yet, so passthrough the first 2 chars for
        // now — Sprint 2 introduces a proper Country picker.
        vendorCountryCode: inviteForm.country.slice(0, 2).toUpperCase(),
        vendorType:        inviteForm.vendorType,
        industryCategory:  inviteForm.category,
      });
      setShowInviteModal(false);
      setInviteForm({
        legalName: "",
        email: "",
        country: "",
        vendorType: "",
        category: "",
        entity: "",
        expiryDays: "7",
        message: "",
      });
      setFormErrors({});
      toast.success(`Invitation sent to ${inviteForm.email}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send invitation';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!selectedInvitation) return;
    // The /resend endpoint lands in Sprint 2 — for now we just toast a
    // notice so the button is wired but doesn't fake server state.
    setShowResendConfirm(false);
    toast.info("Resend will be available in Sprint 2");
    setSelectedInvitation(null);
  };

  const handleView = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowViewModal(true);
  };

  const handleResendClick = (invitation: any) => {
    setSelectedInvitation(invitation);
    setShowResendConfirm(true);
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A0F14] mb-2">Vendor Invitations</h1>
            <p className="text-[#64748B]">Manage and track vendor onboarding invitations</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="px-4 py-2.5 bg-white border border-[#E6EEF2] text-[#0A0F14] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2 font-medium disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2.5 bg-[#00A9B7] text-white rounded-lg hover:bg-[#008A96] transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Send Invitation
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {statsData.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-[#E6EEF2]">
            <div className="flex items-center justify-between mb-3">
              <div className={`${stat.bgColor} p-3 rounded-lg`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-3xl font-semibold text-[#0A0F14] mb-1">{stat.value}</div>
            <div className="text-sm text-[#64748B]">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-xl border border-[#E6EEF2] mb-6">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search by vendor name, email, or invitation ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-[#E6EEF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00A9B7] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilterPanel(true)}
              className="px-4 py-2.5 bg-white border border-[#E6EEF2] text-[#0A0F14] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2 font-medium"
            >
              <Filter className="w-4 h-4" />
              Filter
              {(statusFilter !== "All" || countryFilter !== "All") && (
                <span className="ml-1 px-2 py-0.5 bg-[#00A9B7] text-white text-xs rounded-full">
                  {(statusFilter !== "All" ? 1 : 0) + (countryFilter !== "All" ? 1 : 0)}
                </span>
              )}
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2.5 bg-white border border-[#E6EEF2] text-[#0A0F14] rounded-lg hover:bg-[#F6F9FC] transition-colors flex items-center gap-2 font-medium"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Invitations Table */}
      <div className="bg-white rounded-xl border border-[#E6EEF2]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6EEF2]">
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Invitation ID</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Vendor Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Email</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Invited By</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Invited Date</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Expires In</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInvitations.map((invitation) => (
                <tr key={invitation.id} className="border-b border-[#E6EEF2] last:border-0 hover:bg-[#F6F9FC] transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm text-[#00A9B7] font-medium">{invitation.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-[#0A0F14]">{invitation.vendorName}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{invitation.email}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{invitation.invitedBy}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{invitation.invitedDate}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${invitation.statusColor}`}>
                      {invitation.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{invitation.expiresIn}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {(invitation.status === "Pending" || invitation.status === "Expired") && (
                        <button
                          onClick={() => handleResendClick(invitation)}
                          className="text-sm text-[#00A9B7] hover:underline font-medium"
                        >
                          Resend
                        </button>
                      )}
                      <button
                        onClick={() => handleView(invitation)}
                        className="text-sm text-[#64748B] hover:text-[#0A0F14] hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-[#E6EEF2] flex items-center justify-between">
          <div className="text-sm text-[#64748B]">
            Showing {Math.min((page - 1) * pageSize + 1, filteredInvitations.length)}-
            {Math.min(page * pageSize, filteredInvitations.length)} of {filteredInvitations.length} invitations
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-2 bg-white border border-[#E6EEF2] text-[#0A0F14] rounded-lg hover:bg-[#F6F9FC] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-2 rounded-lg font-medium text-sm ${
                    page === pageNum
                      ? "bg-[#00A9B7] text-white"
                      : "bg-white border border-[#E6EEF2] text-[#0A0F14] hover:bg-[#F6F9FC]"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-2 bg-white border border-[#E6EEF2] text-[#0A0F14] rounded-lg hover:bg-[#F6F9FC] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Send Invitation Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Send Vendor Invitation</DialogTitle>
            <DialogDescription>
              Send a secure invitation link to the vendor's email address for onboarding
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Name *</Label>
              <Input
                id="legalName"
                value={inviteForm.legalName}
                onChange={(e) => setInviteForm({ ...inviteForm, legalName: e.target.value })}
                placeholder="Enter vendor legal name"
                className={formErrors.legalName ? "border-red-500" : ""}
              />
              {formErrors.legalName && <p className="text-xs text-red-600">{formErrors.legalName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="vendor@company.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Select value={inviteForm.country} onValueChange={(value) => setInviteForm({ ...inviteForm, country: value })}>
                <SelectTrigger className={formErrors.country ? "border-red-500" : ""}>
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
              {formErrors.country && <p className="text-xs text-red-600">{formErrors.country}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorType">Vendor Type *</Label>
              <Select value={inviteForm.vendorType} onValueChange={(value) => setInviteForm({ ...inviteForm, vendorType: value })}>
                <SelectTrigger className={formErrors.vendorType ? "border-red-500" : ""}>
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
              {formErrors.vendorType && <p className="text-xs text-red-600">{formErrors.vendorType}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Vendor Category *</Label>
              <Select value={inviteForm.category} onValueChange={(value) => setInviteForm({ ...inviteForm, category: value })}>
                <SelectTrigger className={formErrors.category ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.category && <p className="text-xs text-red-600">{formErrors.category}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">Entity *</Label>
              <Select value={inviteForm.entity} onValueChange={(value) => setInviteForm({ ...inviteForm, entity: value })}>
                <SelectTrigger className={formErrors.entity ? "border-red-500" : ""}>
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
              {formErrors.entity && <p className="text-xs text-red-600">{formErrors.entity}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                value={inviteForm.message}
                onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                placeholder="Add a personal message to the invitation"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={submitting}
              className="bg-[#00A9B7] hover:bg-[#008A96]"
            >
              {submitting ? "Sending..." : "Send Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Panel Dialog */}
      <Dialog open={showFilterPanel} onOpenChange={setShowFilterPanel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Invitations</DialogTitle>
            <DialogDescription>Apply filters to narrow down the results</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Country</Label>
              <Select value={countryFilter} onValueChange={setCountryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Countries</SelectItem>
                  {countries.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatusFilter("All");
                setCountryFilter("All");
              }}
            >
              Clear Filters
            </Button>
            <Button onClick={() => setShowFilterPanel(false)} className="bg-[#00A9B7] hover:bg-[#008A96]">
              Apply Filters
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invitation Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invitation Details</DialogTitle>
            <DialogDescription>View complete invitation information</DialogDescription>
          </DialogHeader>

          {selectedInvitation && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#64748B]">Invitation ID</Label>
                  <p className="font-mono text-[#00A9B7] font-medium">{selectedInvitation.id}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Status</Label>
                  <div className="mt-1">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${selectedInvitation.statusColor}`}>
                      {selectedInvitation.status}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-[#64748B]">Vendor Name</Label>
                  <p className="font-medium">{selectedInvitation.vendorName}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Email</Label>
                  <p className="font-medium">{selectedInvitation.email}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Country</Label>
                  <p className="font-medium">{selectedInvitation.country}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Vendor Type</Label>
                  <p className="font-medium">{selectedInvitation.vendorType}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Invited By</Label>
                  <p className="font-medium">{selectedInvitation.invitedBy}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Invited Date</Label>
                  <p className="font-medium">{selectedInvitation.invitedDate}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Expires In</Label>
                  <p className="font-medium">{selectedInvitation.expiresIn}</p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend Confirmation Dialog */}
      <AlertDialog open={showResendConfirm} onOpenChange={setShowResendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send a new invitation email to <strong>{selectedInvitation?.email}</strong> and extend the expiry date by 7 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedInvitation(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResend} className="bg-[#00A9B7] hover:bg-[#008A96]">
              Resend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
