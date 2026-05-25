import { useState, useMemo } from "react";
import {  } from "react-router-dom";
import { Plus, Search, Filter, Download, RefreshCw, CheckCircle2, Clock, Ban, UserCheck } from "lucide-react";
import { toast } from "sonner";
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
import { Switch } from "../components/ui/switch";

const initialUsers = [
  {
    id: "USR-001",
    name: "John Smith",
    email: "john.smith@acmeglobal.com",
    vendorName: "Acme Global Logistics Ltd.",
    vendorId: "VND-2025-00234",
    role: "Primary Contact",
    status: "Active",
    statusColor: "text-green-600 bg-green-50",
    lastLogin: "2026-02-19 14:23",
    invitedDate: "2025-11-15",
  },
  {
    id: "USR-002",
    name: "Sarah Johnson",
    email: "s.johnson@techvision.com",
    vendorName: "TechVision Solutions Inc.",
    vendorId: "VND-2025-00198",
    role: "Finance Manager",
    status: "Active",
    statusColor: "text-green-600 bg-green-50",
    lastLogin: "2026-02-20 09:15",
    invitedDate: "2025-10-22",
  },
  {
    id: "USR-003",
    name: "Michael Chen",
    email: "mchen@globalsupply.com",
    vendorName: "Global Supply Partners",
    vendorId: "VND-2025-00167",
    role: "Operations Manager",
    status: "Inactive",
    statusColor: "text-gray-600 bg-gray-50",
    lastLogin: "2026-01-15 16:42",
    invitedDate: "2025-09-08",
  },
  {
    id: "USR-004",
    name: "Lisa Anderson",
    email: "l.anderson@premiermfg.com",
    vendorName: "Premier Manufacturing Corp",
    vendorId: "VND-2026-00012",
    role: "Primary Contact",
    status: "Pending",
    statusColor: "text-yellow-600 bg-yellow-50",
    lastLogin: "Never",
    invitedDate: "2026-02-18",
  },
  {
    id: "USR-005",
    name: "David Martinez",
    email: "d.martinez@innovatech.com",
    vendorName: "Innovatech Systems",
    vendorId: "VND-2025-00289",
    role: "Compliance Officer",
    status: "Suspended",
    statusColor: "text-red-600 bg-red-50",
    lastLogin: "2026-02-01 11:30",
    invitedDate: "2025-12-03",
  },
];

const roles = ["Primary Contact", "Finance Manager", "Operations Manager", "Compliance Officer", "Document Manager"];

// Extract unique vendors from users
const getVendorsFromUsers = (users: any[]) => {
  const vendorsMap = new Map();
  users.forEach(user => {
    if (!vendorsMap.has(user.vendorId)) {
      vendorsMap.set(user.vendorId, { id: user.vendorId, name: user.vendorName });
    }
  });
  return Array.from(vendorsMap.values());
};

