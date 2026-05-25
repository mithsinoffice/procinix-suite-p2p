-- CreateTable
CREATE TABLE `vendor_country_configs` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `countryName` VARCHAR(191) NOT NULL,
    `requiredDocuments` JSON NOT NULL,
    `taxIdLabel` VARCHAR(191) NOT NULL,
    `taxIdFormat` VARCHAR(191) NULL,
    `bankFieldsRequired` JSON NOT NULL,
    `sanctionListsToCheck` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_country_configs_tenantId_countryCode_key`(`tenantId`, `countryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_workflow_templates` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `steps` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_notification_templates` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `eventType` VARCHAR(191) NOT NULL,
    `channel` VARCHAR(191) NOT NULL,
    `subjectLine` TEXT NULL,
    `bodyTemplate` TEXT NOT NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'en',
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_notification_templates_tenantId_eventType_channel_lan_key`(`tenantId`, `eventType`, `channel`, `language`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_risk_matrix_rules` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `vendorType` VARCHAR(191) NULL,
    `spendTier` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NULL,
    `industryCategory` VARCHAR(191) NULL,
    `riskWeights` JSON NOT NULL,
    `riskTierThresholds` JSON NOT NULL,
    `requiredDocumentOverrides` JSON NULL,
    `workflowTemplateId` VARCHAR(191) NULL,
    `screeningFrequencyDays` INTEGER NOT NULL DEFAULT 365,
    `screeningLists` JSON NOT NULL,
    `onboardingSlaHours` INTEGER NOT NULL DEFAULT 72,
    `autoApproveThreshold` INTEGER NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_risk_matrix_rules_tenantId_vendorType_spendTier_count_idx`(`tenantId`, `vendorType`, `spendTier`, `countryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_risk_factors` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `factorKey` VARCHAR(191) NOT NULL,
    `factorLabel` VARCHAR(191) NOT NULL,
    `factorGroup` VARCHAR(191) NOT NULL,
    `scoringLogic` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_risk_factors_tenantId_factorKey_key`(`tenantId`, `factorKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_onboarding_requests` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `requestCode` VARCHAR(191) NOT NULL,
    `initiationType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `vendorLegalName` VARCHAR(191) NULL,
    `vendorEmail` VARCHAR(191) NOT NULL,
    `vendorCountryCode` VARCHAR(191) NULL,
    `vendorType` VARCHAR(191) NULL,
    `industryCategory` VARCHAR(191) NULL,
    `estimatedSpend` DECIMAL(18, 2) NULL,
    `spendTier` VARCHAR(191) NULL,
    `portalToken` VARCHAR(191) NULL,
    `tokenExpiresAt` DATETIME(3) NULL,
    `tokenUsedAt` DATETIME(3) NULL,
    `riskMatrixRuleId` VARCHAR(191) NULL,
    `appliedRiskWeights` JSON NULL,
    `invitedByUserId` VARCHAR(191) NULL,
    `invitedAt` DATETIME(3) NULL,
    `submittedAt` DATETIME(3) NULL,
    `approvedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,
    `erpSyncStatus` VARCHAR(191) NULL,
    `erpSyncedAt` DATETIME(3) NULL,
    `erpVendorCode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_onboarding_requests_requestCode_key`(`requestCode`),
    UNIQUE INDEX `vendor_onboarding_requests_portalToken_key`(`portalToken`),
    INDEX `vendor_onboarding_requests_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `vendor_onboarding_requests_tenantId_vendorCountryCode_idx`(`tenantId`, `vendorCountryCode`),
    INDEX `vendor_onboarding_requests_portalToken_idx`(`portalToken`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_onboarding_invitations` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `sentToEmail` VARCHAR(191) NOT NULL,
    `sentByUserId` VARCHAR(191) NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `resendCount` INTEGER NOT NULL DEFAULT 0,
    `lastResentAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_profiles` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `vendorCode` VARCHAR(191) NULL,
    `legalName` VARCHAR(191) NOT NULL,
    `tradeName` VARCHAR(191) NULL,
    `registrationNumber` VARCHAR(191) NULL,
    `incorporationDate` DATETIME(3) NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `vendorType` VARCHAR(191) NOT NULL,
    `industryCategory` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL DEFAULT 'USD',
    `annualRevenue` DECIMAL(18, 2) NULL,
    `employeeCount` INTEGER NULL,
    `dunsNumber` VARCHAR(191) NULL,
    `riskScore` INTEGER NULL,
    `riskTier` VARCHAR(191) NULL,
    `lastRiskScoredAt` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL,
    `isErpSynced` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_profiles_requestId_key`(`requestId`),
    UNIQUE INDEX `vendor_profiles_vendorCode_key`(`vendorCode`),
    INDEX `vendor_profiles_tenantId_status_idx`(`tenantId`, `status`),
    INDEX `vendor_profiles_tenantId_riskTier_idx`(`tenantId`, `riskTier`),
    INDEX `vendor_profiles_countryCode_idx`(`countryCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_contacts` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `contactType` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_contacts_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_addresses` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `addressType` VARCHAR(191) NOT NULL,
    `line1` VARCHAR(191) NOT NULL,
    `line2` VARCHAR(191) NULL,
    `city` VARCHAR(191) NOT NULL,
    `state` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `isRegistered` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_profile_bank_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `accountName` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NOT NULL,
    `bankName` VARCHAR(191) NOT NULL,
    `bankCode` VARCHAR(191) NULL,
    `ifscSwiftIban` VARCHAR(191) NULL,
    `currency` VARCHAR(191) NOT NULL,
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `verificationStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `verifiedAt` DATETIME(3) NULL,
    `verifiedByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_profile_bank_accounts_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_compliance_records` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `countryCode` VARCHAR(191) NOT NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `documentNumber` VARCHAR(191) NULL,
    `verificationStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `verificationSource` VARCHAR(191) NULL,
    `verificationDetails` TEXT NULL,
    `expiresAt` DATETIME(3) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `vendor_compliance_records_vendorId_documentType_idx`(`vendorId`, `documentType`),
    INDEX `vendor_compliance_records_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_profile_documents` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `complianceId` VARCHAR(191) NULL,
    `documentType` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `blobUrl` TEXT NOT NULL,
    `blobContainer` VARCHAR(191) NOT NULL,
    `blobPath` TEXT NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `uploadedByType` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `reviewStatus` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `rejectionReason` TEXT NULL,
    `reviewedByUserId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vendor_profile_documents_vendorId_idx`(`vendorId`),
    INDEX `vendor_profile_documents_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_approval_workflows` (
    `id` VARCHAR(191) NOT NULL,
    `requestId` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `workflowTemplateId` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `currentLevel` INTEGER NOT NULL DEFAULT 1,
    `totalLevels` INTEGER NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `slaDeadlineAt` DATETIME(3) NULL,

    UNIQUE INDEX `vendor_approval_workflows_requestId_key`(`requestId`),
    INDEX `vendor_approval_workflows_tenantId_status_idx`(`tenantId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_approval_steps` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL,
    `stepName` VARCHAR(191) NOT NULL,
    `approverId` VARCHAR(191) NULL,
    `approverRole` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `decision` VARCHAR(191) NULL,
    `comments` TEXT NULL,
    `decidedAt` DATETIME(3) NULL,
    `dueAt` DATETIME(3) NULL,
    `escalatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_sanction_screenings` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `screeningProvider` VARCHAR(191) NOT NULL,
    `listName` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `matchType` VARCHAR(191) NULL,
    `matchScore` INTEGER NULL,
    `matchDetail` TEXT NULL,
    `screenedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `nextScreenAt` DATETIME(3) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolvedByUserId` VARCHAR(191) NULL,
    `resolutionNote` TEXT NULL,

    INDEX `vendor_sanction_screenings_vendorId_idx`(`vendorId`),
    INDEX `vendor_sanction_screenings_nextScreenAt_idx`(`nextScreenAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_change_requests` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `requestCode` VARCHAR(191) NOT NULL,
    `requestedByType` VARCHAR(191) NOT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `changeType` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `status` VARCHAR(191) NOT NULL,
    `beforeSnapshot` JSON NOT NULL,
    `afterSnapshot` JSON NOT NULL,
    `comments` TEXT NULL,
    `approvalStatus` VARCHAR(191) NULL,
    `requestedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `approvedAt` DATETIME(3) NULL,
    `approvedByUserId` VARCHAR(191) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `rejectionReason` TEXT NULL,

    UNIQUE INDEX `vendor_change_requests_requestCode_key`(`requestCode`),
    INDEX `vendor_change_requests_vendorId_status_idx`(`vendorId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_portal_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `sessionToken` VARCHAR(191) NOT NULL,
    `authMethod` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastActiveAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vendor_portal_sessions_sessionToken_key`(`sessionToken`),
    INDEX `vendor_portal_sessions_sessionToken_idx`(`sessionToken`),
    INDEX `vendor_portal_sessions_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_risk_history` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `riskScore` INTEGER NOT NULL,
    `riskTier` VARCHAR(191) NOT NULL,
    `scoredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `scoreBreakdown` TEXT NOT NULL,
    `triggeredBy` VARCHAR(191) NOT NULL,

    INDEX `vendor_risk_history_vendorId_scoredAt_idx`(`vendorId`, `scoredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `vendor_risk_matrix_rules` ADD CONSTRAINT `vendor_risk_matrix_rules_workflowTemplateId_fkey` FOREIGN KEY (`workflowTemplateId`) REFERENCES `vendor_workflow_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_onboarding_invitations` ADD CONSTRAINT `vendor_onboarding_invitations_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `vendor_onboarding_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_profiles` ADD CONSTRAINT `vendor_profiles_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `vendor_onboarding_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_contacts` ADD CONSTRAINT `vendor_contacts_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_addresses` ADD CONSTRAINT `vendor_addresses_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_profile_bank_accounts` ADD CONSTRAINT `vendor_profile_bank_accounts_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_compliance_records` ADD CONSTRAINT `vendor_compliance_records_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_profile_documents` ADD CONSTRAINT `vendor_profile_documents_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_profile_documents` ADD CONSTRAINT `vendor_profile_documents_complianceId_fkey` FOREIGN KEY (`complianceId`) REFERENCES `vendor_compliance_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_approval_workflows` ADD CONSTRAINT `vendor_approval_workflows_requestId_fkey` FOREIGN KEY (`requestId`) REFERENCES `vendor_onboarding_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_approval_steps` ADD CONSTRAINT `vendor_approval_steps_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `vendor_approval_workflows`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_sanction_screenings` ADD CONSTRAINT `vendor_sanction_screenings_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_change_requests` ADD CONSTRAINT `vendor_change_requests_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_portal_sessions` ADD CONSTRAINT `vendor_portal_sessions_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_risk_history` ADD CONSTRAINT `vendor_risk_history_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendor_profiles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
