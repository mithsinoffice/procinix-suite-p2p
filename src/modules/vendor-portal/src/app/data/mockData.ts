export interface VendorRequest {
  id: string;
  requestId: string;
  legalName: string;
  onboardingSource: "Self-Service" | "Buyer Assisted";
  country: string;
  vendorType: string;
  riskLevel: "Low" | "Medium" | "High";
  validationStatus: "Pending" | "In Progress" | "Completed" | "Failed";
  approvalStatus: "Pending" | "In Progress" | "Approved" | "Rejected";
  erpSyncStatus: "Not Started" | "In Progress" | "Synced" | "Failed";
  lastUpdated: string;
  entity: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  validationScore?: number;
}

export interface ChangeRequest {
  id: string;
  changeRequestId: string;
  vendorName: string;
  changeType: string;
  requestedBy: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress";
  approvalStatus: string;
  priority: "Low" | "Medium" | "High";
  effectiveDate?: string;
}

export const mockVendorRequests: VendorRequest[] = [
  {
    id: "1",
    requestId: "VR-2026-0234",
    legalName: "Tech Innovators Pvt Ltd",
    onboardingSource: "Self-Service",
    country: "India",
    vendorType: "IT Services",
    riskLevel: "Low",
    validationStatus: "Completed",
    approvalStatus: "Pending",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-18 14:30",
    entity: "Procinix India",
    email: "contact@techinnovators.com",
    phone: "+91 9876543210",
    validationScore: 25,
  },
  {
    id: "2",
    requestId: "VR-2026-0235",
    legalName: "Global Supplies Inc",
    onboardingSource: "Buyer Assisted",
    country: "USA",
    vendorType: "Raw Materials",
    riskLevel: "High",
    validationStatus: "In Progress",
    approvalStatus: "Pending",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-18 11:20",
    entity: "Procinix Americas",
    email: "info@globalsupplies.com",
    phone: "+1 555-0123",
    validationScore: 82,
  },
  {
    id: "3",
    requestId: "VR-2026-0236",
    legalName: "Deutsche Logistics GmbH",
    onboardingSource: "Self-Service",
    country: "Germany",
    vendorType: "Logistics",
    riskLevel: "Medium",
    validationStatus: "Completed",
    approvalStatus: "Approved",
    erpSyncStatus: "Synced",
    lastUpdated: "2026-02-17 16:45",
    entity: "Procinix Europe",
    email: "service@deutschelogistics.de",
    phone: "+49 30 12345678",
    validationScore: 45,
  },
  {
    id: "4",
    requestId: "VR-2026-0237",
    legalName: "Eastern Manufacturing Ltd",
    onboardingSource: "Buyer Assisted",
    country: "China",
    vendorType: "Manufacturing",
    riskLevel: "High",
    validationStatus: "Failed",
    approvalStatus: "Rejected",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-17 09:15",
    entity: "Procinix Asia",
    email: "info@easternmfg.cn",
    phone: "+86 21 5555 1234",
    validationScore: 88,
  },
  {
    id: "5",
    requestId: "VR-2026-0238",
    legalName: "Australian Mining Corp",
    onboardingSource: "Self-Service",
    country: "Australia",
    vendorType: "Raw Materials",
    riskLevel: "Medium",
    validationStatus: "In Progress",
    approvalStatus: "Pending",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-16 13:50",
    entity: "Procinix APAC",
    email: "contact@ausmining.com.au",
    phone: "+61 2 9876 5432",
    validationScore: 55,
  },
  {
    id: "6",
    requestId: "VR-2026-0239",
    legalName: "UK Engineering Solutions",
    onboardingSource: "Buyer Assisted",
    country: "United Kingdom",
    vendorType: "Engineering",
    riskLevel: "Low",
    validationStatus: "Completed",
    approvalStatus: "In Progress",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-16 10:30",
    entity: "Procinix Europe",
    email: "hello@ukengsolutions.co.uk",
    phone: "+44 20 7123 4567",
    validationScore: 18,
  },
  {
    id: "7",
    requestId: "VR-2026-0240",
    legalName: "Singapore Tech Ventures",
    onboardingSource: "Self-Service",
    country: "Singapore",
    vendorType: "IT Services",
    riskLevel: "Low",
    validationStatus: "Pending",
    approvalStatus: "Pending",
    erpSyncStatus: "Not Started",
    lastUpdated: "2026-02-15 15:20",
    entity: "Procinix APAC",
    email: "info@sgtech.sg",
    phone: "+65 6789 1234",
    validationScore: 22,
  },
  {
    id: "8",
    requestId: "VR-2026-0241",
    legalName: "Brazilian Coffee Exporters",
    onboardingSource: "Buyer Assisted",
    country: "Brazil",
    vendorType: "Food & Beverage",
    riskLevel: "Medium",
    validationStatus: "Completed",
    approvalStatus: "Approved",
    erpSyncStatus: "In Progress",
    lastUpdated: "2026-02-15 08:45",
    entity: "Procinix Americas",
    email: "export@brazilcoffee.com.br",
    phone: "+55 11 9876 5432",
    validationScore: 48,
  },
];