export function VendorPortalUsersPage() {
  const [users, setUsers] = useState(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; message: string } | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState("All");
  const [roleFilter, setRoleFilter] = useState("All");
  
  // Form state
  const [userForm, setUserForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    vendor: "",
    vendorName: "",
    role: "",
    status: "Active",
    sendWelcome: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<any>({});

  const vendors = useMemo(() => getVendorsFromUsers(users), [users]);

  // Filtering and pagination
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        searchQuery === "" ||
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "All" || user.status === statusFilter;
      const matchesRole = roleFilter === "All" || user.role === roleFilter;
      
      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  const pageSize = 10;
  const totalPages = Math.ceil(filteredUsers.length / pageSize);
  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);

  const stats = useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === "Active").length,
      pending: users.filter((u) => u.status === "Pending").length,
      suspended: users.filter((u) => u.status === "Suspended").length,
    };
  }, [users]);

  const statsData = [
    { label: "Total Users", value: stats.total.toString(), icon: <UserCheck className="w-5 h-5 text-blue-600" />, bgColor: "bg-blue-50" },
    { label: "Active", value: stats.active.toString(), icon: <CheckCircle2 className="w-5 h-5 text-green-600" />, bgColor: "bg-green-50" },
    { label: "Pending", value: stats.pending.toString(), icon: <Clock className="w-5 h-5 text-yellow-600" />, bgColor: "bg-yellow-50" },
    { label: "Suspended", value: stats.suspended.toString(), icon: <Ban className="w-5 h-5 text-red-600" />, bgColor: "bg-red-50" },
  ];

  const handleRefresh = async () => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setLoading(false);
    toast.success("Users refreshed");
  };

  const handleExport = () => {
    const csvContent = [
      ["User ID", "Name", "Email", "Vendor", "Role", "Status", "Last Login"].join(","),
      ...filteredUsers.map((user) =>
        [user.id, user.name, user.email, user.vendorName, user.role, user.status, user.lastLogin].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `portal-users-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Exported users CSV");
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!userForm.firstName.trim()) errors.firstName = "First name is required";
    if (!userForm.lastName.trim()) errors.lastName = "Last name is required";
    if (!userForm.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = "Invalid email format";
    }
    if (!userForm.vendor) errors.vendor = "Vendor is required";
    if (!userForm.role) errors.role = "Role is required";
    
    // Check for duplicate email for same vendor (except when editing current user)
    const duplicate = users.find(
      (user) => 
        user.email.toLowerCase() === userForm.email.toLowerCase() && 
        user.vendorId === userForm.vendor &&
        (!selectedUser || user.id !== selectedUser.id)
    );
    if (duplicate) {
      errors.email = `This email is already registered for this vendor (${duplicate.id})`;
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setUserForm({
      firstName: "",
      lastName: "",
      email: "",
      vendor: "",
      vendorName: "",
      role: "",
      status: "Active",
      sendWelcome: true,
    });
    setFormErrors({});
  };

  const handleAddUser = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const selectedVendor = vendors.find((v) => v.id === userForm.vendor);
    const newUser = {
      id: `USR-${String(users.length + 1).padStart(3, "0")}`,
      name: `${userForm.firstName} ${userForm.lastName}`,
      email: userForm.email,
      vendorName: selectedVendor?.name || "",
      vendorId: userForm.vendor,
      role: userForm.role,
      status: userForm.status,
      statusColor: userForm.status === "Active" ? "text-green-600 bg-green-50" : "text-yellow-600 bg-yellow-50",
      lastLogin: "Never",
      invitedDate: new Date().toISOString().split("T")[0],
    };
    
    setUsers([...users, newUser]);
    setShowAddUser(false);
    resetForm();
    setSubmitting(false);
    toast.success(`User added successfully${userForm.sendWelcome ? ". Welcome email sent." : ""}`);
  };

  const handleEditClick = (user: any) => {
    const [firstName, ...lastNameParts] = user.name.split(" ");
    setUserForm({
      firstName,
      lastName: lastNameParts.join(" "),
      email: user.email,
      vendor: user.vendorId,
      vendorName: user.vendorName,
      role: user.role,
      status: user.status,
      sendWelcome: false,
    });
    setSelectedUser(user);
    setShowEditUser(true);
  };

  const handleUpdateUser = async () => {
    if (!validateForm()) return;
    
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const selectedVendor = vendors.find((v) => v.id === userForm.vendor);
    setUsers(
      users.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              name: `${userForm.firstName} ${userForm.lastName}`,
              email: userForm.email,
              vendorName: selectedVendor?.name || user.vendorName,
              vendorId: userForm.vendor,
              role: userForm.role,
              status: userForm.status,
              statusColor:
                userForm.status === "Active"
                  ? "text-green-600 bg-green-50"
                  : userForm.status === "Suspended"
                  ? "text-red-600 bg-red-50"
                  : "text-yellow-600 bg-yellow-50",
            }
          : user
      )
    );
    
    setShowEditUser(false);
    setSelectedUser(null);
    resetForm();
    setSubmitting(false);
    toast.success("User updated successfully");
  };

  const handleSuspendClick = (user: any) => {
    setSelectedUser(user);
    setConfirmAction({
      type: "suspend",
      message: `Are you sure you want to suspend ${user.name}? This will revoke their portal access immediately.`,
    });
    setShowConfirmDialog(true);
  };

  const handleActivateClick = (user: any) => {
    setSelectedUser(user);
    setConfirmAction({
      type: "activate",
      message: `Are you sure you want to activate ${user.name}? This will restore their portal access.`,
    });
    setShowConfirmDialog(true);
  };

  const handleResendClick = (user: any) => {
    setSelectedUser(user);
    setConfirmAction({
      type: "resend",
      message: `Resend invitation email to ${user.email}?`,
    });
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedUser || !confirmAction) return;
    
    setShowConfirmDialog(false);
    await new Promise((resolve) => setTimeout(resolve, 400));
    
    if (confirmAction.type === "suspend") {
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status: "Suspended", statusColor: "text-red-600 bg-red-50" }
            : user
        )
      );
      toast.success(`${selectedUser.name} has been suspended`);
    } else if (confirmAction.type === "activate") {
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status: "Active", statusColor: "text-green-600 bg-green-50" }
            : user
        )
      );
      toast.success(`${selectedUser.name} has been activated`);
    } else if (confirmAction.type === "resend") {
      toast.success(`Invitation resent to ${selectedUser.email}`);
    }
    
    setSelectedUser(null);
    setConfirmAction(null);
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0A0F14] mb-2">Portal Users</h1>
            <p className="text-[#64748B]">Manage vendor portal user access and permissions</p>
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
              onClick={() => setShowAddUser(true)}
              className="px-4 py-2.5 bg-[#00A9B7] text-white rounded-lg hover:bg-[#008A96] transition-colors flex items-center gap-2 font-medium shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add User
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
                placeholder="Search by name, email, vendor, or user ID..."
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
              {(statusFilter !== "All" || roleFilter !== "All") && (
                <span className="ml-1 px-2 py-0.5 bg-[#00A9B7] text-white text-xs rounded-full">
                  {(statusFilter !== "All" ? 1 : 0) + (roleFilter !== "All" ? 1 : 0)}
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

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-[#E6EEF2]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6EEF2]">
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">User ID</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Name</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Email</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Vendor</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Role</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Status</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Last Login</th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[#0A0F14]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="border-b border-[#E6EEF2] last:border-0 hover:bg-[#F6F9FC] transition-colors">
                  <td className="py-4 px-6">
                    <span className="font-mono text-sm text-[#00A9B7] font-medium">{user.id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm font-medium text-[#0A0F14]">{user.name}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{user.email}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#0A0F14]">{user.vendorName}</span>
                      <span className="text-xs text-[#94A3B8] font-mono">{user.vendorId}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{user.role}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.statusColor}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-[#64748B]">{user.lastLogin}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="text-sm text-[#00A9B7] hover:underline font-medium"
                      >
                        Edit
                      </button>
                      {user.status === "Active" && (
                        <button
                          onClick={() => handleSuspendClick(user)}
                          className="text-sm text-[#64748B] hover:text-[#DC2626] hover:underline"
                        >
                          Suspend
                        </button>
                      )}
                      {user.status === "Suspended" && (
                        <button
                          onClick={() => handleActivateClick(user)}
                          className="text-sm text-[#64748B] hover:text-[#00A9B7] hover:underline"
                        >
                          Activate
                        </button>
                      )}
                      {user.status === "Pending" && (
                        <button
                          onClick={() => handleResendClick(user)}
                          className="text-sm text-[#64748B] hover:text-[#00A9B7] hover:underline"
                        >
                          Resend
                        </button>
                      )}
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
            Showing {Math.min((page - 1) * pageSize + 1, filteredUsers.length)}-
            {Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
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

      {/* Add User Modal */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Portal User</DialogTitle>
            <DialogDescription>
              Create a new user account for vendor portal access
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                placeholder="John"
                className={formErrors.firstName ? "border-red-500" : ""}
              />
              {formErrors.firstName && <p className="text-xs text-red-600">{formErrors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                placeholder="Doe"
                className={formErrors.lastName ? "border-red-500" : ""}
              />
              {formErrors.lastName && <p className="text-xs text-red-600">{formErrors.lastName}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="john.doe@company.com"
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select value={userForm.vendor} onValueChange={(value) => setUserForm({ ...userForm, vendor: value })}>
                <SelectTrigger className={formErrors.vendor ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.vendor && <p className="text-xs text-red-600">{formErrors.vendor}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                <SelectTrigger className={formErrors.role ? "border-red-500" : ""}>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-red-600">{formErrors.role}</p>}
            </div>

            <div className="flex items-center space-x-2 col-span-2">
              <Switch
                id="sendWelcome"
                checked={userForm.sendWelcome}
                onCheckedChange={(checked) => setUserForm({ ...userForm, sendWelcome: checked })}
              />
              <Label htmlFor="sendWelcome" className="cursor-pointer">
                Send welcome email with login instructions
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddUser(false); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={submitting}
              className="bg-[#00A9B7] hover:bg-[#008A96]"
            >
              {submitting ? "Adding..." : "Add User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information and permissions
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editFirstName">First Name *</Label>
              <Input
                id="editFirstName"
                value={userForm.firstName}
                onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                className={formErrors.firstName ? "border-red-500" : ""}
              />
              {formErrors.firstName && <p className="text-xs text-red-600">{formErrors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editLastName">Last Name *</Label>
              <Input
                id="editLastName"
                value={userForm.lastName}
                onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                className={formErrors.lastName ? "border-red-500" : ""}
              />
              {formErrors.lastName && <p className="text-xs text-red-600">{formErrors.lastName}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="editEmail">Email Address *</Label>
              <Input
                id="editEmail"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                className={formErrors.email ? "border-red-500" : ""}
              />
              {formErrors.email && <p className="text-xs text-red-600">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editVendor">Vendor *</Label>
              <Select value={userForm.vendor} onValueChange={(value) => setUserForm({ ...userForm, vendor: value })}>
                <SelectTrigger className={formErrors.vendor ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.vendor && <p className="text-xs text-red-600">{formErrors.vendor}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="editRole">Role *</Label>
              <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                <SelectTrigger className={formErrors.role ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formErrors.role && <p className="text-xs text-red-600">{formErrors.role}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="editStatus">Status</Label>
              <Select value={userForm.status} onValueChange={(value) => setUserForm({ ...userForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditUser(false); setSelectedUser(null); resetForm(); }}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={submitting}
              className="bg-[#00A9B7] hover:bg-[#008A96]"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Panel Dialog */}
      <Dialog open={showFilterPanel} onOpenChange={setShowFilterPanel}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Users</DialogTitle>
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
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
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
                setRoleFilter("All");
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

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "suspend" && "Suspend User"}
              {confirmAction?.type === "activate" && "Activate User"}
              {confirmAction?.type === "resend" && "Resend Invitation"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setSelectedUser(null); setConfirmAction(null); }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} className="bg-[#00A9B7] hover:bg-[#008A96]">
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
