-- CreateTable
CREATE TABLE `po_acknowledgements` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `acknowledgementType` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `comments` TEXT NULL,
    `expectedDeliveryDate` DATETIME(3) NULL,
    `acknowledgedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `acknowledgedByEmail` VARCHAR(191) NOT NULL,

    INDEX `po_acknowledgements_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `po_acknowledgements_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `advance_shipment_notices` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `asnNumber` VARCHAR(191) NOT NULL,
    `purchaseOrderId` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'CREATED',
    `dispatchDate` DATETIME(3) NOT NULL,
    `expectedDeliveryDate` DATETIME(3) NOT NULL,
    `carrierName` VARCHAR(191) NULL,
    `trackingNumber` VARCHAR(191) NULL,
    `comments` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `advance_shipment_notices_asnNumber_key`(`asnNumber`),
    INDEX `advance_shipment_notices_purchaseOrderId_idx`(`purchaseOrderId`),
    INDEX `advance_shipment_notices_vendorId_idx`(`vendorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `advance_shipment_lines` (
    `id` VARCHAR(191) NOT NULL,
    `asnId` VARCHAR(191) NOT NULL,
    `poLineId` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(18, 4) NOT NULL,
    `uom` VARCHAR(191) NOT NULL,

    INDEX `advance_shipment_lines_asnId_idx`(`asnId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_disputes` (
    `id` VARCHAR(191) NOT NULL,
    `tenantId` VARCHAR(191) NOT NULL,
    `disputeNumber` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `invoiceId` VARCHAR(191) NULL,
    `paymentId` VARCHAR(191) NULL,
    `disputeType` VARCHAR(191) NOT NULL,
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
    `attachmentBlobUrl` VARCHAR(191) NULL,
    `resolvedAt` DATETIME(3) NULL,
    `resolutionNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_disputes_disputeNumber_key`(`disputeNumber`),
    INDEX `vendor_disputes_vendorId_idx`(`vendorId`),
    INDEX `vendor_disputes_invoiceId_idx`(`invoiceId`),
    INDEX `vendor_disputes_paymentId_idx`(`paymentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `po_acknowledgements` ADD CONSTRAINT `po_acknowledgements_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `advance_shipment_notices` ADD CONSTRAINT `advance_shipment_notices_purchaseOrderId_fkey` FOREIGN KEY (`purchaseOrderId`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `advance_shipment_lines` ADD CONSTRAINT `advance_shipment_lines_asnId_fkey` FOREIGN KEY (`asnId`) REFERENCES `advance_shipment_notices`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
