import {  } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Download,
  Edit,
  Ban,
  CheckCircle2,
  Clock,
  CreditCard,
  Activity,
  TrendingUp,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card } from "../components/ui/card";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { RiskMeter } from "../components/design-system/RiskMeter";
import { mockVendorRequests } from "../data/mockData";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function VendorProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = mockVendorRequests.find((v) => v.id === id);

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  const riskTrendData = [
    { month: "Sep", score: 45 },
    { month: "Oct", score: 42 },
    { month: "Nov", score: 38 },
    { month: "Dec", score: 35 },
    { month: "Jan", score: 32 },
    { month: "Feb", score: vendor.validationScore || 25 },
  ];

  const documents = [
    {
      name: "Certificate of Incorporation",
      uploadDate: "2026-01-15",
      expiryDate: null,
      status: "Active",
    },
    {
      name: "PAN Card",
      uploadDate: "2026-01-15",
      expiryDate: null,
      status: "Active",
    },
    {
      name: "GST Certificate",
      uploadDate: "2026-01-15",
      expiryDate: "2027-03-31",
      status: "Active",
    },
    {
      name: "Bank Statement",
      uploadDate: "2026-02-01",
      expiryDate: "2026-05-01",
      status: "Expiring Soon",
    },
    {
      name: "ISO 9001 Certificate",
      uploadDate: "2025-12-10",
      expiryDate: "2026-12-10",
      status: "Active",
    },
  ];

  const auditTrail = [
    {
      action: "Vendor Created",
      user: "Sarah Mitchell",
      timestamp: "2026-02-18 14:30",
      details: "Initial vendor setup completed",
    },
    {
      action: "Validation Completed",
      user: "System",
      timestamp: "2026-02-18 15:45",
      details: "All validation checks passed",
    },
    {
      action: "Approval Granted - Finance",
      user: "Michael Chen",
      timestamp: "2026-02-18 16:20",
      details: "Finance department approved",
    },
    {
      action: "ERP Sync Initiated",
      user: "System",
      timestamp: "2026-02-18 16:25",
      details: "Syncing with SAP ERP",
    },
    {
      action: "ERP Sync Completed",
      user: "System",
      timestamp: "2026-02-18 16:30",
      details: "Vendor code: V-2026-234",
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
            onClick={() => navigate("/vendors/requests")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vendor Requests
          </Button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-[#E0F5F7] rounded-lg flex items-center justify-center">
                <Building2 className="w-8 h-8 text-[#00A9B7]" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-semibold text-[#0A0F14]">
                    {vendor.legalName}
                  </h1>
                  {vendor.validationScore && vendor.validationScore <= 30 ? (
                    <StatusBadge status="success" label="Active" />
                  ) : (
                    <StatusBadge status="warning" label="Under Review" />
                  )}
                </div>
                <div className="flex items-center gap-6 text-sm text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {vendor.country}
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {vendor.vendorType}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {vendor.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {vendor.phone}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Profile
              </Button>
              <Button variant="outline" className="gap-2">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
              <Button variant="outline" className="gap-2 text-[#DC2626] border-[#DC2626] hover:bg-red-50">
                <Ban className="w-4 h-4" />
                Block Vendor
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-white border border-[#E6EEF2]">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="compliance">Compliance & KYC</TabsTrigger>
                <TabsTrigger value="banking">Banking</TabsTrigger>
                <TabsTrigger value="entity">Entity Mapping</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="erp">ERP Sync</TabsTrigger>
                <TabsTrigger value="history">Change History</TabsTrigger>
                <TabsTrigger value="audit">Audit Trail</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4 border-[#E6EEF2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-[#0A0F14]">24</p>
                        <p className="text-xs text-[#64748B]">Total Orders</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-[#E6EEF2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-[#0A0F14]">$458K</p>
                        <p className="text-xs text-[#64748B]">Total Spend</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-[#E6EEF2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-[#0A0F14]">18 days</p>
                        <p className="text-xs text-[#64748B]">Avg. Payment</p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-4 border-[#E6EEF2]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-[#0A0F14]">98%</p>
                        <p className="text-xs text-[#64748B]">On-Time Rate</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Basic Information */}
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Basic Information
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Legal Name</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.legalName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Request ID</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.requestId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Country</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.country}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Vendor Type</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.vendorType}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Entity</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.entity}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Onboarding Source</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.onboardingSource}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Email</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.email}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Phone</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        {vendor.phone}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Risk Trend Chart */}
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Risk Score Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={riskTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" />
                      <XAxis
                        dataKey="month"
                        stroke="#64748B"
                        fontSize={12}
                      />
                      <YAxis stroke="#64748B" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #E6EEF2",
                          borderRadius: "8px",
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#00A9B7"
                        strokeWidth={2}
                        dot={{ fill: "#00A9B7", r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-4">
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Tax Details
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">PAN Number</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        ABCDE1234F
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">GST Number</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        29ABCDE1234F1Z5
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">TAN Number</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        ABCD12345E
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Tax Status</p>
                      <StatusBadge status="success" label="Verified" size="sm" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Compliance Screening
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            Sanctions Screening
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Last checked: Feb 18, 2026
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" label="Clear" size="sm" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            PEP Screening
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Last checked: Feb 18, 2026
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" label="Clear" size="sm" />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            Adverse Media Check
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Last checked: Feb 18, 2026
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" label="Clear" size="sm" />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="banking" className="space-y-4">
                <Card className="p-6 border-[#E6EEF2]">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-[#0A0F14]">
                      Primary Bank Account
                    </h3>
                    <StatusBadge status="success" label="Verified" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Bank Name</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        HDFC Bank Ltd
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Account Number</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        •••• •••• 5678
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">IFSC Code</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        HDFC0001234
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Account Type</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        Current Account
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Branch</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        Mumbai - Andheri East
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Verification Status</p>
                      <StatusBadge status="success" label="Penny Drop Verified" size="sm" />
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Payment Terms
                  </h3>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Payment Terms</p>
                      <p className="text-sm text-[#0A0F14] font-medium">Net 30</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Payment Method</p>
                      <p className="text-sm text-[#0A0F14] font-medium">
                        Bank Transfer
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">Currency</p>
                      <p className="text-sm text-[#0A0F14] font-medium">INR</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#64748B] mb-1">TDS Applicable</p>
                      <p className="text-sm text-[#0A0F14] font-medium">Yes (2%)</p>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="entity" className="space-y-4">
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Entity Mapping
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#E0F5F7] rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-[#00A9B7]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            {vendor.entity}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            ERP Vendor Code: V-2026-234-IN
                          </p>
                        </div>
                      </div>
                      <StatusBadge status="success" label="Active" size="sm" />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <Card className="border-[#E6EEF2]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Document Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Upload Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Expiry Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E6EEF2]">
                        {documents.map((doc, index) => (
                          <tr key={index} className="hover:bg-[#F6F9FC]">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#64748B]" />
                                <span className="text-sm text-[#0A0F14]">
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#64748B]">
                              {doc.uploadDate}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#64748B]">
                              {doc.expiryDate || "N/A"}
                            </td>
                            <td className="px-6 py-4">
                              {doc.status === "Active" ? (
                                <StatusBadge
                                  status="success"
                                  label="Active"
                                  size="sm"
                                />
                              ) : (
                                <StatusBadge
                                  status="warning"
                                  label="Expiring Soon"
                                  size="sm"
                                />
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <Button variant="ghost" size="sm" className="gap-2">
                                <Download className="w-4 h-4" />
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="erp" className="space-y-4">
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    ERP Sync Status
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            SAP S/4HANA - {vendor.entity}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Last synced: Feb 18, 2026 16:30
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge status="success" label="Synced" size="sm" />
                        <p className="text-xs text-[#64748B] mt-1">
                          Vendor Code: V-2026-234-IN
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Sync Logs
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[
                      {
                        timestamp: "2026-02-18 16:30:45",
                        message: "Vendor master data sync completed successfully",
                        status: "success",
                      },
                      {
                        timestamp: "2026-02-18 16:30:30",
                        message: "Bank details synchronized",
                        status: "success",
                      },
                      {
                        timestamp: "2026-02-18 16:30:15",
                        message: "Tax details synchronized",
                        status: "success",
                      },
                      {
                        timestamp: "2026-02-18 16:30:00",
                        message: "Basic information synchronized",
                        status: "success",
                      },
                      {
                        timestamp: "2026-02-18 16:29:45",
                        message: "Sync initiated by System",
                        status: "info",
                      },
                    ].map((log, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg"
                      >
                        {log.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-[#0A0F14]">{log.message}</p>
                          <p className="text-xs text-[#64748B] mt-1">
                            {log.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <Card className="p-6 border-[#E6EEF2]">
                  <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                    Change History
                  </h3>
                  <div className="space-y-3">
                    <div className="p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            Bank Account Updated
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Changed by: Sarah Mitchell
                          </p>
                        </div>
                        <span className="text-xs text-[#64748B]">
                          Feb 15, 2026
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B]">
                        <span className="font-medium">Old:</span> HDFC0001111 →{" "}
                        <span className="font-medium">New:</span> HDFC0001234
                      </div>
                    </div>

                    <div className="p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-[#0A0F14]">
                            Contact Email Updated
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Changed by: Vendor Portal
                          </p>
                        </div>
                        <span className="text-xs text-[#64748B]">
                          Jan 28, 2026
                        </span>
                      </div>
                      <div className="text-xs text-[#64748B]">
                        Email address updated successfully
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4">
                <Card className="border-[#E6EEF2]">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-[#F6F9FC] border-b border-[#E6EEF2]">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Action
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Timestamp
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                            Details
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-[#E6EEF2]">
                        {auditTrail.map((entry, index) => (
                          <tr key={index} className="hover:bg-[#F6F9FC]">
                            <td className="px-6 py-4">
                              <span className="text-sm font-medium text-[#0A0F14]">
                                {entry.action}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#64748B]">
                              {entry.user}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#64748B]">
                              {entry.timestamp}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#64748B]">
                              {entry.details}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Sidebar */}
          <div className="col-span-4 space-y-6">
            {/* Risk Score */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4 text-center">
                Overall Risk Score
              </h3>
              <div className="flex justify-center">
                <RiskMeter score={vendor.validationScore || 25} size="md" />
              </div>
            </Card>

            {/* Validation Summary */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Validation Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Tax Validation</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Bank Verification</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Sanctions Check</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Duplicate Check</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">Documents</span>
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </Card>

            {/* Document Expiry Alerts */}
            <Card className="p-6 border-[#E6EEF2]">
              <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
                Alerts & Notifications
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0A0F14]">
                      Document Expiring Soon
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      Bank Statement expires on May 1, 2026
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[#0A0F14]">
                      Payment Performance
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">
                      Excellent on-time payment record
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
