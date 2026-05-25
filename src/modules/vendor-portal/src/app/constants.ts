/**
 * Procinix Application Constants
 * Centralized configuration and constants
 */

// ===========================================
// APPLICATION INFO
// ===========================================

export const APP_NAME = 'Procinix';
export const APP_FULL_NAME = 'Procinix Vendor Governance & Onboarding';
export const APP_VERSION = '1.0.0';
export const APP_DESCRIPTION = 'Enterprise-Grade Multi-Tenant ERP System';

// ===========================================
// BRAND COLORS
// ===========================================

export const COLORS = {
  primary: '#00A9B7',
  primaryHover: '#008A96',
  primaryLight: '#E0F5F7',
  
  dark: '#0A0F14',
  lightSurface: '#F6F9FC',
  border: '#E6EEF2',
  
  success: '#16A34A',
  successLight: '#E0F5E9',
  
  warning: '#F59E0B',
  warningLight: '#FEF3E2',
  
  error: '#DC2626',
  errorLight: '#FEE2E2',
  
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  
  textPrimary: '#0A0F14',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
} as const;

// ===========================================
// VALIDATION RULES
// ===========================================

export const VALIDATION_RULES = {
  pan: {
    regex: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    message: 'Invalid PAN format. Expected format: ABCDE1234F',
  },
  gst: {
    regex: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    message: 'Invalid GST format. Expected format: 29ABCDE1234F1Z5',
  },
  ifsc: {
    regex: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    message: 'Invalid IFSC code. Expected format: HDFC0001234',
  },
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Invalid email address',
  },
  phone: {
    regex: /^\+?[1-9]\d{1,14}$/,
    message: 'Invalid phone number',
  },
} as const;

// ===========================================
// FILE UPLOAD SETTINGS
// ===========================================

export const FILE_UPLOAD = {
  maxSize: 10 * 1024 * 1024, // 10MB in bytes
  maxSizeLabel: '10MB',
  acceptedFormats: ['PDF', 'DOC', 'DOCX', 'JPG', 'JPEG', 'PNG'],
  acceptedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
  ],
} as const;

// ===========================================
// RISK SCORING
// ===========================================

export const RISK_LEVELS = {
  low: {
    min: 0,
    max: 30,
    label: 'Low Risk',
    color: COLORS.success,
    bgColor: COLORS.successLight,
  },
  medium: {
    min: 31,
    max: 70,
    label: 'Medium Risk',
    color: COLORS.warning,
    bgColor: COLORS.warningLight,
  },
  high: {
    min: 71,
    max: 100,
    label: 'High Risk',
    color: COLORS.error,
    bgColor: COLORS.errorLight,
  },
} as const;

export const RISK_WEIGHTS = {
  taxValidation: 25,
  bankVerification: 20,
  sanctionsScreening: 30,
  duplicateCheck: 15,
  documentCompleteness: 10,
} as const;

// ===========================================
// VENDOR STATUSES
// ===========================================

export const VENDOR_STATUSES = {
  validation: ['Pending', 'In Progress', 'Completed', 'Failed'],
  approval: ['Pending', 'In Progress', 'Approved', 'Rejected'],
  erpSync: ['Not Started', 'In Progress', 'Synced', 'Failed'],
} as const;

// ===========================================
// CHANGE REQUEST TYPES
// ===========================================

export const CHANGE_REQUEST_TYPES = [
  'Bank Account Change',
  'GST Number Update',
  'Address Change',
  'Contact Person Update',
  'Lower TDS Certificate',
  'Payment Terms Change',
  'Block Vendor',
  'Unblock Vendor',
] as const;

// ===========================================
// PRIORITY LEVELS
// ===========================================

export const PRIORITY_LEVELS = ['Low', 'Medium', 'High'] as const;

// ===========================================
// DEPARTMENTS
// ===========================================

export const DEPARTMENTS = [
  {
    id: 'legal',
    name: 'Legal',
    approver: 'Jennifer Cooper',
    sections: ['Company Registration', 'Legal Documents', 'Compliance'],
  },
  {
    id: 'finance',
    name: 'Finance',
    approver: 'Michael Chen',
    sections: ['Tax Details', 'Bank Details', 'Payment Terms'],
  },
  {
    id: 'compliance',
    name: 'Compliance',
    approver: 'Rebecca Adams',
    sections: ['KYC', 'Sanctions Screening', 'Risk Assessment'],
  },
  {
    id: 'it',
    name: 'IT Security',
    approver: 'David Kumar',
    sections: ['System Access', 'Data Security', 'Integration'],
  },
  {
    id: 'procurement',
    name: 'Procurement',
    approver: 'Sarah Mitchell',
    sections: ['Vendor Category', 'Business Terms', 'Entity Mapping'],
  },
] as const;

// ===========================================
// ENTITIES
// ===========================================

