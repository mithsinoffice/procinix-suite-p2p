-- ============================================================================
-- ITEM MASTER SEEDS — 2026-05-10
-- ----------------------------------------------------------------------------
-- 25 generic Indian mid-market items spread across IT hardware, office
-- supplies, raw materials, services, MRO, packaging, and travel/admin. All
-- rows are tenant-scoped to tenant-default-001 with approval_status=Approved
-- and item_status=Active. Idempotent via INSERT IGNORE on the
-- uq_item_master_item_code UNIQUE index.
-- ============================================================================

USE item_master;

INSERT IGNORE INTO item_master (
  id, item_code, item_name, item_status, item_description, uom,
  procurement_category, expenditure_type, gl_account_code, gl_account_description,
  hsn_code, sac_code, gst_rate, po_required, approval_status, tenant_id
) VALUES
  -- IT Hardware
  (UUID(), 'ITM-IT-001', 'Dell Latitude 5520 Laptop', 'Active', 'Business laptop, 11th Gen Intel i5, 16GB RAM, 512GB SSD', 'Each', 'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals', '8471', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-002', 'HP LaserJet Pro MFP M428fdw', 'Active', 'Multifunction printer with print/scan/copy/fax', 'Each', 'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals', '8443', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-003', 'Logitech MX Master 3S Mouse', 'Active', 'Wireless ergonomic mouse', 'Each', 'IT Hardware', 'OPEX', '5601', 'IT Consumables', '8471', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-004', 'Dell 24-inch Monitor P2422H', 'Active', 'Full HD IPS monitor with USB-C', 'Each', 'IT Hardware', 'CAPEX', '1601', 'Computers & Peripherals', '8528', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-IT-005', 'TP-Link Archer C80 Router', 'Active', 'AC1900 dual-band Wi-Fi router', 'Each', 'IT Hardware', 'OPEX', '5601', 'IT Consumables', '8517', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  -- Office supplies
  (UUID(), 'ITM-OFF-001', 'A4 Copier Paper (500 sheets)', 'Active', '75 GSM A4 copy paper, 500-sheet pack', 'Pack', 'Office Supplies', 'OPEX', '5901', 'Office Supplies', '4802', NULL, '12', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-OFF-002', 'Ballpoint Pen (Blue, Pack of 10)', 'Active', 'Reynolds 045 fine-tip ballpoint pens', 'Pack', 'Office Supplies', 'OPEX', '5901', 'Office Supplies', '9608', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-OFF-003', 'Staples (Box of 5000)', 'Active', 'Standard 24/6 office staples', 'Box', 'Office Supplies', 'OPEX', '5901', 'Office Supplies', '8305', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-OFF-004', 'Whiteboard Marker Set (Pack of 4)', 'Active', 'Camlin assorted-colour dry-erase markers', 'Pack', 'Office Supplies', 'OPEX', '5901', 'Office Supplies', '9608', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-OFF-005', 'Notebook A5 (Pack of 5)', 'Active', '160-page hardbound A5 notebook', 'Pack', 'Office Supplies', 'OPEX', '5901', 'Office Supplies', '4820', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  -- Office furniture
  (UUID(), 'ITM-FUR-001', 'Ergonomic Office Chair', 'Active', 'Mesh-back chair, adjustable lumbar support', 'Each', 'Furniture', 'CAPEX', '1700', 'Furniture & Fixtures', '9401', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-FUR-002', 'Executive Desk (L-shape)', 'Active', '5x5 ft engineered wood desk with drawer unit', 'Each', 'Furniture', 'CAPEX', '1700', 'Furniture & Fixtures', '9403', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-FUR-003', 'Steel Filing Cabinet (4 drawer)', 'Active', 'Powder-coated steel filing cabinet', 'Each', 'Furniture', 'CAPEX', '1700', 'Furniture & Fixtures', '9403', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  -- Raw materials / packaging
  (UUID(), 'ITM-RAW-001', 'Mild Steel Sheet (1.2mm, 4x8 ft)', 'Active', 'Cold-rolled mild steel sheet, IS 513 grade', 'Sheet', 'Raw Materials', 'OPEX', '5001', 'Raw Materials', '7209', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-RAW-002', 'Aluminium Extrusion (per kg)', 'Active', '6063 T6 aluminium architectural section', 'Kg', 'Raw Materials', 'OPEX', '5001', 'Raw Materials', '7604', NULL, '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-PKG-001', 'Corrugated Box (Medium)', 'Active', '5-ply 18x12x12 in corrugated carton', 'Each', 'Packaging', 'OPEX', '5002', 'Packaging Materials', '4819', NULL, '12', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-PKG-002', 'Bubble Wrap Roll (1m x 100m)', 'Active', 'Air-bubble protective wrap', 'Roll', 'Packaging', 'OPEX', '5002', 'Packaging Materials', '3923', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  -- MRO / facility
  (UUID(), 'ITM-MRO-001', 'LED Tube Light (20W)', 'Active', 'Philips T8 LED batten 4ft, 20W cool daylight', 'Each', 'MRO', 'OPEX', '5701', 'Repairs & Maintenance', '8539', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-002', 'Hand Sanitizer (5 L)', 'Active', '70% IPA hand sanitizer, 5-litre can', 'Each', 'MRO', 'OPEX', '5701', 'Repairs & Maintenance', '3402', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-003', 'Floor Cleaning Liquid (5 L)', 'Active', 'Disinfectant floor cleaner concentrate', 'Each', 'MRO', 'OPEX', '5701', 'Repairs & Maintenance', '3402', NULL, '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-MRO-004', 'AC Service & Maintenance', 'Active', 'Quarterly preventive maintenance per unit', 'Each', 'MRO', 'OPEX', '5701', 'Repairs & Maintenance', NULL, '9987', '18', 'Yes', 'Approved', 'tenant-default-001'),
  -- Services
  (UUID(), 'ITM-SVC-001', 'Software Subscription (Annual)', 'Active', 'Generic SaaS software annual subscription', 'License', 'IT Services', 'OPEX', '5602', 'Software & Subscriptions', NULL, '9983', '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-SVC-002', 'Professional Consulting (per hour)', 'Active', 'Hourly billed consulting services', 'Hour', 'Professional Services', 'OPEX', '5301', 'Professional Fees', NULL, '9983', '18', 'Yes', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-SVC-003', 'Courier & Shipping (Domestic)', 'Active', 'Per-shipment domestic courier charge', 'Shipment', 'Logistics', 'OPEX', '5901', 'Office Supplies', NULL, '9968', '18', 'No', 'Approved', 'tenant-default-001'),
  (UUID(), 'ITM-SVC-004', 'Travel Booking (per trip)', 'Active', 'Domestic flight + hotel booking per business trip', 'Trip', 'Travel & Admin', 'OPEX', '5401', 'Travel & Conveyance', NULL, '9964', '5', 'No', 'Approved', 'tenant-default-001');
