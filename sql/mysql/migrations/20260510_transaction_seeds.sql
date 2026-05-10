-- ============================================================================
-- 20260510_transaction_seeds.sql
-- End-to-end P2P chain demo data for tenant-default-001 / entity-ptpl-001:
--   6 PRs (Regular x2 + Service + CAPEX + Pending + Blanket)
--   4 POs from 4 of those PRs (issued / partial / fully received / issued)
--   2 GRNs (partial + full)
--   1 SRN (1-month consumption of a 3-month service contract)
--   4 invoices (Queued, Under Verification, MSME breach, Approved no-PO)
--   2 vendor advances (approved + queued_for_payment)
--
-- Idempotency strategy:
--   • Deterministic UUIDs for headers (e.g. PR1 → 11111111-1111-... )
--   • INSERT IGNORE on UNIQUE-keyed refs so re-runs skip
--   • DELETE before INSERT for child rows keyed by parent_id
--
-- Vendor + user IDs are looked up at runtime by code via SET @vars.
-- ============================================================================

-- ── Vendor IDs ─────────────────────────────────────────────────────────────
SET @VID_TCS  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-TCS-001');
SET @VID_INF  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-INF-002');
SET @VID_WIP  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-WIP-003');
SET @VID_MAH  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-MAH-004');
SET @VID_RAJ  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-RAJ-005');
SET @VID_BAL  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-BAL-006');
SET @VID_SHR  := (SELECT id FROM p2p_schema_mt.vendors WHERE vendor_code = 'V-SHR-007');

-- ── User IDs ───────────────────────────────────────────────────────────────
SET @UID_MEENA := (SELECT id FROM user_master.user_master WHERE record_code = 'EMP106');
SET @UID_ROHAN := (SELECT id FROM user_master.user_master WHERE record_code = 'EMP104');
SET @UID_DEEPAK:= (SELECT id FROM user_master.user_master WHERE record_code = 'EMP107');
SET @UID_VIKRAM:= (SELECT id FROM user_master.user_master WHERE record_code = 'EMP005');
SET @UID_KIRAN := (SELECT id FROM user_master.user_master WHERE record_code = 'EMP105');
SET @UID_ANANYA:= (SELECT id FROM user_master.user_master WHERE record_code = 'EMP108');
SET @UID_ARUN  := (SELECT id FROM user_master.user_master WHERE record_code = 'EMP101');

-- Deterministic header UUIDs so children can DELETE + INSERT cleanly on
-- re-run. Procurement tables use utf8mb4_0900_ai_ci while the connection
-- default in this DB is utf8mb4_unicode_ci, so each literal is COLLATE-cast
-- explicitly to avoid `ER_CANT_AGGREGATE_2COLLATIONS` on every join.
SET @PR1_ID := '11111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @PR2_ID := '22222222-2222-4222-8222-222222222222' COLLATE utf8mb4_0900_ai_ci;
SET @PR3_ID := '33333333-3333-4333-8333-333333333333' COLLATE utf8mb4_0900_ai_ci;
SET @PR4_ID := '44444444-4444-4444-8444-444444444444' COLLATE utf8mb4_0900_ai_ci;
SET @PR5_ID := '55555555-5555-4555-8555-555555555555' COLLATE utf8mb4_0900_ai_ci;
SET @PR6_ID := '66666666-6666-4666-8666-666666666666' COLLATE utf8mb4_0900_ai_ci;
SET @PO1_ID := 'a1111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @PO2_ID := 'a2222222-2222-4222-8222-222222222222' COLLATE utf8mb4_0900_ai_ci;
SET @PO3_ID := 'a3333333-3333-4333-8333-333333333333' COLLATE utf8mb4_0900_ai_ci;
SET @PO4_ID := 'a4444444-4444-4444-8444-444444444444' COLLATE utf8mb4_0900_ai_ci;
SET @GRN1_ID := 'b1111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @GRN2_ID := 'b2222222-2222-4222-8222-222222222222' COLLATE utf8mb4_0900_ai_ci;
SET @SRN1_ID := 'c1111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @INV1_ID := 'd1111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @INV2_ID := 'd2222222-2222-4222-8222-222222222222' COLLATE utf8mb4_0900_ai_ci;
SET @INV3_ID := 'd3333333-3333-4333-8333-333333333333' COLLATE utf8mb4_0900_ai_ci;
SET @INV4_ID := 'd4444444-4444-4444-8444-444444444444' COLLATE utf8mb4_0900_ai_ci;
SET @ADV1_ID := 'e1111111-1111-4111-8111-111111111111' COLLATE utf8mb4_0900_ai_ci;
SET @ADV2_ID := 'e2222222-2222-4222-8222-222222222222' COLLATE utf8mb4_0900_ai_ci;