export const ENTITIES = [
  {
    id: 'in',
    name: 'Procinix India',
    country: 'India',
    currency: 'INR',
    erpSystem: 'SAP S/4HANA',
  },
  {
    id: 'us',
    name: 'Procinix Americas',
    country: 'USA',
    currency: 'USD',
    erpSystem: 'SAP S/4HANA',
  },
  {
    id: 'eu',
    name: 'Procinix Europe',
    country: 'Germany',
    currency: 'EUR',
    erpSystem: 'SAP S/4HANA',
  },
  {
    id: 'cn',
    name: 'Procinix Asia',
    country: 'China',
    currency: 'CNY',
    erpSystem: 'SAP S/4HANA',
  },
  {
    id: 'apac',
    name: 'Procinix APAC',
    country: 'Singapore',
    currency: 'SGD',
    erpSystem: 'SAP S/4HANA',
  },
] as const;

// ===========================================
// PORTAL STEPS
// ===========================================

export const PORTAL_STEPS = [
  {
    id: 1,
    name: 'Basic Info',
    description: 'Company basic information',
    fields: ['legalName', 'country', 'registrationNumber', 'address', 'contact'],
  },
  {
    id: 2,
    name: 'Tax & Compliance',
    description: 'Tax registration details',
    fields: ['pan', 'gst', 'tan'],
  },
  {
    id: 3,
    name: 'Banking',
    description: 'Bank account information',
    fields: ['bankName', 'accountNumber', 'ifscCode', 'accountType'],
  },
  {
    id: 4,
    name: 'Business Classification',
    description: 'Vendor category and type',
    fields: ['vendorType', 'category', 'businessSize'],
  },
  {
    id: 5,
    name: 'Documents Upload',
    description: 'Required documents',
    fields: ['incorporation', 'pan', 'gst', 'bank', 'other'],
  },
  {
    id: 6,
    name: 'Review & Submit',
    description: 'Final review',
    fields: [],
  },
] as const;

// ===========================================
// REQUIRED DOCUMENTS
// ===========================================

export const REQUIRED_DOCUMENTS = [
  {
    id: 'incorporation',
    name: 'Certificate of Incorporation',
    required: true,
    category: 'Legal',
  },
  {
    id: 'pan',
    name: 'PAN Card',
    required: true,
    category: 'Tax',
  },
  {
    id: 'gst',
    name: 'GST Certificate',
    required: true,
    category: 'Tax',
  },
  {
    id: 'bank',
    name: 'Cancelled Cheque / Bank Statement',
    required: true,
    category: 'Banking',
  },
  {
    id: 'address',
    name: 'Address Proof',
    required: false,
    category: 'Legal',
  },
  {
    id: 'iso',
    name: 'ISO Certificate',
    required: false,
    category: 'Compliance',
  },
  {
    id: 'msme',
    name: 'MSME Certificate',
    required: false,
    category: 'Classification',
  },
] as const;

// ===========================================
// PAGINATION
// ===========================================

export const PAGINATION = {
  defaultPageSize: 25,
  pageSizeOptions: [10, 25, 50, 100],
} as const;

// ===========================================
// DATE FORMATS
// ===========================================

export const DATE_FORMATS = {
  display: 'MMM dd, yyyy',
  displayWithTime: 'MMM dd, yyyy HH:mm',
  iso: 'yyyy-MM-dd',
  isoWithTime: 'yyyy-MM-dd HH:mm:ss',
} as const;

// ===========================================
// NOTIFICATION SETTINGS
// ===========================================

export const NOTIFICATIONS = {
  duration: {
    success: 3000,
    error: 5000,
    warning: 4000,
    info: 3000,
  },
  maxVisible: 5,
} as const;

// ===========================================
// API ENDPOINTS (for future integration)
// ===========================================

export const API_ENDPOINTS = {
  vendors: {
    list: '/api/vendors',
    detail: '/api/vendors/:id',
    create: '/api/vendors',
    update: '/api/vendors/:id',
    delete: '/api/vendors/:id',
    validate: '/api/vendors/:id/validate',
    approve: '/api/vendors/:id/approve',
    sync: '/api/vendors/:id/sync',
  },
  changeRequests: {
    list: '/api/change-requests',
    detail: '/api/change-requests/:id',
    create: '/api/change-requests',
    update: '/api/change-requests/:id',
    approve: '/api/change-requests/:id/approve',
    reject: '/api/change-requests/:id/reject',
  },
  documents: {
    upload: '/api/documents/upload',
    download: '/api/documents/:id/download',
    delete: '/api/documents/:id',
  },
  validation: {
    pan: '/api/validation/pan',
    gst: '/api/validation/gst',
    bank: '/api/validation/bank',
    sanctions: '/api/validation/sanctions',
    duplicate: '/api/validation/duplicate',
  },
} as const;

// ===========================================
// LOCAL STORAGE KEYS
// ===========================================

export const STORAGE_KEYS = {
  userPreferences: 'procinix_user_preferences',
  filters: 'procinix_filters',
  recentVendors: 'procinix_recent_vendors',
  draftForms: 'procinix_draft_forms',
} as const;

// ===========================================
// FEATURE FLAGS (for future use)
// ===========================================

export const FEATURES = {
  multiEntitySync: true,
  bulkActions: true,
  advancedValidation: true,
  documentOcr: false,
  aiRiskScoring: false,
  realTimeNotifications: false,
} as const;
