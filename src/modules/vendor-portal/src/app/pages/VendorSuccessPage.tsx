import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Building2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  AlertCircle,
  Eye,
  Home,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { mockVendorRequests } from "../data/mockData";

export function VendorSuccessPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = mockVendorRequests.find((v) => v.id === id);

  const [showSyncLogs, setShowSyncLogs] = useState(false);
  const [syncProgress] = useState(85);

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  const erpSyncDetails = [
    {
      entity: "Procinix India",
      system: "SAP S/4HANA",
      vendorCode: "V-2026-234-IN",
      status: "Synced",
      timestamp: "2026-02-18 16:30",
    },
    {
      entity: "Procinix Europe",
      system: "SAP S/4HANA",
      vendorCode: "V-2026-234-EU",
      status: "In Progress",
      timestamp: "2026-02-18 16:32",
    },
    {
      entity: "Procinix Americas",
      system: "SAP S/4HANA",
      vendorCode: "V-2026-234-AM",
      status: "Pending",
      timestamp: null,
    },
  ];

  const syncLogs = [
    {
      timestamp: "2026-02-18 16:30:45",
      level: "SUCCESS",
      message: "Vendor master data created successfully in Procinix India - SAP",
      details: "Vendor Code: V-2026-234-IN",
    },
    {
      timestamp: "2026-02-18 16:30:30",
      level: "SUCCESS",
      message: "Bank details synchronized for Procinix India",
      details: "Primary bank account linked",
    },
    {
      timestamp: "2026-02-18 16:30:25",
      level: "SUCCESS",
      message: "Tax details synchronized for Procinix India",
      details: "PAN, GST, and TAN details synced",
    },
    {
      timestamp: "2026-02-18 16:30:20",
      level: "INFO",
      message: "Starting sync with Procinix Europe - SAP",
      details: "Initiating connection...",
    },
    {
      timestamp: "2026-02-18 16:30:15",
      level: "INFO",
      message: "Validating vendor data before sync",
      details: "All validation checks passed",
    },
    {
      timestamp: "2026-02-18 16:30:10",
      level: "SUCCESS",
      message: "Basic information synchronized for Procinix India",
      details: "Legal name, address, and contact details",
    },
    {
      timestamp: "2026-02-18 16:30:05",
      level: "INFO",
      message: "ERP sync initiated by System",
      details: "Multi-entity sync process started",
    },
    {
      timestamp: "2026-02-18 16:30:00",
      level: "INFO",
      message: "Vendor approval workflow completed",
      details: "All departments approved",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="w-full max-w-5xl">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-50 rounded-full mb-6 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-semibold text-[#0A0F14] mb-2">
            Vendor Successfully Created!
          </h1>
          <p className="text-[#64748B]">
            {vendor.legalName} has been created in Procinix and is being synced to ERP
            systems
          </p>
        </div>

        {/* Vendor Summary Card */}
        <Card className="p-6 border-[#E6EEF2] mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-16 h-16 bg-[#E0F5F7] rounded-lg flex items-center justify-center">
              <Building2 className="w-8 h-8 text-[#00A9B7]" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-[#0A0F14] mb-1">
                {vendor.legalName}
              </h2>
              <p className="text-sm text-[#64748B] mb-2">
                Request ID: {vendor.requestId}
              </p>
              <div className="flex items-center gap-6 text-sm text-[#64748B]">
                <div className="flex items-center gap-2">
                  <span>Country: {vendor.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Type: {vendor.vendorType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>Entity: {vendor.entity}</span>
                </div>
              </div>
            </div>
            <StatusBadge status="success" label="Active" />
          </div>

          <div className="grid grid-cols-3 gap-4 p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg">
            <div>
              <p className="text-xs text-[#64748B] mb-1">Validation Status</p>
              <StatusBadge status="success" label="Completed" size="sm" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Approval Status</p>
              <StatusBadge status="success" label="Approved" size="sm" />
            </div>
            <div>
              <p className="text-xs text-[#64748B] mb-1">Risk Level</p>
              <StatusBadge
                status={
                  vendor.riskLevel === "Low"
                    ? "success"
                    : vendor.riskLevel === "Medium"
                    ? "warning"
                    : "error"
                }
                label={`${vendor.riskLevel} Risk`}
                size="sm"
              />
            </div>
          </div>
        </Card>

        {/* ERP Sync Progress */}
        <Card className="p-6 border-[#E6EEF2] mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#0A0F14]">
              ERP Sync Progress
            </h3>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#00A9B7] animate-spin" />
              <span className="text-sm text-[#64748B]">Syncing...</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#64748B]">Overall Progress</span>
              <span className="text-sm font-semibold text-[#0A0F14]">
                {syncProgress}%
              </span>
            </div>
            <div className="w-full h-3 bg-[#E6EEF2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A9B7] rounded-full transition-all duration-500"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          </div>

          {/* ERP Systems */}
          <div className="space-y-3">
            {erpSyncDetails.map((erp, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg ${
                  erp.status === "Synced"
                    ? "bg-green-50 border-green-200"
                    : erp.status === "In Progress"
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {erp.status === "Synced" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : erp.status === "In Progress" ? (
                      <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[#0A0F14]">
                        {erp.system} - {erp.entity}
                      </p>
                      {erp.vendorCode && (
                        <p className="text-xs text-[#64748B] mt-0.5">
                          Vendor Code: {erp.vendorCode}
                        </p>
                      )}
                      {erp.timestamp && (
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {erp.timestamp}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {erp.status === "Synced" && (
                      <StatusBadge status="success" label="Synced" size="sm" />
                    )}
                    {erp.status === "In Progress" && (
                      <StatusBadge status="info" label="In Progress" size="sm" />
                    )}
                    {erp.status === "Pending" && (
                      <StatusBadge status="neutral" label="Pending" size="sm" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sync Logs */}
        <Card className="border-[#E6EEF2] mb-6">
          <button
            onClick={() => setShowSyncLogs(!showSyncLogs)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#F6F9FC] transition-colors"
          >
            <h3 className="text-lg font-semibold text-[#0A0F14]">
              Sync Logs & Details
            </h3>
            {showSyncLogs ? (
              <ChevronUp className="w-5 h-5 text-[#64748B]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[#64748B]" />
            )}
          </button>

          {showSyncLogs && (
            <div className="p-4 pt-0 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {syncLogs.map((log, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg"
                  >
                    {log.level === "SUCCESS" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    ) : log.level === "ERROR" ? (
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-sm text-[#0A0F14]">{log.message}</p>
                        <span className="text-xs text-[#64748B] whitespace-nowrap ml-2">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#64748B]">{log.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* ERP Vendor Codes Summary */}
        <Card className="p-6 border-[#E6EEF2] mb-6">
          <h3 className="text-lg font-semibold text-[#0A0F14] mb-4">
            ERP Vendor Codes per Entity
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {erpSyncDetails
              .filter((erp) => erp.vendorCode)
              .map((erp, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#F6F9FC] border border-[#E6EEF2] rounded-lg"
                >
                  <p className="text-xs text-[#64748B] mb-1">{erp.entity}</p>
                  <p className="text-lg font-semibold text-[#0A0F14]">
                    {erp.vendorCode}
                  </p>
                  <p className="text-xs text-[#64748B] mt-1">{erp.system}</p>
                </div>
              ))}
          </div>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/vendors/${vendor.id}`)}
          >
            <Eye className="w-4 h-4" />
            View Vendor Profile
          </Button>
          <Button
            className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
            onClick={() => navigate("/vendors/requests")}
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        {/* Success Message */}
        <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[#0A0F14] mb-1">
                Next Steps
              </p>
              <ul className="text-sm text-[#64748B] space-y-1">
                <li>
                  • Vendor will be available for purchase order creation once all ERP
                  syncs are complete
                </li>
                <li>
                  • Email notification has been sent to the vendor with account
                  details
                </li>
                <li>
                  • Payment terms and bank details are configured and active
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
