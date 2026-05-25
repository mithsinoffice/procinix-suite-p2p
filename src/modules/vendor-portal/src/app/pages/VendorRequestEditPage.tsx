import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Save,
  Send,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import { RiskMeter } from "../components/design-system/RiskMeter";
import { StatusBadge } from "../components/design-system/StatusBadge";
import { DocumentUploader } from "../components/design-system/DocumentUploader";
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
import { mockVendorRequests, countries, vendorTypes, entities } from "../data/mockData";

export function VendorRequestEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vendor = mockVendorRequests.find((v) => v.id === id);
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    tax: false,
    banking: false,
    classification: false,
    documents: false,
    mapping: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  const handleRunValidation = () => {
    navigate(`/vendors/requests/${id}/validation`);
  };

  if (!vendor) {
    return <div className="p-8">Vendor not found</div>;
  }

  return (
    <div className="min-h-screen">
      {/* Sticky Header */}
      <div className="sticky top-16 z-40 bg-white border-b border-[#E6EEF2] shadow-sm">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Link to="/vendors/requests" className="text-sm text-[#00A9B7] hover:underline">
                  ← Back to Requests
                </Link>
              </div>
              <h1 className="text-2xl font-semibold text-[#0A0F14]">{vendor.legalName}</h1>
              <p className="text-sm text-[#64748B]">{vendor.requestId} • Buyer Assisted Onboarding</p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                Save Draft
              </Button>
              <Button
                onClick={handleRunValidation}
                className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
              >
                <CheckCircle2 className="w-4 h-4" />
                Run Validation
              </Button>
              <Button className="gap-2">
                <Send className="w-4 h-4" />
                Send for Approval
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main Form Area */}
        <div className="flex-1 p-8 max-w-5xl">
          <div className="space-y-4">
            {/* Basic Details Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("basic")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <h3 className="font-semibold text-[#0A0F14]">Basic Details</h3>
                </div>
                {expandedSections.basic ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.basic && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2]">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="legalName">Legal Name *</Label>
                      <Input id="legalName" defaultValue={vendor.legalName} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tradeName">Trade Name</Label>
                      <Input id="tradeName" placeholder="Enter trade name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Select defaultValue={vendor.country}>
                        <SelectTrigger>
                          <SelectValue />
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
                      <Label htmlFor="registrationNumber">Registration Number *</Label>
                      <Input id="registrationNumber" placeholder="Enter registration number" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="yearEstablished">Year Established</Label>
                      <Input id="yearEstablished" type="number" placeholder="YYYY" />
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Registered Address *</Label>
                      <Textarea
                        id="address"
                        defaultValue={vendor.address}
                        placeholder="Enter complete address"
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contactPerson">Contact Person *</Label>
                      <Input id="contactPerson" placeholder="Full name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" defaultValue={vendor.email} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input id="phone" defaultValue={vendor.phone} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" placeholder="www.company.com" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Details Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("tax")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="font-semibold text-[#0A0F14]">Tax Details</h3>
                </div>
                {expandedSections.tax ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.tax && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2]">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID / TIN *</Label>
                      <Input id="taxId" defaultValue={vendor.taxId} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gst">GST / VAT Number *</Label>
                      <Input id="gst" placeholder="Enter GST/VAT number" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pan">PAN Number (India)</Label>
                      <Input id="pan" placeholder="Enter PAN" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tan">TAN Number (India)</Label>
                      <Input id="tan" placeholder="Enter TAN" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="msme">MSME Registration</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes - Registered</SelectItem>
                          <SelectItem value="no">Not Registered</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="msmeNumber">MSME Number</Label>
                      <Input id="msmeNumber" placeholder="Enter MSME number" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bank Details Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("banking")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
                  <h3 className="font-semibold text-[#0A0F14]">Bank Details</h3>
                </div>
                {expandedSections.banking ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.banking && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2]">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="bankName">Bank Name *</Label>
                      <Input id="bankName" defaultValue={vendor.bankName} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountName">Account Holder Name *</Label>
                      <Input id="accountName" placeholder="Enter account holder name" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input id="accountNumber" defaultValue={vendor.accountNumber} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ifsc">IFSC / SWIFT Code *</Label>
                      <Input id="ifsc" defaultValue={vendor.ifscCode} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select account type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="savings">Savings</SelectItem>
                          <SelectItem value="current">Current</SelectItem>
                          <SelectItem value="corporate">Corporate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR - Indian Rupee</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="branchAddress">Branch Address</Label>
                      <Textarea id="branchAddress" placeholder="Enter branch address" rows={2} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Classification Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("classification")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <h3 className="font-semibold text-[#0A0F14]">Classification</h3>
                </div>
                {expandedSections.classification ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.classification && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2]">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="vendorType">Vendor Type *</Label>
                      <Select defaultValue={vendor.vendorType}>
                        <SelectTrigger>
                          <SelectValue />
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

                    <div className="space-y-2">
                      <Label htmlFor="industry">Industry *</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="technology">Technology</SelectItem>
                          <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                          <SelectItem value="retail">Retail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="annualRevenue">Annual Revenue</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0-1m">Less than $1M</SelectItem>
                          <SelectItem value="1-10m">$1M - $10M</SelectItem>
                          <SelectItem value="10-50m">$10M - $50M</SelectItem>
                          <SelectItem value="50m+">Above $50M</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employees">Number of Employees</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-50">11-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="201-500">201-500</SelectItem>
                          <SelectItem value="500+">500+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Documents Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("documents")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-[#DC2626]" />
                  <h3 className="font-semibold text-[#0A0F14]">Documents</h3>
                </div>
                {expandedSections.documents ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.documents && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2] space-y-6">
                  <DocumentUploader
                    title="Certificate of Incorporation *"
                    description="Upload company registration certificate"
                  />
                  <DocumentUploader
                    title="Tax Registration Certificate *"
                    description="Upload GST/VAT certificate"
                  />
                  <DocumentUploader title="Bank Proof Document *" />
                  <DocumentUploader title="PAN Card (India)" />
                </div>
              )}
            </div>

            {/* Entity Mapping Section */}
            <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm overflow-hidden">
              <button
                onClick={() => toggleSection("mapping")}
                className="w-full flex items-center justify-between p-6 hover:bg-[#F6F9FC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                  <h3 className="font-semibold text-[#0A0F14]">Entity Mapping</h3>
                </div>
                {expandedSections.mapping ? (
                  <ChevronUp className="w-5 h-5 text-[#64748B]" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#64748B]" />
                )}
              </button>

              {expandedSections.mapping && (
                <div className="p-6 pt-0 border-t border-[#E6EEF2]">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="entity">Primary Entity *</Label>
                      <Select defaultValue={vendor.entity}>
                        <SelectTrigger>
                          <SelectValue />
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

                    <div className="bg-[#F6F9FC] rounded-lg border border-[#E6EEF2] p-4">
                      <h4 className="font-semibold text-[#0A0F14] mb-3">Additional Entities</h4>
                      <div className="space-y-2">
                        {entities.slice(0, 3).map((entity) => (
                          <label key={entity} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded border-[#E6EEF2]" />
                            <span className="text-sm text-[#0A0F14]">{entity}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-96 bg-[#F6F9FC] border-l border-[#E6EEF2] p-6 space-y-6">
          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Risk Score</h3>
            <div className="flex justify-center">
              <RiskMeter score={vendor.validationScore || 25} size="md" />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Validation Summary</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Basic Details</span>
                <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Tax Details</span>
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Bank Details</span>
                <AlertCircle className="w-5 h-5 text-[#F59E0B]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">Documents</span>
                <XCircle className="w-5 h-5 text-[#DC2626]" />
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-amber-900 mb-1">Duplicate Detection</h4>
                <p className="text-sm text-amber-800">
                  Similar vendor found: "Tech Innovators LLC"
                </p>
                <Button variant="link" className="text-amber-700 p-0 h-auto mt-1">
                  View Details →
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E6EEF2] p-6">
            <h3 className="font-semibold text-[#0A0F14] mb-4">Missing Documents</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
                <span className="text-[#0A0F14]">Tax Registration Certificate</span>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <FileText className="w-4 h-4 text-[#DC2626] mt-0.5 flex-shrink-0" />
                <span className="text-[#0A0F14]">Bank Proof Document</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="sticky bottom-0 bg-white border-t border-[#E6EEF2] shadow-lg">
        <div className="px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <StatusBadge status="warning" label="Draft" />
            <span className="text-sm text-[#64748B]">Last saved: 2 minutes ago</span>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button
              onClick={handleRunValidation}
              className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Run Validation
            </Button>
            <Button className="gap-2">
              <Send className="w-4 h-4" />
              Send for Approval
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
