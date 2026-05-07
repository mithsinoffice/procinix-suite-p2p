# 📊 MASTER DATA FORMS - DETAILED SPECIFICATIONS
## Enterprise Procurement & AP Automation System

---

## 📌 TABLE OF CONTENTS
1. [Overview](#overview)
2. [Vendor Master](#1-vendor-master)
3. [Item Master](#2-item-master)
4. [Entity Master](#3-entity-master)
5. [UOM Master](#4-uom-master)
6. [Cost Centre Master](#5-cost-centre-master)
7. [Profit Centre Master](#6-profit-centre-master)
8. [Payment Terms Master](#7-payment-terms-master)
9. [Department Master](#8-department-master)
10. [Item Category Master](#9-item-category-master)
11. [Debit Note Reason Master](#10-debit-note-reason-master)
12. [Bank Account Master](#11-bank-account-master)
13. [Tax Code Master](#12-tax-code-master)
14. [GL Account Master](#13-gl-account-master)
15. [Project Master](#14-project-master)
16. [Master Data Relationships](#master-data-relationships)

---

## 🎯 OVERVIEW

### Purpose
Master data forms are the **System of Record** for all reference data used across procurement and AP automation modules. They ensure data consistency, enable proper validation, and support workflow-based approvals.

### Key Principles
- ✅ **Single Source of Truth** - All modules consume from these masters
- ✅ **Workflow-Based Approvals** - No record goes live without approval
- ✅ **Immutability Post-Approval** - Approved records cannot be deleted
- ✅ **Modification Workflow** - Changes to approved records require re-approval
- ✅ **Multi-Entity Support** - Entity-specific filtering and access control
- ✅ **Audit Trail** - Complete history of all changes

### Common Fields (All Masters)
Every master data form includes:
- **Created By** *(Auto-populated)* - Username
- **Created Date** *(Auto-populated)* - Timestamp
- **Modified By** *(Auto-populated)* - Last modifier
- **Modified Date** *(Auto-populated)* - Last modification timestamp
- **Workflow Status** *(System)* - Draft / Pending Approval / Approved / Rejected / Modification Pending
- **Submitted By** *(Auto-populated)* - Who submitted for approval
- **Submitted Date** *(Auto-populated)*
- **Approved By** *(Auto-populated)* - Approver name
- **Approved Date** *(Auto-populated)*
- **Rejection Reason** *(Textarea)* - If rejected
- **Modification History** *(Display)* - Change log with highlighted differences

---

## 1️⃣ VENDOR MASTER

### Form Layout
**Route:** `/masters/vendors/create` or `/masters/vendors/edit/:id`  
**Access:** Procurement Manager, AP Manager, Master Data Admin  
**Approval Required:** Yes (for creation and modifications)

---

### SECTION 1: BASIC INFORMATION

#### 1.1 Vendor Code
- **Field Type:** Text Input (Auto-generated with manual override option)
- **Format:** `VEN-XXXXX` (e.g., VEN-00001)
- **Max Length:** 20 characters
- **Required:** Yes
- **Validation:** 
  - Must be unique across all entities
  - Alphanumeric and hyphens only
  - Cannot be changed once approved
- **Business Rule:** Auto-incremented by system, but can be overridden before approval
- **Sample Values:** VEN-00001, VEN-TEXTILE-001, VEN-SUBKO-001

#### 1.2 Vendor Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Validation:**
  - Minimum 3 characters
  - No special characters except &, -, ., spaces
  - Case-insensitive duplicate check
- **Business Rule:** Used for display in dropdowns and reports
- **Sample Values:** "Textile Solutions Pvt Ltd", "ABC Enterprises", "Global Trading Co"

#### 1.3 Legal Name
- **Field Type:** Text Input
- **Max Length:** 150 characters
- **Required:** Yes
- **Validation:**
  - Must match name in PAN/GSTIN records
  - As per official registration documents
- **Business Rule:** Used in contracts, invoices, and legal documents
- **Sample Values:** "Textile Solutions Private Limited", "ABC Enterprises LLP"

#### 1.4 PAN (Permanent Account Number)
- **Field Type:** Text Input (Uppercase auto-conversion)
- **Format:** `AAAAA9999A` (5 letters, 4 digits, 1 letter)
- **Length:** Exactly 10 characters
- **Required:** Yes (for Indian vendors)
- **Validation:**
  - Regex: `^[A-Z]{5}[0-9]{4}[A-Z]{1}$`
  - Unique check across all vendors
  - Real-time validation against Income Tax database (if API available)
- **Business Rule:** 
  - Mandatory for TDS deduction
  - 4th character indicates entity type (C=Company, P=Person, F=Firm, etc.)
- **Sample Values:** AABCS1234D, ABCDE5678F
- **Error Messages:**
  - "Invalid PAN format"
  - "PAN already exists for another vendor"
  - "PAN verification failed"

#### 1.5 GSTIN (GST Identification Number)
- **Field Type:** Text Input (Uppercase auto-conversion)
- **Format:** `99AAAAA9999A9Z9` (15 characters)
- **Length:** Exactly 15 characters
- **Required:** Yes (for Indian domestic vendors with turnover > 20 lakhs)
- **Validation:**
  - Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`
  - First 2 digits must match valid state code (01-38)
  - Characters 3-12 must match PAN
  - Unique check
  - Real-time validation against GST portal (if API available)
- **Business Rule:**
  - Auto-extract state from first 2 digits
  - Auto-validate PAN match
  - Used for GST determination (IGST vs CGST/SGST)
- **Sample Values:** 29AABCS1234D1Z5, 27ABCDE5678F1ZY
- **Auto-Derived Fields:**
  - **Supplier State:** Extracted from first 2 digits
  - **State Code:** First 2 digits
- **Error Messages:**
  - "GSTIN format invalid"
  - "GSTIN doesn't match PAN"
  - "Invalid state code in GSTIN"
  - "GSTIN already registered"

#### 1.6 VAT Registration Number (UAE)
- **Field Type:** Text Input
- **Format:** TRN (Tax Registration Number) - 15 digits
- **Length:** 15 characters
- **Required:** Yes (for UAE vendors)
- **Conditional Display:** Only for UAE entities
- **Validation:** 
  - Numeric only
  - 15 digits
- **Sample Values:** 100123456789012

#### 1.7 Emirates ID (UAE)
- **Field Type:** Text Input
- **Format:** 784-YYYY-XXXXXXX-X
- **Required:** No (Optional for UAE vendors)
- **Conditional Display:** Only for UAE entities
- **Sample Values:** 784-1990-1234567-8

#### 1.8 Email
- **Field Type:** Email Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Validation:**
  - Valid email format (RFC 5322)
  - Domain must have valid MX record
  - Test email option to verify deliverability
- **Business Rule:**
  - Used for PO/Invoice notifications
  - Can have multiple emails (comma-separated for additional)
- **Sample Values:** accounts@textiles.com, vendor@example.com

#### 1.9 Phone
- **Field Type:** Phone Input with country code
- **Format:** +[Country Code] [Number]
- **Required:** Yes
- **Validation:**
  - Valid international format
  - Minimum 10 digits
- **Sample Values:** +91 98765 43210, +971 50 123 4567
- **Enhancement:** Click-to-call integration

#### 1.10 Vendor Category
- **Field Type:** Dropdown (Single Select)
- **Required:** Yes
- **Options:**
  - Raw Materials
  - Finished Goods
  - Packaging Materials
  - Services - Professional
  - Services - Utilities
  - Services - IT/Software
  - Services - Marketing
  - Services - Logistics
  - Services - Consultancy
  - Services - Manpower
  - Capital Goods
  - Office Supplies
  - Travel & Transportation
  - Others
- **Business Rule:** 
  - Determines default GL accounts
  - Used for spend analytics
  - Can influence approval routing

#### 1.11 Vendor Type
- **Field Type:** Radio Buttons
- **Required:** Yes
- **Options:**
  - Domestic (within same country as entity)
  - Import (international vendor)
- **Business Rule:**
  - Affects tax calculations (IGST vs Customs Duty)
  - Determines currency options
  - Influences payment processing (RTGS/NEFT vs Wire Transfer)
- **Conditional Logic:**
  - If Import → Currency defaults to USD/EUR/GBP
  - If Domestic → Currency defaults to entity's base currency

#### 1.12 Status
- **Field Type:** Dropdown with color coding
- **Required:** Yes
- **Options:**
  - 🟢 Active - Can be used in transactions
  - 🟡 Inactive - Cannot be used in new transactions, existing continue
  - 🔴 Blocked - Completely blocked from all transactions
- **Default:** Active (after approval)
- **Business Rule:**
  - Only Active vendors appear in PO/Invoice dropdowns
  - Status change requires approval
  - Blocked vendors show warning if selected in existing transactions
- **Status Change Workflow:**
  - Active → Inactive (Requires approval, reason mandatory)
  - Inactive → Active (Requires approval)
  - Any → Blocked (Emergency, requires CFO approval, reason mandatory)

---

### SECTION 2: MSME DETAILS

#### 2.1 MSME Registered
- **Field Type:** Checkbox
- **Required:** No
- **Default:** Unchecked
- **Business Rule:**
  - If checked, shows MSME Number and Category fields
  - Affects payment terms compliance (45-day payment rule)
  - Used in compliance reporting

#### 2.2 MSME Number
- **Field Type:** Text Input
- **Max Length:** 50 characters
- **Required:** Conditional (Yes if MSME Registered = Yes)
- **Validation:**
  - Udyam Registration Number format (if India)
  - Unique check
- **Sample Values:** UDYAM-XX-00-0000000
- **Conditional Display:** Only if MSME Registered = Yes

#### 2.3 MSME Category
- **Field Type:** Dropdown
- **Required:** Conditional (Yes if MSME Registered = Yes)
- **Options:**
  - Micro
  - Small
  - Medium
- **Conditional Display:** Only if MSME Registered = Yes
- **Business Rule:**
  - Micro: Investment < ₹1 Cr, Turnover < ₹5 Cr
  - Small: Investment < ₹10 Cr, Turnover < ₹50 Cr
  - Medium: Investment < ₹50 Cr, Turnover < ₹250 Cr

---

### SECTION 3: PAYMENT & TAX DETAILS

#### 3.1 Payment Terms
- **Field Type:** Dropdown (from Payment Terms Master)
- **Required:** Yes
- **Options:** Net 15, Net 30, Net 45, Net 60, Advance, COD, etc.
- **Business Rule:**
  - Determines default payment due date on invoices
  - Cannot exceed 45 days for MSME vendors
- **Validation:**
  - If MSME = Yes and Payment Terms > 45 days → Error

#### 3.2 Credit Days
- **Field Type:** Number Input
- **Required:** Yes
- **Min:** 0
- **Max:** 365
- **Default:** Auto-populated from Payment Terms
- **Validation:**
  - Must be ≤ 45 if MSME registered
  - Must match payment terms
- **Business Rule:**
  - Used for due date calculation
  - Affects vendor ranking and evaluation

#### 3.3 TDS Applicable (India)
- **Field Type:** Checkbox
- **Required:** No
- **Default:** Checked (for most vendors)
- **Business Rule:**
  - If unchecked, TDS section fields are hidden
  - Government vendors and specific exemptions can be unchecked
- **Conditional Display:** Only for India entities

#### 3.4 TDS Section
- **Field Type:** Dropdown
- **Required:** Conditional (Yes if TDS Applicable = Yes)
- **Options:**
  - 194C - Payment to Contractors (1% Individual, 2% Company)
  - 194J - Professional/Technical Services (10%)
  - 194I - Rent (10% for plant/machinery, 10% for land/building)
  - 194H - Commission/Brokerage (5%)
  - 194Q - Purchase of Goods (0.1% if turnover > 10Cr)
  - 194O - E-commerce Operator (1%)
  - 195 - Non-Resident Payments (Varying rates)
- **Business Rule:**
  - Determines TDS rate for invoice calculations
  - Different rates for Individual vs Company
- **Auto-populated:** Based on vendor category (e.g., Services → 194J)

#### 3.5 Lower TDS Applicable
- **Field Type:** Checkbox
- **Required:** No
- **Default:** Unchecked
- **Business Rule:**
  - If checked, vendor has Lower TDS Certificate from Income Tax
  - Shows Lower TDS Rate and Reference fields
- **Conditional Display:** Only if TDS Applicable = Yes

#### 3.6 Lower TDS Rate
- **Field Type:** Number Input (Percentage)
- **Required:** Conditional (Yes if Lower TDS Applicable = Yes)
- **Min:** 0
- **Max:** Standard TDS rate for section
- **Decimal:** 2 places
- **Validation:**
  - Must be less than standard rate
  - Cannot exceed standard rate
- **Sample Values:** 0.5, 1.0, 5.0
- **Conditional Display:** Only if Lower TDS Applicable = Yes

#### 3.7 Lower TDS Reference
- **Field Type:** Text Input
- **Max Length:** 50 characters
- **Required:** Conditional (Yes if Lower TDS Applicable = Yes)
- **Validation:** Certificate number from Income Tax Department
- **Sample Values:** Lower TDS Cert/2024/12345
- **Conditional Display:** Only if Lower TDS Applicable = Yes
- **Enhancement:** Certificate expiry date tracking

#### 3.8 Section 206AB Applicable
- **Field Type:** Checkbox
- **Required:** No
- **Default:** Unchecked
- **Business Rule:**
  - Applicable for non-filers of Income Tax Returns
  - TDS rate doubles if checked (e.g., 194C becomes 4% instead of 2%)
  - System should auto-check based on ITR filing status (if API available)
- **Validation:** Warning if checked
- **Info Tooltip:** "This vendor hasn't filed ITR for last 2 years. TDS will be deducted at twice the normal rate."
- **Conditional Display:** Only if TDS Applicable = Yes

#### 3.9 Effective TDS Rate
- **Field Type:** Number (Display only, Auto-calculated)
- **Decimal:** 2 places
- **Calculation Logic:**
  ```
  IF Lower TDS Applicable = Yes THEN
    Effective Rate = Lower TDS Rate
  ELSE IF Section 206AB Applicable = Yes THEN
    Effective Rate = Standard Rate × 2
  ELSE
    Effective Rate = Standard Rate
  END IF
  ```
- **Display:** Shown in colored badge (Green if lower, Red if 206AB)
- **Sample Values:** 1.0%, 2.0%, 4.0%, 10.0%

---

### SECTION 4: MULTI-ENTITY FIELDS

#### 4.1 Entity
- **Field Type:** Multi-Select Dropdown
- **Required:** Yes
- **Options:** From Entity Master (Active entities only)
- **Business Rule:**
  - Vendor can be associated with one or multiple entities
  - Determines visibility in PO/Invoice screens
  - Single-entity mode: Auto-selected and hidden
- **Sample Values:** 
  - Subko Coffee Pvt Ltd - India
  - Subko Coffee LLC - UAE
  - Subko Coffee Inc - USA

#### 4.2 Entity Name
- **Field Type:** Display only (Auto-populated)
- **Business Rule:** Shows comma-separated list of selected entities

#### 4.3 Country
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - India
  - United Arab Emirates
  - United States
  - United Kingdom
  - Singapore
  - Others (expandable)
- **Business Rule:**
  - Determines which tax fields to show (PAN/GSTIN vs VAT/TRN)
  - Affects currency options
  - Determines address format
- **Conditional Logic:**
  - Country = India → Show PAN, GSTIN, TDS fields
  - Country = UAE → Show VAT, Emirates ID fields
  - Country = Others → Show generic tax ID field

#### 4.4 Currency
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - INR - Indian Rupee (₹)
  - AED - UAE Dirham (د.إ)
  - USD - US Dollar ($)
  - EUR - Euro (€)
  - GBP - British Pound (£)
  - SGD - Singapore Dollar (S$)
- **Business Rule:**
  - Default currency for all transactions with this vendor
  - Can be overridden at PO level
  - Exchange rate required if different from entity currency
- **Auto-suggested:** Based on vendor country
  - India → INR
  - UAE → AED
  - USA → USD

---

### SECTION 5: BANK ACCOUNT DETAILS (Multi-Entry Grid)

**Purpose:** Store vendor's bank accounts for payment processing  
**Layout:** Tabular grid with Add/Edit/Delete buttons  
**Minimum Required:** At least 1 bank account  
**Maximum Allowed:** 10 accounts per vendor

#### 5.1 Account Number
- **Field Type:** Text Input (Masked)
- **Max Length:** 20 characters
- **Required:** Yes
- **Validation:**
  - Numeric only (except for IBAN format)
  - Unique within vendor's accounts
  - Minimum 9 digits
- **Security:** Masked as ****1234 in display, full number only visible to authorized users
- **Sample Values:** 1234567890, 012345678901234

#### 5.2 Account Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Validation:**
  - Should match vendor's legal name or authorized signatory
  - Name mismatch warning
- **Sample Values:** "Textile Solutions Private Limited", "ABC Enterprises"

#### 5.3 IFSC Code (India)
- **Field Type:** Text Input (Uppercase auto-conversion)
- **Format:** `AAAA0BBBBBB` (4 letters, 1 zero, 6 alphanumeric)
- **Length:** Exactly 11 characters
- **Required:** Conditional (Yes if Country = India)
- **Validation:**
  - Regex: `^[A-Z]{4}0[A-Z0-9]{6}$`
  - Real-time validation against RBI IFSC database
  - Auto-populate bank name and branch from IFSC
- **Sample Values:** SBIN0001234, HDFC0000123
- **Auto-Derived:** Bank Name, Branch Name from IFSC API

#### 5.4 Swift Code (International)
- **Field Type:** Text Input (Uppercase auto-conversion)
- **Format:** 8 or 11 characters
- **Required:** Conditional (Yes if Country ≠ India)
- **Validation:**
  - Regex: `^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$`
  - First 4 letters: Bank code
  - Next 2 letters: Country code
  - Next 2: Location code
  - Last 3: Branch code (optional)
- **Sample Values:** SBININBB123, HDFCINBB

#### 5.5 IBAN (International)
- **Field Type:** Text Input (Uppercase, no spaces)
- **Max Length:** 34 characters
- **Required:** Conditional (For UAE, EU banks)
- **Validation:**
  - Country-specific IBAN validation
  - Check digit verification (MOD 97)
- **Sample Values:** AE070331234567890123456

#### 5.6 Bank Name
- **Field Type:** Text Input or Dropdown (from Bank Master)
- **Max Length:** 100 characters
- **Required:** Yes
- **Auto-populated:** If IFSC/Swift code is entered
- **Sample Values:** "State Bank of India", "HDFC Bank", "Emirates NBD"

#### 5.7 Branch Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Auto-populated:** If IFSC code is entered
- **Sample Values:** "Mumbai Main Branch", "Bangalore Koramangala"

#### 5.8 Account Type
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - Current
  - Savings
  - Overdraft
  - Cash Credit
- **Default:** Current (for business vendors)
- **Business Rule:** Most vendors use Current accounts

#### 5.9 Is Primary
- **Field Type:** Radio Button (within grid)
- **Required:** Yes (exactly one must be primary)
- **Validation:** 
  - Only one account can be primary
  - Auto-deselect others when selecting primary
- **Business Rule:**
  - Primary account is default for payments
  - Shows badge "PRIMARY" in display

#### 5.10 Verified
- **Field Type:** Checkbox (Read-only for user, set by system)
- **Default:** Unchecked
- **Business Rule:**
  - Set to true after penny drop verification
  - Shows green checkmark ✓ if verified
  - Shows orange warning ⚠ if not verified
- **Verification Method:** Penny drop test (₹1 transfer with name match)

#### 5.11 Verified Date
- **Field Type:** Date (Display only)
- **Format:** DD-MMM-YYYY HH:MM
- **Auto-populated:** When verification is successful
- **Sample Values:** 15-Dec-2024 14:30

#### 5.12 Actions
- **Field Type:** Button group
- **Actions:**
  - 🔍 View - Show full account details
  - ✏️ Edit - Modify account (requires approval if verified)
  - 🗑️ Delete - Remove account (cannot delete if primary or used in transactions)
  - ✅ Verify - Trigger penny drop verification
  - ⭐ Set Primary - Make this the primary account

---

### SECTION 6: ADDRESS DETAILS (Multi-Entry Grid)

**Purpose:** Store vendor's multiple addresses (Billing, Shipping, Registered)  
**Layout:** Card-based grid with Add/Edit/Delete buttons  
**Minimum Required:** At least 1 address  
**Maximum Allowed:** 10 addresses per vendor

#### 6.1 Address Type
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - Billing - For invoice and payment correspondence
  - Shipping - For delivery of materials
  - Registered - Legal/registered office address
- **Validation:** 
  - At least one Billing address required
  - Each type can have multiple entries
- **Business Rule:**
  - Billing address used in PO/Invoice documents
  - Shipping address used for GRN and deliveries

#### 6.2 Address Line 1
- **Field Type:** Textarea (auto-resize)
- **Max Length:** 200 characters
- **Required:** Yes
- **Validation:** Minimum 10 characters
- **Sample Values:** "Floor 3, Building A, Industrial Estate"

#### 6.3 Address Line 2
- **Field Type:** Textarea (auto-resize)
- **Max Length:** 200 characters
- **Required:** No
- **Sample Values:** "Near Whitefield Railway Station"

#### 6.4 City
- **Field Type:** Text Input or Dropdown (from City Master)
- **Max Length:** 50 characters
- **Required:** Yes
- **Validation:** Alphabets and spaces only
- **Sample Values:** "Mumbai", "Bangalore", "Dubai"

#### 6.5 State / Emirates
- **Field Type:** Dropdown (Country-specific)
- **Required:** Yes
- **Options (India):**
  - 29 states + 8 union territories (from GSTIN state codes)
  - Maharashtra (27), Karnataka (29), Tamil Nadu (33), etc.
- **Options (UAE):**
  - Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain
- **Business Rule:**
  - Used for GST calculation (IGST vs CGST/SGST)
  - Auto-populate State Code

#### 6.6 State Code
- **Field Type:** Text (Display only, Auto-populated)
- **Length:** 2 characters
- **Auto-populated:** From State selection
- **Sample Values:** 27 (Maharashtra), 29 (Karnataka), 07 (Delhi)
- **Business Rule:** Used in GSTIN validation

#### 6.7 Pincode / Postal Code
- **Field Type:** Text Input
- **Length:** 6 characters (India), variable (international)
- **Required:** Yes
- **Validation:**
  - India: Exactly 6 digits
  - UAE: 5 digits
  - USA: 5 or 9 digits (ZIP)
- **Auto-suggest:** City/State based on pincode (if API available)
- **Sample Values:** 400001 (Mumbai), 560001 (Bangalore)

#### 6.8 Country
- **Field Type:** Dropdown
- **Required:** Yes
- **Default:** Same as vendor's country
- **Options:** India, UAE, USA, UK, Singapore, etc.
- **Business Rule:**
  - Can be different from vendor's primary country (branch offices)
  - Determines address format and validation rules

#### 6.9 GSTIN (Location-specific for India)
- **Field Type:** Text Input (Uppercase)
- **Length:** Exactly 15 characters
- **Required:** Conditional (Optional for additional locations)
- **Validation:**
  - Same as main GSTIN validation
  - State code in GSTIN must match address state
  - PAN portion must match vendor's main GSTIN
- **Business Rule:**
  - Some vendors have different GSTINs for different states
  - Used for inter-state vs intra-state GST determination
- **Sample Values:** 27AABCS1234D1Z5 (Maharashtra location)

#### 6.10 Is Primary
- **Field Type:** Radio Button
- **Required:** Yes (exactly one must be primary)
- **Validation:** Only one address can be primary
- **Business Rule:**
  - Primary address is default for PO/Invoice
  - Shows badge "PRIMARY" in display

#### 6.11 Actions
- **Field Type:** Button group
- **Actions:**
  - ✏️ Edit - Modify address
  - 🗑️ Delete - Remove address (cannot delete if primary or used in transactions)
  - ⭐ Set Primary - Make this the primary address
  - 🗺️ View on Map - Show Google Maps location (if geocoded)

---

### SECTION 7: WORKFLOW & AUDIT FIELDS

#### 7.1 Workflow Status
- **Field Type:** Display Badge
- **Auto-managed:** System-controlled
- **Status Values:**
  - 📝 Draft - Being created/edited
  - ⏳ Pending Approval - Submitted, awaiting approval
  - ✅ Approved - Live and active
  - ❌ Rejected - Not approved
  - 🔄 Modification Pending - Approved record modified, awaiting re-approval
- **Color Coding:**
  - Draft: Grey
  - Pending Approval: Orange
  - Approved: Green
  - Rejected: Red
  - Modification Pending: Blue

#### 7.2 Created By
- **Field Type:** Display (Auto-populated)
- **Value:** Username of creator
- **Sample Values:** "john.doe@company.com", "Rajesh Kumar"

#### 7.3 Created Date
- **Field Type:** Display (Auto-populated)
- **Format:** DD-MMM-YYYY HH:MM:SS
- **Sample Values:** "15-Dec-2024 10:30:45"

#### 7.4 Modified By
- **Field Type:** Display (Auto-populated)
- **Value:** Username of last modifier
- **Sample Values:** "jane.smith@company.com"

#### 7.5 Modified Date
- **Field Type:** Display (Auto-populated)
- **Format:** DD-MMM-YYYY HH:MM:SS
- **Sample Values:** "20-Dec-2024 15:45:30"

#### 7.6 Submitted By
- **Field Type:** Display (Auto-populated)
- **Value:** Username who submitted for approval
- **Sample Values:** "john.doe@company.com"

#### 7.7 Submitted Date
- **Field Type:** Display (Auto-populated)
- **Format:** DD-MMM-YYYY HH:MM:SS
- **Sample Values:** "15-Dec-2024 11:00:00"

#### 7.8 Approver
- **Field Type:** Display (Auto-populated from Approval Matrix)
- **Value:** Name/Email of designated approver
- **Business Rule:** Determined by approval matrix based on user role
- **Sample Values:** "Procurement Manager", "CFO"

#### 7.9 Approved By
- **Field Type:** Display (Auto-populated)
- **Value:** Actual approver who approved
- **Sample Values:** "cfo@company.com"

#### 7.10 Approved Date
- **Field Type:** Display (Auto-populated)
- **Format:** DD-MMM-YYYY HH:MM:SS
- **Sample Values:** "16-Dec-2024 09:15:00"

#### 7.11 Rejection Reason
- **Field Type:** Textarea (Approver input)
- **Max Length:** 500 characters
- **Required:** Conditional (Yes if rejecting)
- **Sample Values:** "PAN verification failed", "Duplicate vendor exists"

#### 7.12 Approval Comments
- **Field Type:** Textarea (Approver input)
- **Max Length:** 500 characters
- **Required:** No
- **Sample Values:** "Approved with condition to verify bank account", "Good to proceed"

---

### SECTION 8: MODIFICATION HISTORY

**Purpose:** Track all changes to vendor master with highlighted differences  
**Layout:** Timeline view with expandable change details  
**Access:** View only (no edit)

#### 8.1 Change Log Entry
Each change log entry shows:
- **Modified Date:** Timestamp
- **Modified By:** Username
- **Action:** Created / Updated / Status Changed
- **Fields Changed:** List of modified fields
- **Old Value → New Value:** Side-by-side comparison
- **Approval Status:** Pending / Approved / Rejected
- **Approver Comments:** If any

#### 8.2 Highlighted Changes (for pending modifications)
- **Field Name:** What was changed
- **Current Value (Live):** Approved value
- **Proposed Value (Pending):** New value awaiting approval
- **Visual Indicator:** Yellow highlight for differences
- **Approval Action:** Approve / Reject buttons for approver

---

### FORM ACTIONS

#### Primary Actions
1. **💾 Save as Draft**
   - Saves without submitting
   - Can be edited later
   - Not visible to others

2. **📤 Submit for Approval**
   - Validates all required fields
   - Sends notification to approver
   - Cannot be edited until approved/rejected

3. **❌ Cancel**
   - Discards changes
   - Confirmation dialog if unsaved changes exist

#### Approver Actions (for pending records)
1. **✅ Approve**
   - Makes vendor live
   - Sends notification to creator
   - Optional comments

2. **❌ Reject**
   - Returns to creator
   - Reason mandatory
   - Notification sent

3. **ℹ️ Request More Info**
   - Asks creator for clarification
   - Record remains pending
   - Creator notified

#### Post-Approval Actions
1. **✏️ Modify**
   - Creates modification request
   - Highlights changes for approver
   - Requires re-approval

2. **🚫 Deactivate**
   - Changes status to Inactive
   - Requires approval
   - Reason mandatory

3. **🔒 Block**
   - Emergency action
   - Requires CFO approval
   - Immediate effect, post-approval workflow

---

### VALIDATION RULES SUMMARY

| Field | Validation | Error Message |
|-------|-----------|---------------|
| Vendor Code | Unique, Alphanumeric | "Vendor code already exists" |
| PAN | Format AAAAA9999A, Unique | "Invalid PAN format" |
| GSTIN | Format validation, PAN match | "GSTIN doesn't match PAN" |
| Email | Valid email, Deliverable | "Invalid email address" |
| IFSC | Format validation, Valid code | "Invalid IFSC code" |
| Payment Terms | ≤45 days if MSME | "MSME vendors must have ≤45 day terms" |
| Bank Accounts | Min 1, Max 10 | "At least one bank account required" |
| Addresses | Min 1 Billing address | "Billing address is mandatory" |

---

### SAMPLE DATA

```json
{
  "vendorCode": "VEN-00001",
  "vendorName": "Textile Solutions Pvt Ltd",
  "legalName": "Textile Solutions Private Limited",
  "pan": "AABCS1234D",
  "gstin": "29AABCS1234D1Z5",
  "email": "accounts@textiles.com",
  "phone": "+91 98765 43210",
  "category": "Raw Materials",
  "vendorType": "Domestic",
  "status": "Active",
  "msmeRegistered": true,
  "msmeNumber": "UDYAM-KA-00-0012345",
  "msmeCategory": "Small",
  "paymentTerms": "Net 30",
  "creditDays": 30,
  "tdsApplicable": true,
  "tdsSection": "194C",
  "lowerTdsApplicable": false,
  "section206ABApplicable": false,
  "effectiveTdsRate": 2.0,
  "entity": ["ENT-SUBKO-IN"],
  "country": "India",
  "currency": "INR",
  "bankAccounts": [
    {
      "accountNumber": "1234567890",
      "accountName": "Textile Solutions Private Limited",
      "ifscCode": "SBIN0001234",
      "bankName": "State Bank of India",
      "branchName": "Bangalore Main",
      "accountType": "Current",
      "isPrimary": true,
      "verified": true,
      "verifiedDate": "2024-12-10T10:30:00Z"
    }
  ],
  "addresses": [
    {
      "type": "Billing",
      "addressLine1": "123, Industrial Area, Phase 1",
      "addressLine2": "Near Railway Station",
      "city": "Bangalore",
      "state": "Karnataka",
      "stateCode": "29",
      "pincode": "560001",
      "country": "India",
      "gstin": "29AABCS1234D1Z5",
      "isPrimary": true
    }
  ],
  "workflowStatus": "Approved",
  "createdBy": "john.doe@company.com",
  "createdDate": "2024-12-10T09:00:00Z",
  "approvedBy": "manager@company.com",
  "approvedDate": "2024-12-10T14:30:00Z"
}
```

---

## 2️⃣ ITEM MASTER

### Form Layout
**Route:** `/masters/items/create` or `/masters/items/edit/:id`  
**Access:** Procurement Manager, Inventory Manager, Master Data Admin  
**Approval Required:** Yes

---

### SECTION 1: BASIC INFORMATION

#### 1.1 Item Code
- **Field Type:** Text Input (Auto-generated with manual override)
- **Format:** `ITEM-XXXXX` (e.g., ITEM-00001)
- **Max Length:** 20 characters
- **Required:** Yes
- **Validation:** 
  - Unique across all items
  - Alphanumeric and hyphens only
  - Cannot be changed once approved
- **Sample Values:** ITEM-00001, ITEM-RM-COTTON-001

#### 1.2 Item Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Validation:** Minimum 3 characters
- **Sample Values:** "Organic Cotton Fabric", "Polyester Thread", "Consulting Services"

#### 1.3 Description
- **Field Type:** Textarea (Rich text editor)
- **Max Length:** 500 characters
- **Required:** Yes
- **Validation:** Minimum 10 characters
- **Features:** 
  - Supports bullet points
  - Bold/Italic formatting
  - Auto-resize
- **Sample Values:** "100% organic cotton fabric, 60 GSM, white color, suitable for garment manufacturing"

#### 1.4 Category
- **Field Type:** Dropdown (from Item Category Master)
- **Required:** Yes
- **Options:**
  - Raw Materials
  - Semi-Finished Goods
  - Finished Goods
  - Packaging Materials
  - Office Supplies
  - IT Equipment
  - Services - Professional
  - Services - Maintenance
  - Services - Utilities
  - Capital Assets
- **Business Rule:** 
  - Determines default GL accounts
  - Affects inventory tracking (goods vs services)
  - Cascades to sub-category options

#### 1.5 Sub-Category
- **Field Type:** Dropdown (Dynamic based on Category)
- **Required:** Yes
- **Options (Dynamic):**
  - If Category = Raw Materials → Fabric, Thread, Buttons, Zippers, Dyes, etc.
  - If Category = Services - Professional → Consulting, Legal, Accounting, IT, etc.
- **Business Rule:** Provides granular classification for reporting

#### 1.6 Item Type
- **Field Type:** Radio Buttons
- **Required:** Yes
- **Options:**
  - 🎁 Goods - Physical items with inventory
  - 🛠️ Services - Intangible services without inventory
- **Business Rule:**
  - Goods → Enable inventory tracking, reorder level
  - Services → Disable inventory fields
  - Affects GST calculation and invoice type

#### 1.7 Status
- **Field Type:** Dropdown with badge
- **Required:** Yes
- **Options:**
  - 🟢 Active
  - 🔴 Inactive
  - 🟡 Discontinued
- **Default:** Active (after approval)
- **Business Rule:**
  - Only Active items appear in PR/PO dropdowns
  - Inactive items cannot be used in new transactions
  - Discontinued items show warning

---

### SECTION 2: TAX & PRICING

#### 2.1 HSN/SAC Code
- **Field Type:** Text Input with auto-suggest
- **Max Length:** 8 characters
- **Required:** Yes
- **Validation:**
  - HSN for Goods: 4, 6, or 8 digits
  - SAC for Services: 6 digits
- **Auto-suggest:** Search from HSN/SAC master database
- **Sample Values:** 
  - 5208 (Cotton fabric - HSN)
  - 998314 (Consulting services - SAC)
- **Business Rule:** 
  - Determines default GST rate
  - Auto-populate GST % based on HSN/SAC
- **Info Tooltip:** "HSN (Harmonized System of Nomenclature) for goods, SAC (Services Accounting Code) for services"

#### 2.2 GST Rate
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - 0% - Exempted items
  - 0.25% - Specific items (gems, precious metals)
  - 3% - Gold, precious stones
  - 5% - Essential commodities, medicines
  - 12% - Standard goods
  - 18% - Most goods and services
  - 28% - Luxury items, sin goods
- **Default:** Auto-populated from HSN/SAC code
- **Business Rule:** 
  - Used in invoice GST calculation
  - Can be overridden if HSN has multiple rates
  - GST split (CGST/SGST vs IGST) calculated at transaction level

#### 2.3 UOM (Unit of Measurement)
- **Field Type:** Dropdown (from UOM Master)
- **Required:** Yes
- **Options:**
  - Pieces (Pcs)
  - Kilograms (Kg)
  - Meters (Mtr)
  - Liters (Ltr)
  - Hours (Hrs)
  - Days
  - Square Meters (Sqm)
  - Cubic Meters (CBM)
  - Dozens (Dzn)
  - Boxes
  - Cartons
  - Sets
- **Business Rule:** 
  - Defines how quantity is measured
  - Used in PO, GRN, Invoice
  - Can have conversion ratios (e.g., 1 Box = 100 Pcs)

#### 2.4 Standard Price (Optional)
- **Field Type:** Number Input (Currency)
- **Required:** No
- **Min:** 0
- **Decimal:** 2 places
- **Currency:** Based on entity's base currency
- **Sample Values:** 150.00, 2500.00
- **Business Rule:**
  - Reference price for cost estimation
  - Used in PR for budget checks
  - Actual PO price can differ (negotiated rate)
- **Display:** ₹150.00 or $25.00 based on currency

---

### SECTION 3: INVENTORY (Only for Goods)

**Conditional Display:** Only shown if Item Type = Goods

#### 3.1 Reorder Level
- **Field Type:** Number Input
- **Required:** Conditional (Recommended for inventory items)
- **Min:** 0
- **Decimal:** 2 places
- **Sample Values:** 100, 500, 1000
- **Business Rule:**
  - Minimum stock level before reorder trigger
  - System alerts when stock falls below
  - Used in automatic PR generation
- **Enhancement:** Auto-calculate based on consumption pattern

#### 3.2 Reorder Quantity
- **Field Type:** Number Input
- **Required:** Conditional
- **Min:** 0
- **Decimal:** 2 places
- **Sample Values:** 1000, 5000
- **Business Rule:**
  - Quantity to order when reorder level is reached
  - Used in automatic PR generation

#### 3.3 Lead Time (Days)
- **Field Type:** Number Input
- **Required:** No
- **Min:** 0
- **Max:** 365
- **Sample Values:** 7, 15, 30
- **Business Rule:**
  - Expected delivery time from order date
  - Used for delivery date calculation in PO
  - Helps in inventory planning

#### 3.4 Minimum Order Quantity (MOQ)
- **Field Type:** Number Input
- **Required:** No
- **Min:** 1
- **Sample Values:** 100, 500
- **Business Rule:**
  - Minimum qty that must be ordered
  - Validation at PO line item level
  - Vendor-specific, but item-level MOQ serves as default

---

### SECTION 4: ACCOUNTING

#### 4.1 Default GL Account (Expense)
- **Field Type:** Dropdown (from GL Account Master)
- **Required:** Yes
- **Format:** `XXXX - Account Name`
- **Options:**
  - 5100 - Raw Material Purchases
  - 5200 - Consumables & Supplies
  - 6100 - Professional Fees
  - 6200 - Utilities
  - 7100 - Capital Expenditure
  - etc.
- **Business Rule:**
  - Default account code in PO/Invoice line items
  - Can be overridden at transaction level
  - Used for financial reporting

#### 4.2 Default Cost Centre
- **Field Type:** Dropdown (from Cost Centre Master)
- **Required:** Conditional (If organization uses cost centre accounting)
- **Options:** Production, Marketing, Admin, IT, etc.
- **Business Rule:**
  - Default cost allocation
  - Can be overridden at transaction level

---

### SECTION 5: WORKFLOW & AUDIT

*(Same as Vendor Master - Created By, Created Date, Approved By, Workflow Status, etc.)*

---

### FORM ACTIONS

*(Same as Vendor Master - Save Draft, Submit, Approve, Reject, Modify)*

---

### VALIDATION RULES SUMMARY

| Field | Validation | Error Message |
|-------|-----------|---------------|
| Item Code | Unique, Alphanumeric | "Item code already exists" |
| HSN/SAC | Valid format, 4-8 digits | "Invalid HSN/SAC code" |
| GST Rate | Must be from allowed values | "Invalid GST rate" |
| Reorder Level | Required if Item Type = Goods | "Reorder level mandatory for goods" |

---

### SAMPLE DATA

```json
{
  "itemCode": "ITEM-00001",
  "itemName": "Organic Cotton Fabric",
  "description": "100% organic cotton fabric, 60 GSM, white color, suitable for garment manufacturing",
  "category": "Raw Materials",
  "subCategory": "Fabric",
  "itemType": "Goods",
  "status": "Active",
  "hsnCode": "5208",
  "gstRate": 5,
  "uom": "Meters",
  "standardPrice": 150.00,
  "reorderLevel": 1000,
  "reorderQuantity": 5000,
  "leadTimeDays": 15,
  "minimumOrderQty": 500,
  "defaultGLAccount": "5100",
  "defaultCostCentre": "PROD-01",
  "workflowStatus": "Approved",
  "createdBy": "inventory.manager@company.com",
  "createdDate": "2024-12-10T09:00:00Z"
}
```

---

## 3️⃣ ENTITY MASTER

### Form Layout
**Route:** `/masters/entities/create` or `/masters/entities/edit/:id`  
**Access:** System Admin, Finance Controller  
**Approval Required:** Yes (CFO approval)

---

### SECTION 1: BASIC INFORMATION

#### 1.1 Entity Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `ENT-XXXXX` or `XXX-XX` (e.g., ENT-00001, SUBKO-IN)
- **Max Length:** 20 characters
- **Required:** Yes
- **Validation:** Unique across all entities
- **Sample Values:** ENT-SUBKO-IN, ENT-SUBKO-UAE, ENT-TEXTILE-USA

#### 1.2 Entity Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Subko Coffee Pvt Ltd – India", "Textile Corp LLC – UAE"

#### 1.3 Legal Name
- **Field Type:** Text Input
- **Max Length:** 150 characters
- **Required:** Yes
- **Validation:** Must match incorporation documents
- **Sample Values:** "Subko Coffee Private Limited", "Textile Corporation LLC"

#### 1.4 PAN (India)
- **Field Type:** Text Input
- **Format:** AAAAA9999A
- **Length:** 10 characters
- **Required:** Conditional (Yes if Country = India)
- **Validation:** Same as Vendor PAN validation
- **Sample Values:** AABCS1234D

#### 1.5 GSTIN (India)
- **Field Type:** Text Input
- **Format:** 99AAAAA9999A9Z9
- **Length:** 15 characters
- **Required:** Conditional (Yes if Country = India)
- **Validation:** Same as Vendor GSTIN validation
- **Sample Values:** 29AABCS1234D1Z5

#### 1.6 TRN (UAE)
- **Field Type:** Text Input
- **Length:** 15 digits
- **Required:** Conditional (Yes if Country = UAE)
- **Sample Values:** 100123456789012

#### 1.7 Country
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** India, UAE, USA, UK, Singapore
- **Business Rule:** Determines tax fields, currency, compliance requirements

#### 1.8 Base Currency
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** INR, AED, USD, EUR, GBP, SGD
- **Auto-suggested:** Based on country
- **Business Rule:** Default currency for all transactions

#### 1.9 Time Zone
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** 
  - Asia/Kolkata (IST - India)
  - Asia/Dubai (UAE)
  - America/New_York (USA - EST)
  - Europe/London (UK - GMT/BST)
- **Business Rule:** Used for transaction timestamps, due date calculations

#### 1.10 Fiscal Year Start
- **Field Type:** Dropdown (Month)
- **Required:** Yes
- **Options:** January, February, March, April, ..., December
- **Default:** 
  - India → April
  - UAE/USA/UK → January
- **Business Rule:** Defines fiscal year for budgets, reports

#### 1.11 Status
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - Active
  - Inactive
- **Default:** Active
- **Business Rule:** Only active entities appear in transaction dropdowns

---

### SECTION 2: REGISTERED ADDRESS

#### 2.1 Address Line 1
- **Field Type:** Textarea
- **Max Length:** 200 characters
- **Required:** Yes
- **Sample Values:** "123, Tech Park, Whitefield"

#### 2.2 Address Line 2
- **Field Type:** Textarea
- **Max Length:** 200 characters
- **Required:** No
- **Sample Values:** "Near ITPL Main Road"

#### 2.3 City
- **Field Type:** Text Input
- **Max Length:** 50 characters
- **Required:** Yes
- **Sample Values:** "Bangalore", "Dubai", "New York"

#### 2.4 State/Emirates
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** Based on country selection
- **Sample Values:** Karnataka, Maharashtra, Dubai, Abu Dhabi

#### 2.5 Postal Code
- **Field Type:** Text Input
- **Required:** Yes
- **Validation:** Country-specific format
- **Sample Values:** 560066, 400001

#### 2.6 Country
- **Field Type:** Display only (from basic info)
- **Auto-populated:** From Section 1

---

### SECTION 3: BANKING DETAILS

#### 3.1 Bank Name
- **Field Type:** Text Input or Dropdown
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "HDFC Bank", "Emirates NBD", "Chase Bank"

#### 3.2 Account Number
- **Field Type:** Text Input (Masked)
- **Max Length:** 20 characters
- **Required:** Yes
- **Security:** Masked display

#### 3.3 IFSC Code (India) / Swift Code (International)
- **Field Type:** Text Input
- **Required:** Yes
- **Validation:** Format validation
- **Sample Values:** HDFC0001234, HDFCINBB

#### 3.4 Branch
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Bangalore MG Road Branch"

---

### SECTION 4: COMPLIANCE SETTINGS

#### 4.1 TDS Deduction Required
- **Field Type:** Checkbox
- **Default:** Checked (for India)
- **Business Rule:** Enables TDS calculation on invoices

#### 4.2 GST Registration Type (India)
- **Field Type:** Dropdown
- **Required:** Conditional
- **Options:**
  - Regular
  - Composition
  - Exempted
- **Business Rule:** Affects GST calculation methods

#### 4.3 MSME Payment Compliance
- **Field Type:** Checkbox
- **Default:** Checked (for India)
- **Business Rule:** Enforces 45-day payment rule for MSME vendors

---

### SECTION 5: INTEGRATION SETTINGS

#### 5.1 ERP System
- **Field Type:** Dropdown
- **Options:** SAP, Oracle, Tally, QuickBooks, None
- **Business Rule:** Determines integration endpoints

#### 5.2 ERP Entity Code
- **Field Type:** Text Input
- **Max Length:** 20 characters
- **Required:** Conditional (if ERP System ≠ None)
- **Sample Values:** 1000, COMP01

#### 5.3 Bank Integration Enabled
- **Field Type:** Checkbox
- **Business Rule:** Enables real-time balance checks, payment status

---

### FORM ACTIONS & WORKFLOW

*(Same as Vendor Master)*

---

### SAMPLE DATA

```json
{
  "entityCode": "ENT-SUBKO-IN",
  "entityName": "Subko Coffee Pvt Ltd – India",
  "legalName": "Subko Coffee Private Limited",
  "pan": "AABCS1234D",
  "gstin": "29AABCS1234D1Z5",
  "country": "India",
  "baseCurrency": "INR",
  "timeZone": "Asia/Kolkata",
  "fiscalYearStart": "April",
  "status": "Active",
  "registeredAddress": {
    "addressLine1": "123, Coffee Estate Road",
    "city": "Bangalore",
    "state": "Karnataka",
    "postalCode": "560001",
    "country": "India"
  },
  "banking": {
    "bankName": "HDFC Bank",
    "accountNumber": "1234567890",
    "ifscCode": "HDFC0001234",
    "branch": "Bangalore Main"
  },
  "workflowStatus": "Approved"
}
```

---

## 4️⃣ UOM MASTER

### Form Layout
**Route:** `/masters/uom/create`  
**Access:** All users with master data access  
**Approval Required:** Yes (simple approval)

---

### FIELDS

#### 4.1 UOM Code
- **Field Type:** Text Input
- **Max Length:** 10 characters
- **Required:** Yes
- **Validation:** Unique, uppercase
- **Sample Values:** KG, PCS, MTR, LTR, HRS

#### 4.2 UOM Name
- **Field Type:** Text Input
- **Max Length:** 50 characters
- **Required:** Yes
- **Sample Values:** "Kilogram", "Pieces", "Meters", "Liters", "Hours"

#### 4.3 Description
- **Field Type:** Textarea
- **Max Length:** 200 characters
- **Required:** No
- **Sample Values:** "Standard unit for measuring weight in kilograms"

#### 4.4 UOM Type
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:**
  - Weight (Kg, g, ton)
  - Length (m, cm, km)
  - Volume (L, ml)
  - Quantity (Pcs, Nos, Sets)
  - Time (Hrs, Days, Months)
  - Area (Sqm, Sqft)
- **Business Rule:** Helps in unit conversion

#### 4.5 Status
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** Active, Inactive
- **Default:** Active

---

### SAMPLE DATA

```json
{
  "uomCode": "KG",
  "uomName": "Kilogram",
  "description": "Standard unit for measuring weight",
  "uomType": "Weight",
  "status": "Active"
}
```

---

## 5️⃣ COST CENTRE MASTER

### Form Layout
**Route:** `/masters/cost-centres/create`  
**Access:** Finance team, Controllers  
**Approval Required:** Yes

---

### FIELDS

#### 5.1 Cost Centre Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `CC-XXXXX`
- **Required:** Yes
- **Sample Values:** CC-00001, CC-PROD-BLR

#### 5.2 Cost Centre Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Production - Bangalore", "Marketing - Mumbai", "IT Department"

#### 5.3 Description
- **Field Type:** Textarea
- **Max Length:** 500 characters
- **Required:** No

#### 5.4 Department
- **Field Type:** Dropdown (from Department Master)
- **Required:** Yes
- **Options:** Production, Marketing, Sales, IT, Admin, HR, Finance

#### 5.5 Entity
- **Field Type:** Dropdown (from Entity Master)
- **Required:** Yes
- **Business Rule:** Cost centre belongs to specific entity

#### 5.6 Manager
- **Field Type:** Dropdown (from User/Employee Master)
- **Required:** Yes
- **Business Rule:** Cost centre owner for approvals

#### 5.7 Budget Enabled
- **Field Type:** Checkbox
- **Default:** Checked
- **Business Rule:** If enabled, budget checks apply

#### 5.8 Status
- **Field Type:** Dropdown
- **Required:** Yes
- **Options:** Active, Inactive

---

## 6️⃣ PROFIT CENTRE MASTER

Similar structure to Cost Centre Master

---

## 7️⃣ PAYMENT TERMS MASTER

### FIELDS

#### 7.1 Payment Term Code
- **Field Type:** Text Input
- **Max Length:** 20 characters
- **Required:** Yes
- **Sample Values:** NET30, NET45, ADVANCE, COD

#### 7.2 Description
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Net 30 days", "Payment due in 30 days from invoice date"

#### 7.3 Credit Days
- **Field Type:** Number Input
- **Required:** Yes
- **Min:** 0
- **Max:** 365
- **Sample Values:** 0, 15, 30, 45, 60

#### 7.4 Discount Days
- **Field Type:** Number Input
- **Required:** No
- **Min:** 0
- **Business Rule:** Early payment discount window (e.g., 2/10 Net 30 = 2% discount if paid within 10 days)

#### 7.5 Discount Percentage
- **Field Type:** Number Input (Percentage)
- **Required:** Conditional (if Discount Days > 0)
- **Min:** 0
- **Max:** 100
- **Decimal:** 2 places

#### 7.6 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 8️⃣ DEPARTMENT MASTER

### FIELDS

#### 8.1 Department Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `DEPT-XXXXX`
- **Sample Values:** DEPT-00001, DEPT-IT, DEPT-FIN

#### 8.2 Department Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Information Technology", "Finance & Accounts", "Human Resources"

#### 8.3 Description
- **Field Type:** Textarea

#### 8.4 Head of Department (HOD)
- **Field Type:** Dropdown (from User Master)
- **Required:** Yes

#### 8.5 Entity
- **Field Type:** Dropdown
- **Required:** Yes

#### 8.6 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 9️⃣ ITEM CATEGORY MASTER

### FIELDS

#### 9.1 Category Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `CAT-XXXXX`
- **Sample Values:** CAT-00001, CAT-RM, CAT-FG

#### 9.2 Category Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Raw Materials", "Finished Goods", "Packaging Materials"

#### 9.3 Description
- **Field Type:** Textarea

#### 9.4 Parent Category
- **Field Type:** Dropdown (from same master)
- **Required:** No
- **Business Rule:** Enables hierarchical category structure

#### 9.5 Default GL Account
- **Field Type:** Dropdown (from GL Account Master)
- **Required:** Yes

#### 9.6 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 🔟 DEBIT NOTE REASON MASTER

### FIELDS

#### 10.1 Reason Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `DN-REASON-XXXXX`
- **Sample Values:** DN-REASON-00001, DN-SHORT-SUPPLY

#### 10.2 Reason Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** 
  - "Short Supply"
  - "Quality Issue"
  - "Price Difference"
  - "Return of Materials"
  - "Service Not Rendered"

#### 10.3 Description
- **Field Type:** Textarea
- **Max Length:** 500 characters
- **Required:** No

#### 10.4 Reason Category
- **Field Type:** Dropdown
- **Options:**
  - Quantity Variance
  - Quality Issue
  - Pricing Error
  - Return
  - Service Deficiency

#### 10.5 Requires Approval
- **Field Type:** Checkbox
- **Default:** Checked
- **Business Rule:** If checked, debit notes with this reason need approval

#### 10.6 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 1️⃣1️⃣ BANK ACCOUNT MASTER (Entity)

### FIELDS

#### 11.1 Bank Account Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `BANK-XXXXX`

#### 11.2 Entity
- **Field Type:** Dropdown
- **Required:** Yes

#### 11.3 Bank Name
- **Field Type:** Text Input
- **Required:** Yes

#### 11.4 Account Number
- **Field Type:** Text Input (Masked)
- **Required:** Yes

#### 11.5 IFSC/Swift Code
- **Field Type:** Text Input
- **Required:** Yes

#### 11.6 Account Type
- **Field Type:** Dropdown
- **Options:** Current, Savings, Overdraft, Cash Credit

#### 11.7 Currency
- **Field Type:** Dropdown
- **Required:** Yes

#### 11.8 Is Default
- **Field Type:** Checkbox
- **Business Rule:** Default account for payments

#### 11.9 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 1️⃣2️⃣ TAX CODE MASTER

### FIELDS

#### 12.1 Tax Code
- **Field Type:** Text Input
- **Max Length:** 20 characters
- **Sample Values:** GST-18, VAT-5, IGST-12

#### 12.2 Tax Name
- **Field Type:** Text Input
- **Sample Values:** "GST @ 18%", "VAT @ 5%"

#### 12.3 Tax Type
- **Field Type:** Dropdown
- **Options:** GST, IGST, CGST, SGST, VAT, Customs Duty, Withholding Tax

#### 12.4 Tax Rate
- **Field Type:** Number (Percentage)
- **Required:** Yes
- **Decimal:** 2 places

#### 12.5 Applicable Country
- **Field Type:** Dropdown
- **Required:** Yes

#### 12.6 Valid From
- **Field Type:** Date
- **Required:** Yes

#### 12.7 Valid Till
- **Field Type:** Date
- **Required:** No

#### 12.8 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 1️⃣3️⃣ GL ACCOUNT MASTER

### FIELDS

#### 13.1 Account Code
- **Field Type:** Text Input
- **Format:** 4-6 digit code
- **Sample Values:** 5100, 6200, 7100

#### 13.2 Account Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes
- **Sample Values:** "Raw Material Purchases", "Professional Fees", "Capital Expenditure"

#### 13.3 Account Type
- **Field Type:** Dropdown
- **Options:** Asset, Liability, Equity, Revenue, Expense

#### 13.4 Parent Account
- **Field Type:** Dropdown (hierarchical)
- **Required:** No

#### 13.5 Currency
- **Field Type:** Dropdown
- **Required:** Yes

#### 13.6 Cost Centre Mandatory
- **Field Type:** Checkbox
- **Business Rule:** If checked, cost centre is mandatory in transactions

#### 13.7 Status
- **Field Type:** Dropdown
- **Options:** Active, Inactive

---

## 1️⃣4️⃣ PROJECT MASTER

### FIELDS

#### 14.1 Project Code
- **Field Type:** Text Input (Auto-generated)
- **Format:** `PROJ-XXXXX`

#### 14.2 Project Name
- **Field Type:** Text Input
- **Max Length:** 100 characters
- **Required:** Yes

#### 14.3 Description
- **Field Type:** Textarea

#### 14.4 Entity
- **Field Type:** Dropdown
- **Required:** Yes

#### 14.5 Project Manager
- **Field Type:** Dropdown (from User Master)

#### 14.6 Start Date
- **Field Type:** Date
- **Required:** Yes

#### 14.7 End Date
- **Field Type:** Date
- **Required:** Yes

#### 14.8 Budget
- **Field Type:** Number (Currency)
- **Required:** No

#### 14.9 Status
- **Field Type:** Dropdown
- **Options:** Active, On Hold, Completed, Cancelled

---

## 📊 MASTER DATA RELATIONSHIPS

### Dependency Matrix

```
Entity Master
  ↓
  ├── Vendor Master (Many-to-Many)
  ├── Cost Centre Master (One-to-Many)
  ├── Department Master (One-to-Many)
  ├── GL Account Master (One-to-Many)
  └── Bank Account Master (One-to-Many)

Vendor Master
  ↓
  ├── Bank Accounts (One-to-Many)
  ├── Addresses (One-to-Many)
  ├── Payment Terms (Many-to-One)
  └── Entity (Many-to-Many)

Item Master
  ↓
  ├── Item Category (Many-to-One)
  ├── UOM (Many-to-One)
  ├── GL Account (Many-to-One)
  └── Cost Centre (Many-to-One)

Department Master
  ↓
  ├── Entity (Many-to-One)
  └── Cost Centre (One-to-Many)

Cost Centre Master
  ↓
  ├── Entity (Many-to-One)
  └── Department (Many-to-One)
```

---

## 🎯 COMMON BUSINESS RULES

### 1. Workflow Approval Rules
- **Creation** → Draft → Submit → Pending Approval → Approved/Rejected
- **Modification** → Modification Pending → Approved/Rejected
- **Deletion** → Not allowed if used in approved transactions
- **Deactivation** → Requires approval, reason mandatory

### 2. Data Validation Rules
- **Uniqueness:** Code fields must be unique
- **Format Validation:** PAN, GSTIN, IFSC follow prescribed formats
- **Cross-Field Validation:** GSTIN state must match address state
- **Business Logic Validation:** MSME payment terms ≤ 45 days

### 3. Security & Access Control
- **Role-Based Access:** Different roles for create, view, approve
- **Entity-Level Security:** Users see only their entity's masters
- **Field-Level Security:** Sensitive fields (bank account) masked
- **Audit Trail:** All changes logged with user and timestamp

### 4. Integration Points
- **ERP Systems:** SAP, Oracle, Tally integration
- **Government Portals:** PAN verification, GSTIN validation
- **Banking:** IFSC lookup, penny drop verification
- **Email/SMS:** Approval notifications, alerts

---

## 📈 SUMMARY STATISTICS

| Master | Approx. Fields | Complexity | Approval Level |
|--------|---------------|------------|----------------|
| Vendor Master | 84 | High | Manager |
| Item Master | 18 | Medium | Manager |
| Entity Master | 30 | High | CFO |
| UOM Master | 6 | Low | Coordinator |
| Cost Centre Master | 10 | Medium | Controller |
| Profit Centre Master | 8 | Medium | Controller |
| Payment Terms Master | 7 | Low | Manager |
| Department Master | 8 | Low | Manager |
| Item Category Master | 7 | Low | Coordinator |
| Debit Note Reason Master | 6 | Low | Coordinator |
| Bank Account Master | 10 | Medium | Controller |
| Tax Code Master | 10 | Medium | Finance Manager |
| GL Account Master | 9 | Medium | Controller |
| Project Master | 11 | Medium | Manager |

**Total Master Forms:** 14  
**Total Fields:** 220+  
**Approval Required:** All masters  
**Multi-Entity Support:** Yes

---

**Document Version:** 1.0  
**Last Updated:** December 23, 2024  
**Maintained By:** System Administrator
