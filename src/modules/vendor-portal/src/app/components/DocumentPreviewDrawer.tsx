import { useState } from "react";
import { X, Download, Upload, FileText } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface DocumentVersion {
  version: number;
  uploadedOn: string;
  uploadedBy: string;
  status: string;
  fileName: string;
}

interface ComplianceDocument {
  id: string;
  type: string;
  required: boolean;
  status: "Missing" | "Uploaded" | "Verified" | "Rejected" | "Expired";
  expiryDate?: string;
  uploadedDate?: string;
  fileName?: string;
  uploadedBy?: string;
  versions?: DocumentVersion[];
}

interface DocumentPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  document: ComplianceDocument | null;
  onReplace: (file: File) => void;
  onDownload: (doc: ComplianceDocument) => void;
}

export function DocumentPreviewDrawer({
  isOpen,
  onClose,
  document,
  onReplace,
  onDownload,
}: DocumentPreviewDrawerProps) {
  const [replaceMode, setReplaceMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  if (!isOpen || !document) return null;

  const handleReplace = () => {
    if (selectedFile) {
      onReplace(selectedFile);
      setReplaceMode(false);
      setSelectedFile(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Verified":
        return "bg-green-50 text-green-700";
      case "Uploaded":
        return "bg-blue-50 text-blue-700";
      case "Missing":
        return "bg-red-50 text-red-700";
      case "Rejected":
        return "bg-red-50 text-red-700";
      case "Expired":
        return "bg-yellow-50 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E6EEF2] px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-[#0A0F14] mb-2">{document.type}</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(document.status)}`}>
              {document.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#F6F9FC] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#64748B]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Document Info */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">File Name</span>
              <span className="text-sm text-[#0A0F14] font-medium">{document.fileName || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Uploaded On</span>
              <span className="text-sm text-[#0A0F14]">{document.uploadedDate || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#64748B]">Uploaded By</span>
              <span className="text-sm text-[#0A0F14]">{document.uploadedBy || "N/A"}</span>
            </div>
            {document.expiryDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Expiry Date</span>
                <span className="text-sm text-[#0A0F14]">{document.expiryDate}</span>
              </div>
            )}
          </div>

          {/* Preview Area */}
          <div className="border border-[#E6EEF2] rounded-lg bg-[#F6F9FC] p-8 flex flex-col items-center justify-center min-h-[300px]">
            <FileText className="w-16 h-16 text-[#64748B] mb-4" />
            <p className="text-sm text-[#64748B] text-center">
              Document Preview
              <br />
              <span className="text-xs">(PDF viewer would be integrated here)</span>
            </p>
          </div>

          {/* Replace Document Section */}
          <div className="border border-[#E6EEF2] rounded-lg p-4">
            <h3 className="text-sm font-semibold text-[#0A0F14] mb-3">Replace Document</h3>
            {!replaceMode ? (
              <Button
                onClick={() => setReplaceMode(true)}
                variant="outline"
                className="w-full border-[#00A9B7] text-[#00A9B7]"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload New Version
              </Button>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="replace-file">Select File</Label>
                  <Input
                    id="replace-file"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="mt-2"
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <p className="text-xs text-[#64748B] mt-1">Accepted formats: PDF, JPG, PNG (Max 10MB)</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleReplace}
                    disabled={!selectedFile}
                    className="flex-1 bg-[#00A9B7] hover:bg-[#008A96] text-white"
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={() => {
                      setReplaceMode(false);
                      setSelectedFile(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Version History */}
          {document.versions && document.versions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0A0F14] mb-3">Version History</h3>
              <div className="border border-[#E6EEF2] rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-[#F6F9FC]">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#64748B]">Version</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#64748B]">Uploaded On</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#64748B]">By</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-[#64748B]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {document.versions.map((version) => (
                      <tr key={version.version} className="border-t border-[#E6EEF2]">
                        <td className="px-3 py-2 text-[#0A0F14] font-medium">v{version.version}</td>
                        <td className="px-3 py-2 text-[#64748B]">{version.uploadedOn}</td>
                        <td className="px-3 py-2 text-[#64748B]">{version.uploadedBy}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                            {version.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => onDownload(document)}
              variant="outline"
              className="flex-1 border-[#00A9B7] text-[#00A9B7]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button onClick={onClose} variant="outline" className="flex-1">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}