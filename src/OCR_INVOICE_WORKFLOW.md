# Invoice Upload + OCR Extraction Workflow

## Overview
The Invoice Upload + OCR (Optical Character Recognition) workflow enables users to upload supplier invoices and automatically extract data, validate against masters, and perform 3-way matching before completing the invoice creation process.

## Workflow Steps

### Step 0: Invoice Upload (First Step)
**Route:** `/invoices/upload-ocr`

**Features:**
- Drag-and-drop upload area for PDF/Image files
- Supported formats: PDF, PNG, JPG (Max 10MB)
- Upload progress indicator
- Automatic transition to extraction once upload completes

**User Actions:**
- Drag and drop invoice file
- OR click to browse and select file
- System automatically starts OCR extraction after upload

---

### Step 1: OCR Extraction Review (Side-by-Side)

**Layout:** Split-view interface

#### Left Panel: Document Preview
- PDF viewer / Image preview
- Zoom controls (50% - 200%)
- Rotation controls
- Full document view with scroll

#### Right Panel: Extracted Fields Form (Editable)

**Extracted Field Categories:**

1. **Invoice Header**
   - Vendor Name (with confidence indicator)
   - Vendor GSTIN
   - Invoice Number
   - Invoice Date
   - Invoice Amount
   - Currency

2. **Reference Documents**
   - PO Number (if present on invoice)
   - GRN/SRN reference (if present)

3. **Payment Details**
   - Payment Terms (e.g., Net 30 Days)
   - Due Date
   - Bank Details

4. **Tax Breakup**
   - CGST Total
   - SGST Total
   - IGST Total
   - TDS Hint (optional)

5. **Line Items**
   - Description
   - HSN/SAC Code
   - Quantity
   - Rate
   - Base Amount
   - GST Rate
   - GST Amount
   - CGST/SGST/IGST breakup

**Field Features:**
- **Confidence Indicators:** High (green), Medium (yellow), Low (red)
- **Editable Fields:** All fields can be manually edited
- **Edit Tracking:** Edited fields are highlighted in teal
- **Field Validation:** Real-time validation as user edits

**Actions:**
- **Accept & Continue:** Proceed to validation step
- **Re-run Extraction:** Re-process OCR with enhanced algorithm
- **Save Draft:** Save progress and return later
- **Back:** Return to upload step

---

### Step 2: Smart Validation & Auto-Matching

**Purpose:** Automatically match extracted data with Vendor Master, PO, and GRN/SRN

#### Matching Summary Cards (3 Cards)

1. **Vendor Match Card**
   - Shows top vendor matches from Vendor Master
   - Match confidence % (based on GSTIN, name similarity)
   - Reason for match (e.g., "Exact GSTIN match", "Partial name match")
   - Radio button selection
   - Auto-selects best match

2. **PO Match Card**
   - Shows open POs for selected vendor
   - Match confidence % (based on PO number in OCR, amounts)
   - Reason for match (e.g., "Exact PO number match from OCR")
   - Displays PO date, open amount
   - Auto-selects if PO number found in OCR

3. **GRN/SRN Match Card**
   - Shows available GRNs for selected PO
   - Match confidence % (based on GRN number in OCR, quantities)
   - Reason for match
   - Displays GRN date, received quantities
   - Auto-selects if GRN number found in OCR

#### Validation Results Panel

**Validation Categories:**

1. **Duplicate Detection**
   - Severity: Warning
   - Checks for exact and fuzzy invoice number matches
   - Shows suspected duplicate invoices
   - Action: View suspected duplicate

2. **Vendor Validation**
   - GSTIN format validation
   - GSTIN mismatch detection
   - Vendor status check
   - State code extraction from GSTIN

3. **MSME Compliance**
   - Severity: Info
   - Flags MSME registered vendors
   - Payment timeline reminder (45 days)
   - Action: View MSME details

4. **3-Way Matching**
   - Severity: Info/Warning/Blocker
   - PO → GRN → Invoice quantity validation
   - Amount tolerance checking
   - Rate variance detection
   - Status: Matched / Partially Matched / Mismatch

5. **Tax Validation**
   - GST calculation verification
   - CGST + SGST = Total GST check
   - Tax breakup consistency
   - HSN/SAC validation

6. **Missing Data**
   - Severity: Blocker
   - Checks for mandatory fields
   - Required attachments verification
   - Compliance document checks

**Validation Severity Levels:**
- **Blocker (Red):** Prevents submission, must be resolved
- **Warning (Yellow):** Requires justification or confirmation
- **Info (Blue):** Informational, non-blocking

**Actions:**
- **Back to OCR Review:** Return to edit extracted data
- **Save Draft:** Save progress
- **Proceed to Invoice Form:** Continue to final step (disabled if blockers exist)

---

### Step 3: PO-Based Invoice Form (Pre-Filled)

**Purpose:** Complete invoice with pre-filled OCR data + PO/GRN data

**Data Pre-Population:**
- Vendor auto-selected based on matching
- PO auto-selected and linked
- GRN/SRN auto-selected
- Invoice header fields filled from OCR
- Line items populated with merged data

#### Line Item Table Structure