-- ── PR-1: Regular (TCS — laptops + bags) ───────────────────────────────────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, delivery_location, need_by_date, business_justification, priority,
   total_amount, total_gst, currency, status, approved_by, approved_at, created_by, created_at)
VALUES
  (@PR1_ID, 'PR-PTPL-2026-0001', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'regular',
   @UID_MEENA, 'Meena Iyer', 'Procurement', 'CC-PRO-001', 'Mumbai Head Office', '2026-06-15',
   'Quarterly laptop refresh for procurement + ops teams; 10 units with travel bags.',
   'medium', 865000.00, 155700.00, 'INR', 'approved',
   @UID_ARUN, '2026-04-25 10:30:00', @UID_MEENA, '2026-04-22 09:00:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR1_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR1_ID, 'tenant-default-001', 1, 'material', 'IT-LAP-001',
   'Business laptop computers (Dell Latitude class)',
   @VID_TCS, 'Tata Consultancy Services Limited', 10, 'unit', 85000.00,
   850000.00, 18.00, 'IGST', 153000.00, 1003000.00),
  (UUID(), @PR1_ID, 'tenant-default-001', 2, 'material', 'IT-BAG-001',
   'Laptop carry bags (15-inch)',
   @VID_TCS, 'Tata Consultancy Services Limited', 10, 'unit', 1500.00,
   15000.00, 18.00, 'IGST', 2700.00, 17700.00);

-- ── PR-2: Service (Infosys BPM — IT consulting) ────────────────────────────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, need_by_date, business_justification, priority,
   total_amount, total_gst, currency, status, approved_by, approved_at, created_by, created_at)
VALUES
  (@PR2_ID, 'PR-PTPL-2026-0002', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'service',
   @UID_ROHAN, 'Rohan Mehta', 'Information Technology', 'CC-IT-001', '2026-06-30',
   'IT infrastructure consulting — 3-month engagement for cloud migration assessment.',
   'high', 350000.00, 63000.00, 'INR', 'approved',
   @UID_ARUN, '2026-05-10 14:20:00', @UID_ROHAN, '2026-05-08 11:00:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR2_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price,
   service_period_from, service_period_to,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR2_ID, 'tenant-default-001', 1, 'service', 'SVC-IT-CONS-001',
   'IT Infrastructure Consulting — cloud migration assessment',
   @VID_INF, 'Infosys BPM Limited', 1, 'engagement', 350000.00,
   '2026-06-01', '2026-08-31',
   350000.00, 18.00, 'IGST', 63000.00, 413000.00);

-- ── PR-3: Regular MSME (Rajan Tooling — fabricated parts, same state) ──────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, need_by_date, business_justification, priority,
   total_amount, total_gst, currency, status, approved_by, approved_at, created_by, created_at)
VALUES
  (@PR3_ID, 'PR-PTPL-2026-0003', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'regular',
   @UID_DEEPAK, 'Deepak Nair', 'Operations', 'CC-OPS-001', '2026-05-20',
   'Custom fabricated parts for assembly line — MSME vendor (Maharashtra, intra-state).',
   'medium', 62000.00, 11160.00, 'INR', 'approved',
   @UID_MEENA, '2026-03-22 16:00:00', @UID_DEEPAK, '2026-03-20 10:00:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR3_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR3_ID, 'tenant-default-001', 1, 'material', 'MFG-PART-001',
   'Custom fabricated parts (drawing-spec; lot of 50)',
   @VID_RAJ, 'Rajan Tooling Works', 50, 'piece', 1240.00,
   62000.00, 18.00, 'CGST_SGST', 11160.00, 73160.00);

