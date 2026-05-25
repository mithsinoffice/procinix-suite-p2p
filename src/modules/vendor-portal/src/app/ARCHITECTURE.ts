/**
 * Procinix Vendor Governance & Onboarding Module
 * Data Flow and Architecture Overview
 */

// ===========================================
// SCREEN FLOW DIAGRAM
// ===========================================

/**
 * PRIMARY USER JOURNEY - BUYER PERSPECTIVE
 * 
 * 1. Dashboard (/) 
 *    ↓ [Invite Vendor Button]
 * 
 * 2. Invite Modal
 *    ↓ [Send Invitation]
 * 
 * 3. External Portal (/portal/onboarding/:token)
 *    Vendor fills 6-step form
 *    ↓ [Submit]
 * 
 * 4. Back to Dashboard - Request appears
 *    ↓ [View/Edit Button]
 * 
 * 5. Edit Page (/vendors/requests/:id/edit)
 *    Buyer can assist with data entry
 *    ↓ [Run Validation Button]
 * 
 * 6. Validation Dashboard (/vendors/requests/:id/validation)
 *    Review all validation checks
 *    ↓ [Send for Approval Button]
 * 
 * 7. Approval Workspace (/vendors/requests/:id/approval)
 *    Multi-department approval workflow
 *    ↓ [All Departments Approve]
 * 
 * 8. Success Page (/vendors/requests/:id/success)
 *    ERP sync in progress
 *    ↓ [View Profile Button]
 * 
 * 9. Vendor 360° Profile (/vendors/:id)
 *    Complete vendor master record
 */

/**
 * SECONDARY USER JOURNEY - CHANGE REQUESTS
 * 
 * 1. Profile Page (/vendors/:id)
 *    ↓ [Request Change]
 * 
 * 2. Change Requests Page (/vendors/change-requests)
 *    ↓ [Create Change Request]
 * 
 * 3. Change Request Detail (/vendors/change-requests/:id)
 *    Example: Lower TDS Certificate
 *    ↓ [Multi-department Approval]
 * 
 * 4. ERP Re-sync automatically triggered
 */

// ===========================================
// DATA STRUCTURES
// ===========================================

export interface VendorRequest {
  id: string;
  requestId: string;           // e.g., "VR-2026-0234"
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
  validationScore?: number;    // 0-100, lower is better
}

export interface ChangeRequest {
  id: string;
  changeRequestId: string;     // e.g., "CR-2026-0145"
  vendorName: string;
  changeType: string;          // Bank, GST, Address, TDS, etc.
  requestedBy: string;
  requestDate: string;
  status: "Pending" | "Approved" | "Rejected" | "In Progress";
  approvalStatus: string;      // Human-readable status
  priority: "Low" | "Medium" | "High";
  effectiveDate?: string;
}

// ===========================================
// KEY FEATURES BY SCREEN
// ===========================================

/**
 * SCREEN 1: Vendor Requests Control Tower
 * Route: /vendors/requests
 * 
 * Features:
 * - 5 KPI cards with metrics
 * - Left filter panel (Country, Type, Risk, Status, Entity, Date)
 * - Main data table with 10 columns
 * - Bulk actions (checkbox selection)
 * - Search functionality
 * - Invite vendor modal
 * - Export functionality
 * 
 * Actions:
 * - View → Edit Page
 * - Validate → Validation Dashboard
 * - Approve → Approval Workspace
 * - Sync → ERP Sync trigger
 */

/**
 * SCREEN 3: External Vendor Self-Service Portal
 * Route: /portal/onboarding/:token
 * 
 * Features:
 * - Progress stepper (6 steps)
 * - Completion percentage bar
 * - Save draft button
 * - Real-time validation badges
 * - Document drag-and-drop uploader
 * - Mobile responsive
 * - No authentication required (token-based)
 * 
 * Steps:
 * 1. Basic Info (Legal name, country, address, contacts)
 * 2. Tax & Compliance (PAN, GST, TAN)
 * 3. Banking (Bank details, IFSC, account verification)
 * 4. Business Classification (Vendor type, category)
 * 5. Documents Upload (Certificates, registrations)
 * 6. Review & Submit (Final review before submission)
 */

/**
 * SCREEN 4: Buyer Assisted Onboarding Form
 * Route: /vendors/requests/:id/edit
 * 
 * Features:
 * - Multi-section collapsible cards
 * - Right sidebar with:
 *   - Validation summary
 *   - Risk score meter
 *   - Duplicate detection alert
 *   - Missing documents list
 * - Sticky footer with actions:
 *   - Save Draft
 *   - Run Validation
 *   - Send for Approval
 * 
 * Sections:
 * - Basic Details
 * - Tax Details
 * - Bank Details
 * - Classification
 * - Documents
 * - Entity Mapping
 */

/**
 * SCREEN 5: Validation & Risk Intelligence Dashboard
 * Route: /vendors/requests/:id/validation
 * 
 * Validation Checks:
 * - Tax validation (PAN, GST verification)
 * - Bank verification (Penny drop test)
 * - Sanctions screening (Global watchlists)
 * - Duplicate vendor detection (Name/PAN/GST matching)
 * - Document completeness (All required docs)
 * 
 * Risk Scoring:
 * - 0-30: Low Risk (Green)
 * - 31-70: Medium Risk (Yellow)
 * - 71-100: High Risk (Red)
 * 
 * Primary Action:
 * - Send for Department Approval
 */

