-- CreateTable
CREATE TABLE `tenants` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `gstin` VARCHAR(191) NULL,
    `pan` VARCHAR(191) NULL,
    `plan` VARCHAR(191) NOT NULL DEFAULT 'TRIAL',
    `trialExpiresAt` DATETIME(3) NULL,
    `maxEntities` INTEGER NOT NULL DEFAULT 1,
    `maxUsers` INTEGER NOT NULL DEFAULT 5,
    `maxStorageMb` INTEGER NOT NULL DEFAULT 5120,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenants_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'ADMIN', 'AP_MANAGER', 'APPROVER_L1', 'APPROVER_L2', 'APPROVER_L3', 'AP_CLERK', 'CFO', 'MD', 'FINANCE_MANAGER', 'PROCUREMENT_HEAD', 'DEPT_HEAD', 'USER', 'VIEWER') NOT NULL DEFAULT 'USER',
    `additionalRoles` JSON NULL,
    `departmentId` VARCHAR(191) NULL,
    `employeeId` VARCHAR(191) NULL,
    `profilePhoto` VARCHAR(191) NULL,
    `mustResetPassword` BOOLEAN NOT NULL DEFAULT true,
    `emailNotifications` BOOLEAN NOT NULL DEFAULT true,
    `inAppNotifications` BOOLEAN NOT NULL DEFAULT true,
    `dailyDigest` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `users_tenantId_isActive_idx`(`tenantId`, `isActive`),
    INDEX `users_tenantId_status_idx`(`tenantId`, `status`),
    UNIQUE INDEX `users_tenantId_email_key`(`tenantId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_entity_access` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `roleOverride` VARCHAR(191) NULL,
    `canApprove` BOOLEAN NOT NULL DEFAULT false,
    `approvalLimit` DECIMAL(15, 2) NULL,
    `canCreatePO` BOOLEAN NOT NULL DEFAULT false,
    `canCreateInvoice` BOOLEAN NOT NULL DEFAULT true,
    `canViewOnly` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `user_entity_access_userId_entityId_key`(`userId`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_privileges` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `roleCode` VARCHAR(191) NOT NULL,
    `roleName` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `permissions` JSON NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `role_privileges_tenantId_roleCode_key`(`tenantId`, `roleCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_entity_roles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `roleCode` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `user_entity_roles_userId_entityId_roleCode_key`(`userId`, `entityId`, `roleCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `vendorCode` VARCHAR(191) NOT NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NULL,
    `gstin` VARCHAR(191) NULL,
    `pan` VARCHAR(191) NOT NULL,
    `vendorType` ENUM('SUPPLIER', 'SERVICE_PROVIDER', 'CONTRACTOR', 'EMPLOYEE', 'INTERCOMPANY') NOT NULL DEFAULT 'SUPPLIER',
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `bankAccountNo` VARCHAR(191) NULL,
    `ifscCode` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `paymentTerms` INTEGER NOT NULL DEFAULT 30,
    `tdsApplicable` BOOLEAN NOT NULL DEFAULT false,
    `tdsSectionCode` VARCHAR(191) NULL,
    `panCompliance` ENUM('COMPLIANT', 'NON_FILER', 'LOWER_DEDUCTION', 'EXEMPTED') NOT NULL DEFAULT 'COMPLIANT',
    `status` ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'BLOCKED', 'PENDING_APPROVAL', 'REJECTED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `cin` VARCHAR(191) NULL,
    `kycCinStatus` VARCHAR(191) NULL,
    `kycCinCompanyName` VARCHAR(191) NULL,
    `kycCinDateOfReg` VARCHAR(191) NULL,
    `udyamNumber` VARCHAR(191) NULL,
    `msmeRegistered` BOOLEAN NOT NULL DEFAULT false,
    `kycMsmeStatus` VARCHAR(191) NULL,
    `kycMsmeCategory` VARCHAR(191) NULL,
    `kycMsmeRegisteredAt` VARCHAR(191) NULL,
    `panEntityType` VARCHAR(191) NULL,
    `aadharNo` VARCHAR(191) NULL,
    `aadharPanLinked` VARCHAR(191) NULL,
    `msmeCategory` VARCHAR(191) NULL,
    `llpRegNo` VARCHAR(191) NULL,
    `trustRegNo` VARCHAR(191) NULL,
    `kycPanStatus` VARCHAR(191) NULL,
    `kycPanName` VARCHAR(191) NULL,
    `kycGstStatus` VARCHAR(191) NULL,
    `kycGstName` VARCHAR(191) NULL,
    `kycBankStatus` VARCHAR(191) NULL,
    `kycBankAccountName` VARCHAR(191) NULL,
    `kycBankNameMatchScore` INTEGER NULL,
    `kycBankNameMatch` BOOLEAN NULL,
    `kycBankNameMatchedAt` DATETIME(3) NULL,
    `kycLastCheckedAt` DATETIME(3) NULL,
    `gstComplianceScore` INTEGER NULL,
    `einvoiceRequired` BOOLEAN NOT NULL DEFAULT false,
    `itcRisk` VARCHAR(191) NULL,
    `is206ABApplicable` BOOLEAN NOT NULL DEFAULT false,
    `section206ABRate` DECIMAL(5, 2) NULL,
    `section206ABReason` VARCHAR(191) NULL,
    `lastItrFiledYear` VARCHAR(191) NULL,
    `section206ABCheckedAt` DATETIME(3) NULL,
    `gstr1LastFiledPeriod` VARCHAR(191) NULL,
    `gstr1LastFiledDate` VARCHAR(191) NULL,
    `gstr3bLastFiledPeriod` VARCHAR(191) NULL,
    `gstr3bLastFiledDate` VARCHAR(191) NULL,
    `gstReturnRisk` VARCHAR(191) NULL,
    `gstReturnCheckedAt` DATETIME(3) NULL,
    `complianceCheckedAt` DATETIME(3) NULL,
    `transbnkBeneficiaryId` VARCHAR(191) NULL,
    `transbnkRegisteredAt` DATETIME(3) NULL,
    `vendorCategoryId` VARCHAR(191) NULL,
    `vendorGroupId` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `taxRegimeCode` VARCHAR(191) NULL,
    `tan` VARCHAR(191) NULL,
    `tdsSectionId` VARCHAR(191) NULL,
    `tdsRate` DECIMAL(5, 2) NULL,
    `tdsExempt` BOOLEAN NOT NULL DEFAULT false,
    `lowerTdsCertNo` VARCHAR(191) NULL,
    `lowerTdsSection` VARCHAR(191) NULL,
    `lowerTdsRate` DECIMAL(5, 2) NULL,
    `lowerTdsValidFrom` DATETIME(3) NULL,
    `lowerTdsValidTo` DATETIME(3) NULL,
    `lowerTdsAlertDays` INTEGER NOT NULL DEFAULT 30,
    `vatNumber` VARCHAR(191) NULL,
    `whtRegistration` VARCHAR(191) NULL,
    `localTaxId` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `addressLine2` VARCHAR(191) NULL,
    `stateCode` VARCHAR(191) NULL,
    `contactName` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `paymentCurrency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `paymentMode` VARCHAR(191) NOT NULL DEFAULT 'NEFT',
    `erpVendorCode` VARCHAR(191) NULL,
    `erpSystem` VARCHAR(191) NULL,
    `erpSyncStatus` VARCHAR(191) NULL,
    `erpSyncedAt` DATETIME(3) NULL,
    `erpSyncError` VARCHAR(191) NULL,
    `invitationId` VARCHAR(191) NULL,
    `kycLastRunAt` DATETIME(3) NULL,

    INDEX `vendors_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt` DESC),
    UNIQUE INDEX `vendors_tenantId_gstin_key`(`tenantId`, `gstin`),
    UNIQUE INDEX `vendors_tenantId_vendorCode_key`(`tenantId`, `vendorCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `departments_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gl_codes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountType` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `gl_codes_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cost_centres` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cost_centres_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_codes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `cgstRate` DECIMAL(5, 2) NOT NULL,
    `sgstRate` DECIMAL(5, 2) NOT NULL,
    `igstRate` DECIMAL(5, 2) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `tax_codes_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `invoiceNumber` VARCHAR(191) NOT NULL,
    `invoiceRef` VARCHAR(191) NULL,
    `invoiceDate` DATE NOT NULL,
    `dueDate` DATE NULL,
    `vendorId` VARCHAR(191) NULL,
    `vendorGSTIN` VARCHAR(191) NULL,
    `vendorPAN` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `billToLocationId` VARCHAR(191) NULL,
    `channelType` VARCHAR(191) NOT NULL DEFAULT 'MANUAL_UPLOAD',
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `apLane` VARCHAR(191) NULL,
    `matchScore` INTEGER NULL,
    `matchLane` VARCHAR(191) NULL,
    `isPOInvoice` BOOLEAN NOT NULL DEFAULT false,
    `poRef` VARCHAR(191) NULL,
    `grnRef` VARCHAR(191) NULL,
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `cgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `igstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `tdsAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `netPayable` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `exchangeRate` DECIMAL(18, 8) NULL,
    `irnNumber` VARCHAR(191) NULL,
    `irnVerified` BOOLEAN NOT NULL DEFAULT false,
    `ocrConfidence` INTEGER NULL,
    `ocrRawData` JSON NULL,
    `ocrConfidenceMap` JSON NULL,
    `validationIssues` JSON NULL,
    `reviewFlags` JSON NULL,
    `vendorMatchSuggestion` JSON NULL,
    `recommendedAction` VARCHAR(191) NULL DEFAULT 'needs_review',
    `llmScoredAt` DATETIME(3) NULL,
    `duplicateFlag` VARCHAR(191) NULL,
    `duplicateMatches` JSON NULL,
    `fileUrl` TEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `narration` TEXT NULL,
    `periodFrom` DATE NULL,
    `periodTo` DATE NULL,
    `vendorMatchMethod` VARCHAR(191) NULL,
    `retentionRequired` BOOLEAN NOT NULL DEFAULT false,
    `retentionAmount` DECIMAL(15, 2) NULL,
    `retentionGlCodeId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `paidAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'UNPAID',
    `msmePaymentDue` DATE NULL,
    `msmeDaysRemaining` INTEGER NULL,
    `msmeBreach` BOOLEAN NOT NULL DEFAULT false,
    `msmeInterest` DECIMAL(15, 2) NULL,
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `urgentReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `matchType` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `glCodeId` VARCHAR(191) NULL,

    INDEX `invoices_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `invoices_tenantId_vendorId_idx`(`tenantId`, `vendorId`),
    UNIQUE INDEX `invoices_tenantId_invoiceNumber_vendorId_key`(`tenantId`, `invoiceNumber`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_lines` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `lineNumber` INTEGER NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `itemCode` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(15, 4) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(15, 4) NOT NULL,
    `discountPct` DECIMAL(5, 2) NULL,
    `discountAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxableAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `gstRate` DECIMAL(5, 2) NULL,
    `cgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `igstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `tdsRate` DECIMAL(5, 2) NULL,
    `tdsAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `rcmApplicable` BOOLEAN NOT NULL DEFAULT false,
    `hsnCode` VARCHAR(191) NULL,
    `sacCode` VARCHAR(191) NULL,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `lineTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,

    INDEX `invoice_lines_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `userName` VARCHAR(191) NULL,
    `details` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_audit_logs_invoiceId_idx`(`invoiceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `paymentRef` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `paymentDate` DATE NULL,
    `paymentMode` ENUM('NEFT', 'RTGS', 'IMPS', 'CHEQUE', 'CASH', 'UPI', 'WIRE') NOT NULL DEFAULT 'NEFT',
    `bankRefNumber` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED') NOT NULL DEFAULT 'PENDING',
    `narration` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `transbnkTransactionId` VARCHAR(191) NULL,
    `transbnkUtr` VARCHAR(191) NULL,
    `transbnkRawStatus` VARCHAR(191) NULL,
    `transbnkInitiatedAt` DATETIME(3) NULL,
    `transbnkCompletedAt` DATETIME(3) NULL,
    `transbnkFailureReason` VARCHAR(191) NULL,

    INDEX `payments_tenantId_status_createdAt_idx`(`tenantId`, `status`, `createdAt` DESC),
    INDEX `payments_tenantId_vendorId_idx`(`tenantId`, `vendorId`),
    UNIQUE INDEX `payments_tenantId_paymentRef_key`(`tenantId`, `paymentRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_instances` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'IN_PROGRESS',
    `currentStageOrder` INTEGER NOT NULL DEFAULT 1,
    `onHoldReason` VARCHAR(191) NULL,
    `onHoldBy` VARCHAR(191) NULL,
    `onHoldAt` DATETIME(3) NULL,
    `releasedBy` VARCHAR(191) NULL,
    `releasedAt` DATETIME(3) NULL,
    `releaseRemarks` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workflow_instances_tenantId_entityType_entityId_idx`(`tenantId`, `entityType`, `entityId`),
    INDEX `workflow_instances_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `approval_steps` (
    `id` VARCHAR(191) NOT NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `invoiceId` VARCHAR(191) NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `approverId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'DELEGATED', 'ESCALATED') NOT NULL DEFAULT 'PENDING',
    `comments` TEXT NULL,
    `actionAt` DATETIME(3) NULL,
    `delegatedTo` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `approval_steps_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `approval_steps_approverId_status_idx`(`approverId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_tenantId_entityType_entityId_idx`(`tenantId`, `entityType`, `entityId`),
    INDEX `audit_logs_tenantId_createdAt_idx`(`tenantId`, `createdAt` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_ingestion_jobs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `channelType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'QUEUED',
    `rawFileUrl` TEXT NULL,
    `rawFileBase64` LONGTEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `mimeType` VARCHAR(191) NULL,
    `emailFrom` VARCHAR(191) NULL,
    `emailSubject` VARCHAR(191) NULL,
    `extractedData` JSON NULL,
    `errorMessage` TEXT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `ocrJobId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `invoice_ingestion_jobs_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `invoice_ingestion_jobs_tenantId_channelType_idx`(`tenantId`, `channelType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_match_scores` (
    `id` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `vendorScore` INTEGER NOT NULL DEFAULT 0,
    `poScore` INTEGER NOT NULL DEFAULT 0,
    `amountScore` INTEGER NOT NULL DEFAULT 0,
    `grnScore` INTEGER NOT NULL DEFAULT 0,
    `gstScore` INTEGER NOT NULL DEFAULT 0,
    `ocrScore` INTEGER NOT NULL DEFAULT 0,
    `totalScore` INTEGER NOT NULL DEFAULT 0,
    `lane` VARCHAR(191) NOT NULL,
    `isPOInvoice` BOOLEAN NOT NULL DEFAULT false,
    `guardrailsTriggered` JSON NULL,
    `scoreBreakdown` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoice_match_scores_invoiceId_key`(`invoiceId`),
    INDEX `invoice_match_scores_tenantId_idx`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `countries` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `isoCode3` VARCHAR(191) NULL,
    `localName` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `dialCode` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `countries_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `states` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `gstCode` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `states_code_countryCode_key`(`code`, `countryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stateCode` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `isCapital` BOOLEAN NOT NULL DEFAULT false,
    `isMetro` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `cities_name_stateCode_key`(`name`, `stateCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fx_rates` (
    `id` VARCHAR(191) NOT NULL,
    `fromCurrency` VARCHAR(191) NOT NULL,
    `toCurrency` VARCHAR(191) NOT NULL,
    `rate` DECIMAL(18, 8) NOT NULL,
    `effectiveDate` DATE NOT NULL,
    `expiryDate` DATE NULL,
    `source` VARCHAR(191) NOT NULL DEFAULT 'MANUAL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `fx_rates_fromCurrency_toCurrency_effectiveDate_idx`(`fromCurrency`, `toCurrency`, `effectiveDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `designations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `designations_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entities` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `entityType` VARCHAR(191) NULL DEFAULT 'SUBSIDIARY',
    `cinNumber` VARCHAR(191) NULL,
    `incorporationDate` DATE NULL,
    `website` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `gstin` VARCHAR(191) NULL,
    `pan` VARCHAR(191) NULL,
    `tan` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `taxRegimeId` VARCHAR(191) NULL,
    `vatNumber` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `baseCurrencyCode` VARCHAR(191) NULL DEFAULT 'INR',
    `currentFyId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `entities_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `locations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `addressLine1` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `state` VARCHAR(191) NULL,
    `pincode` VARCHAR(191) NULL,
    `locationType` VARCHAR(191) NULL,
    `spocName` VARCHAR(191) NULL,
    `spocEmail` VARCHAR(191) NULL,
    `spocMobile` VARCHAR(191) NULL,
    `spocDescription` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `locations_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `currencies` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `symbol` VARCHAR(191) NOT NULL,
    `exchangeRate` DECIMAL(12, 6) NOT NULL DEFAULT 1,
    `isBase` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `currencies_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_years` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `isCurrent` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `financial_years_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holiday_calendars` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `holiday_calendars_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `holidays` (
    `id` VARCHAR(191) NOT NULL,
    `calendarId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'PUBLIC',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tax_regimes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL DEFAULT 'IN',
    `regimeType` VARCHAR(191) NOT NULL DEFAULT 'GST',
    `requiresGstin` BOOLEAN NOT NULL DEFAULT false,
    `requiresVat` BOOLEAN NOT NULL DEFAULT false,
    `requiresPan` BOOLEAN NOT NULL DEFAULT false,
    `tdsApplicable` BOOLEAN NOT NULL DEFAULT false,
    `vatRate` DECIMAL(5, 2) NULL,
    `withholdingRate` DECIMAL(5, 2) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `effectiveFrom` DATE NULL,
    `effectiveTo` DATE NULL,
    `einvoicingRequired` BOOLEAN NOT NULL DEFAULT false,
    `einvoicingProvider` VARCHAR(191) NULL,
    `einvoicingThreshold` DECIMAL(15, 2) NULL,
    `einvoicingFormat` VARCHAR(191) NULL,
    `placeOfSupplyRuleSet` VARCHAR(191) NULL,
    `kycFieldSchema` JSON NULL,
    `taxTypes` JSON NULL,

    UNIQUE INDEX `tax_regimes_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_rules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `amountFrom` DECIMAL(15, 2) NULL,
    `amountTo` DECIMAL(15, 2) NULL,
    `levels` INTEGER NOT NULL DEFAULT 1,
    `approverL1` VARCHAR(191) NULL,
    `approverL2` VARCHAR(191) NULL,
    `approverL3` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `workflow_rules_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `gender` VARCHAR(191) NULL,
    `dateOfBirth` DATE NULL,
    `bloodGroup` VARCHAR(191) NULL,
    `employeeCategory` VARCHAR(191) NULL DEFAULT 'ON_ROLL',
    `entityId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `designationId` VARCHAR(191) NULL,
    `locationId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `managerId` VARCHAR(191) NULL,
    `systemRole` VARCHAR(191) NULL DEFAULT 'USER',
    `userId` VARCHAR(191) NULL,
    `joiningDate` DATE NULL,
    `confirmationDate` DATE NULL,
    `resignationDate` DATE NULL,
    `lastWorkingDate` DATE NULL,
    `pan` VARCHAR(191) NULL,
    `aadhaarNo` VARCHAR(191) NULL,
    `pfAccountNo` VARCHAR(191) NULL,
    `esiNo` VARCHAR(191) NULL,
    `bankAccountNo` VARCHAR(191) NULL,
    `ifsc` VARCHAR(191) NULL,
    `bankName` VARCHAR(191) NULL,
    `emergencyName` VARCHAR(191) NULL,
    `emergencyPhone` VARCHAR(191) NULL,
    `emergencyRelation` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `approvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employees_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_definitions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `module` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workflow_definitions_tenantId_module_idx`(`tenantId`, `module`),
    UNIQUE INDEX `workflow_definitions_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_definition_stages` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `approverType` VARCHAR(191) NOT NULL DEFAULT 'ROLE',
    `approverRole` VARCHAR(191) NULL,
    `approverUserId` VARCHAR(191) NULL,
    `slaHours` INTEGER NULL,
    `escalateToRole` VARCHAR(191) NULL,
    `autoApproveBelow` DECIMAL(15, 2) NULL,
    `allowDelegation` BOOLEAN NOT NULL DEFAULT false,
    `requiresComment` BOOLEAN NOT NULL DEFAULT false,
    `onReject` VARCHAR(191) NOT NULL DEFAULT 'RETURN_TO_DRAFT',

    INDEX `workflow_definition_stages_definitionId_idx`(`definitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_definition_conditions` (
    `id` VARCHAR(191) NOT NULL,
    `definitionId` VARCHAR(191) NOT NULL,
    `field` VARCHAR(191) NOT NULL,
    `operator` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `logicGroup` VARCHAR(191) NOT NULL DEFAULT 'AND',

    INDEX `workflow_definition_conditions_definitionId_idx`(`definitionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_instance_stages` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `stageOrder` INTEGER NOT NULL,
    `stageName` VARCHAR(191) NOT NULL,
    `approverRole` VARCHAR(191) NULL,
    `assignedTo` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `comments` TEXT NULL,
    `actionAt` DATETIME(3) NULL,
    `actionBy` VARCHAR(191) NULL,
    `slaDeadline` DATETIME(3) NULL,
    `escalatedAt` DATETIME(3) NULL,
    `escalatedTo` VARCHAR(191) NULL,
    `delegatedTo` VARCHAR(191) NULL,
    `rejectionMode` VARCHAR(191) NULL,

    INDEX `workflow_instance_stages_instanceId_idx`(`instanceId`),
    INDEX `workflow_instance_stages_tenantId_assignedTo_status_idx`(`tenantId`, `assignedTo`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_chats` (
    `id` VARCHAR(191) NOT NULL,
    `instanceId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `senderName` VARCHAR(191) NOT NULL,
    `senderRole` VARCHAR(191) NULL,
    `message` TEXT NOT NULL,
    `messageType` VARCHAR(191) NOT NULL DEFAULT 'COMMENT',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `workflow_chats_instanceId_idx`(`instanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workflow_attachments` (
    `id` VARCHAR(191) NOT NULL,
    `chatId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_categories` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_categories_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_groups` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_groups_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profit_centres` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `glCodeId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `profit_centres_tenantId_entityId_idx`(`tenantId`, `entityId`),
    UNIQUE INDEX `profit_centres_tenantId_entityId_code_key`(`tenantId`, `entityId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_gst_registrations` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `stateCode` VARCHAR(191) NOT NULL,
    `gstin` VARCHAR(191) NOT NULL,
    `registrationType` VARCHAR(191) NOT NULL DEFAULT 'REGULAR',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `spocName` VARCHAR(191) NULL,
    `spocEmail` VARCHAR(191) NULL,
    `spocPhone` VARCHAR(191) NULL,
    `kycStatus` VARCHAR(191) NULL,
    `kycVerifiedAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',

    UNIQUE INDEX `vendor_gst_registrations_gstin_key`(`gstin`),
    INDEX `vendor_gst_registrations_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `accountNo` VARCHAR(191) NOT NULL,
    `ifsc` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NULL,
    `branch` VARCHAR(191) NULL,
    `accountType` VARCHAR(191) NOT NULL DEFAULT 'CURRENT',
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `accountHolderName` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `kycStatus` VARCHAR(191) NULL,
    `kycNameMatchScore` INTEGER NULL,
    `kycVerifiedAt` DATETIME(3) NULL,
    `transbnkBeneficiaryId` VARCHAR(191) NULL,
    `transbnkRegisteredAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',

    INDEX `vendor_bank_accounts_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `vendor_bank_accounts_accountNo_ifsc_key`(`accountNo`, `ifsc`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_entity_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `creditLimit` DECIMAL(15, 2) NULL,
    `blockPO` BOOLEAN NOT NULL DEFAULT false,
    `blockPayment` BOOLEAN NOT NULL DEFAULT false,
    `blockReason` VARCHAR(191) NULL,
    `paymentTermsDays` INTEGER NOT NULL DEFAULT 30,
    `paymentMode` VARCHAR(191) NOT NULL DEFAULT 'NEFT',
    `erpVendorCode` VARCHAR(191) NULL,
    `erpSystem` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    INDEX `vendor_entity_mappings_vendorId_idx`(`vendorId`),
    UNIQUE INDEX `vendor_entity_mappings_vendorId_entityId_key`(`vendorId`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_documents` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `docType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` TEXT NOT NULL,
    `mimeType` VARCHAR(191) NULL,
    `fileSize` INTEGER NULL,
    `uploadedBy` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_documents_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NOT NULL,
    `contactName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NULL,
    `vendorType` VARCHAR(191) NULL,
    `vendorCategory` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'INVITED',
    `expiresAt` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NULL,
    `submittedData` JSON NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `vendorId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_invitations_token_key`(`token`),
    INDEX `vendor_invitations_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_modules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `moduleCode` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `enabledAt` DATETIME(3) NULL,
    `enabledBy` VARCHAR(191) NULL,
    `config` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_modules_tenantId_moduleCode_key`(`tenantId`, `moduleCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_features` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `moduleCode` VARCHAR(191) NOT NULL,
    `featureCode` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `enabledAt` DATETIME(3) NULL,
    `enabledBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_features_tenantId_moduleCode_featureCode_key`(`tenantId`, `moduleCode`, `featureCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_sections` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `defaultRate` DECIMAL(5, 2) NULL,
    `applicableTo` VARCHAR(191) NOT NULL DEFAULT 'Both',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tds_sections_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tenant_settings` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `kycEnabled` BOOLEAN NOT NULL DEFAULT true,
    `kycAutoRun` BOOLEAN NOT NULL DEFAULT false,
    `kycMandatoryFields` JSON NOT NULL,
    `panProvider` VARCHAR(191) NOT NULL DEFAULT 'ongrid',
    `gstProvider` VARCHAR(191) NOT NULL DEFAULT 'ongrid',
    `returnsProvider` VARCHAR(191) NOT NULL DEFAULT 'surepass',
    `ab206Provider` VARCHAR(191) NOT NULL DEFAULT 'surepass',
    `bankProvider` VARCHAR(191) NOT NULL DEFAULT 'ongrid',
    `cinProvider` VARCHAR(191) NOT NULL DEFAULT 'ongrid',
    `msmeProvider` VARCHAR(191) NOT NULL DEFAULT 'ongrid',
    `sanctionsProvider` VARCHAR(191) NOT NULL DEFAULT 'surepass',
    `erpSystem` VARCHAR(191) NULL,
    `erpWebhookUrl` VARCHAR(191) NULL,
    `erpAuthType` VARCHAR(191) NULL,
    `erpAuthCredentials` JSON NULL,
    `vendorPortalEnabled` BOOLEAN NOT NULL DEFAULT true,
    `invitationExpiryDays` INTEGER NOT NULL DEFAULT 7,
    `invitationReminderDays` INTEGER NOT NULL DEFAULT 2,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tenant_settings_tenantId_key`(`tenantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_categories` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `item_categories_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_master` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `itemCode` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `itemType` VARCHAR(191) NOT NULL,
    `nature` VARCHAR(191) NULL,
    `expenseType` VARCHAR(191) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `hsnCode` VARCHAR(191) NULL,
    `sacCode` VARCHAR(191) NULL,
    `itemCategoryId` VARCHAR(191) NULL,
    `gstRate` DECIMAL(5, 2) NULL,
    `rcmApplicable` BOOLEAN NOT NULL DEFAULT false,
    `tdsSectionId` VARCHAR(191) NULL,
    `taxCodeId` VARCHAR(191) NULL,
    `poRequired` VARCHAR(191) NOT NULL DEFAULT 'YES',
    `poThresholdAmount` DECIMAL(15, 2) NULL,
    `poAtLocation` BOOLEAN NOT NULL DEFAULT false,
    `threeWayMatch` BOOLEAN NOT NULL DEFAULT true,
    `grnRequired` BOOLEAN NOT NULL DEFAULT true,
    `advanceAllowed` BOOLEAN NOT NULL DEFAULT false,
    `assetCategoryId` VARCHAR(191) NULL,
    `usefulLifeYears` INTEGER NULL,
    `depreciationMethod` VARCHAR(191) NULL,
    `depreciationRate` DECIMAL(5, 2) NULL,
    `residualValuePct` DECIMAL(5, 2) NULL,
    `autoCreateAsset` BOOLEAN NOT NULL DEFAULT false,
    `capitalisationLimit` DECIMAL(15, 2) NULL,
    `autoPostDepreciation` BOOLEAN NOT NULL DEFAULT false,
    `depreciationFrequency` VARCHAR(191) NULL,
    `depreciationStartDate` DATE NULL,
    `provisionRequired` BOOLEAN NOT NULL DEFAULT false,
    `autoPostProvision` BOOLEAN NOT NULL DEFAULT false,
    `provisionFrequency` VARCHAR(191) NULL,
    `provisionBasis` VARCHAR(191) NULL,
    `provisionAmount` DECIMAL(15, 2) NULL,
    `autoReverse` BOOLEAN NOT NULL DEFAULT true,
    `reversalTrigger` VARCHAR(191) NULL,
    `ocrKeywords` TEXT NULL,
    `ocrSynonyms` TEXT NULL,
    `ocrMatchConfidence` INTEGER NOT NULL DEFAULT 80,
    `ocrNegativeKeywords` TEXT NULL,
    `approvedVendorsOnly` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `item_master_tenantId_itemType_expenseType_idx`(`tenantId`, `itemType`, `expenseType`),
    UNIQUE INDEX `item_master_tenantId_itemCode_key`(`tenantId`, `itemCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_master_change_requests` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `changedFields` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING_APPROVAL',
    `workflowInstanceId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewComments` TEXT NULL,

    INDEX `item_master_change_requests_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `item_master_change_requests_tenantId_itemId_idx`(`tenantId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_entity_mappings` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `itemDescription` VARCHAR(191) NULL,
    `expenseGlCodeId` VARCHAR(191) NULL,
    `assetGlCodeId` VARCHAR(191) NULL,
    `depreciationGlCodeId` VARCHAR(191) NULL,
    `accumulatedDepnGlCodeId` VARCHAR(191) NULL,
    `provisionGlCodeId` VARCHAR(191) NULL,
    `provisionExpenseGlCodeId` VARCHAR(191) NULL,
    `rcmGlCodeId` VARCHAR(191) NULL,
    `tdsPayableGlCodeId` VARCHAR(191) NULL,
    `gstItcGlCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `assetCategoryId` VARCHAR(191) NULL,
    `poThresholdOverride` DECIMAL(15, 2) NULL,
    `capitalisationLimitOverride` DECIMAL(15, 2) NULL,
    `provisionAmountOverride` DECIMAL(15, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `item_entity_mappings_itemId_entityId_key`(`itemId`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_approved_vendors` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NOT NULL,

    INDEX `item_approved_vendors_itemId_idx`(`itemId`),
    UNIQUE INDEX `item_approved_vendors_itemId_entityId_vendorId_key`(`itemId`, `entityId`, `vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `recurring_invoice_masters` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `recurringType` VARCHAR(191) NOT NULL DEFAULT 'FIXED',
    `vendorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'MONTHLY',
    `startDate` DATE NOT NULL,
    `endDate` DATE NULL,
    `generationDay` INTEGER NOT NULL DEFAULT 1,
    `advanceDays` INTEGER NOT NULL DEFAULT 3,
    `baseAmount` DECIMAL(15, 2) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `gstApplicable` BOOLEAN NOT NULL DEFAULT false,
    `gstRate` DECIMAL(5, 2) NULL,
    `tdsApplicable` BOOLEAN NOT NULL DEFAULT false,
    `tdsSectionId` VARCHAR(191) NULL,
    `escalationPct` DECIMAL(5, 2) NULL,
    `escalationMonth` INTEGER NULL,
    `bbpsBillerCategory` VARCHAR(191) NULL,
    `bbpsBillerName` VARCHAR(191) NULL,
    `bbpsConsumerNo` VARCHAR(191) NULL,
    `bbpsFetchDays` INTEGER NOT NULL DEFAULT 5,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `provisionGlCodeId` VARCHAR(191) NULL,
    `autoApproveBelow` DECIMAL(15, 2) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastGeneratedAt` DATETIME(3) NULL,
    `nextGenerationAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `recurring_invoice_masters_tenantId_nextGenerationAt_idx`(`tenantId`, `nextGenerationAt`),
    UNIQUE INDEX `recurring_invoice_masters_tenantId_code_key`(`tenantId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_contracts` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `contractRef` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `validFrom` DATE NOT NULL,
    `validTo` DATE NOT NULL,
    `description` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `escalationPct` DECIMAL(5, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rate_contracts_tenantId_contractRef_key`(`tenantId`, `contractRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rate_contract_lines` (
    `id` VARCHAR(191) NOT NULL,
    `contractId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `agreedRate` DECIMAL(15, 4) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `minQty` DECIMAL(15, 4) NULL,
    `maxQty` DECIMAL(15, 4) NULL,
    `utilisedQty` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `utilisedValue` DECIMAL(15, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `budgetRef` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `financialYearId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `periodType` VARCHAR(191) NOT NULL DEFAULT 'ANNUAL',
    `budgetAmount` DECIMAL(15, 2) NOT NULL,
    `revisedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `committedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actualAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `carryForwardAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `toleranceZonePct` DECIMAL(5, 2) NOT NULL DEFAULT 10,
    `hardBlock` BOOLEAN NOT NULL DEFAULT true,
    `exceptionWorkflowId` VARCHAR(191) NULL,
    `carryForward` BOOLEAN NOT NULL DEFAULT false,
    `carryForwardType` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_tenantId_entityId_financialYearId_idx`(`tenantId`, `entityId`, `financialYearId`),
    UNIQUE INDEX `budgets_tenantId_budgetRef_key`(`tenantId`, `budgetRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_periods` (
    `id` VARCHAR(191) NOT NULL,
    `budgetId` VARCHAR(191) NOT NULL,
    `periodLabel` VARCHAR(191) NOT NULL,
    `periodStart` DATE NOT NULL,
    `periodEnd` DATE NOT NULL,
    `allocatedAmount` DECIMAL(15, 2) NOT NULL,
    `committedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `actualAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_revisions` (
    `id` VARCHAR(191) NOT NULL,
    `budgetId` VARCHAR(191) NOT NULL,
    `revisionNo` INTEGER NOT NULL,
    `previousAmount` DECIMAL(15, 2) NOT NULL,
    `revisedAmount` DECIMAL(15, 2) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_requisitions` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `prRef` VARCHAR(191) NOT NULL,
    `prType` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    `requestedBy` VARCHAR(191) NOT NULL,
    `departmentId` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `requiredBy` DATE NOT NULL,
    `justification` TEXT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'NORMAL',
    `estimatedTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `budgetId` VARCHAR(191) NULL,
    `budgetAvailable` DECIMAL(15, 2) NULL,
    `budgetStatus` VARCHAR(191) NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `rejectionReason` VARCHAR(191) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_requisitions_tenantId_status_idx`(`tenantId`, `status`),
    UNIQUE INDEX `purchase_requisitions_tenantId_prRef_key`(`tenantId`, `prRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_requisition_lines` (
    `id` VARCHAR(191) NOT NULL,
    `prId` VARCHAR(191) NOT NULL,
    `lineNo` INTEGER NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `qty` DECIMAL(15, 4) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `estimatedPrice` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `deliveryLocation` VARCHAR(191) NULL,
    `requiredBy` DATE NULL,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `poLineId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `poRef` VARCHAR(191) NOT NULL,
    `poType` VARCHAR(191) NOT NULL DEFAULT 'STANDARD',
    `poDate` DATE NOT NULL,
    `poExpiryDate` DATE NULL,
    `autoExpire` BOOLEAN NOT NULL DEFAULT false,
    `vendorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `shipToLocationId` VARCHAR(191) NULL,
    `billToEntityId` VARCHAR(191) NULL,
    `rateContractId` VARCHAR(191) NULL,
    `blanketPoId` VARCHAR(191) NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `exchangeRate` DECIMAL(18, 8) NULL,
    `paymentTermsDays` INTEGER NOT NULL DEFAULT 30,
    `paymentMode` VARCHAR(191) NOT NULL DEFAULT 'NEFT',
    `deliveryTerms` VARCHAR(191) NULL,
    `warrantyPeriod` VARCHAR(191) NULL,
    `taxType` VARCHAR(191) NOT NULL DEFAULT 'EXCLUSIVE',
    `subtotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `taxAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `tdsAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `consumedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `advanceAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `advancePct` DECIMAL(5, 2) NULL,
    `budgetId` VARCHAR(191) NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `prRefs` JSON NULL,
    `notes` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `rejectionReason` VARCHAR(191) NULL,
    `sentToVendorAt` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `purchase_orders_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `purchase_orders_tenantId_vendorId_idx`(`tenantId`, `vendorId`),
    UNIQUE INDEX `purchase_orders_tenantId_poRef_key`(`tenantId`, `poRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoice_po_links` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `invoiceAmount` DECIMAL(15, 2) NOT NULL,
    `consumptionType` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `invoice_po_links_tenantId_invoiceId_idx`(`tenantId`, `invoiceId`),
    INDEX `invoice_po_links_tenantId_poId_idx`(`tenantId`, `poId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_lines` (
    `id` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `lineNo` INTEGER NOT NULL,
    `prLineId` VARCHAR(191) NULL,
    `itemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `qty` DECIMAL(15, 4) NOT NULL,
    `uom` VARCHAR(191) NULL,
    `unitPrice` DECIMAL(15, 4) NOT NULL,
    `discountPct` DECIMAL(5, 2) NULL,
    `taxType` VARCHAR(191) NOT NULL DEFAULT 'EXCLUSIVE',
    `gstRate` DECIMAL(5, 2) NULL,
    `cgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `sgstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `igstAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `tdsApplicable` BOOLEAN NOT NULL DEFAULT false,
    `tdsRate` DECIMAL(5, 2) NULL,
    `tdsAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `rcmApplicable` BOOLEAN NOT NULL DEFAULT false,
    `hsnCode` VARCHAR(191) NULL,
    `sacCode` VARCHAR(191) NULL,
    `lineTotal` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `shipToLocationId` VARCHAR(191) NULL,
    `deliveryDate` DATE NULL,
    `glCodeId` VARCHAR(191) NULL,
    `costCentreId` VARCHAR(191) NULL,
    `profitCentreId` VARCHAR(191) NULL,
    `toleranceZonePct` DECIMAL(5, 2) NULL,
    `grnQty` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `pendingQty` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `invoicedQty` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `rateContractLineId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `po_payment_milestones` (
    `id` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `milestoneNo` INTEGER NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `pct` DECIMAL(5, 2) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `triggerEvent` VARCHAR(191) NOT NULL DEFAULT 'ON_GRN',
    `dueDate` DATE NULL,
    `isAdvance` BOOLEAN NOT NULL DEFAULT false,
    `advanceAdjusted` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `paidAt` DATETIME(3) NULL,
    `invoiceId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blanket_po_releases` (
    `id` VARCHAR(191) NOT NULL,
    `blanketPoId` VARCHAR(191) NOT NULL,
    `releaseRef` VARCHAR(191) NOT NULL,
    `releaseDate` DATE NOT NULL,
    `releaseAmount` DECIMAL(15, 2) NOT NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipt_notes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `grnRef` VARCHAR(191) NOT NULL,
    `grnDate` DATE NOT NULL,
    `poId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `deliveryLocation` VARCHAR(191) NULL,
    `vehicleNo` VARCHAR(191) NULL,
    `lrNumber` VARCHAR(191) NULL,
    `deliveryNote` VARCHAR(191) NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `goods_receipt_notes_tenantId_poId_idx`(`tenantId`, `poId`),
    UNIQUE INDEX `goods_receipt_notes_tenantId_grnRef_key`(`tenantId`, `grnRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipt_lines` (
    `id` VARCHAR(191) NOT NULL,
    `grnId` VARCHAR(191) NOT NULL,
    `poLineId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `orderedQty` DECIMAL(15, 4) NOT NULL,
    `receivedQty` DECIMAL(15, 4) NOT NULL,
    `acceptedQty` DECIMAL(15, 4) NOT NULL,
    `rejectedQty` DECIMAL(15, 4) NOT NULL DEFAULT 0,
    `rejectionReason` VARCHAR(191) NULL,
    `batchNo` VARCHAR(191) NULL,
    `serialNo` VARCHAR(191) NULL,
    `expiryDate` DATE NULL,
    `storageLocation` VARCHAR(191) NULL,
    `qualityStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_return_notes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `srnRef` VARCHAR(191) NOT NULL,
    `srnDate` DATE NOT NULL,
    `grnId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `returnReason` VARCHAR(191) NULL,
    `creditNoteRef` VARCHAR(191) NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `supplier_return_notes_tenantId_srnRef_key`(`tenantId`, `srnRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_return_lines` (
    `id` VARCHAR(191) NOT NULL,
    `srnId` VARCHAR(191) NOT NULL,
    `grnLineId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `description` VARCHAR(191) NOT NULL,
    `returnQty` DECIMAL(15, 4) NOT NULL,
    `returnReason` VARCHAR(191) NOT NULL,
    `reverseGst` BOOLEAN NOT NULL DEFAULT true,
    `reverseTds` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_advances` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `advanceRef` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `poId` VARCHAR(191) NULL,
    `milestoneId` VARCHAR(191) NULL,
    `advanceAmount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `advanceDate` DATE NOT NULL,
    `purpose` VARCHAR(191) NULL,
    `glCodeId` VARCHAR(191) NULL,
    `tdsApplicable` BOOLEAN NOT NULL DEFAULT false,
    `tdsSectionId` VARCHAR(191) NULL,
    `tdsAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `adjustedAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `pendingAmount` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `workflowInstanceId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `paidAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_advances_tenantId_vendorId_status_idx`(`tenantId`, `vendorId`, `status`),
    UNIQUE INDEX `vendor_advances_tenantId_advanceRef_key`(`tenantId`, `advanceRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_advance_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `advanceId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `adjustedAmount` DECIMAL(15, 2) NOT NULL,
    `adjustmentDate` DATE NOT NULL,
    `tdsCredit` DECIMAL(15, 2) NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entries` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `entryDate` DATE NOT NULL,
    `postingDate` DATE NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `entryType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'POSTED',
    `debitGlCode` VARCHAR(191) NOT NULL,
    `creditGlCode` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `currencyCode` VARCHAR(191) NOT NULL DEFAULT 'INR',
    `narration` TEXT NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `invoiceLineId` VARCHAR(191) NULL,
    `provisionScheduleId` VARCHAR(191) NULL,
    `amortizationScheduleId` VARCHAR(191) NULL,
    `nullifiedByInvoiceId` VARCHAR(191) NULL,
    `reversalOfId` VARCHAR(191) NULL,
    `reversalJvId` VARCHAR(191) NULL,
    `reversalSkipped` BOOLEAN NOT NULL DEFAULT false,
    `erpStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `erpRef` VARCHAR(191) NULL,
    `erpPushedAt` DATETIME(3) NULL,
    `erpPayload` JSON NULL,
    `erpResponse` JSON NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `lastRetryAt` DATETIME(3) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `journal_entries_tenantId_period_idx`(`tenantId`, `period`),
    INDEX `journal_entries_tenantId_erpStatus_idx`(`tenantId`, `erpStatus`),
    INDEX `journal_entries_tenantId_invoiceId_idx`(`tenantId`, `invoiceId`),
    INDEX `journal_entries_tenantId_entryType_idx`(`tenantId`, `entryType`),
    INDEX `journal_entries_tenantId_provisionScheduleId_idx`(`tenantId`, `provisionScheduleId`),
    INDEX `journal_entries_tenantId_amortizationScheduleId_idx`(`tenantId`, `amortizationScheduleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provision_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NULL,
    `frequency` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `basis` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `lastRunDate` DATETIME(3) NULL,
    `nextRunDate` DATETIME(3) NULL,
    `expenseGlCode` VARCHAR(191) NOT NULL,
    `provisionGlCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `provision_schedules_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `provision_schedules_tenantId_itemId_idx`(`tenantId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `amortization_schedules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NOT NULL,
    `invoiceLineId` VARCHAR(191) NULL,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `monthlyAmount` DECIMAL(15, 2) NOT NULL,
    `periodFrom` DATE NOT NULL,
    `periodTo` DATE NOT NULL,
    `totalMonths` INTEGER NOT NULL,
    `basis` VARCHAR(191) NOT NULL DEFAULT 'STRAIGHT_LINE',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `expenseGlCode` VARCHAR(191) NOT NULL,
    `prepaidGlCode` VARCHAR(191) NOT NULL,
    `apGlCode` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `amortization_schedules_tenantId_invoiceId_idx`(`tenantId`, `invoiceId`),
    INDEX `amortization_schedules_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_batches` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `batchRef` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `isUrgent` BOOLEAN NOT NULL DEFAULT false,
    `urgentReason` VARCHAR(191) NULL,
    `urgentFlaggedBy` VARCHAR(191) NULL,
    `containsMsme` BOOLEAN NOT NULL DEFAULT false,
    `msmeVendorCount` INTEGER NOT NULL DEFAULT 0,
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `totalTds` DECIMAL(15, 2) NOT NULL,
    `totalNetPayable` DECIMAL(15, 2) NOT NULL,
    `paymentDate` DATETIME(3) NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `bankAccountId` VARCHAR(191) NULL,
    `narration` TEXT NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `executedAt` DATETIME(3) NULL,

    INDEX `payment_batches_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `payment_batches_tenantId_entityId_idx`(`tenantId`, `entityId`),
    INDEX `payment_batches_tenantId_isUrgent_status_idx`(`tenantId`, `isUrgent`, `status`),
    UNIQUE INDEX `payment_batches_tenantId_batchRef_key`(`tenantId`, `batchRef`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_batch_lines` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `batchId` VARCHAR(191) NOT NULL,
    `lineType` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `advanceId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `isMsme` BOOLEAN NOT NULL DEFAULT false,
    `msmePaymentDue` DATETIME(3) NULL,
    `msmeDaysRemaining` INTEGER NULL,
    `invoiceAmount` DECIMAL(15, 2) NOT NULL,
    `tdsAmount` DECIMAL(15, 2) NOT NULL,
    `advanceAdjusted` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `paymentAmount` DECIMAL(15, 2) NOT NULL,
    `paymentType` VARCHAR(191) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `tdsSection` VARCHAR(191) NULL,
    `utrNumber` VARCHAR(191) NULL,
    `chequeNumber` VARCHAR(191) NULL,
    `chequeDate` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `failureReason` VARCHAR(191) NULL,
    `paidAt` DATETIME(3) NULL,

    INDEX `payment_batch_lines_batchId_idx`(`batchId`),
    INDEX `payment_batch_lines_tenantId_invoiceId_idx`(`tenantId`, `invoiceId`),
    INDEX `payment_batch_lines_tenantId_vendorId_idx`(`tenantId`, `vendorId`),
    INDEX `payment_batch_lines_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tds_challans` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `tdsSection` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(15, 2) NOT NULL,
    `dueDate` DATE NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `challanNumber` VARCHAR(191) NULL,
    `depositedAt` DATETIME(3) NULL,
    `depositedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tds_challans_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `tds_challans_tenantId_dueDate_idx`(`tenantId`, `dueDate`),
    UNIQUE INDEX `tds_challans_tenantId_period_tdsSection_key`(`tenantId`, `period`, `tdsSection`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provision_proposals` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NULL,
    `vendorId` VARCHAR(191) NULL,
    `description` TEXT NOT NULL,
    `proposedAmount` DECIMAL(15, 2) NOT NULL,
    `approvedAmount` DECIMAL(15, 2) NULL,
    `isManual` BOOLEAN NOT NULL DEFAULT false,
    `source` VARCHAR(191) NOT NULL DEFAULT 'ITEM_MASTER',
    `expenseGlCode` VARCHAR(191) NOT NULL,
    `provisionGlCode` VARCHAR(191) NOT NULL,
    `tdsSection` VARCHAR(191) NULL,
    `reversalTrigger` VARCHAR(191) NOT NULL DEFAULT 'FIRST_OF_NEXT_MONTH',
    `narration` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `workflowInstanceId` VARCHAR(191) NULL,
    `invoiceCoveredId` VARCHAR(191) NULL,
    `batchId` VARCHAR(191) NULL,
    `jvId` VARCHAR(191) NULL,
    `reversalJvId` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `reviewedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `approvedAt` DATETIME(3) NULL,

    INDEX `provision_proposals_tenantId_period_status_idx`(`tenantId`, `period`, `status`),
    INDEX `provision_proposals_tenantId_itemId_idx`(`tenantId`, `itemId`),
    INDEX `provision_proposals_tenantId_batchId_idx`(`tenantId`, `batchId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provision_batches` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'DRAFT',
    `totalAmount` DECIMAL(15, 2) NOT NULL,
    `proposalIds` JSON NOT NULL,
    `workflowInstanceId` VARCHAR(191) NULL,
    `submittedBy` VARCHAR(191) NULL,
    `approvedBy` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,

    INDEX `provision_batches_tenantId_period_status_idx`(`tenantId`, `period`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_entity_access` ADD CONSTRAINT `user_entity_access_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_entity_roles` ADD CONSTRAINT `user_entity_roles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_lines` ADD CONSTRAINT `invoice_lines_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_lines` ADD CONSTRAINT `invoice_lines_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item_master`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_audit_logs` ADD CONSTRAINT `invoice_audit_logs_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_instances` ADD CONSTRAINT `workflow_instances_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `workflow_definitions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `approval_steps` ADD CONSTRAINT `approval_steps_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entities` ADD CONSTRAINT `entities_taxRegimeId_fkey` FOREIGN KEY (`taxRegimeId`) REFERENCES `tax_regimes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entities` ADD CONSTRAINT `entities_currentFyId_fkey` FOREIGN KEY (`currentFyId`) REFERENCES `financial_years`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `holidays` ADD CONSTRAINT `holidays_calendarId_fkey` FOREIGN KEY (`calendarId`) REFERENCES `holiday_calendars`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_definition_stages` ADD CONSTRAINT `workflow_definition_stages_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_definition_conditions` ADD CONSTRAINT `workflow_definition_conditions_definitionId_fkey` FOREIGN KEY (`definitionId`) REFERENCES `workflow_definitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_instance_stages` ADD CONSTRAINT `workflow_instance_stages_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `workflow_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_chats` ADD CONSTRAINT `workflow_chats_instanceId_fkey` FOREIGN KEY (`instanceId`) REFERENCES `workflow_instances`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workflow_attachments` ADD CONSTRAINT `workflow_attachments_chatId_fkey` FOREIGN KEY (`chatId`) REFERENCES `workflow_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_gst_registrations` ADD CONSTRAINT `vendor_gst_registrations_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_bank_accounts` ADD CONSTRAINT `vendor_bank_accounts_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_entity_mappings` ADD CONSTRAINT `vendor_entity_mappings_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_documents` ADD CONSTRAINT `vendor_documents_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_modules` ADD CONSTRAINT `tenant_modules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_features` ADD CONSTRAINT `tenant_features_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenant_features` ADD CONSTRAINT `tenant_features_tenantId_moduleCode_fkey` FOREIGN KEY (`tenantId`, `moduleCode`) REFERENCES `tenant_modules`(`tenantId`, `moduleCode`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_master_change_requests` ADD CONSTRAINT `item_master_change_requests_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_entity_mappings` ADD CONSTRAINT `item_entity_mappings_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_approved_vendors` ADD CONSTRAINT `item_approved_vendors_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `item_master`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rate_contract_lines` ADD CONSTRAINT `rate_contract_lines_contractId_fkey` FOREIGN KEY (`contractId`) REFERENCES `rate_contracts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_periods` ADD CONSTRAINT `budget_periods_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_revisions` ADD CONSTRAINT `budget_revisions_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_requisition_lines` ADD CONSTRAINT `purchase_requisition_lines_prId_fkey` FOREIGN KEY (`prId`) REFERENCES `purchase_requisitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_po_links` ADD CONSTRAINT `invoice_po_links_invoiceId_fkey` FOREIGN KEY (`invoiceId`) REFERENCES `invoices`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice_po_links` ADD CONSTRAINT `invoice_po_links_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_lines` ADD CONSTRAINT `purchase_order_lines_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `po_payment_milestones` ADD CONSTRAINT `po_payment_milestones_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blanket_po_releases` ADD CONSTRAINT `blanket_po_releases_blanketPoId_fkey` FOREIGN KEY (`blanketPoId`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_notes` ADD CONSTRAINT `goods_receipt_notes_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_lines` ADD CONSTRAINT `goods_receipt_lines_grnId_fkey` FOREIGN KEY (`grnId`) REFERENCES `goods_receipt_notes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_lines` ADD CONSTRAINT `goods_receipt_lines_poLineId_fkey` FOREIGN KEY (`poLineId`) REFERENCES `purchase_order_lines`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_return_lines` ADD CONSTRAINT `supplier_return_lines_srnId_fkey` FOREIGN KEY (`srnId`) REFERENCES `supplier_return_notes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_advances` ADD CONSTRAINT `vendor_advances_poId_fkey` FOREIGN KEY (`poId`) REFERENCES `purchase_orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_advance_adjustments` ADD CONSTRAINT `vendor_advance_adjustments_advanceId_fkey` FOREIGN KEY (`advanceId`) REFERENCES `vendor_advances`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provision_schedules` ADD CONSTRAINT `provision_schedules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `amortization_schedules` ADD CONSTRAINT `amortization_schedules_tenantId_fkey` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_batch_lines` ADD CONSTRAINT `payment_batch_lines_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `payment_batches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