-- ── PR-4: Asset/CAPEX (Wipro — server racks) ───────────────────────────────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, need_by_date, business_justification, priority,
   total_amount, total_gst, currency, status, approved_by, approved_at, asset_class,
   created_by, created_at)
VALUES
  (@PR4_ID, 'PR-PTPL-2026-0004', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'asset_capex',
   @UID_VIKRAM, 'Vikram Singh', 'Operations', 'CC-OPS-001', '2026-07-01',
   'Server rack expansion for primary data centre — capacity uplift for FY26-27.',
   'high', 900000.00, 162000.00, 'INR', 'approved',
   @UID_ARUN, '2026-05-05 11:45:00', 'IT Hardware',
   @UID_VIKRAM, '2026-05-02 09:30:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR4_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price, depreciation_years,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR4_ID, 'tenant-default-001', 1, 'asset', 'IT-RACK-001',
   '42U server rack with PDU + cable management',
   @VID_WIP, 'Wipro Infrastructure Engineering Limited', 2, 'unit', 450000.00, 5,
   900000.00, 18.00, 'IGST', 162000.00, 1062000.00);

-- ── PR-5: Pending Approval (Shree Fab — office stationery) ─────────────────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, need_by_date, business_justification, priority,
   total_amount, total_gst, currency, status, created_by, created_at)
VALUES
  (@PR5_ID, 'PR-PTPL-2026-0005', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'regular',
   @UID_KIRAN, 'Kiran Desai', 'Finance & Accounts', 'CC-FIN-001', '2026-06-01',
   'Quarterly office stationery + printables (Maharashtra intra-state).',
   'low', 25000.00, 3000.00, 'INR', 'pending_approval',
   @UID_KIRAN, '2026-05-09 13:00:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR5_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR5_ID, 'tenant-default-001', 1, 'material', 'OFC-STAT-001',
   'Office stationery — pens, notebooks, folders, files (assorted)',
   @VID_SHR, 'Shree Fab Works Pvt Ltd', 1, 'lot', 25000.00,
   25000.00, 12.00, 'CGST_SGST', 3000.00, 28000.00);

-- ── PR-6: Blanket (Mahindra Logistics — facility management) ───────────────
INSERT IGNORE INTO purchase_requests
  (id, pr_ref, tenant_id, entity_id, entity_code, pr_type, requester_id, requester_name,
   department, cost_centre, business_justification, priority,
   total_amount, total_gst, currency, status, approved_by, approved_at,
   blanket_ceiling, blanket_validity_from, blanket_validity_to,
   created_by, created_at)
VALUES
  (@PR6_ID, 'PR-PTPL-2026-0006', 'tenant-default-001', 'entity-ptpl-001', 'PTPL', 'blanket',
   @UID_ANANYA, 'Ananya Sharma', 'Administration', 'CC-ADM-001',
   'Annual facility management blanket — housekeeping + cafeteria + utilities support.',
   'medium', 500000.00, 90000.00, 'INR', 'approved',
   @UID_ARUN, '2026-04-15 10:00:00',
   500000.00, '2026-04-01', '2027-03-31',
   @UID_ANANYA, '2026-04-12 14:30:00');

DELETE FROM purchase_request_items WHERE pr_id = @PR6_ID;
INSERT INTO purchase_request_items
  (id, pr_id, tenant_id, line_number, item_type, item_code, item_description,
   vendor_id, vendor_name, quantity, unit, unit_price,
   line_amount, gst_rate, gst_type, gst_amount, total_with_gst)
VALUES
  (UUID(), @PR6_ID, 'tenant-default-001', 1, 'service', 'SVC-FM-001',
   'Facility management services — annual blanket (drawn against monthly invoices)',
   @VID_MAH, 'Mahindra Logistics Limited', 1, 'year', 500000.00,
   500000.00, 18.00, 'IGST', 90000.00, 590000.00);

-- ── PO-1: From PR-1 (TCS laptops, issued, Net 30) ──────────────────────────
INSERT IGNORE INTO purchase_orders_proc
  (id, po_ref, tenant_id, entity_id, entity_code, vendor_id, vendor_name,
   vendor_gstin, bill_to_gstin, po_type, payment_terms, delivery_terms,
   total_amount, total_gst, total_with_gst, status, issued_at,
   created_by, created_at)