export const mockChangeRequests: ChangeRequest[] = [
  {
    id: "1",
    changeRequestId: "CR-2026-0145",
    vendorName: "Tech Innovators Pvt Ltd",
    changeType: "Bank Account Change",
    requestedBy: "Vendor Portal",
    requestDate: "2026-02-18",
    status: "Pending",
    approvalStatus: "Awaiting Finance",
    priority: "High",
  },
  {
    id: "2",
    changeRequestId: "CR-2026-0146",
    vendorName: "Deutsche Logistics GmbH",
    changeType: "Lower TDS Certificate",
    requestedBy: "Sarah Mitchell",
    requestDate: "2026-02-17",
    status: "In Progress",
    approvalStatus: "Finance Approved, Awaiting Compliance",
    priority: "Medium",
  },
  {
    id: "3",
    changeRequestId: "CR-2026-0147",
    vendorName: "Global Supplies Inc",
    changeType: "Address Change",
    requestedBy: "Vendor Portal",
    requestDate: "2026-02-16",
    status: "Approved",
    approvalStatus: "All Approved",
    priority: "Low",
    effectiveDate: "2026-02-20",
  },
  {
    id: "4",
    changeRequestId: "CR-2026-0148",
    vendorName: "UK Engineering Solutions",
    changeType: "GST Number Update",
    requestedBy: "John Davis",
    requestDate: "2026-02-15",
    status: "Rejected",
    approvalStatus: "Rejected by Compliance",
    priority: "Medium",
  },
  {
    id: "5",
    changeRequestId: "CR-2026-0149",
    vendorName: "Singapore Tech Ventures",
    changeType: "Payment Terms Change",
    requestedBy: "Vendor Portal",
    requestDate: "2026-02-14",
    status: "Pending",
    approvalStatus: "Awaiting Procurement",
    priority: "Low",
  },
  {
    id: "6",
    changeRequestId: "CR-2026-0150",
    vendorName: "Brazilian Coffee Exporters",
    changeType: "Contact Person Update",
    requestedBy: "Sarah Mitchell",
    requestDate: "2026-02-13",
    status: "Approved",
    approvalStatus: "Auto-Approved",
    priority: "Low",
    effectiveDate: "2026-02-14",
  },
];

export const countries = [
  "India",
  "USA",
  "Germany",
  "China",
  "Australia",
  "United Kingdom",
  "Singapore",
  "Brazil",
  "Japan",
  "France",
  "Canada",
  "Mexico",
];

export const vendorTypes = [
  "IT Services",
  "Raw Materials",
  "Logistics",
  "Manufacturing",
  "Engineering",
  "Food & Beverage",
  "Consulting",
  "Construction",
  "Healthcare",
  "Professional Services",
];

export const entities = [
  "Procinix India",
  "Procinix Americas",
  "Procinix Europe",
  "Procinix Asia",
  "Procinix APAC",
];

export const departments = [
  { id: "legal", name: "Legal", approver: "Jennifer Cooper" },
  { id: "finance", name: "Finance", approver: "Michael Chen" },
  { id: "compliance", name: "Compliance", approver: "Rebecca Adams" },
  { id: "it", name: "IT Security", approver: "David Kumar" },
  { id: "procurement", name: "Procurement", approver: "Sarah Mitchell" },
];
