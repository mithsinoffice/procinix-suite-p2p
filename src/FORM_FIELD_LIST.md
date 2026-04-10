# 📋 COMPREHENSIVE FORM-WISE FIELD LIST
## Enterprise Procurement & AP Automation System

---

## 📌 TABLE OF CONTENTS
1. [Master Data Forms](#master-data-forms)
2. [Procurement Forms](#procurement-forms)
3. [Accounts Payable Forms](#accounts-payable-forms)
4. [Payment Forms](#payment-forms)
5. [Vendor Advance Forms](#vendor-advance-forms)
6. [Other Forms](#other-forms)

---

## 🎯 MASTER DATA FORMS

### 1️⃣ VENDOR MASTER
**Purpose:** Central repository for vendor information

#### Basic Information
- **Vendor Code** *(Auto-generated/Manual)* - Unique identifier
- **Vendor Name** *(Text)* - Trading name
- **Legal Name** *(Text)* - As per registration documents
- **PAN** *(Text, 10 chars)* - Permanent Account Number (India)
- **GSTIN** *(Text, 15 chars)* - GST Identification Number (India)
- **VAT Registration Number** *(Text)* - For UAE vendors
- **Emirates ID** *(Text)* - For UAE vendors
- **Email** *(Email)* - Primary contact email
- **Phone** *(Text)* - Contact number
- **Vendor Category** *(Dropdown)* - Raw Material, Services, Utilities, etc.
- **Vendor Type** *(Radio)* - Domestic / Import
- **Status** *(Dropdown)* - Active / Inactive / Blocked

#### MSME Details
- **MSME Registered** *(Checkbox)* - Yes/No
- **MSME Number** *(Text)* - Registration number
- **MSME Category** *(Dropdown)* - Micro / Small / Medium

#### Payment & Tax Details
- **Payment Terms** *(Dropdown)* - e.g., Net 30, Net 45
- **Credit Days** *(Number)* - Payment due days
- **TDS Applicable** *(Checkbox)* - Yes/No
- **TDS Section** *(Dropdown)* - 194C, 194J, etc.
- **Lower TDS Applicable** *(Checkbox)* - Certificate-based lower rate
- **Lower TDS Rate** *(Number, %)* - Reduced rate
- **Lower TDS Reference** *(Text)* - Certificate number
- **Section 206AB Applicable** *(Checkbox)* - Higher TDS rate flag
- **Effective TDS Rate** *(Calculated, %)* - Final rate after adjustments

#### Multi-Entity Fields
- **Entity ID** *(Dropdown)* - Associated legal entity
- **Entity Name** *(Auto-populated)*
- **Country** *(Dropdown)* - Vendor's country
- **Currency** *(Dropdown)* - INR, USD, EUR, GBP, AED

#### Bank Account Details (Multi-entry)
- **Account Number** *(Text)*
- **Account Name** *(Text)*
- **IFSC Code** *(Text, 11 chars)* - For India
- **Bank Name** *(Text)*
- **Branch Name** *(Text)*
- **Account Type** *(Dropdown)* - Current / Savings
- **Is Primary** *(Radio)* - One must be primary
- **Verified** *(Checkbox)* - Penny drop verification status
- **Verified Date** *(Date)*

#### Address Details (Multi-entry)
- **Address Type** *(Dropdown)* - Billing / Shipping / Registered
- **Address Line 1** *(Text)*
- **Address Line 2** *(Text, Optional)*
- **City** *(Text)*
- **State** *(Dropdown)*
- **State Code** *(Auto-populated from State)*
- **Pincode** *(Text, 6 chars)*
- **Country** *(Dropdown)*
- **GSTIN** *(Text, Optional)* - Location-specific GSTIN
- **Is Primary** *(Radio)* - One must be primary

#### Workflow Fields
- **Created By** *(Auto-populated)* - User who created
- **Created Date** *(Auto-populated)*
- **Approved By** *(Auto-populated)* - Approver name
- **Approved Date** *(Auto-populated)*
- **Workflow Status** *(System)* - Draft / Pending / Approved / Rejected

---

### 2️⃣ ITEM MASTER
**Purpose:** Catalog of goods and services

#### Basic Information
- **Item Code** *(Auto-generated/Manual)* - Unique identifier
- **Item Name** *(Text)* - Short name
- **Description** *(Textarea)* - Detailed description
- **Category** *(Dropdown)* - Raw Materials, Finished Goods, Services, etc.
- **Sub-Category** *(Dropdown)* - Based on category selection
- **Item Type** *(Radio)* - Goods / Services
- **Status** *(Dropdown)* - Active / Inactive

#### Tax & Pricing
- **HSN/SAC Code** *(Text)* - Harmonized System Nomenclature
- **GST Rate** *(Number, %)* - 0, 5, 12, 18, 28
- **UOM** *(Dropdown)* - Unit of Measurement (Kg, Pcs, Hours, etc.)
- **Standard Price** *(Number, Optional)* - Reference price
- **Reorder Level** *(Number, Optional)* - Inventory threshold

#### Workflow Fields
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*
- **Approved By** *(Auto-populated)*
- **Approved Date** *(Auto-populated)*

---

### 3️⃣ ENTITY MASTER
**Purpose:** Legal entity configuration for multi-entity operations

#### Basic Information
- **Entity Code** *(Auto-generated/Manual)*
- **Entity Name** *(Text)* - Short name
- **Legal Name** *(Text)* - As per incorporation
- **PAN** *(Text, 10 chars)* - India
- **GSTIN** *(Text, 15 chars)* - India
- **TRN** *(Text)* - Tax Registration Number (UAE)
- **Country** *(Dropdown)* - India / UAE / USA / UK
- **Base Currency** *(Dropdown)* - INR / AED / USD / GBP
- **Time Zone** *(Dropdown)*
- **Fiscal Year Start** *(Dropdown)* - Month
- **Status** *(Dropdown)* - Active / Inactive

#### Registered Address
- **Address Line 1** *(Text)*
- **Address Line 2** *(Text, Optional)*
- **City** *(Text)*
- **State/Emirates** *(Dropdown)*
- **Postal Code** *(Text)*
- **Country** *(Auto-populated)*

#### Banking Details
- **Bank Name** *(Text)*
- **Account Number** *(Text)*
- **IFSC/Swift Code** *(Text)*
- **Branch** *(Text)*

---

### 4️⃣ UOM MASTER
**Purpose:** Units of measurement

- **UOM Code** *(Auto-generated/Manual)* - e.g., KG, PCS, LTR
- **UOM Name** *(Text)* - Kilogram, Pieces, Liters
- **Description** *(Textarea)*
- **Status** *(Dropdown)* - Active / Inactive
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*

---

### 5️⃣ COST CENTRE MASTER
**Purpose:** Cost allocation tracking

- **Cost Centre Code** *(Auto-generated/Manual)*
- **Cost Centre Name** *(Text)*
- **Description** *(Textarea)*
- **Department** *(Dropdown)*
- **Entity** *(Dropdown)* - Multi-entity support
- **Is Active** *(Checkbox)*
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*

---

### 6️⃣ PROFIT CENTRE MASTER
**Purpose:** Profit tracking

- **Profit Centre Code** *(Auto-generated/Manual)*
- **Profit Centre Name** *(Text)*
- **Description** *(Textarea)*
- **Entity** *(Dropdown)*
- **Is Active** *(Checkbox)*

---

### 7️⃣ PAYMENT TERMS MASTER
**Purpose:** Standard payment conditions

- **Payment Term Code** *(Auto-generated/Manual)*
- **Description** *(Text)* - e.g., "Payment due in 30 days"
- **Credit Days** *(Number)*
- **Discount Days** *(Number, Optional)* - Early payment discount window
- **Discount Percentage** *(Number, %, Optional)*
- **Status** *(Dropdown)* - Active / Inactive

---

### 8️⃣ DEPARTMENT MASTER
**Purpose:** Organizational structure

- **Department Code** *(Auto-generated/Manual)*
- **Department Name** *(Text)*
- **Description** *(Textarea)*
- **HOD** *(Dropdown)* - Head of Department
- **Entity** *(Dropdown)*
- **Status** *(Dropdown)* - Active / Inactive

---

### 9️⃣ ITEM CATEGORY MASTER
**Purpose:** Item classification

- **Category Code** *(Auto-generated/Manual)*
- **Category Name** *(Text)*
- **Description** *(Textarea)*
- **Parent Category** *(Dropdown, Optional)* - For hierarchical categories
- **Status** *(Dropdown)* - Active / Inactive

---

### 🔟 DEBIT NOTE REASON MASTER
**Purpose:** Standard reasons for debit notes

- **Reason Code** *(Auto-generated/Manual)*
- **Reason Name** *(Text)* - Short supply, Quality issue, Price difference
- **Description** *(Textarea)*
- **Status** *(Dropdown)* - Active / Inactive

---

## 🛒 PROCUREMENT FORMS

### 1️⃣ PURCHASE REQUISITION (PR)
**Purpose:** Internal request for procurement

#### Header Section
- **PR Number** *(Auto-generated)* - System generated
- **PR Date** *(Date, Auto-filled)* - Current date
- **Entity** *(Dropdown)* - Legal entity
- **Requester** *(Auto-populated)* - Current user
- **Department** *(Dropdown)*
- **Required By Date** *(Date)* - Delivery deadline
- **Priority** *(Radio)* - Normal / Urgent / Critical
- **Purpose/Justification** *(Textarea)* - Business reason
- **Budget Available** *(Display only)* - Real-time budget check
- **Budget Code** *(Dropdown, Optional)*

#### Line Items (Multi-entry)
- **Item Code** *(Dropdown)* - From Item Master
- **Item Name** *(Auto-populated)*
- **Description** *(Textarea)*
- **Quantity** *(Number)*
- **UOM** *(Auto-populated from Item)*
- **Estimated Unit Price** *(Number)*
- **Total Amount** *(Calculated)*
- **Account Code** *(Dropdown)* - GL Account
- **Cost Centre** *(Dropdown)*
- **Profit Centre** *(Dropdown, Optional)*
- **Project** *(Dropdown, Optional)*
- **Notes** *(Textarea, Optional)*

#### Attachments
- **Supporting Documents** *(File Upload)* - Specifications, quotes, etc.

#### Workflow Fields
- **Status** *(System)* - Draft / Submitted / Approved / Rejected / Converted to PO
- **Submitted By** *(Auto-populated)*
- **Submitted Date** *(Auto-populated)*
- **Approver** *(Auto-populated)* - Based on approval matrix
- **Approved/Rejected By** *(Auto-populated)*
- **Approval/Rejection Date** *(Auto-populated)*
- **Comments** *(Textarea)* - Approver comments

---

### 2️⃣ PURCHASE ORDER (PO) - WITH PR
**Purpose:** Formal order to vendor (from approved PR)

#### Header Section
- **PO Number** *(Auto-generated)*
- **PO Date** *(Date, Auto-filled)*
- **Entity** *(Auto-populated from PR)*
- **PR Number(s)** *(Display)* - Source PR references
- **Vendor** *(Dropdown)* - From Vendor Master
- **Vendor Code** *(Auto-populated)*
- **Vendor GSTIN** *(Auto-populated)*
- **PO Type** *(Auto-selected)* - Goods / Services
- **Currency** *(Auto-populated from Vendor)*
- **Exchange Rate** *(Number)* - If foreign currency
- **Payment Terms** *(Auto-populated from Vendor)*
- **Credit Days** *(Auto-populated)*
- **Delivery Date** *(Date)*
- **Delivery Location** *(Dropdown)* - From Entity addresses
- **Billing Address** *(Auto-populated from Entity)*
- **Shipping Address** *(Auto-populated from Entity)*
- **Buyer Name** *(Auto-populated)* - Current user
- **Department** *(Auto-populated from PR)*
- **Narration** *(Textarea, Optional)*

#### Line Items (From PR, Editable)
- **Item Code** *(From PR)*
- **Item Name** *(From PR)*
- **Item Description** *(From PR)*
- **HSN/SAC Code** *(Auto-populated from Item)*
- **Quantity** *(Number, from PR)*
- **UOM** *(Auto-populated)*
- **Unit Price** *(Number)* - Negotiated price
- **Amount** *(Calculated)* - Qty × Unit Price
- **GST %** *(Auto-populated from Item)*
- **CGST** *(Calculated)*
- **SGST** *(Calculated)*
- **IGST** *(Calculated)* - Based on supplier state vs entity state
- **GST Amount** *(Calculated)*
- **Gross Amount** *(Calculated)* - Amount + GST
- **TDS %** *(Auto-populated from Vendor)*
- **TDS Amount** *(Calculated)*
- **Net Payable** *(Calculated)* - Gross - TDS
- **Account Code** *(From PR)*
- **Cost Centre** *(From PR)*
- **Profit Centre** *(From PR)*
- **Project** *(From PR)*

#### Milestone-Based Payments (Optional, for Services PO)
- **Milestone Name** *(Text)*
- **Milestone Description** *(Textarea)*
- **Due Date** *(Date)*
- **Milestone Amount** *(Number)*
- **Advance Eligible %** *(Number, %)* - % of milestone eligible for advance
- **Advance Eligible Amount** *(Calculated)*

#### Totals (Auto-calculated)
- **Subtotal** *(Sum of line amounts)*
- **Total GST** *(Sum of GST amounts)*
- **Total TDS** *(Sum of TDS amounts)*
- **Gross Total** *(Subtotal + GST)*
- **Net Payable** *(Gross - TDS)*

#### Attachments
- **Vendor Quotation** *(File Upload)*
- **Technical Specifications** *(File Upload)*
- **Other Documents** *(File Upload)*

#### Workflow Fields
- **Status** *(System)* - Draft / Issued / Partially Received / Fully Received / Closed / Cancelled
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*
- **Approved By** *(Auto-populated)*
- **Approved Date** *(Auto-populated)*

---

### 3️⃣ PURCHASE ORDER (PO) - WITHOUT PR
**Purpose:** Direct PO creation for urgent/emergency needs

#### Header Section
*(Same as PO with PR, except:)*
- **PR Number(s)** *(Not applicable)*
- **Emergency Reason** *(Textarea)* - Justification for bypassing PR
- **Requires Higher Approval** *(Checkbox, Auto-checked)*

#### Line Items
*(Same as PO with PR, but manually entered)*

---

### 4️⃣ GOODS RECEIPT NOTE (GRN)
**Purpose:** Recording receipt of goods/services

#### Header Section
- **GRN Number** *(Auto-generated)*
- **GRN Date** *(Date, Auto-filled)*
- **Entity** *(Auto-populated from PO)*
- **PO Number** *(Dropdown)* - Select open PO
- **Vendor** *(Auto-populated from PO)*
- **Vendor Code** *(Auto-populated)*
- **Receipt Type** *(Radio)* - Full / Partial
- **Invoice Number** *(Text, Optional)* - Vendor's invoice reference
- **Challan/Delivery Note Number** *(Text)*
- **Challan Date** *(Date)*
- **Received By** *(Auto-populated)* - Current user
- **Warehouse/Location** *(Dropdown)*
- **Quality Check Required** *(Checkbox)*
- **Quality Status** *(Radio)* - Accepted / Rejected / Partially Accepted

#### Line Items (From PO)
- **Item Code** *(From PO)*
- **Item Name** *(From PO)*
- **PO Quantity** *(Display)* - Ordered qty
- **Previously Received Qty** *(Display)* - Sum of prior GRNs
- **Remaining Qty** *(Display)* - PO Qty - Received
- **Current Receipt Qty** *(Number)* - Qty being received now
- **Accepted Qty** *(Number)* - After quality check
- **Rejected Qty** *(Number)* - Failed quality check
- **UOM** *(Display)*
- **Unit Price** *(Display, from PO)*
- **Amount** *(Calculated)* - Current Receipt Qty × Unit Price
- **Rejection Reason** *(Textarea, if rejected)*

#### Totals
- **Total Received Value** *(Calculated)*

#### Attachments
- **Delivery Challan** *(File Upload)*
- **Quality Report** *(File Upload, Optional)*
- **Photos** *(File Upload, Optional)*

#### Workflow Fields
- **Status** *(System)* - Pending / Partial / Complete
- **Allocation Status** *(System)* - Not Allocated / Partially Allocated / Fully Allocated / Accepted
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*

---

## 💰 ACCOUNTS PAYABLE FORMS

### 1️⃣ AP INVOICE - PO-BASED (WITH 3-WAY MATCHING)
**Purpose:** Record vendor invoice with PO/GRN matching

#### Entry Mode Selection
- **Entry Mode** *(Radio)* - Upload & Extract (OCR) / Manual Entry

#### Document Upload Section (If OCR mode)
- **Invoice Document** *(File Upload)* - PDF, JPG, PNG
- **Document Preview** *(Display)* - Show uploaded document
- **Zoom Controls** *(Buttons)* - Zoom In/Out, Rotate
- **OCR Status** *(Display)* - Extracting... / Complete / Failed
- **Confidence Level** *(Display)* - High/Medium/Low per field

#### Header Section
- **Invoice Number** *(Text)* - Vendor's invoice number
  - *OCR Field* - Confidence indicator (High/Medium/Low)
  - *Editable* - Yes, with edit indicator
- **Invoice Date** *(Date)*
  - *OCR Field* - Confidence indicator
- **Invoice Type** *(Auto-selected)* - PO
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
  - *OCR Suggestion* - Auto-matched from GSTIN/Name
- **Vendor Code** *(Auto-populated)*
- **Vendor GSTIN** *(Display)*
  - *OCR Field* - Extracted and validated
- **Vendor Address** *(Display)* - From vendor master
- **PO Number** *(Dropdown)* - Open POs for selected vendor
  - *OCR Field* - Extracted from document
- **GRN Number(s)** *(Multi-select)* - GRNs against selected PO
  - *OCR Field* - Extracted
- **Currency** *(Auto-populated from PO)*
  - *OCR Field* - Extracted
- **Exchange Rate** *(Number)* - If foreign currency
- **Invoice Amount (Vendor)** *(Number)* - Total per vendor invoice
  - *OCR Field* - Extracted, validated against PO
- **Due Date** *(Date)* - Based on payment terms
  - *OCR Field* - Extracted
- **Payment Terms** *(Auto-populated from Vendor)*
  - *OCR Field* - Extracted for validation
- **Expense Period** *(Month-Year, for accruals)*
- **Place of Supply** *(Dropdown)* - State for GST determination
- **Narration** *(Textarea, Optional)*

#### 3-Way Match Validation (Auto-populated)
- **Match Status** *(Display)* - 3-Way Matched / Exception / Mismatch
- **PO Amount** *(Display)*
- **GRN Amount** *(Display)*
- **Invoice Amount** *(Display)*
- **Variance** *(Calculated)* - Invoice vs PO
- **Variance %** *(Calculated)*
- **Tolerance Threshold** *(Display)* - e.g., ±5%
- **Exception Type** *(Display)* - Price Variance / Quantity Variance / Tax Mismatch
- **Exception Severity** *(Display)* - Blocker / Warning

#### Line Items (From PO/GRN, with matching)
- **Item Code** *(From PO)*
- **Item Name** *(From PO)*
- **Item Description** *(From PO)*
  - *OCR Field* - Extracted and matched
- **HSN/SAC Code** *(From Item Master)*
  - *OCR Field* - Extracted
- **Account Code** *(From PO)*
- **PO Qty** *(Display)*
- **GRN Qty** *(Display)*
- **Invoice Qty** *(Number)* - As per vendor invoice
  - *OCR Field* - Extracted
- **Remaining Qty Balance** *(Display)* - PO - Previously Invoiced
- **UOM** *(Display)*
- **PO Rate** *(Display)*
- **Invoice Rate** *(Number)* - As per vendor invoice
  - *OCR Field* - Extracted
- **Rate Variance** *(Calculated)* - Invoice Rate vs PO Rate
- **Amount** *(Calculated)* - Invoice Qty × Invoice Rate
  - *OCR Field* - Extracted
- **GST %** *(Number)*
  - *OCR Field* - Extracted
- **CGST** *(Calculated/OCR)*
  - *OCR Field* - Extracted
- **SGST** *(Calculated/OCR)*
  - *OCR Field* - Extracted
- **IGST** *(Calculated/OCR)*
  - *OCR Field* - Extracted
- **GST Amount** *(Calculated)*
  - *OCR Field* - Extracted, validated
- **Gross Amount** *(Calculated)* - Amount + GST
- **TDS %** *(Auto-populated from Vendor)*
- **TDS Section** *(Auto-populated)*
- **TDS Amount** *(Calculated)*
- **Net Payable** *(Calculated)* - Gross - TDS
- **Cost Centre** *(From PO)*
- **Profit Centre** *(From PO)*
- **Project** *(From PO)*
- **Match Status** *(Display per line)* - Matched / Exception

#### OCR Review Section (If OCR mode)
- **All Extracted Fields** *(Display)* - Side-by-side with form
- **Confidence Indicators** *(Visual)* - Color-coded per field
- **Edit History** *(Log)* - Which OCR fields were manually corrected
- **AI Suggestions** *(Display)* - Recommended corrections
- **Exception Alerts** *(Display)* - Red flags from AI

#### Vendor Advance Adjustment (Optional)
- **Available Advances** *(Display)* - List of open advances
- **Advance to Adjust** *(Multi-select)*
- **Advance Number** *(Display)*
- **Advance Amount** *(Display)*
- **Adjustment Amount** *(Number)* - Amount to adjust against invoice
- **Remaining Advance Balance** *(Calculated)*

#### TDS Calculation
- **TDS Section** *(Auto-populated from Vendor)*
- **Base TDS Rate** *(Display)*
- **Lower TDS Certificate** *(Display)* - If applicable
- **Section 206AB Applicable** *(Display)* - If non-filer
- **Effective TDS Rate** *(Calculated)*
- **Total TDS Amount** *(Calculated)*

#### Retention (For Construction/Service Contracts)
- **Retention Required** *(Multi-checkbox)* - GST / PF / ESI / Other
- **GST Retention** *(Number)* - If vendor is contractor
- **PF Retention** *(Number)*
- **ESI Retention** *(Number)*
- **Other Retention** *(Number)*
- **Total Retention** *(Calculated)*

#### Totals (Auto-calculated)
- **Subtotal** *(Sum of line amounts)*
- **Total CGST** *(Sum)*
- **Total SGST** *(Sum)*
- **Total IGST** *(Sum)*
- **Total GST** *(Sum)*
- **Gross Total** *(Subtotal + GST)*
- **Total TDS** *(Sum)*
- **Total Retention** *(Sum)*
- **Advance Adjusted** *(Sum)*
- **Net Payable** *(Gross - TDS - Retention - Advance)*

#### Cashflow Impact (Auto-calculated)
- **Expected Payment Date** *(Calculated)* - Invoice Date + Credit Days
- **Impact on Week** *(Display)* - Which week in 13-week forecast
- **Budget Code Impact** *(Display)* - If budget-linked

#### Attachments
- **Vendor Invoice** *(File Upload)* - Original invoice PDF
- **Supporting Documents** *(File Upload)* - Delivery notes, etc.
- **Tax Documents** *(File Upload)* - TDS certificates, etc.

#### Workflow Fields
- **Status** *(System)* - Draft / Validation Error / Pending Approval / Under Review / Approved / Rejected / Posted to ERP / Paid
- **Validation Errors** *(Display)* - List of blockers
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*
- **Submitted Date** *(Auto-populated)*
- **Approver(s)** *(Display)* - Multi-level approval
- **Current Approver** *(Display)*
- **Approval Comments** *(Display)* - Per approver
- **Rejection Reason** *(Textarea)* - If rejected
- **Posted to ERP** *(Checkbox)* - Integration status
- **ERP Document Number** *(Text)* - SAP/Oracle doc number

---

### 2️⃣ AP INVOICE - NON-PO (DIRECT INVOICE)
**Purpose:** Record vendor invoice without PO reference

#### Entry Mode Selection
*(Same as PO Invoice)*

#### Header Section
- **Invoice Number** *(Text)*
- **Invoice Date** *(Date)*
- **Invoice Type** *(Auto-selected)* - Non-PO
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Vendor Code** *(Auto-populated)*
- **Vendor GSTIN** *(Display)*
- **Currency** *(Auto-populated from Vendor)*
- **Exchange Rate** *(Number)* - If foreign currency
- **Invoice Amount** *(Number)*
- **Due Date** *(Date)*
- **Payment Terms** *(Auto-populated)*
- **Expense Category** *(Dropdown)* - Utilities, Rent, Professional Fees, etc.
- **Expense Period** *(Month-Year)*
- **Place of Supply** *(Dropdown)*
- **Narration** *(Textarea)*

#### Line Items (Manual entry)
- **Description** *(Textarea)* - Expense description
- **HSN/SAC Code** *(Text)*
- **Amount** *(Number)*
- **GST %** *(Number)*
- **CGST** *(Calculated)*
- **SGST** *(Calculated)*
- **IGST** *(Calculated)*
- **GST Amount** *(Calculated)*
- **Gross Amount** *(Calculated)*
- **TDS %** *(Number)*
- **TDS Section** *(Dropdown)*
- **TDS Amount** *(Calculated)*
- **Net Payable** *(Calculated)*
- **Account Code** *(Dropdown)* - GL Account
- **Cost Centre** *(Dropdown)*
- **Profit Centre** *(Dropdown, Optional)*
- **Project** *(Dropdown, Optional)*

#### *(Rest same as PO Invoice - Advance Adjustment, TDS, Retention, Totals, Attachments, Workflow)*

---

### 3️⃣ AP INVOICE - EXPENSE INVOICE
**Purpose:** Employee reimbursements or petty expenses

#### Header Section
- **Invoice Number** *(Text)*
- **Invoice Date** *(Date)*
- **Invoice Type** *(Auto-selected)* - Expense
- **Entity** *(Dropdown)*
- **Employee/Claimant** *(Dropdown)* - Employee master
- **Employee Code** *(Auto-populated)*
- **Department** *(Auto-populated)*
- **Expense Category** *(Dropdown)* - Travel, Entertainment, Office Supplies
- **Expense Period** *(Month-Year)*
- **Total Amount** *(Number)*
- **Narration** *(Textarea)*

#### Expense Line Items
- **Expense Type** *(Dropdown)* - Accommodation, Food, Transport, etc.
- **Description** *(Textarea)*
- **Date of Expense** *(Date)*
- **Amount** *(Number)*
- **GST %** *(Number)*
- **GST Amount** *(Calculated)*
- **Gross Amount** *(Calculated)*
- **Account Code** *(Dropdown)*
- **Cost Centre** *(Dropdown)*
- **Project** *(Dropdown, Optional)*
- **Receipt Attached** *(Checkbox)*

#### Attachments
- **Expense Receipts** *(File Upload)* - Bills, invoices
- **Travel Proof** *(File Upload)* - Tickets, boarding passes
- **Approval Email** *(File Upload)* - Manager approval

#### Workflow Fields
*(Same as other invoices)*

---

## 💳 PAYMENT FORMS

### 1️⃣ PAYMENT PROPOSAL
**Purpose:** Batch payment planning and approval

#### Header Section
- **Proposal Number** *(Auto-generated)*
- **Proposal Date** *(Date, Auto-filled)*
- **Entity** *(Dropdown)*
- **Payment Date** *(Date)* - Proposed payment execution date
- **Payment Method** *(Radio)* - NEFT / RTGS / Cheque / Wire Transfer
- **Bank Account** *(Dropdown)* - Company's bank account
- **Currency** *(Dropdown)* - INR / USD / EUR / GBP / AED
- **Total Invoices** *(Display)* - Count of invoices
- **Total Payment Amount** *(Calculated)*
- **Narration** *(Textarea, Optional)*

#### Invoice Selection (Multi-select from approved invoices)
- **Invoice Number** *(Display)*
- **Vendor Name** *(Display)*
- **Vendor Code** *(Display)*
- **Invoice Date** *(Display)*
- **Due Date** *(Display)*
- **Days Overdue** *(Calculated)* - Negative if not due yet
- **Invoice Amount** *(Display)*
- **TDS Amount** *(Display)*
- **Previous Payments** *(Display)*
- **Outstanding Amount** *(Display)*
- **Payment Amount** *(Number)* - Amount to pay now (editable for partial)
- **Payment Type** *(Display)* - Full / Partial
- **Priority** *(Dropdown)* - High / Medium / Low
- **Vendor Bank Account** *(Dropdown)* - From vendor master
- **Payment Remarks** *(Textarea, Optional)*

#### Grouping Options
- **Group by Vendor** *(Checkbox)* - Combine multiple invoices per vendor
- **Group by Currency** *(Checkbox)*
- **Group by Payment Terms** *(Checkbox)*

#### Totals
- **Total Gross Amount** *(Sum)*
- **Total TDS Deducted** *(Sum)*
- **Total Net Payable** *(Sum)*
- **Available Bank Balance** *(Display)* - Real-time from banking integration
- **Balance After Payment** *(Calculated)*

#### Cashflow Impact
- **Week Number** *(Display)* - In 13-week forecast
- **Impact on Cashflow** *(Display)* - Negative outflow

#### Attachments
- **Payment Approval Email** *(File Upload)*
- **Vendor Payment Requests** *(File Upload)*

#### Workflow Fields
- **Status** *(System)* - Draft / Pending Approval / Approved / Rejected / Executed / Failed
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*
- **Approver** *(Auto-populated)* - Based on amount threshold
- **Approved By** *(Auto-populated)*
- **Approved Date** *(Auto-populated)*
- **Executed By** *(Auto-populated)*
- **Execution Date** *(Auto-populated)*
- **UTR Number** *(Text)* - Bank transaction reference
- **Payment Status** *(Display)* - Success / Failed / Pending

---

### 2️⃣ PAYMENT EXECUTION
**Purpose:** Execute approved payment proposals

#### Proposal Details
- **Proposal Number** *(Dropdown)* - Select approved proposal
- **Payment Date** *(Date)* - Execution date
- **Payment Method** *(Display, from proposal)*
- **Bank Account** *(Display)*
- **Total Amount** *(Display)*

#### Execution Details (Auto-generated from bank integration)
- **UTR/Transaction Reference** *(Text)* - Bank-generated
- **Execution Status** *(Display)* - Success / Failed / Pending
- **Failure Reason** *(Text)* - If failed
- **Retry Attempt** *(Number)* - Attempt count

#### Per Invoice Status
- **Invoice Number** *(Display)*
- **Vendor Name** *(Display)*
- **Payment Amount** *(Display)*
- **Bank Status** *(Display)* - Success / Failed / Pending
- **UTR Number** *(Text)*
- **Credited Date** *(Date)* - When vendor received

---

## 🏦 VENDOR ADVANCE FORMS

### 1️⃣ VENDOR ADVANCE REQUEST
**Purpose:** Request advance payment to vendor

#### Header Section
- **Advance Request Number** *(Auto-generated)*
- **Request Date** *(Date, Auto-filled)*
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Vendor Code** *(Auto-populated)*
- **Currency** *(Auto-populated from Vendor)*
- **Advance Type** *(Radio)* - PO-Based / Non-PO / Milestone-Based
- **PO Number** *(Dropdown)* - If PO-based
- **Milestone** *(Dropdown)* - If milestone-based (from PO milestones)
- **Advance Amount** *(Number)*
- **Advance %** *(Calculated)* - % of PO/Milestone value
- **Advance Limit** *(Display)* - Max allowed % from policy
- **Exceeds Limit** *(Warning)* - If above threshold
- **Business Justification** *(Textarea)* - Required if exceeds limit
- **Expected Adjustment Timeline** *(Text)* - When will advance be utilized
- **Payment Terms** *(Display)*
- **Proposed Payment Date** *(Date)*

#### Advance Conditions
- **Advance Valid Till** *(Date)* - Expiry date
- **Security/Guarantee Required** *(Checkbox)*
- **Security Type** *(Dropdown)* - Bank Guarantee / Letter of Credit / None
- **Security Amount** *(Number)*
- **Security Reference** *(Text)*

#### TDS on Advance
- **TDS Applicable** *(Checkbox)*
- **TDS Section** *(Auto-populated from Vendor)*
- **TDS %** *(Number)*
- **TDS Amount** *(Calculated)*
- **Net Advance Payable** *(Calculated)* - Advance - TDS

#### Attachments
- **Vendor Request Letter** *(File Upload)*
- **PO Copy** *(File Upload)*
- **Milestone Completion Proof** *(File Upload)* - If milestone-based
- **Security Documents** *(File Upload)* - BG, LC

#### Workflow Fields
- **Status** *(System)* - Draft / Pending Approval / Approved / Rejected / Paid / Adjusted / Refunded
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*
- **Approver** *(Auto-populated)*
- **Approved By** *(Auto-populated)*
- **Approved Date** *(Auto-populated)*
- **Paid Date** *(Auto-populated)*
- **UTR Number** *(Text)*

---

### 2️⃣ VENDOR ADVANCE ADJUSTMENT
**Purpose:** Adjust advance against invoice

#### Adjustment Details
- **Adjustment Number** *(Auto-generated)*
- **Adjustment Date** *(Date, Auto-filled)*
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Available Advances** *(Display)* - List of open advances
- **Advance Number** *(Dropdown)* - Select advance to adjust
- **Advance Date** *(Display)*
- **Advance Amount** *(Display)*
- **Previously Adjusted** *(Display)*
- **Open Balance** *(Display)*
- **Invoice Number** *(Dropdown)* - Invoice against which adjusting
- **Invoice Amount** *(Display)*
- **Adjustment Amount** *(Number)* - Amount to adjust
- **Remaining Advance Balance** *(Calculated)*
- **Remarks** *(Textarea)*

---

### 3️⃣ VENDOR ADVANCE REFUND
**Purpose:** Refund unused advance

#### Refund Details
- **Refund Number** *(Auto-generated)*
- **Refund Date** *(Date, Auto-filled)*
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Advance Number** *(Dropdown)*
- **Advance Amount** *(Display)*
- **Adjusted Amount** *(Display)*
- **Open Balance** *(Display)*
- **Refund Amount** *(Number)*
- **Refund Reason** *(Textarea)* - PO cancelled, Work incomplete, etc.
- **Refund Mode** *(Radio)* - Direct Payment / Offset against other payables
- **Vendor Bank Account** *(Dropdown)*
- **TDS on Refund** *(Calculated)* - If applicable
- **Net Refund Amount** *(Calculated)*

---

## 📝 OTHER FORMS

### 1️⃣ DEBIT NOTE
**Purpose:** Claim amount back from vendor

#### Header Section
- **Debit Note Number** *(Auto-generated)*
- **Debit Note Date** *(Date, Auto-filled)*
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Vendor Code** *(Auto-populated)*
- **Reference Type** *(Radio)* - Against Invoice / Against PO / Standalone
- **Reference Number** *(Dropdown)* - Invoice/PO number
- **Reason** *(Dropdown)* - From Debit Note Reason Master
- **Reason Description** *(Textarea)* - Detailed explanation
- **Currency** *(Auto-populated from reference)*
- **Debit Amount** *(Number)*
- **GST Applicable** *(Checkbox)*
- **GST %** *(Number)*
- **GST Amount** *(Calculated)*
- **Total Debit** *(Calculated)* - Amount + GST

#### Line Items (If multi-item)
- **Description** *(Textarea)*
- **HSN/SAC Code** *(Text)*
- **Quantity** *(Number)*
- **Unit Price** *(Number)*
- **Amount** *(Calculated)*
- **GST %** *(Number)*
- **GST Amount** *(Calculated)*
- **Total** *(Calculated)*

#### Adjustment Options
- **Adjustment Mode** *(Radio)* - Offset against next payment / Vendor to pay back
- **Expected Resolution Date** *(Date)*

#### Attachments
- **Quality Report** *(File Upload)*
- **Photos of Defect** *(File Upload)*
- **Correspondence with Vendor** *(File Upload)*

#### Workflow Fields
- **Status** *(System)* - Draft / Issued / Acknowledged / Disputed / Settled / Adjusted
- **Vendor Acknowledgment** *(Checkbox)*
- **Vendor Comments** *(Textarea)*
- **Settlement Amount** *(Number)* - If negotiated
- **Created By** *(Auto-populated)*
- **Created Date** *(Auto-populated)*

---

### 2️⃣ CREDIT NOTE (VENDOR-ISSUED)
**Purpose:** Record vendor's credit note

#### Header Section
- **Credit Note Number** *(Text)* - Vendor's CN number
- **Credit Note Date** *(Date)*
- **Entity** *(Dropdown)*
- **Vendor** *(Dropdown)*
- **Vendor Code** *(Auto-populated)*
- **Reference Invoice Number** *(Dropdown)* - Original invoice
- **Credit Reason** *(Dropdown)* - Return, Shortage, Price correction
- **Credit Amount** *(Number)*
- **GST Amount** *(Number)*
- **Total Credit** *(Calculated)*

#### Line Items
- **Item Code** *(Text)*
- **Description** *(Textarea)*
- **Quantity** *(Number)*
- **Unit Price** *(Number)*
- **Amount** *(Calculated)*
- **GST %** *(Number)*
- **GST Amount** *(Calculated)*

#### Adjustment
- **Adjustment Against** *(Radio)* - Future Invoice / Refund
- **Adjusted Amount** *(Number)*
- **Remaining Credit Balance** *(Calculated)*

---

### 3️⃣ BUDGET POLICY
**Purpose:** Define budget control rules

- **Policy Name** *(Text)*
- **Entity** *(Dropdown)*
- **Department** *(Dropdown, Optional)*
- **Cost Centre** *(Dropdown, Optional)*
- **Fiscal Year** *(Dropdown)*
- **Budget Threshold** *(Number, %)* - Alert at X% utilization
- **Control Type** *(Radio)* - Hard Stop / Soft Warning / Advisory
- **Control Action** *(Textarea)* - What happens at threshold
- **Override Allowed** *(Checkbox)*
- **Override Approver** *(Dropdown)* - Who can override
- **Status** *(Dropdown)* - Active / Inactive

---

### 4️⃣ APPROVAL MATRIX
**Purpose:** Define approval workflows

- **Module** *(Dropdown)* - Invoice, Payment, Advance, PO, etc.
- **Entity** *(Dropdown)*
- **Amount Range From** *(Number)*
- **Amount Range To** *(Number)*
- **Level 1 Approver** *(Dropdown)* - Role or User
- **Level 2 Approver** *(Dropdown, Optional)*
- **Level 3 Approver** *(Dropdown, Optional)*
- **Parallel Approval** *(Checkbox)* - All at once or sequential
- **Escalation After** *(Number)* - Days before auto-escalation
- **Escalate To** *(Dropdown)*

---

## 📊 SUMMARY STATISTICS

### Total Forms: **25**

#### By Category:
- **Master Data Forms:** 9
- **Procurement Forms:** 4
- **Accounts Payable Forms:** 3
- **Payment Forms:** 2
- **Vendor Advance Forms:** 3
- **Other Forms:** 4

### Total Fields: **850+**

#### Field Types:
- **Text Input:** ~150
- **Number Input:** ~180
- **Dropdown/Select:** ~120
- **Date Fields:** ~80
- **Checkbox/Radio:** ~70
- **Textarea:** ~60
- **Auto-calculated:** ~120
- **Auto-populated:** ~70

---

## 🎨 DESIGN STANDARDS

### Color Palette
- **Primary Action:** #00A9B7 (Teal)
- **Secondary Action:** #007D87 (Dark Teal)
- **Background:** #F6F9FC (Opal White)
- **Card Background:** #FFFFFF (White)
- **Border:** #E1E6EA (Silver Grey)
- **Primary Text:** #0A0F14 (Tech Black)
- **Secondary Text:** #6E7A82 (Mercury Grey)

### Field Validation
- **Required Fields:** Marked with asterisk (*)
- **Real-time Validation:** On blur/change
- **Error Display:** Red text below field
- **Success Indicator:** Green checkmark
- **Warning Indicator:** Orange alert icon

### Workflow Status Colors
- **Draft:** #9AA6AF (Grey)
- **Pending Approval:** #F59E0B (Orange)
- **Approved:** #00A9B7 (Teal)
- **Rejected:** #EF4444 (Red)
- **Paid/Posted:** #10B981 (Green)

---

## 📝 NOTES

1. **Workflow Fields** are present in all transactional forms and track approval history
2. **Timestamps** are maintained for all status changes
3. **Multi-Entity Support** is built into all forms via Entity dropdown
4. **OCR Support** is available for Invoice forms with confidence scoring
5. **3-Way Matching** is enforced for PO-based invoices (PO ↔ GRN ↔ Invoice)
6. **Budget Integration** provides real-time budget checks on PR and PO forms
7. **Cashflow Impact** is auto-calculated for all invoice and payment forms
8. **TDS Calculation** is automated based on vendor master settings
9. **Multi-Currency Support** available with real-time exchange rates
10. **Approval Matrix** drives dynamic approval routing based on amount thresholds

---

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Maintained By:** System Administrator