VALUES
  (@PO1_ID, 'PO-PTPL-2026-0001', 'tenant-default-001', 'entity-ptpl-001', 'PTPL',
   @VID_TCS, 'Tata Consultancy Services Limited',
   '27AAACT2727Q1ZX', '27AABCP1234Q1Z5', 'regular', 'Net 30 Days', 'FOB Mumbai',
   865000.00, 155700.00, 1020700.00, 'issued', '2026-05-02 10:00:00',
   @UID_MEENA, '2026-05-02 10:00:00');

DELETE FROM purchase_order_items WHERE po_id = @PO1_ID;
INSERT INTO purchase_order_items
  (id, po_id, tenant_id, line_number, item_type, item_code, item_description,
   quantity, unit, unit_price, line_amount, gst_rate, gst_type,
   gst_amount, total_with_gst, qty_received, match_status)
VALUES
  (UUID(), @PO1_ID, 'tenant-default-001', 1, 'material', 'IT-LAP-001',
   'Business laptop computers (Dell Latitude class)',
   10, 'unit', 85000.00, 850000.00, 18.00, 'IGST',
   153000.00, 1003000.00, 6, 'partial'),
  (UUID(), @PO1_ID, 'tenant-default-001', 2, 'material', 'IT-BAG-001',
   'Laptop carry bags (15-inch)',
   10, 'unit', 1500.00, 15000.00, 18.00, 'IGST',
   2700.00, 17700.00, 6, 'partial');

DELETE FROM po_pr_links WHERE po_id = @PO1_ID;
INSERT INTO po_pr_links (id, po_id, pr_id, tenant_id) VALUES (UUID(), @PO1_ID, @PR1_ID, 'tenant-default-001');

-- ── PO-2: From PR-2 (Infosys consulting, partially received via SRN) ───────
INSERT IGNORE INTO purchase_orders_proc
  (id, po_ref, tenant_id, entity_id, entity_code, vendor_id, vendor_name,
   vendor_gstin, bill_to_gstin, po_type, payment_terms,
   total_amount, total_gst, total_with_gst, status, issued_at,
   created_by, created_at)
VALUES
  (@PO2_ID, 'PO-PTPL-2026-0002', 'tenant-default-001', 'entity-ptpl-001', 'PTPL',
   @VID_INF, 'Infosys BPM Limited',
   '29AAACI1234E1Z7', '27AABCP1234Q1Z5', 'service', 'Net 30 Days',
   350000.00, 63000.00, 413000.00, 'partially_received', '2026-05-15 09:00:00',
   @UID_ROHAN, '2026-05-15 09:00:00');

DELETE FROM purchase_order_items WHERE po_id = @PO2_ID;
INSERT INTO purchase_order_items
  (id, po_id, tenant_id, line_number, item_type, item_code, item_description,
   quantity, unit, unit_price, line_amount, gst_rate, gst_type,
   gst_amount, total_with_gst, amount_consumed, match_status,
   delivery_date)
VALUES
  (UUID(), @PO2_ID, 'tenant-default-001', 1, 'service', 'SVC-IT-CONS-001',
   'IT Infrastructure Consulting — cloud migration assessment',
   1, 'engagement', 350000.00, 350000.00, 18.00, 'IGST',
   63000.00, 413000.00, 116667.00, 'partial',
   '2026-08-31');

DELETE FROM po_pr_links WHERE po_id = @PO2_ID;
INSERT INTO po_pr_links (id, po_id, pr_id, tenant_id) VALUES (UUID(), @PO2_ID, @PR2_ID, 'tenant-default-001');

-- ── PO-3: From PR-3 (Rajan parts, fully received — MSME, intra-state) ──────
INSERT IGNORE INTO purchase_orders_proc
  (id, po_ref, tenant_id, entity_id, entity_code, vendor_id, vendor_name,
   vendor_gstin, bill_to_gstin, po_type, payment_terms,
   total_amount, total_gst, total_with_gst, status, issued_at,
   created_by, created_at)
VALUES
  (@PO3_ID, 'PO-PTPL-2026-0003', 'tenant-default-001', 'entity-ptpl-001', 'PTPL',
   @VID_RAJ, 'Rajan Tooling Works',
   '24AABCR3456D1Z9', '27AABCP1234Q1Z5', 'regular', 'Net 30 Days',
   62000.00, 11160.00, 73160.00, 'fully_received', '2026-03-25 09:00:00',
   @UID_DEEPAK, '2026-03-25 09:00:00');