**Columns (in sequence):**
1. Item Code (from Item Master)
2. Item Description (OCR + master data)
3. Account Code
4. PO Qty (reference)
5. GRN/SRN Qty (reference)
6. Invoice Qty (from OCR, editable with validation)
7. Unit Rate (locked to PO rate)
8. Base Amount (auto-calculated)
9. GST Rate
10. GST Amount
11. CGST / SGST / IGST (auto-split based on state)
12. Gross Amount (Base + GST Total)
13. TDS Section
14. TDS Rate
15. TDS Amount
16. Net Line Payable (Gross - TDS)
17. Cost Centre
18. Profit Centre
19. Project

#### Validation Rules

**Quantity Validations:**
- Invoice Qty ≤ GRN Qty ≤ PO Qty
- Cannot invoice more than received
- Variance highlighting

**Rate Validations:**
- Unit Rate locked to PO rate
- Upward rate change NOT allowed (blocker)
- Downward rate requires justification
- Rate variance highlighting

**Variance Highlighting:**
- OCR values vs PO/GRN values
- Color-coded differences
- Requires user confirmation on mismatches

**Mismatch Handling:**
- Automatic exception workflow creation
- Justification fields for variances
- Approval routing for exceptions

---

## AI Insights Integration

**OCR Quality Insights:**
- Low confidence field detection
- Suggested manual review areas
- Field extraction accuracy scores

**Validation Insights:**
- Duplicate invoice probability
- 3-way match success rate
- Tax calculation verification
- Compliance status

**AI Actions:**
- Auto-Match Vendor & PO (AI-powered matching)
- Re-run Enhanced OCR (better accuracy)
- Auto-correct from PO/Master (data sync)

---

## Submission Blockers

**Invoice submission is blocked if:**
1. OCR critical fields unresolved (vendor, invoice no, date, amount)
2. PO/GRN mismatch beyond tolerance without exception approval
3. Unit rate exceeds PO rate (not allowed)
4. Duplicate invoice confirmed
5. Mandatory compliance documents missing
6. Blocker-level validation issues unresolved

---

## Design Principles

### Enterprise Finance SaaS UI Standards
- Clean, audit-safe interface
- Strong visual hierarchy
- Explainable AI and automation
- Minimal clutter
- Clear action buttons

### Color Scheme
- **Primary Action:** Teal (#00A9B7)
- **Secondary Action:** Gray borders
- **Warning:** Yellow (#F59E0B)
- **Error/Blocker:** Red (#EF4444)
- **Success:** Green (#10B981)
- **Info:** Blue (#3B82F6)
- **OCR Feature:** Indigo (#6366F1)

### Confidence Indicators
- **High:** Green badge (>90% confidence)
- **Medium:** Yellow badge (70-90% confidence)
- **Low:** Red badge (<70% confidence)

---

## Navigation Flow

```
Invoices List
    ↓
[Upload & Extract (OCR)] button
    ↓
Step 1: Upload Invoice
    ↓ (automatic)
Step 2: OCR Extraction Review (split-view)
    ↓ [Accept & Continue]
Step 3: Smart Validation & Auto-Matching
    ↓ [Proceed to Invoice Form]
Step 4: Invoice Form (pre-filled, integrated with existing InvoiceFormPO)
    ↓ [Submit for Approval]
Approval Workflow
```

---

## Technical Implementation

### Components
- **InvoiceUploadOCR.tsx:** Main wizard component with 4 steps
- **Document Viewer:** PDF/Image preview with zoom/rotate controls
- **Extracted Field Input:** Reusable component with confidence badges
- **Validation Results Panel:** Severity-based issue display
- **Matching Cards:** Vendor/PO/GRN match displays

### State Management
- OCR extracted data
- Document preview
- Validation results
- Match selections
- AI insights

### Mock Data
- Simulated OCR extraction (3-second delay)
- Pre-configured vendor matches
- Pre-configured PO/GRN matches
- Sample validation issues

---

## Future Enhancements

1. **Real OCR Integration:** Connect to actual OCR service (e.g., Tesseract, Google Vision API)
2. **Machine Learning:** Train models for better vendor/PO matching
3. **Batch Upload:** Process multiple invoices simultaneously
4. **Template Learning:** Learn invoice formats per vendor
5. **Auto-Routing:** Automatically route to approvers based on matches
6. **Exception Analytics:** Dashboard for common OCR exceptions

---

## User Guidance

### Best Practices
1. Upload clear, high-resolution invoice scans
2. Review low-confidence fields carefully
3. Verify tax breakup calculations
4. Confirm matches before proceeding
5. Provide justification for variances

### Common Issues
- **Low OCR Confidence:** Re-scan invoice with better quality
- **No Vendor Match:** Add vendor to master first
- **No PO Match:** Verify PO number or create Non-PO invoice
- **Rate Mismatch:** Cannot exceed PO rate, create exception if needed

---

## Compliance & Audit Trail

- All OCR extractions logged with confidence scores
- Edit history tracked (original OCR value vs edited value)
- Validation results stored
- Match selections recorded
- Exception workflows documented
- Full audit trail for regulatory compliance
