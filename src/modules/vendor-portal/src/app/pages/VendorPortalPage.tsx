import { useState } from "react";
import { Save, Send, CheckCircle2 } from "lucide-react";
import { Stepper } from "../components/design-system/Stepper";
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
import { countries, vendorTypes } from "../data/mockData";

export function VendorPortalPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  const steps = [
    "Basic Info",
    "Tax & Compliance",
    "Banking",
    "Classification",
    "Documents",
    "Review & Submit",
  ];

  const completionPercentage = Math.round(((completedSteps.length + 1) / steps.length) * 100);

  const handleNext = () => {
    if (!completedSteps.includes(currentStep + 1)) {
      setCompletedSteps([...completedSteps, currentStep + 1]);
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    // Navigate to a thank you page or show success message
    alert("Vendor information submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-[#F6F9FC]">
      {/* Portal Header */}
      <header className="bg-white border-b border-[#E6EEF2] shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#00A9B7] rounded flex items-center justify-center">
              <span className="text-white font-bold">P</span>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-[#0A0F14]">Procinix Vendor Portal</h1>
              <p className="text-sm text-[#64748B]">Complete your vendor onboarding</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[#0A0F14]">Overall Progress</span>
              <span className="text-sm font-medium text-[#00A9B7]">{completionPercentage}%</span>
            </div>
            <div className="w-full h-2 bg-[#E6EEF2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00A9B7] transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          <Stepper steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-8 py-8">
        <div className="bg-white rounded-lg border border-[#E6EEF2] shadow-sm p-8">
          {/* Step 0: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Basic Information</h2>
                <p className="text-sm text-[#64748B]">
                  Please provide your company's basic details
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="legalName">Legal Name *</Label>
                  <Input id="legalName" placeholder="Enter legal company name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tradeName">Trade Name</Label>
                  <Input id="tradeName" placeholder="Enter trade name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select>
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
                  <Label htmlFor="registrationNumber">Registration Number *</Label>
                  <Input id="registrationNumber" placeholder="Enter registration number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="yearEstablished">Year Established *</Label>
                  <Input id="yearEstablished" type="number" placeholder="YYYY" />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Registered Address *</Label>
                  <Textarea id="address" placeholder="Enter complete address" rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Contact Person *</Label>
                  <Input id="contactPerson" placeholder="Full name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input id="email" type="email" placeholder="contact@company.com" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" placeholder="+1 234 567 8900" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" placeholder="www.company.com" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Tax & Compliance */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Tax & Compliance</h2>
                <p className="text-sm text-[#64748B]">
                  Provide your tax identification and compliance information
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax Identification Number (TIN) *</Label>
                  <Input id="taxId" placeholder="Enter TIN" />
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

                <div className="col-span-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900">
                      <strong>Note:</strong> All tax numbers will be verified against government databases.
                      Please ensure accuracy to avoid delays.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Banking */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Banking Information</h2>
                <p className="text-sm text-[#64748B]">
                  Provide your banking details for payment processing
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="bankName">Bank Name *</Label>
                  <Input id="bankName" placeholder="Enter bank name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountName">Account Holder Name *</Label>
                  <Input id="accountName" placeholder="Enter account holder name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountNumber">Account Number *</Label>
                  <Input id="accountNumber" placeholder="Enter account number" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ifsc">IFSC / SWIFT Code *</Label>
                  <Input id="ifsc" placeholder="Enter IFSC/SWIFT code" />
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

                <div className="col-span-2">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-900">
                      <strong>Important:</strong> Bank details will be verified through penny drop test.
                      Ensure account is active and can receive payments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Classification */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Business Classification</h2>
                <p className="text-sm text-[#64748B]">
                  Help us understand your business better
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vendorType">Vendor Type *</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor type" />
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
                  <Label htmlFor="annualRevenue">Annual Revenue *</Label>
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
                  <Label htmlFor="employees">Number of Employees *</Label>
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

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="products">Products/Services Offered *</Label>
                  <Textarea
                    id="products"
                    placeholder="Describe the products or services you provide"
                    rows={3}
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="certifications">Certifications</Label>
                  <Input id="certifications" placeholder="ISO, SOC2, etc. (comma separated)" />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Documents */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Document Upload</h2>
                <p className="text-sm text-[#64748B]">
                  Upload required documents for verification
                </p>
              </div>

              <div className="space-y-6">
                <DocumentUploader
                  title="Certificate of Incorporation *"
                  description="Upload your company registration certificate"
                />

                <DocumentUploader
                  title="Tax Registration Certificate *"
                  description="Upload GST/VAT registration certificate"
                />

                <DocumentUploader
                  title="Bank Proof Document *"
                  description="Upload cancelled cheque or bank statement"
                />

                <DocumentUploader
                  title="PAN Card (India) *"
                  description="Upload PAN card copy"
                />

                <DocumentUploader
                  title="MSME Certificate (if applicable)"
                  description="Upload MSME registration certificate"
                />

                <DocumentUploader
                  title="Additional Documents"
                  description="Upload any other relevant documents"
                />
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-[#0A0F14] mb-2">Review & Submit</h2>
                <p className="text-sm text-[#64748B]">
                  Please review your information before submitting
                </p>
              </div>

              <div className="space-y-6">
                <div className="bg-[#F6F9FC] rounded-lg border border-[#E6EEF2] p-6">
                  <h3 className="font-semibold text-[#0A0F14] mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    Submission Summary
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#64748B] mb-1">Completed Sections</p>
                      <p className="font-semibold text-[#0A0F14]">{completedSteps.length} of {steps.length}</p>
                    </div>
                    <div>
                      <p className="text-[#64748B] mb-1">Documents Uploaded</p>
                      <p className="font-semibold text-[#0A0F14]">6 documents</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2">What happens next?</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>• Your information will be validated against official databases</li>
                        <li>• Risk assessment will be conducted automatically</li>
                        <li>• You'll receive approval status within 3-5 business days</li>
                        <li>• Once approved, you'll be synced to our ERP systems</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 rounded border-[#E6EEF2]" />
                    <span className="text-sm text-[#0A0F14]">
                      I confirm that all information provided is accurate and complete. I understand
                      that providing false information may result in rejection of this application.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 rounded border-[#E6EEF2]" />
                    <span className="text-sm text-[#0A0F14]">
                      I agree to the Terms & Conditions and Privacy Policy of Procinix vendor program.
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-[#E6EEF2]">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="gap-2"
            >
              Previous
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <Save className="w-4 h-4" />
                Save Draft
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]">
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  className="gap-2 bg-[#00A9B7] hover:bg-[#008A96]"
                >
                  <Send className="w-4 h-4" />
                  Submit for Approval
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