DELETE FROM purchase_order_items WHERE po_id = @PO3_ID;
INSERT INTO purchase_order_items
  (id, po_id, tenant_id, line_number, item_type, item_code, item_description,
   quantity, unit, unit_price, line_amount, gst_rate, gst_type,
   gst_amount, total_with_gst, qty_received, match_status)
VALUES
  (UUID(), @PO3_ID, 'tenant-default-001', 1, 'material', 'MFG-PART-001',
   'Custom fabricated parts (drawing-spec; lot of 50)',
   50, 'piece', 1240.00, 62000.00, 18.00, 'CGST_SGST',
   11160.00, 73160.00, 50, 'matched');

DELETE FROM po_pr_links WHERE po_id = @PO3_ID;
INSERT INTO po_pr_links (id, po_id, pr_id, tenant_id) VALUES (UUID(), @PO3_ID, @PR3_ID, 'tenant-default-001');

-- ── PO-4: From PR-4 (Wipro server racks, issued, awaiting receipt) ─────────
INSERT IGNORE INTO purchase_orders_proc
  (id, po_ref, tenant_id, entity_id, entity_code, vendor_id, vendor_name,
   vendor_gstin, bill_to_gstin, po_type, payment_terms,
   total_amount, total_gst, total_with_gst, status, issued_at,
   created_by, created_at)
VALUES
  (@PO4_ID, 'PO-PTPL-2026-0004', 'tenant-default-001', 'entity-ptpl-001', 'PTPL',
   @VID_WIP, 'Wipro Infrastructure Engineering Limited',
   '29AAACW0020B1Z8', '27AABCP1234Q1Z5', 'asset_capex', 'Net 45 Days',
   900000.00, 162000.00, 1062000.00, 'issued', '2026-05-08 11:00:00',
   @UID_VIKRAM, '2026-05-08 11:00:00');

DELETE FROM purchase_order_items WHERE po_id = @PO4_ID;
INSERT INTO purchase_order_items
  (id, po_id, tenant_id, line_number, item_type, item_code, item_description,
   quantity, unit, unit_price, line_amount, gst_rate, gst_type,
   gst_amount, total_with_gst, match_status)
VALUES
  (UUID(), @PO4_ID, 'tenant-default-001', 1, 'asset', 'IT-RACK-001',
   '42U server rack with PDU + cable management',
   2, 'unit', 450000.00, 900000.00, 18.00, 'IGST',
   162000.00, 1062000.00, 'pending');

DELETE FROM po_pr_links WHERE po_id = @PO4_ID;
INSERT INTO po_pr_links (id, po_id, pr_id, tenant_id) VALUES (UUID(), @PO4_ID, @PR4_ID, 'tenant-default-001');

-- Flip the 4 used PRs to converted_to_po for audit consistency.
UPDATE purchase_requests SET status = 'converted_to_po'
 WHERE id IN (@PR1_ID, @PR2_ID, @PR3_ID, @PR4_ID);

-- ── GRN-1: PO-1 partial (6 of 10 of each line) ─────────────────────────────
INSERT IGNORE INTO goods_receipt_notes
  (id, grn_ref, po_id, tenant_id, entity_id, entity_code, vendor_id,
   receipt_date, received_by, delivery_note_no, status, confirmed_at,
   created_by, created_at)
VALUES
  (@GRN1_ID, 'GRN-PTPL-2026-0001', @PO1_ID, 'tenant-default-001', 'entity-ptpl-001', 'PTPL', @VID_TCS,
   '2026-05-05', 'Deepak Nair', 'TCS-DN-2026-0421', 'confirmed', '2026-05-05 16:00:00',
   @UID_DEEPAK, '2026-05-05 15:30:00');

DELETE FROM grn_items WHERE grn_id = @GRN1_ID;
INSERT INTO grn_items
  (id, grn_id, po_item_id, tenant_id, line_number, item_description,
   qty_ordered, qty_received, qty_accepted, qty_rejected,
   unit, unit_price, line_amount)