/**
 * SCREEN 6: Multi-Department Sectional Approval
 * Route: /vendors/requests/:id/approval
 * 
 * Departments:
 * - Legal (Jennifer Cooper)
 * - Finance (Michael Chen)
 * - Compliance (Rebecca Adams)
 * - IT Security (David Kumar)
 * - Procurement (Sarah Mitchell)
 * 
 * Features:
 * - Left vertical section navigator
 * - Center panel with editable fields (department-specific)
 * - Right panel with full validation summary
 * - Bottom sticky action bar:
 *   - Approve
 *   - Reject
 *   - Request Clarification
 *   - Add Comment
 * - Approval timeline history
 */

/**
 * SCREEN 7: Vendor Created Success + ERP Sync
 * Route: /vendors/requests/:id/success
 * 
 * Features:
 * - Animated success confirmation
 * - Vendor summary card
 * - Real-time ERP sync progress (0-100%)
 * - Multi-entity sync status:
 *   - Procinix India (SAP) → V-2026-234-IN
 *   - Procinix Europe (SAP) → V-2026-234-EU
 *   - Procinix Americas (SAP) → V-2026-234-AM
 * - Expandable sync logs drawer
 * - Success/Info/Error log entries
 * - Next steps guidance
 * 
 * Actions:
 * - View Vendor Profile
 * - Back to Dashboard
 */

/**
 * SCREEN 8: Vendor 360° Profile
 * Route: /vendors/:id
 * 
 * Tabs:
 * 1. Overview - Basic info, quick stats, risk trend chart
 * 2. Compliance & KYC - Tax details, screening results
 * 3. Banking - Bank accounts, payment terms
 * 4. Entity Mapping - Multi-entity vendor codes
 * 5. Documents - Document library with expiry tracking
 * 6. Risk & Score - Risk meter, trend analysis
 * 7. ERP Sync - Sync status and logs
 * 8. Change History - All master data changes
 * 9. Audit Trail - Complete activity log
 * 
 * Right Sidebar:
 * - Overall risk score meter
 * - Validation summary (all checks)
 * - Document expiry alerts
 * - Recent activities
 * 
 * Actions:
 * - Export Profile
 * - Edit Vendor
 * - Block/Unblock Vendor
 */

/**
 * SCREEN 9 & 10: Change Request Management
 * 
 * Change Types Supported:
 * - Bank Account Change
 * - GST Number Update
 * - Address Change
 * - Contact Person Update
 * - Lower TDS Certificate (Section 197)
 * - Payment Terms Change
 * - Block/Unblock Vendor
 * 
 * Lower TDS Flow (Detail):
 * 1. Upload Section 197 certificate
 * 2. System validates PAN
 * 3. Display effective tax preview:
 *    - Current TDS: 10%
 *    - Approved TDS: 2%
 *    - Tax Savings: 8%
 * 4. Multi-department approval chain
 * 5. Auto ERP re-sync on approval
 * 
 * Features:
 * - Approval chain visualization
 * - Comments & discussion thread
 * - Document management
 * - Audit history
 * - ERP re-sync status
 */

// ===========================================
// DESIGN SYSTEM COMPONENTS
// ===========================================

/**
 * COMPONENT: KPICard
 * Usage: Dashboard metrics
 * Props: title, value, icon, trend (optional)
 * Example: Total Requests, Pending Approvals
 */

/**
 * COMPONENT: StatusBadge
 * Types: success, warning, error, info, pending, neutral
 * Sizes: sm, md, lg
 * Usage: Status indicators throughout app
 */

/**
 * COMPONENT: RiskMeter
 * Display: Circular progress gauge
 * Colors: Green (0-30), Yellow (31-70), Red (71-100)
 * Usage: Risk scoring visualization
 */

/**
 * COMPONENT: Stepper
 * Usage: Multi-step forms, progress tracking
 * Features: Current step, completed steps, navigation
 */

/**
 * COMPONENT: DocumentUploader
 * Features: Drag-and-drop, multiple files, progress
 * Accepted: PDF, DOC, DOCX, JPG, PNG
 * Max Size: 10MB
 */

/**
 * COMPONENT: ApprovalTimeline
 * Display: Vertical timeline with icons
 * States: approved, pending, rejected, waiting
 * Usage: Approval workflow visualization
 */

/**
 * COMPONENT: DataTable
 * Features: Sorting, selection, pagination
 * Usage: All list views in the app
 */

// ===========================================
// COLOR SYSTEM
// ===========================================

export const ProcinixColors = {
  // Brand
  primaryTeal: '#00A9B7',
  darkBackground: '#0A0F14',
  lightSurface: '#F6F9FC',
  borderNeutral: '#E6EEF2',
  
  // Status
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  info: '#3B82F6',
  
  // Grays
  textPrimary: '#0A0F14',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
};

// ===========================================
// MOCK DATA COUNTS
// ===========================================

/**
 * Available Mock Data:
 * - 8 Vendor Requests (various statuses)
 * - 6 Change Requests (various types)
 * - 12 Countries
 * - 10 Vendor Types
 * - 5 Entities
 * - 5 Departments with approvers
 */