SELECT UUID(), @GRN1_ID, poi.id, 'tenant-default-001', poi.line_number,
       poi.item_description, poi.quantity, 6, 6, 0,
       poi.unit, poi.unit_price, 6 * poi.unit_price
  FROM purchase_order_items poi
 WHERE poi.po_id = @PO1_ID
 ORDER BY poi.line_number;

-- ── GRN-2: PO-3 fully received (all 50 parts) ──────────────────────────────
INSERT IGNORE INTO goods_receipt_notes
  (id, grn_ref, po_id, tenant_id, entity_id, entity_code, vendor_id,
   receipt_date, received_by, delivery_note_no, status, confirmed_at,
   created_by, created_at)
VALUES
  (@GRN2_ID, 'GRN-PTPL-2026-0002', @PO3_ID, 'tenant-default-001', 'entity-ptpl-001', 'PTPL', @VID_RAJ,
   '2026-04-10', 'Deepak Nair', 'RTW-DN-2026-0034', 'confirmed', '2026-04-10 14:00:00',
   @UID_DEEPAK, '2026-04-10 13:30:00');

DELETE FROM grn_items WHERE grn_id = @GRN2_ID;
INSERT INTO grn_items
  (id, grn_id, po_item_id, tenant_id, line_number, item_description,
   qty_ordered, qty_received, qty_accepted, qty_rejected,
   unit, unit_price, line_amount)
SELECT UUID(), @GRN2_ID, poi.id, 'tenant-default-001', poi.line_number,
       poi.item_description, poi.quantity, poi.quantity, poi.quantity, 0,
       poi.unit, poi.unit_price, poi.quantity * poi.unit_price
  FROM purchase_order_items poi
 WHERE poi.po_id = @PO3_ID
 ORDER BY poi.line_number;

-- ── SRN-1: PO-2 1-month consumption of 3-month service ─────────────────────
INSERT IGNORE INTO service_receipt_notes
  (id, srn_ref, po_id, tenant_id, entity_id, entity_code, vendor_id,
   service_period_from, service_period_to, receipt_date, accepted_by,
   remarks, status, confirmed_at, created_by, created_at)
VALUES
  (@SRN1_ID, 'SRN-PTPL-2026-0001', @PO2_ID, 'tenant-default-001', 'entity-ptpl-001', 'PTPL', @VID_INF,
   '2026-06-01', '2026-06-30', '2026-06-30', 'Rohan Mehta',
   'June 2026 deliverables — interim cloud-readiness assessment report.',
   'confirmed', '2026-06-30 18:00:00', @UID_ROHAN, '2026-06-30 17:00:00');

DELETE FROM srn_items WHERE srn_id = @SRN1_ID;
INSERT INTO srn_items
  (id, srn_id, po_item_id, tenant_id, line_number, service_description,
   po_line_value, amount_consumed, consumption_pct, milestone, remarks)
SELECT UUID(), @SRN1_ID, poi.id, 'tenant-default-001', poi.line_number,
       poi.item_description, poi.line_amount, 116667.00, 33.33,
       'Month 1 of 3 — assessment phase',
       'Initial discovery + current-state report delivered.'
  FROM purchase_order_items poi
 WHERE poi.po_id = @PO2_ID
 ORDER BY poi.line_number;

-- ── INV-1: TCS, Queued for Payment, against PO-1 ───────────────────────────
INSERT IGNORE INTO p2p_schema_mt.invoices
  (id, invoice_number, invoice_date, due_date, vendor_name, vendor_id, currency,
   subtotal, tax_amount, total_amount, po_number, po_id, status, source,
   entity_id, processing_status, lifecycle_state, is_msme_vendor, tenant_id)
VALUES
  (@INV1_ID, 'TCS/2026/INV/4521', '2026-05-06', '2026-06-05',
   'Tata Consultancy Services Limited', @VID_TCS, 'INR',
   519000.00, 82200.00, 601200.00, 'PO-PTPL-2026-0001', @PO1_ID,
   'approved', 'manual_entry',
   'entity-ptpl-001', 'queued_for_payment', 'Queued for Payment', 0, 'tenant-default-001');

-- ── INV-2: Infosys BPM, Under Verification, against PO-2 ───────────────────
INSERT IGNORE INTO p2p_schema_mt.invoices
  (id, invoice_number, invoice_date, due_date, vendor_name, vendor_id, currency,
   subtotal, tax_amount, total_amount, po_number, po_id, status, source,
   entity_id, processing_status, lifecycle_state, is_msme_vendor, tenant_id)
VALUES
  (@INV2_ID, 'IBPM/2026/7832', '2026-07-01', '2026-07-31',
   'Infosys BPM Limited', @VID_INF, 'INR',
   116667.00, 21000.00, 137667.00, 'PO-PTPL-2026-0002', @PO2_ID,
   'pending_approval', 'manual_entry',
   'entity-ptpl-001', 'validation_in_progress', 'Under Verification', 0, 'tenant-default-001');

-- ── INV-3: Rajan Tooling, MSME, Queued for Payment (45-day demo) ──────────
INSERT IGNORE INTO p2p_schema_mt.invoices
  (id, invoice_number, invoice_date, due_date, vendor_name, vendor_id, currency,
   subtotal, tax_amount, total_amount, po_number, po_id, status, source,
   entity_id, processing_status, lifecycle_state, is_msme_vendor, tenant_id)
VALUES
  (@INV3_ID, 'RTW/2026/0891', '2026-03-25', '2026-04-24',
   'Rajan Tooling Works', @VID_RAJ, 'INR',
   62000.00, 11000.00, 73000.00, 'PO-PTPL-2026-0003', @PO3_ID,
   'approved', 'manual_entry',
   'entity-ptpl-001', 'queued_for_payment', 'Queued for Payment', 1, 'tenant-default-001');

-- ── INV-4: Shree Fab, Approved, no PO ──────────────────────────────────────
INSERT IGNORE INTO p2p_schema_mt.invoices
  (id, invoice_number, invoice_date, due_date, vendor_name, vendor_id, currency,
   subtotal, tax_amount, total_amount, status, source,
   entity_id, processing_status, lifecycle_state, is_msme_vendor, tenant_id)
VALUES
  (@INV4_ID, 'SFW/2026/0234', '2026-05-01', '2026-05-31',
   'Shree Fab Works Pvt Ltd', @VID_SHR, 'INR',
   25000.00, 3000.00, 28000.00, 'approved', 'manual_entry',
   'entity-ptpl-001', 'approved', 'Processed', 1, 'tenant-default-001');

-- ── ADV-1: Mahindra Logistics — procurement advance, approved ──────────────
INSERT IGNORE INTO vendor_advances
  (id, advance_ref, tenant_id, entity_id, vendor_id, vendor_name,
   requester_id, requester_name, department, cost_centre,
   purpose, advance_type, amount, currency, requested_date, required_by_date,
   status, approved_by, approved_at)
VALUES
  (@ADV1_ID, 'ADV-PTPL-2026-0001', 'tenant-default-001', 'entity-ptpl-001',
   @VID_MAH, 'Mahindra Logistics Limited',
   @UID_ANANYA, 'Ananya Sharma', 'Administration', 'CC-ADM-001',
   'Advance payment for facility management contract commencement (annual blanket kick-off).',
   'procurement', 100000.00, 'INR', '2026-04-15', '2026-05-15',
   'approved', @UID_ARUN, '2026-04-16 11:30:00');

-- ── ADV-2: Rohan Mehta — travel advance, queued for payment ────────────────
INSERT IGNORE INTO vendor_advances
  (id, advance_ref, tenant_id, entity_id, vendor_id, vendor_name,
   requester_id, requester_name, department, cost_centre,
   purpose, advance_type, amount, currency, requested_date, required_by_date,
   status, approved_by, approved_at, supporting_doc_url, supporting_doc_name)
VALUES
  (@ADV2_ID, 'ADV-PTPL-2026-0002', 'tenant-default-001', 'entity-ptpl-001',
   @UID_ROHAN, 'Rohan Mehta',
   @UID_ROHAN, 'Rohan Mehta', 'Information Technology', 'CC-IT-001',
   'Client visit to Bangalore — travel and accommodation for Infosys consulting kickoff (3 days).',
   'travel', 35000.00, 'INR', '2026-05-05', '2026-05-12',
   'queued_for_payment', @UID_ARUN, '2026-05-06 09:00:00',
   NULL, NULL);
