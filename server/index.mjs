import { randomUUID, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { readFile, stat } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DIST_PATH = join(__dirname, '..', 'build');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webp': 'image/webp',
};

async function serveStaticFile(res, filePath) {
  try {
    const s = await stat(filePath);
    if (!s.isFile()) return false;
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': data.length,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}
import {
  pingDatabase,
  query,
  closePool,
  withTransaction,
  connExecute,
  getConnection as getMysqlConnection,
} from './mysql.mjs';
import {
  MASTER_STORAGE,
  getQualifiedAuditTableName,
  getQualifiedTableName,
} from './masterStorage.mjs';
import { sendVendorInvitationEmailServer } from './vendorInvitationMail.mjs';
import { sendPortalWelcomeEmailServer } from './portalWelcomeMail.mjs';
import {
  startEmailPoller,
  pollOnce,
  checkGeminiKey,
  restartEmailPoller,
} from './services/invoiceIngestion/emailPoller.mjs';
import {
  listSettings,
  setSetting,
  loadSettingsToEnv,
  onSettingsChange,
} from './services/settings/settingsStore.mjs';
import { processInvoiceEmail } from './services/invoiceIngestion/orchestrator.mjs';
import { extractInvoiceData } from './services/invoiceIngestion/geminiOCR.mjs';
import {
  validateInvoiceData,
  validateInvoiceDataWithPolicy,
} from './services/invoiceIngestion/validator.mjs';
import { matchToPO } from './services/invoiceIngestion/poMatcher.mjs';
import { createInvoiceFromExtraction } from './services/invoiceIngestion/invoiceCreator.mjs';
import { handleExceptions } from './services/invoiceIngestion/exceptionHandler.mjs';
import { triggerWorkflow } from './services/invoiceIngestion/workflowTrigger.mjs';
import {
  mapLegacyToLifecycle,
  mapProcessingStatusToLifecycle,
  LIFECYCLE_STATES,
} from './services/invoices/lifecycleMapping.mjs';
import { assertValidTransition } from './services/invoices/lifecycleTransitions.mjs';
import { processMatch } from './services/agents/matchAgent.mjs';
import {
  processInvoiceWithAgents,
  startAgentRetryScheduler,
  stopAgentRetryScheduler,
  resetAndRequeueInvoice,
} from './services/agents/orchestrator.mjs';
import { checkAndExitIfInvalid } from './services/startup/validateEnv.mjs';
import {
  authenticateUser,
  createSession,
  lookupSession,
  ensureSessionsTable,
} from './services/auth/loginService.mjs';
import { handleAuthRoute } from './routes/auth.mjs';
import { handleInvoiceRoute } from './routes/invoices.mjs';
import { handlePaymentsRoute } from './routes/payments.mjs';
import { handleAdvancesRoute } from './routes/advances.mjs';
import { handleProcurementRoute } from './routes/procurement.mjs';
import { loadAgent, runAgent, testAgent } from './services/agents/agentRunner.mjs';
import {
  verifyPAN,
  verifyPANComprehensive,
  verifyGSTIN,
  verifyBankAccount,
  verifyMSME,
} from './services/kyc/panVerification.mjs';
import { getForceClosurePreview, forceclosePO } from './services/po/forceClosure.mjs';
import {
  checkAndProcessExpiries,
  sendExpiryReminders,
  extendPO,
  getExpiringPOs,
} from './services/po/poExpiry.mjs';
import {
  createAmendment,
  approveAmendment,
  rejectAmendment,
  getAmendmentHistory,
  getAmendmentPreview,
} from './services/po/poAmendment.mjs';
import {
  approveItem,
  bulkApprove,
  getApprovalDetail,
  getApprovalKPIs,
  getApprovalQueue,
  getMSMEAlerts,
  getModuleCounts,
  rejectItem,
  startApprovalSyncLoop,
  triggerApprovalSync,
} from './services/approvals/approvalService.mjs';
import {
  listPayableInvoices,
  listPaymentBatches,
  getPaymentBatchDetail,
  createPaymentBatch,
  submitPaymentBatch,
  approvePaymentBatch,
  rejectPaymentBatch,
  executePaymentBatch,
} from './services/payments/paymentBatches.mjs';
import { getPaymentsDashboardPayload } from './services/payments/paymentsDashboard.mjs';
import {
  assertSuperAdminRequest,
  buildPlatformContext,
  createEntityForTenant,
  createTenant,
  listEntitiesForTenant,
  listTenants,
} from './services/tenant/tenantAdmin.mjs';
import cron from 'node-cron';

const MASTER_SCHEMA_NAMES = [
  ...new Set(Object.values(MASTER_STORAGE).map((storage) => storage.database)),
];
const PENDING_APPROVAL_STATUSES = ['Draft', 'Pending Approval', 'Pending', 'Changes Requested'];
let vendorLearningTableReady = false;
let fieldLearningTableReady = false;
let ocrLearningTablesReady = false;

async function ensureVendorLearningTable() {
  if (vendorLearningTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS p2p_schema_mt.ap_vendor_learning_map (
      id CHAR(36) PRIMARY KEY,
      entity_name VARCHAR(255) NOT NULL,
      source_vendor_name VARCHAR(255) NOT NULL DEFAULT '',
      source_vendor_gstin VARCHAR(32) NOT NULL DEFAULT '',
      master_vendor_name VARCHAR(255) NOT NULL,
      master_vendor_gstin VARCHAR(32) NOT NULL DEFAULT '',
      confidence DECIMAL(5,2) NOT NULL DEFAULT 100.00,
      learn_count INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ap_vendor_learning (entity_name, source_vendor_name, source_vendor_gstin)
    )
  `);
  vendorLearningTableReady = true;
}

async function ensureFieldLearningTable() {
  if (fieldLearningTableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS p2p_schema_mt.ap_field_learning_map (
      id CHAR(36) PRIMARY KEY,
      mapping_type VARCHAR(32) NOT NULL,
      entity_name VARCHAR(255) NOT NULL DEFAULT '',
      source_value VARCHAR(255) NOT NULL,
      mapped_value VARCHAR(255) NOT NULL,
      confidence DECIMAL(5,2) NOT NULL DEFAULT 100.00,
      learn_count INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_used_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ap_field_learning (mapping_type, entity_name, source_value)
    )
  `);
  fieldLearningTableReady = true;
}

async function ensureOcrLearningTables() {
  if (ocrLearningTablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS ocr_field_corrections (
      id VARCHAR(36) PRIMARY KEY,
      invoice_id VARCHAR(36),
      ingestion_log_id VARCHAR(36),
      vendor_id VARCHAR(36),
      entity_id VARCHAR(36),
      field_name VARCHAR(100) NOT NULL,
      ocr_extracted_value TEXT,
      correct_value TEXT,
      correction_type ENUM(
        'vendor_name_mapping',
        'gstin_ocr_error',
        'date_selection',
        'department_mapping',
        'amount_format',
        'custom'
      ) NOT NULL,
      correction_description TEXT,
      confirmed BOOLEAN DEFAULT FALSE,
      confirmed_by VARCHAR(36),
      confirmed_at DATETIME,
      applied_to_learning BOOLEAN DEFAULT FALSE,
      created_by VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vendor (vendor_id),
      INDEX idx_field (field_name),
      INDEX idx_confirmed (confirmed)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS ocr_learning_patterns (
      id VARCHAR(36) PRIMARY KEY,
      pattern_type ENUM(
        'vendor_name_alias',
        'character_confusion',
        'department_mapping',
        'date_position',
        'amount_format',
        'entity_mapping'
      ) NOT NULL,
      input_pattern TEXT NOT NULL,
      correct_output TEXT NOT NULL,
      vendor_id VARCHAR(36),
      entity_id VARCHAR(36),
      confidence_boost DECIMAL(5,2) DEFAULT 10.00,
      times_applied INT DEFAULT 0,
      times_correct INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_from_correction_id VARCHAR(36),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pattern_type (pattern_type),
      INDEX idx_vendor (vendor_id)
    )
  `);
  ocrLearningTablesReady = true;
}

// --- CORS ---
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

const IS_PRODUCTION_API = process.env.NODE_ENV === 'production';
/** Matches http(s)://localhost:PORT and http(s)://127.0.0.1:PORT (any port). */
const LOCAL_DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function getAllowedOrigin(req) {
  const origin = req.headers['origin'];
  if (!origin) {
    return undefined;
  }
  if (ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  // Avoid CORS whack-a-mole on local Vite ports (3000, 3001, …). Production still uses ALLOWED_ORIGINS only.
  if (!IS_PRODUCTION_API && LOCAL_DEV_ORIGIN_RE.test(origin)) {
    return origin;
  }
  return undefined;
}

// --- Auth ---
const API_KEY = process.env.API_SECRET_KEY || '';
const PUBLIC_PATHS = new Set(['/health', '/api/mysql/health', '/api/auth/login']);

async function isAuthenticated(req, pathname) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  // Vendor invite portal is semi-public (token in URL validates on its own)
  if (pathname === '/api/vendor-invitations/send') {
    // still require auth — only internal callers should send invites
  }

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!API_KEY) {
    // Auth disabled (dev mode) — but still populate req.user from session if token present.
    if (token) {
      const session = await lookupSession(token).catch(() => null);
      if (session) req.user = session;
    }
    return true;
  }

  if (!token) {
    return false;
  }

  // Service-to-service: timing-safe API key comparison
  try {
    const expected = Buffer.from(API_KEY, 'utf8');
    const received = Buffer.from(token, 'utf8');
    if (expected.length === received.length && timingSafeEqual(expected, received)) {
      return true;
    }
  } catch {
    // fall through to session check
  }

  // User session: look up SHA-256(token) in sessions table
  const session = await lookupSession(token).catch(() => null);
  if (session) {
    req.user = session;
    return true;
  }

  return false;
}
const MASTER_WORKFLOW_TARGETS = new Set([
  'Category Master',
  'Item Master',
  'Product Master',
  'Color Master',
  'Size Master',
  'Vendor Master',
  'SKU Master',
  'Contract Master',
  'Country Master',
  'State Master',
  'Tax Code Master',
  'Employee Master',
  'Department Master',
  'Cost Centre Master',
  'Profit Centre Master',
  'UOM Master',
  'Debit Note Reason Master',
  'Item Category Master',
  'Vendor Payment Terms Master',
  'Entity Master',
  'Currency Master',
  'Exchange Rate Master',
  'Roles Master',
  'User Master',
]);

function sendJson(res, statusCode, payload) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-User-Email, X-Tenant-Id, X-Entity-Id, X-User-Name, X-User-Id',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
  if (res._corsOrigin) {
    headers['Access-Control-Allow-Origin'] = res._corsOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function getRequestUserId(req) {
  const explicitUser = req.headers['x-user-id'];
  if (typeof explicitUser === 'string' && explicitUser.trim()) {
    return explicitUser.trim();
  }
  return '1';
}

function readApTenantId(req, url, body = {}) {
  const h = req.headers['x-tenant-id'] ?? req.headers['X-Tenant-Id'];
  if (h && String(h).trim()) return String(h).trim();
  if (body?.tenantId && String(body.tenantId).trim()) return String(body.tenantId).trim();
  const q = url?.searchParams?.get?.('tenantId');
  if (q && String(q).trim()) return String(q).trim();
  return '';
}

function readActorEmail(req) {
  return String(req.headers['x-user-email'] ?? req.headers['X-User-Email'] ?? '').trim();
}

function readActorName(req) {
  return String(req.headers['x-user-name'] ?? req.headers['X-User-Name'] ?? '').trim();
}

const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB

async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw Object.assign(new Error('Request body too large'), { statusCode: 413 });
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function parseMultipart(raw, boundary) {
  const parts = [];
  const sep = Buffer.from(`--${boundary}`);
  let start = 0;
  while (true) {
    const idx = raw.indexOf(sep, start);
    if (idx === -1) break;
    if (start > 0) {
      const chunk = raw.slice(start, idx);
      const headerEnd = chunk.indexOf('\r\n\r\n');
      if (headerEnd !== -1) {
        const headerStr = chunk.slice(0, headerEnd).toString('utf8');
        const body = chunk.slice(headerEnd + 4, chunk.length - 2); // strip trailing \r\n
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        const filenameMatch = headerStr.match(/filename="([^"]+)"/);
        const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i);
        parts.push({
          name: nameMatch?.[1] || '',
          filename: filenameMatch?.[1] || '',
          contentType: ctMatch?.[1]?.trim() || '',
          data: body,
        });
      }
    }
    start = idx + sep.length;
    if (raw[start] === 0x2d && raw[start + 1] === 0x2d) break; // --boundary--
    if (raw[start] === 0x0d) start += 2; // skip \r\n
  }
  return parts;
}

function mapItemRow(row) {
  return {
    id: row.id,
    itemCode: row.item_code,
    itemName: row.item_name,
    itemAlias: row.item_alias,
    itemStatus: row.item_status,
    itemDescription: row.item_description,
    uom: row.uom,
    itemGroupMaster: row.item_group_master,
    procurementCategory: row.procurement_category,
    entityName: row.entity_name,
    expenditureType: row.expenditure_type,
    glAccountCode: row.gl_account_code,
    glAccountDescription: row.gl_account_description,
    nature: row.nature,
    rcmApplicable: row.rcm_applicable,
    hsnCode: row.hsn_code,
    sacCode: row.sac_code,
    gstRate: row.gst_rate,
    defaultITCEligibility: row.default_itc_eligibility,
    poRequired: row.po_required,
    reorderLevel: row.reorder_level,
    maxOrderQty: row.max_order_qty,
    approvalStatus: row.approval_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonValue(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
}

function inferWorkflowCategory(moduleName) {
  return MASTER_WORKFLOW_TARGETS.has(moduleName) ? 'Masters' : 'Forms';
}

function mapGenericMasterRow(row) {
  const payload = parseJsonValue(row.payload, {}) ?? {};
  return {
    ...payload,
    id: row.id,
    approvalStatus: row.approval_status ?? payload.approvalStatus ?? null,
    createdAt: row.created_at ?? payload.createdAt ?? null,
    updatedAt: row.updated_at ?? payload.updatedAt ?? null,
  };
}

function inferRecordCode(record) {
  return (
    record.code ??
    record.categoryCode ??
    record.colorCode ??
    record.countryCode ??
    record.stateCode ??
    record.deptCode ??
    record.taxCode ??
    record.sizeCode ??
    record.costCentreCode ??
    record.profitCentreCode ??
    record.empCode ??
    record.contractId ??
    record.roleCode ??
    record.employeeId ??
    record.skuCode ??
    record.productCode ??
    record.fromCurrency ??
    null
  );
}

function inferRecordName(record) {
  return (
    record.name ??
    record.categoryName ??
    record.colorName ??
    record.countryName ??
    record.stateName ??
    record.deptName ??
    record.description ??
    record.sizeName ??
    record.costCentreName ??
    record.profitCentreName ??
    record.empName ??
    record.roleName ??
    record.productName ??
    record.legalName ??
    record.fromCurrency ??
    null
  );
}

function inferStatus(record) {
  if (typeof record.status === 'string') {
    return record.status;
  }

  if (typeof record.isActive === 'boolean') {
    return record.isActive ? 'Active' : 'Inactive';
  }

  return null;
}

function inferApprovalStatus(record) {
  return typeof record.approvalStatus === 'string' ? record.approvalStatus : null;
}

function mergeCanonicalMasterRecord(row) {
  const payload =
    typeof row?.payload === 'string'
      ? JSON.parse(row.payload || '{}')
      : row?.payload && typeof row.payload === 'object'
        ? row.payload
        : {};

  const approvalStatus = row?.approval_status ?? inferApprovalStatus(payload);
  const status = row?.status ?? inferStatus(payload);
  const recordCode = row?.record_code ?? inferRecordCode(payload);
  const recordName = row?.record_name ?? inferRecordName(payload);

  return {
    ...payload,
    id: String(row?.id ?? payload?.id ?? ''),
    ...(recordCode ? { code: payload?.code ?? recordCode, recordCode } : {}),
    ...(recordName ? { recordName } : {}),
    ...(status ? { status, isActive: String(status).toLowerCase() !== 'inactive' } : {}),
    ...(approvalStatus ? { approvalStatus } : {}),
  };
}

function resolveNextApprovalStatus(previousRecord, incomingRecord) {
  const previousApprovalStatus = inferApprovalStatus(previousRecord);
  const incomingApprovalStatus = inferApprovalStatus(incomingRecord);
  const terminalStatuses = new Set(['Approved', 'Rejected']);

  if (
    terminalStatuses.has(previousApprovalStatus || '') &&
    !terminalStatuses.has(incomingApprovalStatus || '')
  ) {
    return previousApprovalStatus;
  }

  return incomingApprovalStatus ?? previousApprovalStatus ?? null;
}

const auditTableConfigCache = new Map();

async function getAuditTableConfig(masterKey) {
  if (auditTableConfigCache.has(masterKey)) {
    return auditTableConfigCache.get(masterKey);
  }

  const storage = MASTER_STORAGE?.[masterKey];
  const schema = storage?.database;
  const table = storage?.auditTable;
  const auditTableName = getQualifiedAuditTableName(masterKey);

  const fallback = {
    auditTableName,
    recordIdColumn: 'record_id',
    changedAtColumn: 'changed_at',
    versionNoColumn: null,
  };

  if (!schema || !table || !auditTableName) {
    auditTableConfigCache.set(masterKey, fallback);
    return fallback;
  }

  try {
    const rows = await query(
      `
        SELECT COLUMN_NAME AS columnName
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ?
          AND TABLE_NAME = ?
      `,
      [schema, table]
    );

    const cols = new Set((rows || []).map((r) => r.columnName));

    const recordIdColumn = cols.has('record_id')
      ? 'record_id'
      : cols.has('recordId')
        ? 'recordId'
        : cols.has('master_record_id')
          ? 'master_record_id'
          : null;

    const changedAtColumn = cols.has('changed_at')
      ? 'changed_at'
      : cols.has('created_at')
        ? 'created_at'
        : null;

    const versionNoColumn = cols.has('version_no') ? 'version_no' : null;

    const cfg = { auditTableName, recordIdColumn, changedAtColumn, versionNoColumn };
    auditTableConfigCache.set(masterKey, cfg);
    return cfg;
  } catch {
    auditTableConfigCache.set(masterKey, fallback);
    return fallback;
  }
}

async function appendMasterVersion(
  masterKey,
  recordId,
  oldValues,
  newValues,
  actionType,
  conn = null
) {
  const auditTableName = getQualifiedAuditTableName(masterKey);
  if (!auditTableName) {
    return;
  }

  const cfg = await getAuditTableConfig(masterKey);
  if (!cfg?.recordIdColumn) {
    return;
  }

  const execFn = conn ? (sql, params) => connExecute(conn, sql, params) : query;

  // Some older audit tables use (master_record_id, version_no, created_at) instead of (record_id, changed_at).
  let nextVersionNo = null;
  if (cfg.versionNoColumn) {
    const vr = await execFn(
      `
        SELECT COALESCE(MAX(${cfg.versionNoColumn}), 0) + 1 AS nextVersionNo
        FROM ${auditTableName}
        WHERE ${cfg.recordIdColumn} = ?
      `,
      [recordId]
    );
    nextVersionNo = Number(vr?.[0]?.nextVersionNo || 1);
  }

  const insertColumns = [
    'id',
    cfg.recordIdColumn,
    'action_type',
    'old_values',
    'new_values',
    ...(cfg.versionNoColumn ? [cfg.versionNoColumn] : []),
    ...(cfg.changedAtColumn ? [cfg.changedAtColumn] : []),
  ];

  const insertValues = [
    '?',
    '?',
    '?',
    'CAST(? AS JSON)',
    'CAST(? AS JSON)',
    ...(cfg.versionNoColumn ? ['?'] : []),
    ...(cfg.changedAtColumn ? ['CURRENT_TIMESTAMP(6)'] : []),
  ];

  const params = [
    randomUUID(),
    recordId,
    actionType,
    JSON.stringify(oldValues ?? {}),
    JSON.stringify(newValues ?? {}),
    ...(cfg.versionNoColumn ? [nextVersionNo] : []),
  ];

  await execFn(
    `INSERT INTO ${auditTableName} (${insertColumns.join(', ')}) VALUES (${insertValues.join(', ')})`,
    params
  );
}

async function getPendingApprovalRows(masterKey) {
  const tableName = getQualifiedTableName(masterKey);
  if (!tableName) {
    return [];
  }

  if (masterKey === 'item_master') {
    const rows = await query(
      `
        SELECT *
        FROM ${tableName}
        WHERE approval_status IN (${PENDING_APPROVAL_STATUSES.map(() => '?').join(', ')})
        ORDER BY updated_at ASC
      `,
      PENDING_APPROVAL_STATUSES
    );

    return rows.map((row) => ({
      masterKey,
      recordId: row.id,
      record: mapItemRow(row),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  const rows = await query(
    `
      SELECT id, payload, approval_status, created_at, updated_at
      FROM ${tableName}
      WHERE approval_status IN (${PENDING_APPROVAL_STATUSES.map(() => '?').join(', ')})
      ORDER BY updated_at ASC
    `,
    PENDING_APPROVAL_STATUSES
  );

  return rows.map((row) => ({
    masterKey,
    recordId: row.id,
    record: mapGenericMasterRow(row),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

async function getLatestAuditEntry(masterKey, recordId) {
  const auditTableName = getQualifiedAuditTableName(masterKey);
  if (!auditTableName) {
    return null;
  }

  const cfg = await getAuditTableConfig(masterKey);
  if (!cfg?.recordIdColumn) {
    return null;
  }
  const recordIdColumn = cfg.recordIdColumn;
  const changedAtColumn = cfg.changedAtColumn || 'changed_at';
  const orderBits = [
    cfg.changedAtColumn ? `${changedAtColumn} DESC` : null,
    cfg.versionNoColumn ? `${cfg.versionNoColumn} DESC` : null,
    'id DESC',
  ].filter(Boolean);

  const rows = await query(
    `
      SELECT action_type, old_values, new_values, ${changedAtColumn} AS changed_at
      FROM ${auditTableName}
      WHERE ${recordIdColumn} = ?
      ORDER BY ${orderBits.join(', ')}
      LIMIT 1
    `,
    [recordId]
  );

  if (!rows[0]) {
    return null;
  }

  return {
    actionType: rows[0].action_type,
    oldValues: parseJsonValue(rows[0].old_values, {}) ?? {},
    newValues: parseJsonValue(rows[0].new_values, {}) ?? {},
    changedAt: rows[0].changed_at,
  };
}

function applyApprovalActionToRecord(record, nextStatus, action, actor, comments) {
  const nowIso = new Date().toISOString();
  const nextRecord = {
    ...record,
    approvalStatus: nextStatus,
    updatedAt: nowIso,
  };

  if (action === 'approve') {
    nextRecord.originalData = undefined;
    nextRecord.approvedBy = actor || nextRecord.approvedBy;
    nextRecord.approvedDate = nowIso.split('T')[0];
  }

  if (action === 'reject') {
    nextRecord.rejectedBy = actor || nextRecord.rejectedBy;
    nextRecord.rejectedDate = nowIso.split('T')[0];
    if (comments) {
      nextRecord.rejectionReason = comments;
    }
  }

  if (action === 'request_info') {
    nextRecord.requestedInfoBy = actor || nextRecord.requestedInfoBy;
    nextRecord.requestedInfoDate = nowIso.split('T')[0];
    if (comments) {
      nextRecord.requestInfoComments = comments;
    }
  }

  return nextRecord;
}

async function updateGenericMasterApproval(
  masterKey,
  recordId,
  nextStatus,
  action,
  actor,
  comments
) {
  const tableName = getQualifiedTableName(masterKey);
  const auditTableName = getQualifiedAuditTableName(masterKey);

  return withTransaction(async (conn) => {
    const rows = await connExecute(
      conn,
      `
        SELECT id, payload, approval_status, created_at, updated_at
        FROM ${tableName}
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [recordId]
    );

    if (!rows[0]) {
      return null;
    }

    const previousRecord = mapGenericMasterRow(rows[0]);
    const updatedRecord = applyApprovalActionToRecord(
      previousRecord,
      nextStatus,
      action,
      actor,
      comments
    );

    await connExecute(
      conn,
      `
        UPDATE ${tableName}
        SET
          record_code = ?,
          record_name = ?,
          status = ?,
          approval_status = ?,
          payload = CAST(? AS JSON),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [
        inferRecordCode(updatedRecord),
        inferRecordName(updatedRecord),
        inferStatus(updatedRecord),
        inferApprovalStatus(updatedRecord),
        JSON.stringify(updatedRecord),
        recordId,
      ]
    );

    if (auditTableName) {
      await appendMasterVersion(
        masterKey,
        recordId,
        previousRecord,
        {
          ...updatedRecord,
          _workflowActor: actor,
          _workflowComments: comments,
        },
        action.toUpperCase(),
        conn
      );
    }

    return updatedRecord;
  });
}

async function updateItemApproval(recordId, nextStatus, action, actor, comments) {
  const tableName = getQualifiedTableName('item_master');
  const auditTableName = getQualifiedAuditTableName('item_master');

  return withTransaction(async (conn) => {
    const rows = await connExecute(
      conn,
      `
        SELECT *
        FROM ${tableName}
        WHERE id = ?
        LIMIT 1
        FOR UPDATE
      `,
      [recordId]
    );

    if (!rows[0]) {
      return null;
    }

    const previousRecord = mapItemRow(rows[0]);
    const updatedRecord = applyApprovalActionToRecord(
      previousRecord,
      nextStatus,
      action,
      actor,
      comments
    );

    await connExecute(
      conn,
      `
        UPDATE ${tableName}
        SET approval_status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [nextStatus, recordId]
    );

    if (auditTableName) {
      await appendMasterVersion(
        'item_master',
        recordId,
        previousRecord,
        {
          ...updatedRecord,
          _workflowActor: actor,
          _workflowComments: comments,
        },
        action.toUpperCase(),
        conn
      );
    }

    return updatedRecord;
  });
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    return sendJson(res, 400, { ok: false, error: 'Invalid request' });
  }

  res._corsOrigin = getAllowedOrigin(req);

  if (req.method === 'OPTIONS') {
    const headers = {
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, X-User-Email, X-Tenant-Id, X-Entity-Id, X-User-Name, X-User-Id',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
    if (res._corsOrigin) {
      headers['Access-Control-Allow-Origin'] = res._corsOrigin;
      headers['Vary'] = 'Origin';
    }
    res.writeHead(204, headers);
    return res.end();
  }

  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname;

  // Auth gate
  if (!(await isAuthenticated(req, pathname))) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  try {
    // Auth routes (POST /api/auth/login — also in PUBLIC_PATHS, handled here for consistency)
    if (await handleAuthRoute(req, res, pathname, sendJson)) return;
    if (await handleInvoiceRoute(req, res, pathname, sendJson)) return;
    if (await handlePaymentsRoute(req, res, pathname, sendJson)) return;
    if (await handleAdvancesRoute(req, res, pathname, sendJson)) return;
    if (await handleProcurementRoute(req, res, pathname, sendJson)) return;

    if (req.method === 'POST' && pathname === '/api/auth/platform-context') {
      const body = await readJsonBody(req);
      const out = await buildPlatformContext(body);
      const status = out.ok
        ? 200
        : out.error === 'invalid_credentials' || out.error === 'tenant_code_mismatch'
          ? 401
          : 400;
      return sendJson(res, status, out);
    }

    if (req.method === 'GET' && pathname === '/api/admin/tenants') {
      try {
        assertSuperAdminRequest(req);
      } catch (e) {
        return sendJson(res, e.statusCode || 403, { success: false, error: e.message });
      }
      const rows = await listTenants();
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'POST' && pathname === '/api/admin/tenants') {
      try {
        assertSuperAdminRequest(req);
      } catch (e) {
        return sendJson(res, e.statusCode || 403, { success: false, error: e.message });
      }
      const body = await readJsonBody(req);
      try {
        const row = await createTenant(body);
        return sendJson(res, 201, { success: true, data: row });
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          return sendJson(res, 409, { success: false, error: 'duplicate_tenant_code' });
        }
        throw e;
      }
    }

    // Simple entities listing for regular users (no admin gate)
    if (req.method === 'GET' && pathname === '/api/entities') {
      const rows = await query(
        'SELECT id, name, code, tenant_id, is_default FROM entities ORDER BY is_default DESC, name ASC'
      );
      return sendJson(res, 200, { success: true, data: rows });
    }

    const adminEntitiesMatch = pathname.match(/^\/api\/admin\/tenants\/([^/]+)\/entities$/);
    if (adminEntitiesMatch && req.method === 'GET') {
      try {
        assertSuperAdminRequest(req);
      } catch (e) {
        return sendJson(res, e.statusCode || 403, { success: false, error: e.message });
      }
      const tenantId = decodeURIComponent(adminEntitiesMatch[1]);
      const data = await listEntitiesForTenant(tenantId);
      return sendJson(res, 200, { success: true, data });
    }

    if (adminEntitiesMatch && req.method === 'POST') {
      try {
        assertSuperAdminRequest(req);
      } catch (e) {
        return sendJson(res, e.statusCode || 403, { success: false, error: e.message });
      }
      const tenantId = decodeURIComponent(adminEntitiesMatch[1]);
      const body = await readJsonBody(req);
      try {
        const row = await createEntityForTenant(tenantId, body);
        return sendJson(res, 201, { success: true, data: row });
      } catch (e) {
        if (e.statusCode) {
          return sendJson(res, e.statusCode, { success: false, error: e.message });
        }
        throw e;
      }
    }

    if (req.method === 'GET' && pathname === '/health') {
      const database = await pingDatabase();
      return sendJson(res, 200, {
        ok: true,
        database,
        env: process.env.NODE_ENV || 'development',
        version: '1.0.0',
      });
    }

    if (req.method === 'GET' && pathname === '/api/mysql/health') {
      const database = await pingDatabase();
      const tables = await query(
        `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = ?
          ORDER BY table_name
        `,
        [process.env.MYSQL_DATABASE]
      );
      const masterSchemas = await query(
        `
          SELECT schema_name
          FROM information_schema.schemata
          WHERE schema_name IN (${MASTER_SCHEMA_NAMES.map(() => '?').join(', ')})
          ORDER BY schema_name
        `,
        MASTER_SCHEMA_NAMES
      );

      return sendJson(res, 200, { ok: true, database, tables, masterSchemas });
    }

    if (req.method === 'GET' && pathname === '/api/master-approvals/pending') {
      const pendingByMaster = await Promise.all(
        Object.keys(MASTER_STORAGE).map(async (masterKey) => {
          const items = await getPendingApprovalRows(masterKey);
          const enriched = await Promise.all(
            items.map(async (item) => ({
              ...item,
              latestAudit: await getLatestAuditEntry(masterKey, item.recordId),
            }))
          );
          return enriched;
        })
      );

      return sendJson(res, 200, { success: true, data: pendingByMaster.flat() });
    }

    if (req.method === 'POST' && pathname.startsWith('/api/master-approvals/')) {
      const [, , , masterKey, recordId, actionSegment] = pathname.split('/');
      if (actionSegment !== 'actions' || !masterKey || !recordId) {
        return sendJson(res, 404, { success: false, error: 'Route not found' });
      }

      const body = await readJsonBody(req);
      const action = body?.action;
      const actor = typeof body?.actor === 'string' ? body.actor : 'Approver';
      const comments = typeof body?.comments === 'string' ? body.comments : '';

      if (!['approve', 'reject', 'request_info'].includes(action)) {
        return sendJson(res, 400, { success: false, error: 'Unsupported approval action' });
      }

      const nextStatus =
        action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Changes Requested';

      const updatedRecord =
        masterKey === 'item_master'
          ? await updateItemApproval(recordId, nextStatus, action, actor, comments)
          : await updateGenericMasterApproval(
              masterKey,
              recordId,
              nextStatus,
              action,
              actor,
              comments
            );

      if (!updatedRecord) {
        return sendJson(res, 404, { success: false, error: 'Master record not found' });
      }

      return sendJson(res, 200, { success: true, data: updatedRecord });
    }

    if (req.method === 'GET' && pathname === '/api/approvals/queue') {
      try {
        const approverId = getRequestUserId(req);
        const filters = {
          module: url.searchParams.get('module') || undefined,
          priority: url.searchParams.get('priority') || undefined,
          page: url.searchParams.get('page') || undefined,
          limit: url.searchParams.get('limit') || undefined,
        };
        const db = {
          execute: async (sql, params = []) => [await query(sql, params)],
          getConnection: getMysqlConnection,
        };
        triggerApprovalSync(db, approverId);
        const rows = await getApprovalQueue(approverId, filters, db);
        return sendJson(res, 200, rows);
      } catch (error) {
        console.error('[Approvals] queue error', error);
        return sendJson(res, 500, { success: false, error: 'Failed to fetch approval queue' });
      }
    }

    if (req.method === 'GET' && pathname === '/api/approvals/kpis') {
      try {
        const approverId = getRequestUserId(req);
        const year = Number(url.searchParams.get('year') || new Date().getFullYear());
        const data = await getApprovalKPIs(approverId, year, {
          execute: async (sql, params = []) => [await query(sql, params)],
        });
        return sendJson(res, 200, data);
      } catch (error) {
        console.error('[Approvals] kpis error', error);
        return sendJson(res, 500, { success: false, error: 'Failed to fetch KPI data' });
      }
    }

    if (req.method === 'GET' && pathname === '/api/approvals/module-counts') {
      try {
        const approverId = getRequestUserId(req);
        const data = await getModuleCounts(approverId, {
          execute: async (sql, params = []) => [await query(sql, params)],
        });
        return sendJson(res, 200, data);
      } catch (error) {
        console.error('[Approvals] module counts error', error);
        return sendJson(res, 500, { success: false, error: 'Failed to fetch module counts' });
      }
    }

    if (req.method === 'POST' && pathname === '/api/approvals/bulk-approve') {
      try {
        const approverId = getRequestUserId(req);
        const body = await readJsonBody(req);
        const approvalIds = Array.isArray(body?.approval_ids) ? body.approval_ids : [];
        if (approvalIds.length === 0) {
          return sendJson(res, 400, { success: false, error: 'approval_ids is required' });
        }
        const result = await bulkApprove(
          approvalIds,
          approverId,
          { getConnection: getMysqlConnection },
          body?.comments || 'Bulk approved'
        );
        return sendJson(res, 200, result);
      } catch (error) {
        console.error('[Approvals] bulk approve error', error);
        return sendJson(res, 500, { success: false, error: 'Bulk approve failed' });
      }
    }

    if (req.method === 'GET' && pathname === '/api/approvals/msme-alerts') {
      try {
        const approverId = getRequestUserId(req);
        const data = await getMSMEAlerts(approverId, {
          execute: async (sql, params = []) => [await query(sql, params)],
          getConnection: getMysqlConnection,
        });
        return sendJson(res, 200, data);
      } catch (error) {
        console.error('[Approvals] MSME alerts error', error);
        return sendJson(res, 500, { success: false, error: 'Failed to fetch MSME alerts' });
      }
    }

    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/approvals/') &&
      pathname.endsWith('/detail')
    ) {
      try {
        const approverId = getRequestUserId(req);
        const approvalId = pathname.split('/')[3];
        const data = await getApprovalDetail(approvalId, approverId, {
          execute: async (sql, params = []) => [await query(sql, params)],
        });
        if (!data) {
          return sendJson(res, 404, { success: false, error: 'Approval item not found' });
        }
        return sendJson(res, 200, data);
      } catch (error) {
        console.error('[Approvals] detail error', error);
        return sendJson(res, 500, { success: false, error: 'Failed to fetch approval detail' });
      }
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/approvals/') &&
      pathname.endsWith('/approve')
    ) {
      try {
        const approverId = getRequestUserId(req);
        const approvalId = pathname.split('/')[3];
        const body = await readJsonBody(req);
        const result = await approveItem(approvalId, approverId, body?.comments || null, {
          getConnection: getMysqlConnection,
        });
        const detail = await getApprovalDetail(approvalId, approverId, {
          execute: async (sql, params = []) => [await query(sql, params)],
        });
        return sendJson(res, 200, { ...result, item: detail });
      } catch (error) {
        console.error('[Approvals] approve error', error);
        return sendJson(res, 400, { success: false, error: error.message || 'Approve failed' });
      }
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/approvals/') &&
      pathname.endsWith('/reject')
    ) {
      try {
        const approverId = getRequestUserId(req);
        const approvalId = pathname.split('/')[3];
        const body = await readJsonBody(req);
        if (!body?.reason || !String(body.reason).trim()) {
          return sendJson(res, 400, { success: false, error: 'reason is required' });
        }
        const result = await rejectItem(approvalId, approverId, String(body.reason).trim(), {
          getConnection: getMysqlConnection,
        });
        return sendJson(res, 200, result);
      } catch (error) {
        console.error('[Approvals] reject error', error);
        return sendJson(res, 400, { success: false, error: error.message || 'Reject failed' });
      }
    }

    // ── App settings (integrations) ─────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/settings') {
      const settings = await listSettings();
      return sendJson(res, 200, { success: true, data: settings });
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/settings/')) {
      const key = decodeURIComponent(pathname.replace('/api/settings/', ''));
      const body = await readJsonBody(req);
      try {
        await setSetting(key, body.value, { updatedBy: body.updatedBy || null });
        return sendJson(res, 200, { success: true });
      } catch (err) {
        return sendJson(res, 400, { success: false, error: err.message });
      }
    }

    // ── KYC Verification endpoints (Ongrid Gridlines) ───────────────
    if (req.method === 'POST' && pathname === '/api/kyc/verify-pan') {
      const body = await readJsonBody(req);
      if (body.consent !== 'Y' && body.consent !== true) {
        return sendJson(res, 400, {
          success: false,
          error: 'Vendor consent required (consent="Y") before KYC verification.',
        });
      }
      const result = await verifyPAN(query, body.pan, { reason: body.reason });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === 'POST' && pathname === '/api/kyc/verify-pan-comprehensive') {
      const body = await readJsonBody(req);
      if (body.consent !== 'Y' && body.consent !== true) {
        return sendJson(res, 400, {
          success: false,
          error: 'Vendor consent required (consent="Y") before KYC verification.',
        });
      }
      const result = await verifyPANComprehensive(query, body.pan, { reason: body.reason });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === 'POST' && pathname === '/api/kyc/verify-gstin') {
      const body = await readJsonBody(req);
      if (body.consent !== 'Y' && body.consent !== true) {
        return sendJson(res, 400, {
          success: false,
          error: 'Vendor consent required (consent="Y") before KYC verification.',
        });
      }
      const result = await verifyGSTIN(query, body.gstin, { reason: body.reason });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === 'POST' && pathname === '/api/kyc/verify-bank') {
      const body = await readJsonBody(req);
      if (body.consent !== 'Y' && body.consent !== true) {
        return sendJson(res, 400, {
          success: false,
          error: 'Vendor consent required (consent="Y") before KYC verification.',
        });
      }
      const result = await verifyBankAccount(query, body.account_number, body.ifsc, {
        reason: body.reason,
      });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === 'POST' && pathname === '/api/kyc/verify-msme') {
      const body = await readJsonBody(req);
      if (body.consent !== 'Y' && body.consent !== true) {
        return sendJson(res, 400, {
          success: false,
          error: 'Vendor consent required (consent="Y") before KYC verification.',
        });
      }
      const result = await verifyMSME(query, body.udyam_number, { reason: body.reason });
      return sendJson(res, result.success ? 200 : 400, result);
    }

    if (req.method === 'POST' && pathname === '/api/vendor-invitations/send') {
      const body = await readJsonBody(req);
      const result = await sendVendorInvitationEmailServer(body);
      if (!result.ok) {
        return sendJson(res, result.status ?? 400, { success: false, error: result.error });
      }
      return sendJson(res, 200, {
        success: true,
        ...(result.mock ? { mock: true } : {}),
      });
    }

    if (req.method === 'POST' && pathname === '/api/portal-users/welcome-email') {
      const body = await readJsonBody(req);
      const result = await sendPortalWelcomeEmailServer(body);
      if (!result.ok) {
        return sendJson(res, result.status ?? 400, { success: false, error: result.error });
      }
      return sendJson(res, 200, {
        success: true,
        ...(result.mock ? { mock: true } : {}),
      });
    }

    if (req.method === 'GET' && pathname.startsWith('/api/documents/')) {
      const domain = pathname.replace('/api/documents/', '');
      const rows = await query(
        `
          SELECT payload
          FROM domain_documents
          WHERE domain_name = ?
          LIMIT 1
        `,
        [domain]
      );

      const payload = rows[0]?.payload
        ? typeof rows[0].payload === 'string'
          ? JSON.parse(rows[0].payload)
          : rows[0].payload
        : null;

      return sendJson(res, 200, { success: true, payload });
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/documents/')) {
      const domain = pathname.replace('/api/documents/', '');
      const body = await readJsonBody(req);
      const payload = body?.payload ?? {};

      await query(
        `
          INSERT INTO domain_documents (domain_name, payload)
          VALUES (?, CAST(? AS JSON))
          ON DUPLICATE KEY UPDATE
            payload = VALUES(payload),
            updated_at = CURRENT_TIMESTAMP
        `,
        [domain, JSON.stringify(payload)]
      );

      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'GET' && pathname === '/api/items') {
      const tableName = getQualifiedTableName('item_master');
      const rows = await query(
        `
          SELECT *
          FROM ${tableName}
          ORDER BY updated_at DESC, created_at DESC
        `
      );

      return sendJson(res, 200, { success: true, data: rows.map(mapItemRow) });
    }

    if (req.method === 'GET' && pathname.startsWith('/api/masters/')) {
      const masterKey = pathname.replace('/api/masters/', '');
      const tableName = getQualifiedTableName(masterKey);
      if (!tableName) {
        return sendJson(res, 404, {
          success: false,
          error: `Unsupported master key: ${masterKey}`,
        });
      }

      // item_master has a non-erp_master_* schema (item_code/item_name/uom/
      // hsn_code/gst_rate/...) — projecting the canonical record_code/
      // record_name/payload shape inline keeps `/api/masters/item_master`
      // compatible with every generic master consumer without breaking the
      // dedicated `/api/items` endpoint above.
      if (masterKey === 'item_master') {
        const rows = await query(
          `SELECT * FROM ${tableName} ORDER BY updated_at DESC, created_at DESC`
        );
        const records = rows.map((row) => {
          const item = mapItemRow(row);
          return mergeCanonicalMasterRecord({
            id: item.id,
            record_code: item.itemCode ?? null,
            record_name: item.itemName ?? null,
            status: item.itemStatus ?? null,
            approval_status: item.approvalStatus ?? null,
            payload: item,
            updated_at: item.updatedAt ?? null,
          });
        });
        return sendJson(res, 200, { success: true, data: records });
      }

      const rows = await query(
        `
          SELECT id, record_code, record_name, status, approval_status, payload, updated_at
          FROM ${tableName}
          ORDER BY
            COALESCE(record_code, '') ASC,
            COALESCE(record_name, '') ASC,
            id ASC
        `
      );

      const records = rows.map((row) => mergeCanonicalMasterRecord(row));

      return sendJson(res, 200, { success: true, data: records });
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/masters/')) {
      const masterKey = pathname.replace('/api/masters/', '');
      const tableName = getQualifiedTableName(masterKey);
      if (!tableName) {
        return sendJson(res, 404, {
          success: false,
          error: `Unsupported master key: ${masterKey}`,
        });
      }

      const body = await readJsonBody(req);
      const records = Array.isArray(body.records) ? body.records : [];
      const purgeAbsent = body.purgeAbsent === true;
      const existingRows = await query(
        `
          SELECT id, record_code, record_name, status, approval_status, payload
          FROM ${tableName}
        `
      );

      const existingById = new Map(
        existingRows.map((row) => [row.id, mergeCanonicalMasterRecord(row)])
      );

      const seenIds = new Set();
      for (const record of records) {
        const id = String(record?.id ?? randomUUID());
        const previous = existingById.get(id) ?? null;
        const nextApprovalStatus = resolveNextApprovalStatus(previous, record);
        const nextStatus = inferStatus(record) ?? inferStatus(previous ?? {}) ?? null;
        const payload = {
          ...(previous ?? {}),
          ...record,
          id,
          ...(nextStatus
            ? { status: nextStatus, isActive: String(nextStatus).toLowerCase() !== 'inactive' }
            : {}),
          ...(nextApprovalStatus ? { approvalStatus: nextApprovalStatus } : {}),
        };

        await query(
          `
            INSERT INTO ${tableName} (
              id,
              record_code,
              record_name,
              status,
              approval_status,
              payload
            ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
            ON DUPLICATE KEY UPDATE
              record_code = VALUES(record_code),
              record_name = VALUES(record_name),
              status = VALUES(status),
              approval_status = VALUES(approval_status),
              payload = VALUES(payload),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            id,
            inferRecordCode(payload),
            inferRecordName(payload),
            nextStatus,
            nextApprovalStatus,
            JSON.stringify(payload),
          ]
        );

        await appendMasterVersion(
          masterKey,
          id,
          previous ?? {},
          payload,
          previous ? 'UPDATE' : 'CREATE'
        );

        seenIds.add(id);
      }

      let deletedCount = 0;
      if (purgeAbsent) {
        for (const [id, previous] of existingById.entries()) {
          if (seenIds.has(id)) {
            continue;
          }

          await query(
            `
              DELETE FROM ${tableName}
              WHERE id = ?
            `,
            [id]
          );

          await appendMasterVersion(masterKey, id, previous, {}, 'DELETE');
          deletedCount++;
        }
      }

      return sendJson(res, 200, { success: true, count: records.length, deletedCount });
    }

    if (req.method === 'GET' && pathname === '/api/workflows/approval-levels') {
      const rows = await query(
        `
          SELECT
            id,
            workflow_name AS workflowName,
            min_amount AS minAmount,
            max_amount AS maxAmount,
            approver,
            status
          FROM approval_workflows
          ORDER BY created_at ASC
        `
      );

      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'PUT' && pathname === '/api/workflows/approval-levels') {
      const body = await readJsonBody(req);
      const workflows = Array.isArray(body.workflows) ? body.workflows : [];
      const existingRows = await query('SELECT id FROM approval_workflows');
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set();

      for (const workflow of workflows) {
        const id = String(workflow?.id ?? randomUUID());
        incomingIds.add(id);

        await query(
          `
            INSERT INTO approval_workflows (
              id,
              workflow_name,
              min_amount,
              max_amount,
              approver,
              status
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              workflow_name = VALUES(workflow_name),
              min_amount = VALUES(min_amount),
              max_amount = VALUES(max_amount),
              approver = VALUES(approver),
              status = VALUES(status),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            id,
            workflow.workflowName ?? '',
            workflow.minAmount ?? '',
            workflow.maxAmount ?? '',
            workflow.approver ?? '',
            workflow.status ?? 'Active',
          ]
        );
      }

      for (const id of existingIds) {
        if (!incomingIds.has(id)) {
          await query('DELETE FROM approval_workflows WHERE id = ?', [id]);
        }
      }

      return sendJson(res, 200, { success: true, count: workflows.length });
    }

    if (req.method === 'GET' && pathname === '/api/workflows/configurations') {
      const rows = await query(
        `
          SELECT
            id,
            workflow_name AS workflowName,
            module_name AS module,
            description,
            trigger_event AS triggerEvent,
            conditions,
            steps,
            status,
            created_date AS createdDate
          FROM workflow_configurations
          ORDER BY created_at DESC
        `
      );

      const workflows = rows.map((row) => ({
        ...row,
        workflowCategory: inferWorkflowCategory(row.module),
        workflowTarget: row.module,
        conditions:
          typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
        steps: typeof row.steps === 'string' ? JSON.parse(row.steps) : row.steps,
      }));

      return sendJson(res, 200, { success: true, data: workflows });
    }

    if (req.method === 'PUT' && pathname === '/api/workflows/configurations') {
      const body = await readJsonBody(req);
      const workflows = Array.isArray(body.workflows) ? body.workflows : [];
      const existingRows = await query('SELECT id FROM workflow_configurations');
      const existingIds = new Set(existingRows.map((row) => row.id));
      const incomingIds = new Set();

      for (const workflow of workflows) {
        const id = String(workflow?.id ?? randomUUID());
        incomingIds.add(id);

        await query(
          `
            INSERT INTO workflow_configurations (
              id,
              workflow_name,
              module_name,
              description,
              trigger_event,
              conditions,
              steps,
              status,
              created_date
            ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?)
            ON DUPLICATE KEY UPDATE
              workflow_name = VALUES(workflow_name),
              module_name = VALUES(module_name),
              description = VALUES(description),
              trigger_event = VALUES(trigger_event),
              conditions = VALUES(conditions),
              steps = VALUES(steps),
              status = VALUES(status),
              created_date = VALUES(created_date),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            id,
            workflow.workflowName ?? '',
            workflow.module ?? '',
            workflow.description ?? '',
            workflow.triggerEvent ?? 'On Record Submission',
            JSON.stringify(workflow.conditions ?? []),
            JSON.stringify(workflow.steps ?? []),
            workflow.status ?? 'Draft',
            workflow.createdDate || new Date().toISOString().split('T')[0],
          ]
        );
      }

      for (const id of existingIds) {
        if (!incomingIds.has(id)) {
          await query('DELETE FROM workflow_configurations WHERE id = ?', [id]);
        }
      }

      return sendJson(res, 200, { success: true, count: workflows.length });
    }

    if (pathname.startsWith('/api/items/')) {
      const id = pathname.replace('/api/items/', '');
      const itemTableName = getQualifiedTableName('item_master');

      if (req.method === 'GET') {
        const rows = await query(`SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);
        if (rows.length === 0) {
          return sendJson(res, 404, { success: false, error: 'Item not found' });
        }

        return sendJson(res, 200, { success: true, data: mapItemRow(rows[0]) });
      }

      if (req.method === 'PUT') {
        const body = await readJsonBody(req);
        const itemAuditTable = getQualifiedAuditTableName('item_master');

        const result = await withTransaction(async (conn) => {
          const previousRows = await connExecute(
            conn,
            `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1 FOR UPDATE`,
            [id]
          );
          if (previousRows.length === 0) {
            return { notFound: true };
          }

          await connExecute(
            conn,
            `
              UPDATE ${itemTableName}
              SET
                item_code = ?,
                item_name = ?,
                item_alias = ?,
                item_status = ?,
                item_description = ?,
                uom = ?,
                item_group_master = ?,
                procurement_category = ?,
                entity_name = ?,
                expenditure_type = ?,
                gl_account_code = ?,
                gl_account_description = ?,
                nature = ?,
                rcm_applicable = ?,
                hsn_code = ?,
                sac_code = ?,
                gst_rate = ?,
                default_itc_eligibility = ?,
                po_required = ?,
                reorder_level = ?,
                max_order_qty = ?,
                approval_status = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            [
              body.itemCode ?? '',
              body.itemName ?? '',
              body.itemAlias ?? '',
              body.itemStatus ?? 'Active',
              body.itemDescription ?? '',
              body.uom ?? '',
              body.itemGroupMaster ?? '',
              body.procurementCategory ?? '',
              body.entityName ?? '',
              body.expenditureType ?? '',
              body.glAccountCode ?? '',
              body.glAccountDescription ?? '',
              body.nature ?? 'Product',
              body.rcmApplicable ?? 'No',
              body.hsnCode ?? '',
              body.sacCode ?? '',
              body.gstRate ?? '',
              body.defaultITCEligibility ?? '',
              body.poRequired ?? 'No',
              body.reorderLevel ?? '',
              body.maxOrderQty ?? '',
              body.approvalStatus ?? 'Draft',
              id,
            ]
          );

          const updatedRows = await connExecute(
            conn,
            `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`,
            [id]
          );

          if (itemAuditTable) {
            await appendMasterVersion(
              'item_master',
              id,
              mapItemRow(previousRows[0]),
              mapItemRow(updatedRows[0]),
              'UPDATE',
              conn
            );
          }

          return { data: mapItemRow(updatedRows[0]) };
        });

        if (result.notFound) {
          return sendJson(res, 404, { success: false, error: 'Item not found' });
        }
        return sendJson(res, 200, { success: true, data: result.data });
      }

      if (req.method === 'DELETE') {
        const itemAuditTable = getQualifiedAuditTableName('item_master');

        const result = await withTransaction(async (conn) => {
          const existingRows = await connExecute(
            conn,
            `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1 FOR UPDATE`,
            [id]
          );
          if (existingRows.length === 0) {
            return { notFound: true };
          }
          if (existingRows[0].approval_status === 'Approved') {
            return { forbidden: true };
          }

          await connExecute(conn, `DELETE FROM ${itemTableName} WHERE id = ?`, [id]);

          if (itemAuditTable) {
            await appendMasterVersion(
              'item_master',
              id,
              mapItemRow(existingRows[0]),
              {},
              'DELETE',
              conn
            );
          }

          return { deleted: true };
        });

        if (result.notFound) {
          return sendJson(res, 404, { success: false, error: 'Item not found' });
        }
        if (result.forbidden) {
          return sendJson(res, 403, {
            success: false,
            error: 'Cannot delete approved items. Please deactivate instead.',
          });
        }
        return sendJson(res, 200, { success: true, message: 'Item deleted successfully' });
      }
    }

    if (req.method === 'POST' && pathname === '/api/items') {
      const body = await readJsonBody(req);
      const id = randomUUID(); // always server-generated
      const itemTableName = getQualifiedTableName('item_master');
      const itemAuditTable = getQualifiedAuditTableName('item_master');

      const data = await withTransaction(async (conn) => {
        await connExecute(
          conn,
          `
            INSERT INTO ${itemTableName} (
              id, item_code, item_name, item_alias, item_status, item_description,
              uom, item_group_master, procurement_category, entity_name, expenditure_type,
              gl_account_code, gl_account_description, nature, rcm_applicable,
              hsn_code, sac_code, gst_rate, default_itc_eligibility, po_required,
              reorder_level, max_order_qty, approval_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            id,
            body.itemCode ?? '',
            body.itemName ?? '',
            body.itemAlias ?? '',
            body.itemStatus ?? 'Active',
            body.itemDescription ?? '',
            body.uom ?? '',
            body.itemGroupMaster ?? '',
            body.procurementCategory ?? '',
            body.entityName ?? '',
            body.expenditureType ?? '',
            body.glAccountCode ?? '',
            body.glAccountDescription ?? '',
            body.nature ?? 'Product',
            body.rcmApplicable ?? 'No',
            body.hsnCode ?? '',
            body.sacCode ?? '',
            body.gstRate ?? '',
            body.defaultITCEligibility ?? '',
            body.poRequired ?? 'No',
            body.reorderLevel ?? '',
            body.maxOrderQty ?? '',
            body.approvalStatus ?? 'Draft',
          ]
        );

        const createdRows = await connExecute(
          conn,
          `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`,
          [id]
        );

        if (itemAuditTable) {
          await appendMasterVersion(
            'item_master',
            id,
            {},
            mapItemRow(createdRows[0]),
            'CREATE',
            conn
          );
        }

        return mapItemRow(createdRows[0]);
      });

      return sendJson(res, 201, { success: true, data });
    }

    // ── OCR score & learning endpoints ───────────────────
    if (req.method === 'GET' && /^\/api\/invoices\/[^/]+\/ocr-scores$/.test(pathname)) {
      const invoiceId = pathname.split('/')[3];
      const rows = await query(
        'SELECT id, ingestion_log_id, metadata FROM invoices WHERE id = ? LIMIT 1',
        [invoiceId]
      );
      if (!rows.length) return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      const invoice = rows[0];
      const metadata =
        typeof invoice.metadata === 'string'
          ? JSON.parse(invoice.metadata || '{}')
          : invoice.metadata || {};
      const ocrFromMeta = metadata?.ocrScores || {};
      let ocrFromLog = null;
      if (invoice.ingestion_log_id) {
        const logRows = await query(
          `SELECT ocr_field_scores, ocr_overall_confidence, fields_matched, fields_conflicted, fields_low_confidence, fields_not_found
           FROM invoice_ingestion_log WHERE id = ? LIMIT 1`,
          [invoice.ingestion_log_id]
        );
        if (logRows.length) {
          const lr = logRows[0];
          ocrFromLog = {
            fields:
              typeof lr.ocr_field_scores === 'string'
                ? JSON.parse(lr.ocr_field_scores || '{}')
                : lr.ocr_field_scores || {},
            overall_confidence:
              Number(lr.ocr_overall_confidence || 0) > 1
                ? Number(lr.ocr_overall_confidence || 0) / 100
                : Number(lr.ocr_overall_confidence || 0),
            fields_matched: Number(lr.fields_matched || 0),
            fields_conflicted: Number(lr.fields_conflicted || 0),
            fields_low_confidence: Number(lr.fields_low_confidence || 0),
            fields_not_found: Number(lr.fields_not_found || 0),
          };
        }
      }
      const payload = {
        overall_confidence:
          ocrFromLog?.overall_confidence ?? Number(ocrFromMeta.overall_confidence || 0),
        fields_matched: ocrFromLog?.fields_matched ?? Number(ocrFromMeta.fields_matched || 0),
        fields_conflicted:
          ocrFromLog?.fields_conflicted ?? Number(ocrFromMeta.fields_conflicted || 0),
        fields_low_confidence:
          ocrFromLog?.fields_low_confidence ?? Number(ocrFromMeta.fields_low_confidence || 0),
        fields_not_found: ocrFromLog?.fields_not_found ?? Number(ocrFromMeta.fields_not_found || 0),
        touchless_eligible: Boolean(ocrFromMeta.touchless_eligible),
        fields: ocrFromLog?.fields ?? ocrFromMeta.fields ?? {},
      };
      return sendJson(res, 200, { success: true, data: payload });
    }

    if (req.method === 'POST' && /^\/api\/invoices\/[^/]+\/field-correction$/.test(pathname)) {
      await ensureOcrLearningTables();
      const invoiceId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const invoiceRows = await query(
        'SELECT ingestion_log_id, entity_id FROM invoices WHERE id = ? LIMIT 1',
        [invoiceId]
      );
      if (!invoiceRows.length)
        return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      const correctionId = randomUUID();
      await query(
        `INSERT INTO ocr_field_corrections
          (id, invoice_id, ingestion_log_id, entity_id, field_name, ocr_extracted_value, correct_value, correction_type, correction_description, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          correctionId,
          invoiceId,
          invoiceRows[0].ingestion_log_id || null,
          invoiceRows[0].entity_id || null,
          String(body?.field_name || ''),
          String(body?.ocr_extracted_value || ''),
          String(body?.correct_value || ''),
          String(body?.correction_type || 'custom'),
          String(body?.correction_description || ''),
          String(body?.created_by || ''),
        ]
      );
      return sendJson(res, 200, { success: true, id: correctionId });
    }

    if (req.method === 'POST' && /^\/api\/invoices\/[^/]+\/confirm-learning$/.test(pathname)) {
      await ensureOcrLearningTables();
      const invoiceId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const correctionIds = Array.isArray(body?.correction_ids)
        ? body.correction_ids.filter(Boolean)
        : [];
      if (!correctionIds.length)
        return sendJson(res, 400, { success: false, error: 'correction_ids required' });
      const placeholders = correctionIds.map(() => '?').join(',');
      const corrections = await query(
        `SELECT * FROM ocr_field_corrections WHERE invoice_id = ? AND id IN (${placeholders})`,
        [invoiceId, ...correctionIds]
      );
      for (const c of corrections) {
        const typeMap = {
          vendor_name_mapping: 'vendor_name_alias',
          gstin_ocr_error: 'character_confusion',
          department_mapping: 'department_mapping',
          date_selection: 'date_position',
          amount_format: 'amount_format',
          custom: 'entity_mapping',
        };
        await query(
          `INSERT INTO ocr_learning_patterns
           (id, pattern_type, input_pattern, correct_output, vendor_id, entity_id, created_from_correction_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            correct_output = VALUES(correct_output),
            updated_at = CURRENT_TIMESTAMP`,
          [
            randomUUID(),
            typeMap[c.correction_type] || 'entity_mapping',
            c.ocr_extracted_value || '',
            c.correct_value || '',
            c.vendor_id || null,
            c.entity_id || null,
            c.id,
          ]
        );
      }
      await query(
        `UPDATE ocr_field_corrections
         SET confirmed = TRUE, confirmed_at = CURRENT_TIMESTAMP, applied_to_learning = TRUE
         WHERE invoice_id = ? AND id IN (${placeholders})`,
        [invoiceId, ...correctionIds]
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && /^\/api\/invoices\/[^/]+\/confirm-all-learnings$/.test(pathname)) {
      await ensureOcrLearningTables();
      const invoiceId = pathname.split('/')[3];
      const pending = await query(
        'SELECT * FROM ocr_field_corrections WHERE invoice_id = ? AND confirmed = FALSE',
        [invoiceId]
      );
      const ids = pending.map((p) => p.id);
      if (!ids.length) return sendJson(res, 200, { success: true, count: 0 });
      for (const c of pending) {
        const typeMap = {
          vendor_name_mapping: 'vendor_name_alias',
          gstin_ocr_error: 'character_confusion',
          department_mapping: 'department_mapping',
          date_selection: 'date_position',
          amount_format: 'amount_format',
          custom: 'entity_mapping',
        };
        await query(
          `INSERT INTO ocr_learning_patterns
           (id, pattern_type, input_pattern, correct_output, vendor_id, entity_id, created_from_correction_id)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
            correct_output = VALUES(correct_output),
            updated_at = CURRENT_TIMESTAMP`,
          [
            randomUUID(),
            typeMap[c.correction_type] || 'entity_mapping',
            c.ocr_extracted_value || '',
            c.correct_value || '',
            c.vendor_id || null,
            c.entity_id || null,
            c.id,
          ]
        );
      }
      const placeholders = ids.map(() => '?').join(',');
      await query(
        `UPDATE ocr_field_corrections
         SET confirmed = TRUE, confirmed_at = CURRENT_TIMESTAMP, applied_to_learning = TRUE
         WHERE invoice_id = ? AND id IN (${placeholders})`,
        [invoiceId, ...ids]
      );
      return sendJson(res, 200, { success: true, count: ids.length });
    }

    if (
      req.method === 'DELETE' &&
      /^\/api\/invoices\/[^/]+\/discard-correction\/[^/]+$/.test(pathname)
    ) {
      const parts = pathname.split('/');
      const invoiceId = parts[3];
      const correctionId = parts[5];
      await query(
        'DELETE FROM ocr_field_corrections WHERE invoice_id = ? AND id = ? AND confirmed = FALSE',
        [invoiceId, correctionId]
      );
      return sendJson(res, 200, { success: true });
    }

    // ── PDF file serving ──────────────────────────────────
    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/pdf')
    ) {
      const invoiceId = pathname.split('/')[3];
      const rows = await query('SELECT attachment_path FROM invoices WHERE id = ? LIMIT 1', [
        invoiceId,
      ]);
      if (rows.length === 0 || !rows[0].attachment_path) {
        return sendJson(res, 404, { success: false, error: 'PDF not found' });
      }
      const fs = await import('node:fs');
      const filePath = rows[0].attachment_path;
      try {
        const stat = fs.statSync(filePath);
        const headers = {
          'Content-Type': 'application/pdf',
          'Content-Length': stat.size,
          'Content-Disposition': 'inline',
          // Always allow CORS for PDF serving (embed/iframe needs it)
          'Access-Control-Allow-Origin': '*',
        };
        res.writeHead(200, headers);
        fs.createReadStream(filePath).pipe(res);
        return;
      } catch {
        return sendJson(res, 404, { success: false, error: 'PDF file not accessible' });
      }
    }

    // ── Parsed Invoice API ────────────────────────────────
    const appendInvoiceAuditLog = async ({ invoiceId, userId, action, before, after }) => {
      try {
        await query(`
          CREATE TABLE IF NOT EXISTS invoice_audit_log (
            id VARCHAR(36) PRIMARY KEY,
            invoice_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(64) NULL,
            action VARCHAR(32) NOT NULL,
            changed_fields JSON NULL,
            ip_address VARCHAR(64) NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await query(
          `INSERT INTO invoice_audit_log (id, invoice_id, user_id, action, changed_fields, ip_address)
           VALUES (?, ?, ?, ?, CAST(? AS JSON), ?)`,
          [
            randomUUID(),
            invoiceId,
            userId || null,
            action,
            JSON.stringify({ before: before || null, after: after || null }),
            req.socket?.remoteAddress || null,
          ]
        );
      } catch (error) {
        console.error('invoice audit log append failed:', error?.message || error);
      }
    };

    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/audit-log')
    ) {
      const invoiceId = pathname.replace('/api/invoices/', '').replace('/audit-log', '');
      await query(`
        CREATE TABLE IF NOT EXISTS invoice_audit_log (
          id VARCHAR(36) PRIMARY KEY,
          invoice_id VARCHAR(36) NOT NULL,
          user_id VARCHAR(64) NULL,
          action VARCHAR(32) NOT NULL,
          changed_fields JSON NULL,
          ip_address VARCHAR(64) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      const logs = await query(
        'SELECT id, invoice_id, user_id, action, changed_fields, ip_address, created_at FROM invoice_audit_log WHERE invoice_id = ? ORDER BY created_at DESC',
        [invoiceId]
      );
      return sendJson(res, 200, { success: true, data: logs });
    }

    // ── Lifecycle transition endpoints ────────────────────
    // Each: read current state → guard → UPDATE in transaction → audit log → return

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/verify')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [invoice] = await query(
        'SELECT id, lifecycle_state, status, tenant_id FROM invoices WHERE id = ?',
        [invoiceId]
      );
      if (!invoice) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      try {
        assertValidTransition(invoice.lifecycle_state ?? null, LIFECYCLE_STATES.UNDER_VERIFICATION);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }

      const body = await readJsonBody(req).catch(() => ({}));
      const actor = body.actor || req.headers['x-user-id'] || '1';

      await withTransaction(async (conn) => {
        await connExecute(
          conn,
          "UPDATE invoices SET lifecycle_state = ?, status = 'pending_approval', updated_at = NOW() WHERE id = ?",
          [LIFECYCLE_STATES.UNDER_VERIFICATION, invoiceId]
        );
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            invoice.tenant_id,
            invoiceId,
            'verify',
            invoice.lifecycle_state,
            LIFECYCLE_STATES.UNDER_VERIFICATION,
            actor,
            'user',
          ]
        );
      });

      const [updated] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/exception')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [invoice] = await query(
        'SELECT id, lifecycle_state, status, tenant_id FROM invoices WHERE id = ?',
        [invoiceId]
      );
      if (!invoice) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      try {
        assertValidTransition(invoice.lifecycle_state ?? null, LIFECYCLE_STATES.EXCEPTION_HOLD);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }

      const body = await readJsonBody(req).catch(() => ({}));
      if (!body.reason) return sendJson(res, 400, { success: false, error: 'reason is required' });
      const actor = body.actor || req.headers['x-user-id'] || '1';

      await withTransaction(async (conn) => {
        await connExecute(
          conn,
          "UPDATE invoices SET lifecycle_state = ?, status = 'draft', processing_status = 'exception', updated_at = NOW() WHERE id = ?",
          [LIFECYCLE_STATES.EXCEPTION_HOLD, invoiceId]
        );
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, reason_code, reason_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            invoice.tenant_id,
            invoiceId,
            'exception_raised',
            invoice.lifecycle_state,
            LIFECYCLE_STATES.EXCEPTION_HOLD,
            actor,
            'user',
            body.reasonCode || null,
            body.reason,
          ]
        );
      });

      const [updated] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/resume')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [invoice] = await query(
        'SELECT id, lifecycle_state, status, tenant_id FROM invoices WHERE id = ?',
        [invoiceId]
      );
      if (!invoice) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      try {
        assertValidTransition(invoice.lifecycle_state ?? null, LIFECYCLE_STATES.UNDER_VERIFICATION);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }

      const body = await readJsonBody(req).catch(() => ({}));
      const actor = body.actor || req.headers['x-user-id'] || '1';

      await withTransaction(async (conn) => {
        await connExecute(
          conn,
          "UPDATE invoices SET lifecycle_state = ?, status = 'pending_approval', processing_status = NULL, updated_at = NOW() WHERE id = ?",
          [LIFECYCLE_STATES.UNDER_VERIFICATION, invoiceId]
        );
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, reason_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            invoice.tenant_id,
            invoiceId,
            'exception_resolved',
            invoice.lifecycle_state,
            LIFECYCLE_STATES.UNDER_VERIFICATION,
            actor,
            'user',
            body.notes || null,
          ]
        );
      });

      const [updated] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/reject')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [invoice] = await query(
        'SELECT id, lifecycle_state, status, tenant_id FROM invoices WHERE id = ?',
        [invoiceId]
      );
      if (!invoice) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      try {
        assertValidTransition(invoice.lifecycle_state ?? null, LIFECYCLE_STATES.REJECTED);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }

      const body = await readJsonBody(req).catch(() => ({}));
      if (!body.reasonCode)
        return sendJson(res, 400, { success: false, error: 'reasonCode is required' });
      const actor = body.actor || req.headers['x-user-id'] || '1';

      // Validate reasonCode against tenant's rejection reasons
      const [validReason] = await query(
        'SELECT reason_code FROM invoice_rejection_reasons WHERE tenant_id = ? AND reason_code = ? AND is_active = 1',
        [invoice.tenant_id, body.reasonCode]
      );
      if (!validReason)
        return sendJson(res, 400, {
          success: false,
          error: `Invalid rejection reason code: ${body.reasonCode}`,
        });

      await withTransaction(async (conn) => {
        await connExecute(
          conn,
          "UPDATE invoices SET lifecycle_state = ?, status = 'Rejected', processing_status = 'rejected', rejection_reason_code = ?, rejection_reason_note = ?, updated_at = NOW() WHERE id = ?",
          [LIFECYCLE_STATES.REJECTED, body.reasonCode, body.reasonNote || null, invoiceId]
        );
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, reason_code, reason_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            invoice.tenant_id,
            invoiceId,
            'reject',
            invoice.lifecycle_state,
            LIFECYCLE_STATES.REJECTED,
            actor,
            'user',
            body.reasonCode,
            body.reasonNote || null,
          ]
        );
      });

      const [updated] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      return sendJson(res, 200, { success: true, data: updated });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/resubmit')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [parent] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!parent) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      if (parent.lifecycle_state !== LIFECYCLE_STATES.REJECTED) {
        return sendJson(res, 422, {
          success: false,
          error: `Cannot resubmit: invoice is in state '${parent.lifecycle_state}', must be 'Rejected'`,
        });
      }

      const body = await readJsonBody(req).catch(() => ({}));
      const actor = body.actor || req.headers['x-user-id'] || '1';

      const newId = randomUUID();
      const newLifecycle = parent.metadata
        ? LIFECYCLE_STATES.OCR_EXTRACTED
        : LIFECYCLE_STATES.INGESTED;
      const newCount = (Number(parent.resubmission_count) || 0) + 1;

      await withTransaction(async (conn) => {
        // Clone invoice row (OCR data, vendor, PO, entity, attachment)
        // Does NOT clone: approval history, audit log, match result, duplicate check, voucher, rejection, TDS
        await connExecute(
          conn,
          `INSERT INTO invoices (id, invoice_number, invoice_date, due_date,
            vendor_name, vendor_gstin, vendor_pan, vendor_email,
            bill_to_entity, bill_to_gstin,
            currency, subtotal, tax_amount, total_amount,
            po_number, po_id, payment_terms, notes, metadata,
            attachment_path, source, document_id,
            status, processing_status, lifecycle_state,
            vendor_id, vendor_id_match_confidence,
            tenant_id, entity_id,
            source_invoice_id, resubmission_count,
            financial_year,
            created_at, updated_at)
          VALUES (?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, CAST(? AS JSON),
            ?, ?, ?,
            'draft', NULL, ?,
            ?, ?,
            ?, ?,
            ?, ?,
            ?,
            NOW(), NOW())`,
          [
            newId,
            parent.invoice_number,
            parent.invoice_date,
            parent.due_date,
            parent.vendor_name,
            parent.vendor_gstin,
            parent.vendor_pan,
            parent.vendor_email,
            parent.bill_to_entity,
            parent.bill_to_gstin,
            parent.currency,
            parent.subtotal,
            parent.tax_amount,
            parent.total_amount,
            parent.po_number,
            parent.po_id,
            parent.payment_terms,
            parent.notes,
            typeof parent.metadata === 'string'
              ? parent.metadata
              : JSON.stringify(parent.metadata || null),
            parent.attachment_path,
            parent.source,
            parent.document_id,
            newLifecycle,
            parent.vendor_id,
            parent.vendor_id_match_confidence,
            parent.tenant_id,
            parent.entity_id,
            invoiceId,
            newCount,
            parent.financial_year,
          ]
        );

        // Clone line items
        const parentLines = await connExecute(
          conn,
          'SELECT * FROM invoice_line_items WHERE invoice_id = ?',
          [invoiceId]
        );
        for (const line of parentLines[0] || parentLines || []) {
          await connExecute(
            conn,
            `INSERT INTO invoice_line_items (id, invoice_id, line_number, description, hsn_sac, quantity, unit_price, amount, gst_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, utgst_amount, cess_rate, cess_amount, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
              randomUUID(),
              newId,
              line.line_number,
              line.description,
              line.hsn_sac,
              line.quantity,
              line.unit_price,
              line.amount,
              line.gst_rate,
              line.taxable_amount,
              line.cgst_amount || null,
              line.sgst_amount || null,
              line.igst_amount || null,
              line.utgst_amount || null,
              line.cess_rate || null,
              line.cess_amount || null,
            ]
          );
        }

        // Audit log on parent (resubmitted)
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, reason_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            parent.tenant_id,
            invoiceId,
            'resubmitted',
            LIFECYCLE_STATES.REJECTED,
            LIFECYCLE_STATES.REJECTED,
            actor,
            'user',
            `Resubmitted as ${newId}`,
          ]
        );

        // Audit log on new invoice (created via resubmission)
        await connExecute(
          conn,
          'INSERT INTO invoice_audit_log (id, tenant_id, invoice_id, action, from_state, to_state, actor_id, actor_source, reason_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
          [
            randomUUID(),
            parent.tenant_id,
            newId,
            'resubmission_created',
            null,
            newLifecycle,
            actor,
            'user',
            `Resubmitted from ${invoiceId} (submission #${newCount})`,
          ]
        );
      });

      const [newInvoice] = await query('SELECT * FROM invoices WHERE id = ?', [newId]);
      return sendJson(res, 200, { success: true, data: newInvoice });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/invoices/') &&
      pathname.endsWith('/match')
    ) {
      const invoiceId = pathname.split('/')[3];
      const [invoice] = await query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
      if (!invoice) return sendJson(res, 404, { success: false, error: 'Invoice not found' });

      const result = await processMatch(
        invoiceId,
        {
          po_number: invoice.po_number,
          vendor_name: invoice.vendor_name,
          total_amount: invoice.total_amount,
          invoice_date: invoice.invoice_date,
        },
        invoice.entity_id
      );

      return sendJson(res, 200, {
        success: true,
        data: {
          matchResult: result.matchResult,
          matchScore: result.matchScore,
          matchDetails: result.variances,
          explanation: result.explanation,
        },
      });
    }

    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/invoices/') &&
      !pathname.includes('ingestion')
    ) {
      const invoiceId = pathname.replace('/api/invoices/', '');
      const rows = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
      if (rows.length === 0)
        return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      const invoice = rows[0];
      const requestTenantId = readApTenantId(req, url);
      if (requestTenantId && String(invoice.tenant_id) !== String(requestTenantId)) {
        return sendJson(res, 403, { success: false, error: 'tenant_mismatch' });
      }
      invoice.metadata =
        typeof invoice.metadata === 'string' ? JSON.parse(invoice.metadata) : invoice.metadata;
      invoice.bank_details =
        typeof invoice.bank_details === 'string'
          ? JSON.parse(invoice.bank_details)
          : invoice.bank_details;
      const lineItems = await query(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY line_number',
        [invoiceId]
      );
      const payments = await query(
        "SELECT id, payment_date, amount, currency, payment_method, status, reference, notes FROM payments WHERE invoice_id = ? AND status = 'confirmed' ORDER BY payment_date DESC",
        [invoiceId]
      );
      return sendJson(res, 200, {
        success: true,
        data: { ...invoice, line_items: lineItems, payments },
      });
    }

    if (
      req.method === 'PUT' &&
      pathname.startsWith('/api/invoices/') &&
      !pathname.includes('ingestion')
    ) {
      const invoiceId = pathname.replace('/api/invoices/', '');
      const body = await readJsonBody(req);
      const invoicePatch = body?.invoice && typeof body.invoice === 'object' ? body.invoice : {};
      const hasLineItemsPayload = Array.isArray(body?.line_items);
      const lineItems = hasLineItemsPayload ? body.line_items : [];
      const normalizeDateOnly = (value) => {
        if (!value || typeof value !== 'string') return null;
        return value.includes('T') ? value.slice(0, 10) : value;
      };

      const existingRows = await query(
        'SELECT id, metadata, bank_details FROM invoices WHERE id = ? LIMIT 1',
        [invoiceId]
      );
      if (existingRows.length === 0) {
        return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      }

      const existing = existingRows[0];
      const duplicateRows = await query(
        `SELECT id FROM invoices
         WHERE id <> ?
           AND invoice_number = ?
           AND vendor_name = ?
           AND YEAR(invoice_date) = YEAR(?)
         LIMIT 1`,
        [
          invoiceId,
          invoicePatch.invoice_number ?? null,
          invoicePatch.vendor_name ?? null,
          normalizeDateOnly(invoicePatch.invoice_date) || new Date().toISOString().slice(0, 10),
        ]
      );
      if (duplicateRows.length > 0) {
        return sendJson(res, 409, {
          success: false,
          error: 'Duplicate invoice detected for vendor + invoice number + fiscal year',
          duplicateInvoiceId: duplicateRows[0].id,
        });
      }
      const nextMetadata =
        invoicePatch.metadata && typeof invoicePatch.metadata === 'object'
          ? invoicePatch.metadata
          : typeof existing.metadata === 'string'
            ? JSON.parse(existing.metadata)
            : existing.metadata || {};
      const nextBankDetails =
        invoicePatch.bank_details && typeof invoicePatch.bank_details === 'object'
          ? invoicePatch.bank_details
          : typeof existing.bank_details === 'string'
            ? JSON.parse(existing.bank_details)
            : existing.bank_details || null;

      const patchStatus = invoicePatch.status ?? 'draft';
      const resolvedLifecycle =
        invoicePatch.lifecycle_state ||
        mapLegacyToLifecycle(patchStatus, invoicePatch.processing_status) ||
        null;

      if (invoicePatch.lifecycle_state && resolvedLifecycle) {
        try {
          assertValidTransition(existing.lifecycle_state ?? null, resolvedLifecycle);
        } catch (e) {
          return sendJson(res, 422, { success: false, error: e.message });
        }
      }

      await query(
        `
          UPDATE invoices
          SET
            invoice_number = ?,
            invoice_date = ?,
            due_date = ?,
            vendor_name = ?,
            vendor_gstin = ?,
            vendor_pan = ?,
            vendor_email = ?,
            bill_to_entity = ?,
            bill_to_gstin = ?,
            currency = ?,
            subtotal = ?,
            tax_amount = ?,
            tax_rate = ?,
            total_amount = ?,
            po_number = ?,
            irn = ?,
            hsn_sac_summary = ?,
            payment_terms = ?,
            bank_details = CAST(? AS JSON),
            notes = ?,
            status = ?${resolvedLifecycle ? ', lifecycle_state = ?' : ''},
            ${invoicePatch.validated_by != null ? 'validated_by = ?,' : ''}
            ${invoicePatch.validated_at != null ? 'validated_at = ?,' : ''}
            metadata = CAST(? AS JSON),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        [
          invoicePatch.invoice_number ?? null,
          normalizeDateOnly(invoicePatch.invoice_date),
          normalizeDateOnly(invoicePatch.due_date),
          invoicePatch.vendor_name ?? null,
          invoicePatch.vendor_gstin ?? null,
          invoicePatch.vendor_pan ?? null,
          invoicePatch.vendor_email ?? null,
          invoicePatch.bill_to_entity ?? null,
          invoicePatch.bill_to_gstin ?? null,
          invoicePatch.currency ?? 'INR',
          Number(invoicePatch.subtotal ?? 0),
          Number(invoicePatch.tax_amount ?? 0),
          invoicePatch.tax_rate ?? null,
          Number(invoicePatch.total_amount ?? 0),
          invoicePatch.po_number ?? null,
          invoicePatch.irn ?? null,
          invoicePatch.hsn_sac_summary ?? null,
          invoicePatch.payment_terms ?? null,
          JSON.stringify(nextBankDetails),
          invoicePatch.notes ?? null,
          patchStatus,
          ...(resolvedLifecycle ? [resolvedLifecycle] : []),
          ...(invoicePatch.validated_by != null ? [invoicePatch.validated_by] : []),
          ...(invoicePatch.validated_at != null ? [invoicePatch.validated_at] : []),
          JSON.stringify(nextMetadata),
          invoiceId,
        ]
      );
      const isSubmitting =
        invoicePatch.status === 'pending_approval' ||
        invoicePatch.lifecycle_state === LIFECYCLE_STATES.UNDER_VERIFICATION;
      await appendInvoiceAuditLog({
        invoiceId,
        userId: req.userId || req.headers['x-user-id'] || null,
        action: isSubmitting ? 'submitted' : 'edited',
        before: existing,
        after: invoicePatch,
      });

      if (hasLineItemsPayload) {
        const lineTaxable = lineItems.reduce(
          (sum, item) => sum + Number(item.amount ?? item.taxable_amount ?? 0),
          0
        );
        const lineGST = lineItems.reduce(
          (sum, item) =>
            sum + Number(item.igst ?? 0) + Number(item.cgst ?? 0) + Number(item.sgst ?? 0),
          0
        );
        const headerTotal = Number(invoicePatch.total_amount ?? 0);
        if (Math.abs(lineTaxable + lineGST - headerTotal) > 1) {
          return sendJson(res, 422, {
            success: false,
            error: 'Amount reconciliation failed: line taxable + GST does not match invoice total',
            expectedTotal: lineTaxable + lineGST,
            submittedTotal: headerTotal,
          });
        }

        await query('DELETE FROM invoice_line_items WHERE invoice_id = ?', [invoiceId]);
        for (let i = 0; i < lineItems.length; i += 1) {
          const item = lineItems[i] || {};
          await query(
            `
              INSERT INTO invoice_line_items (
                id, invoice_id, line_number, description, quantity, unit_price, amount, hsn_sac, gst_rate
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
              item.id || randomUUID(),
              invoiceId,
              i + 1,
              item.description ?? '',
              Number(item.quantity ?? 0),
              Number(item.unit_price ?? 0),
              Number(item.amount ?? 0),
              item.hsn_sac ?? null,
              item.gst_rate ?? null,
            ]
          );
        }
      }

      const rows = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
      const updated = rows[0];
      updated.metadata =
        typeof updated.metadata === 'string' ? JSON.parse(updated.metadata) : updated.metadata;
      updated.bank_details =
        typeof updated.bank_details === 'string'
          ? JSON.parse(updated.bank_details)
          : updated.bank_details;
      const updatedLines = await query(
        'SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY line_number',
        [invoiceId]
      );
      return sendJson(res, 200, { success: true, data: { ...updated, line_items: updatedLines } });
    }

    // ── AP Payment batches (payable list → proposal → batch → approve → execute → payments) ──
    if (req.method === 'GET' && pathname === '/api/ap/payable-invoices') {
      const tenantId = readApTenantId(req, url);
      const entityId =
        url.searchParams.get('entityId') || String(req.headers['x-entity-id'] ?? '').trim() || null;
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        const data = await listPayableInvoices({ tenantId, entityId });
        return sendJson(res, 200, { success: true, data });
      } catch (e) {
        return sendJson(res, e.statusCode || 500, { success: false, error: e.message });
      }
    }

    if (req.method === 'GET' && pathname === '/api/ap/payments-dashboard') {
      const tenantId = readApTenantId(req, url);
      const entityId =
        url.searchParams.get('entityId') || String(req.headers['x-entity-id'] ?? '').trim() || null;
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        const data = await getPaymentsDashboardPayload({ tenantId, entityId });
        return sendJson(res, 200, { success: true, data });
      } catch (e) {
        return sendJson(res, e.statusCode || 500, { success: false, error: e.message });
      }
    }

    if (req.method === 'GET' && pathname === '/api/ap/payment-batches') {
      const tenantId = readApTenantId(req, url);
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        const data = await listPaymentBatches({ tenantId });
        return sendJson(res, 200, { success: true, data });
      } catch (e) {
        return sendJson(res, e.statusCode || 500, { success: false, error: e.message });
      }
    }

    const paymentBatchDetailRe = /^\/api\/ap\/payment-batches\/([^/]+)$/;
    if (req.method === 'GET' && paymentBatchDetailRe.test(pathname)) {
      const tenantId = readApTenantId(req, url);
      const batchId = pathname.match(paymentBatchDetailRe)[1];
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        const data = await getPaymentBatchDetail({ tenantId, batchId });
        return sendJson(res, 200, { success: true, data });
      } catch (e) {
        return sendJson(res, e.statusCode || 500, { success: false, error: e.message });
      }
    }

    if (req.method === 'POST' && pathname === '/api/ap/payment-batches') {
      const body = await readJsonBody(req);
      const tenantId = readApTenantId(req, url, body);
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        const result = await createPaymentBatch({
          tenantId,
          entityId: body.entityId || null,
          invoiceIds: Array.isArray(body.invoiceIds) ? body.invoiceIds.map(String) : [],
          amountsByInvoiceId:
            body.amounts && typeof body.amounts === 'object' ? body.amounts : null,
          createdByEmail: readActorEmail(req) || body.createdByEmail || null,
          createdByName: readActorName(req) || body.createdByName || null,
        });
        return sendJson(res, 201, { success: true, data: result });
      } catch (e) {
        return sendJson(res, e.statusCode || 500, {
          success: false,
          error: e.message,
          invoiceIds: e.invoiceIds,
        });
      }
    }

    const paymentBatchActionRe =
      /^\/api\/ap\/payment-batches\/([^/]+)\/(submit|approve|reject|execute)$/;
    if (req.method === 'POST' && paymentBatchActionRe.test(pathname)) {
      const [, batchId, action] = pathname.match(paymentBatchActionRe);
      const body = await readJsonBody(req);
      const tenantId = readApTenantId(req, url, body);
      if (!tenantId) {
        return sendJson(res, 400, { success: false, error: 'tenant_required' });
      }
      try {
        if (action === 'submit') {
          await submitPaymentBatch({ tenantId, batchId, actorEmail: readActorEmail(req) });
          return sendJson(res, 200, { success: true });
        }
        if (action === 'approve') {
          await approvePaymentBatch({
            tenantId,
            batchId,
            actorEmail: readActorEmail(req),
            comments: body.comments || null,
            paymentDate: body.paymentDate || null,
            paymentMode: body.paymentMode || null,
          });
          return sendJson(res, 200, { success: true });
        }
        if (action === 'reject') {
          await rejectPaymentBatch({
            tenantId,
            batchId,
            actorEmail: readActorEmail(req),
            comments: body.comments || 'Rejected',
          });
          return sendJson(res, 200, { success: true });
        }
        if (action === 'execute') {
          await executePaymentBatch({ tenantId, batchId, actorEmail: readActorEmail(req) });
          return sendJson(res, 200, { success: true });
        }
      } catch (e) {
        return sendJson(res, e.statusCode || 500, { success: false, error: e.message });
      }
    }

    // ── Enhanced invoice listing ─────────────────────────
    // GET /api/invoices — WS-1a columns + payment progress + filters + pagination
    //
    // Smoke test:
    //   curl 'http://localhost:3000/api/invoices?lifecycle_state=Under+Verification,Exception+Hold&page=1&limit=10&sort_by=last_action&sort_dir=desc'
    //   Expected shape per row: { id, invoice_number, ..., lifecycle_state, financial_year,
    //     resubmission_count, is_resubmission, vendor_id, last_action, last_action_at,
    //     match_result, match_score, match_computed_at, duplicate_decision,
    //     supplier_gstin, place_of_supply, payment_total, payment_count,
    //     payment_outstanding, payment_progress_pct }
    if (req.method === 'GET' && pathname === '/api/invoices') {
      const tenantId = readApTenantId(req, url);
      const source = url.searchParams.get('source');
      const status = url.searchParams.get('status');
      const vendorId = url.searchParams.get('vendorId');
      const invoiceNo = url.searchParams.get('invoiceNo');
      const lifecycleParam = url.searchParams.get('lifecycle_state');
      const financialYear = url.searchParams.get('financial_year');
      const isResubmission = url.searchParams.get('is_resubmission');
      const duplicateDecision = url.searchParams.get('duplicate_decision');
      const hasException = url.searchParams.get('has_exception');

      // Pagination
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 1), 500);
      const page = Math.max(Number(url.searchParams.get('page')) || 1, 1);
      const offset = (page - 1) * limit;

      // Sorting
      const VALID_SORT_COLS = {
        last_action: 'i.last_action_at',
        created_at: 'i.created_at',
        invoice_date: 'i.invoice_date',
        total_amount: 'i.total_amount',
      };
      const sortBy = VALID_SORT_COLS[url.searchParams.get('sort_by')] || null;
      const sortDir = url.searchParams.get('sort_dir')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const orderClause = sortBy
        ? `ORDER BY ${sortBy} ${sortDir}`
        : 'ORDER BY COALESCE(i.last_action_at, i.created_at) DESC';

      let sql = `SELECT i.id, i.invoice_number, i.invoice_date, i.due_date,
          i.vendor_name, i.vendor_gstin, i.currency, i.subtotal, i.tax_amount, i.total_amount,
          i.po_number, i.po_id, i.status, i.source, i.ingestion_log_id, i.attachment_path, i.lane,
          i.lifecycle_state, i.financial_year,
          i.resubmission_count, i.source_invoice_id,
          i.vendor_id,
          i.last_action, i.last_action_at,
          i.match_result, i.match_score, i.match_computed_at,
          i.duplicate_decision,
          i.supplier_gstin, i.place_of_supply,
          i.created_at,
          COALESCE(pay.payment_total, 0) AS payment_total,
          COALESCE(pay.payment_count, 0) AS payment_count
        FROM invoices i
        LEFT JOIN (
          SELECT invoice_id,
                 SUM(amount) AS payment_total,
                 COUNT(id) AS payment_count
          FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
        ) pay ON pay.invoice_id = i.id`;

      const conditions = [];
      const params = [];

      if (tenantId) {
        conditions.push('i.tenant_id = ?');
        params.push(tenantId);
      }

      if (source) {
        conditions.push('i.source = ?');
        params.push(source);
      }

      // Legacy status filter with dual-read (backward compatible)
      if (status) {
        const mappedLifecycle = mapLegacyToLifecycle(status);
        if (mappedLifecycle) {
          conditions.push('(i.status = ? OR i.lifecycle_state = ?)');
          params.push(status, mappedLifecycle);
        } else {
          conditions.push('i.status = ?');
          params.push(status);
        }
      }

      if (vendorId) {
        conditions.push('i.vendor_id = ?');
        params.push(vendorId);
      }
      if (invoiceNo) {
        conditions.push('i.invoice_number = ?');
        params.push(invoiceNo);
      }

      // New WS-1a filters
      if (lifecycleParam) {
        const states = lifecycleParam
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (states.length > 0) {
          conditions.push(`i.lifecycle_state IN (${states.map(() => '?').join(',')})`);
          params.push(...states);
        }
      }

      if (financialYear) {
        conditions.push('i.financial_year = ?');
        params.push(financialYear);
      }

      if (isResubmission === 'true') {
        conditions.push('i.resubmission_count > 0');
      } else if (isResubmission === 'false') {
        conditions.push('i.resubmission_count = 0');
      }

      if (duplicateDecision) {
        const decisions = duplicateDecision
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (decisions.length > 0) {
          conditions.push(`i.duplicate_decision IN (${decisions.map(() => '?').join(',')})`);
          params.push(...decisions);
        }
      }

      if (hasException === 'true') {
        conditions.push("i.lifecycle_state = 'Exception Hold'");
      } else if (hasException === 'false') {
        conditions.push("i.lifecycle_state != 'Exception Hold'");
      }

      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ` ${orderClause} LIMIT ${Number(limit)} OFFSET ${Number(offset)}`;

      const rows = await query(sql, params);

      // Enrich with computed fields
      const data = rows.map((row) => ({
        ...row,
        is_resubmission: (Number(row.resubmission_count) || 0) > 0,
        payment_outstanding: (Number(row.total_amount) || 0) - (Number(row.payment_total) || 0),
        payment_progress_pct:
          row.total_amount > 0
            ? parseFloat(
                (((Number(row.payment_total) || 0) / Number(row.total_amount)) * 100).toFixed(2)
              )
            : 0,
      }));

      return sendJson(res, 200, { success: true, data, page, limit });
    }

    if (req.method === 'GET' && pathname === '/api/ap/vendor-learning/resolve') {
      await ensureVendorLearningTable();
      const entityName = String(url.searchParams.get('entity_name') || '').trim();
      const sourceVendorName = String(url.searchParams.get('vendor_name') || '').trim();
      const sourceVendorGstin = String(url.searchParams.get('vendor_gstin') || '')
        .trim()
        .toUpperCase();
      if (!entityName || (!sourceVendorName && !sourceVendorGstin)) {
        return sendJson(res, 200, { success: true, mapping: null });
      }
      const rows = await query(
        `
          SELECT *
          FROM p2p_schema_mt.ap_vendor_learning_map
          WHERE entity_name = ?
            AND (
              (? <> '' AND source_vendor_gstin = ?)
              OR
              (? <> '' AND LOWER(source_vendor_name) = LOWER(?))
            )
          ORDER BY
            CASE WHEN (? <> '' AND source_vendor_gstin = ?) THEN 0 ELSE 1 END,
            learn_count DESC,
            updated_at DESC
          LIMIT 1
        `,
        [
          entityName,
          sourceVendorGstin,
          sourceVendorGstin,
          sourceVendorName,
          sourceVendorName,
          sourceVendorGstin,
          sourceVendorGstin,
        ]
      );
      return sendJson(res, 200, { success: true, mapping: rows[0] || null });
    }

    if (req.method === 'POST' && pathname === '/api/ap/vendor-learning/learn') {
      await ensureVendorLearningTable();
      const body = await readJsonBody(req);
      const entityName = String(body?.entity_name || '').trim();
      const sourceVendorName = String(body?.source_vendor_name || '').trim();
      const sourceVendorGstin = String(body?.source_vendor_gstin || '')
        .trim()
        .toUpperCase();
      const masterVendorName = String(body?.master_vendor_name || '').trim();
      const masterVendorGstin = String(body?.master_vendor_gstin || '')
        .trim()
        .toUpperCase();
      if (!entityName || !masterVendorName || (!sourceVendorName && !sourceVendorGstin)) {
        return sendJson(res, 400, {
          success: false,
          error: 'entity_name, source vendor and master vendor are required',
        });
      }
      await query(
        `
          INSERT INTO p2p_schema_mt.ap_vendor_learning_map
            (id, entity_name, source_vendor_name, source_vendor_gstin, master_vendor_name, master_vendor_gstin, confidence, learn_count, last_used_at)
          VALUES
            (?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            master_vendor_name = VALUES(master_vendor_name),
            master_vendor_gstin = VALUES(master_vendor_gstin),
            confidence = VALUES(confidence),
            learn_count = learn_count + 1,
            last_used_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          randomUUID(),
          entityName,
          sourceVendorName,
          sourceVendorGstin,
          masterVendorName,
          masterVendorGstin,
          Number(body?.confidence ?? 100),
        ]
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'GET' && pathname === '/api/ap/field-learning/resolve') {
      await ensureFieldLearningTable();
      const mappingType = String(url.searchParams.get('mapping_type') || '').trim();
      const entityName = String(url.searchParams.get('entity_name') || '').trim();
      const sourceValue = String(url.searchParams.get('source_value') || '').trim();
      if (!mappingType || !sourceValue) {
        return sendJson(res, 200, { success: true, mapping: null });
      }
      const rows = await query(
        `
          SELECT *
          FROM p2p_schema_mt.ap_field_learning_map
          WHERE mapping_type = ?
            AND source_value = ?
            AND (entity_name = ? OR entity_name = '')
          ORDER BY
            CASE WHEN entity_name = ? THEN 0 ELSE 1 END,
            learn_count DESC,
            updated_at DESC
          LIMIT 1
        `,
        [mappingType, sourceValue, entityName, entityName]
      );
      return sendJson(res, 200, { success: true, mapping: rows[0] || null });
    }

    if (req.method === 'POST' && pathname === '/api/ap/field-learning/learn') {
      await ensureFieldLearningTable();
      const body = await readJsonBody(req);
      const mappingType = String(body?.mapping_type || '').trim();
      const entityName = String(body?.entity_name || '').trim();
      const sourceValue = String(body?.source_value || '').trim();
      const mappedValue = String(body?.mapped_value || '').trim();
      if (!mappingType || !sourceValue || !mappedValue) {
        return sendJson(res, 400, {
          success: false,
          error: 'mapping_type, source_value and mapped_value are required',
        });
      }
      await query(
        `
          INSERT INTO p2p_schema_mt.ap_field_learning_map
            (id, mapping_type, entity_name, source_value, mapped_value, confidence, learn_count, last_used_at)
          VALUES
            (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
          ON DUPLICATE KEY UPDATE
            mapped_value = VALUES(mapped_value),
            confidence = VALUES(confidence),
            learn_count = learn_count + 1,
            last_used_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        `,
        [
          randomUUID(),
          mappingType,
          entityName,
          sourceValue,
          mappedValue,
          Number(body?.confidence ?? 100),
        ]
      );
      return sendJson(res, 200, { success: true });
    }

    // ── Workbench Stats API ───────────────────────────────
    if (req.method === 'GET' && pathname === '/api/invoice-ingestion/workbench-stats') {
      try {
        const [invoices] = await query('SELECT COUNT(*) as total FROM p2p_schema_mt.invoices');
        const [green] = await query(
          "SELECT COUNT(*) as cnt FROM p2p_schema_mt.invoices WHERE lane = 'green'"
        );
        const [amber] = await query(
          "SELECT COUNT(*) as cnt FROM p2p_schema_mt.invoices WHERE lane = 'amber'"
        );
        const [red] = await query(
          "SELECT COUNT(*) as cnt FROM p2p_schema_mt.invoices WHERE lane = 'red' OR lane IS NULL"
        );
        const [pending] = await query(
          "SELECT COUNT(*) as cnt FROM p2p_schema_mt.invoices WHERE status = 'pending_approval' OR lifecycle_state = ?",
          [LIFECYCLE_STATES.UNDER_VERIFICATION]
        );
        const [avgScore] = await query(
          'SELECT AVG(readiness_score) as avg FROM p2p_schema_mt.invoices'
        );
        const total = invoices.total || 0;
        const greenCount = green.cnt || 0;
        const stpRate = total > 0 ? Math.round((greenCount / total) * 100) : 0;

        let exceptionsByType = { vendor: 0, ocr: 0, data: 0, po: 0 };
        try {
          const [exc] = await query(
            'SELECT exception_type, COUNT(*) as cnt FROM p2p_schema_mt.invoice_exceptions WHERE resolved = FALSE GROUP BY exception_type'
          );
          if (Array.isArray(exc)) {
            for (const e of exc) {
              const t = (e.exception_type || '').toLowerCase();
              if (t.includes('vendor')) exceptionsByType.vendor += e.cnt;
              else if (t.includes('ocr') || t.includes('confidence')) exceptionsByType.ocr += e.cnt;
              else if (t.includes('po')) exceptionsByType.po += e.cnt;
              else exceptionsByType.data += e.cnt;
            }
          }
        } catch {
          /* exceptions table may not exist */
        }

        const totalExceptions =
          exceptionsByType.vendor +
          exceptionsByType.ocr +
          exceptionsByType.data +
          exceptionsByType.po;

        return sendJson(res, 200, {
          success: true,
          data: {
            total_processed: total,
            stp_rate: stpRate,
            stp_count: greenCount,
            avg_readiness: Math.round((avgScore.avg || 0) * 100),
            unresolved_exceptions: totalExceptions,
            exceptions_by_type: exceptionsByType,
            lane_counts: {
              green: greenCount,
              amber: amber.cnt || 0,
              red: red.cnt || 0,
              pending: pending.cnt || 0,
            },
            last_poll_time: new Date().toISOString(),
          },
        });
      } catch (err) {
        return sendJson(res, 200, {
          success: true,
          data: {
            total_processed: 0,
            stp_rate: 0,
            stp_count: 0,
            avg_readiness: 0,
            unresolved_exceptions: 0,
            exceptions_by_type: { vendor: 0, ocr: 0, data: 0, po: 0 },
            lane_counts: { green: 0, amber: 0, red: 0, pending: 0 },
            last_poll_time: new Date().toISOString(),
          },
        });
      }
    }

    // ── Invoice Ingestion API ──────────────────────────────
    if (req.method === 'POST' && pathname === '/api/invoice-ingestion/trigger') {
      const { emails, results } = await pollOnce();
      for (const email of emails) {
        try {
          await processInvoiceEmail(email);
        } catch (err) {
          console.error('[Ingestion] trigger process error:', err.message);
        }
      }
      return sendJson(res, 200, { success: true, ...results });
    }

    if (req.method === 'GET' && pathname === '/api/invoice-ingestion/logs') {
      const status = url.searchParams.get('status');
      const limit = Math.min(
        Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50),
        200
      );
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      let sql = 'SELECT * FROM invoice_ingestion_log';
      const params = [];
      if (status) {
        sql += ' WHERE status = ?';
        params.push(status);
      }
      sql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'GET' && pathname.startsWith('/api/invoice-ingestion/logs/')) {
      const logId = pathname.replace('/api/invoice-ingestion/logs/', '');
      const rows = await query('SELECT * FROM invoice_ingestion_log WHERE id = ? LIMIT 1', [logId]);
      if (rows.length === 0) return sendJson(res, 404, { success: false, error: 'Log not found' });
      return sendJson(res, 200, { success: true, data: rows[0] });
    }

    if (req.method === 'GET' && pathname === '/api/invoice-ingestion/exceptions') {
      const severity = url.searchParams.get('severity');
      const invoiceId = url.searchParams.get('invoice_id');
      let sql = 'SELECT * FROM invoice_exceptions WHERE resolved = FALSE';
      const params = [];
      if (severity) {
        sql += ' AND severity = ?';
        params.push(severity);
      }
      if (invoiceId) {
        sql += ' AND invoice_id = ?';
        params.push(invoiceId);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (
      req.method === 'PATCH' &&
      pathname.startsWith('/api/invoice-ingestion/exceptions/') &&
      pathname.endsWith('/resolve')
    ) {
      const exId = pathname.split('/')[4];
      await query(
        'UPDATE invoice_exceptions SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
        [exId]
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/invoice-ingestion\/revalidate\/[^/]+$/)) {
      const invoiceId = pathname.split('/').pop();
      try {
        const invoiceRows = await query(
          'SELECT * FROM p2p_schema_mt.invoices WHERE id = ? LIMIT 1',
          [invoiceId]
        );
        if (invoiceRows.length === 0)
          return sendJson(res, 404, { success: false, error: 'Invoice not found' });
        const invoice = invoiceRows[0];

        let score = 0;
        const checks = [];

        // Vendor check (+25)
        if (invoice.vendor_name) {
          const vendorRows = await query(
            "SELECT id FROM `vendor_master`.`vendor_master` WHERE payload->>'$.legalName' = ? OR payload->>'$.vendorName' = ? LIMIT 1",
            [invoice.vendor_name, invoice.vendor_name]
          );
          if (vendorRows.length > 0) {
            score += 25;
            checks.push({ check: 'vendor_found', passed: true });
          } else {
            checks.push({
              check: 'vendor_found',
              passed: false,
              detail: `Vendor "${invoice.vendor_name}" not in master`,
            });
          }
        }

        // Amount check (+10)
        if (invoice.total_amount > 0) {
          score += 10;
          checks.push({ check: 'amount_valid', passed: true });
        } else {
          checks.push({ check: 'amount_valid', passed: false });
        }

        // Invoice date check (+10)
        if (invoice.invoice_date) {
          score += 10;
          checks.push({ check: 'date_valid', passed: true });
        } else {
          checks.push({ check: 'date_valid', passed: false });
        }

        // Invoice number not duplicate (+15)
        const dupRows = await query(
          'SELECT COUNT(*) as cnt FROM p2p_schema_mt.invoices WHERE invoice_number = ? AND id != ?',
          [invoice.invoice_number, invoiceId]
        );
        const dupCount = dupRows[0]?.cnt || 0;
        if (dupCount === 0) {
          score += 15;
          checks.push({ check: 'not_duplicate', passed: true });
        } else {
          checks.push({
            check: 'not_duplicate',
            passed: false,
            detail: 'Duplicate invoice number',
          });
        }

        // Required fields (+10)
        if (
          invoice.invoice_number &&
          invoice.vendor_name &&
          invoice.total_amount &&
          invoice.currency
        ) {
          score += 10;
        }

        // GSTIN check (+10)
        if (
          invoice.vendor_gstin &&
          /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(invoice.vendor_gstin)
        ) {
          score += 10;
        } else if (!invoice.vendor_gstin) {
          score += 5;
        } // not applicable

        // PO match (+20)
        if (invoice.matched_po_id) {
          score += 20;
        }

        // Determine lane
        const lane = score >= 80 ? 'green' : score >= 50 ? 'amber' : 'red';

        // Update invoice
        // NOTE: transition guard bypassed — automated pipeline flow, not user-facing
        const newStatus = lane === 'green' ? 'pending_approval' : 'draft';
        const newLifecycle = mapLegacyToLifecycle(newStatus);
        await query(
          'UPDATE p2p_schema_mt.invoices SET readiness_score = ?, lane = ?, status = ?' +
            (newLifecycle ? ', lifecycle_state = ?' : '') +
            ' WHERE id = ?',
          newLifecycle
            ? [score / 100, lane, newStatus, newLifecycle, invoiceId]
            : [score / 100, lane, newStatus, invoiceId]
        );

        return sendJson(res, 200, { success: true, score, lane, checks });
      } catch (err) {
        console.error('Revalidate error:', err);
        return sendJson(res, 500, { success: false, error: 'Revalidation failed' });
      }
    }

    if (req.method === 'POST' && pathname.startsWith('/api/invoice-ingestion/reprocess/')) {
      const logId = pathname.replace('/api/invoice-ingestion/reprocess/', '');
      const logs = await query('SELECT * FROM invoice_ingestion_log WHERE id = ? LIMIT 1', [logId]);
      if (logs.length === 0) return sendJson(res, 404, { success: false, error: 'Log not found' });
      await query(
        'UPDATE invoice_ingestion_log SET status = ?, error_message = NULL WHERE id = ?',
        ['received', logId]
      );
      return sendJson(res, 200, { success: true, message: 'Queued for reprocessing' });
    }

    if (
      req.method === 'POST' &&
      pathname.match(/^\/api\/invoice-ingestion\/agent-retry\/([^/]+)$/)
    ) {
      const invoiceId = pathname.match(/^\/api\/invoice-ingestion\/agent-retry\/([^/]+)$/)[1];
      const result = await resetAndRequeueInvoice(invoiceId);
      if (result === null)
        return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      return sendJson(res, 200, { success: true, data: result });
    }

    if (req.method === 'POST' && pathname === '/api/invoice-ingestion/manual-upload') {
      // Check API key before OCR
      if (!checkGeminiKey()) {
        return sendJson(res, 503, {
          success: false,
          error: 'GOOGLE_AI_API_KEY not configured — cannot run OCR',
        });
      }

      let buffer, mimeType, filename;
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        // Parse multipart/form-data
        const boundary = contentType.split('boundary=')[1];
        if (!boundary)
          return sendJson(res, 400, { success: false, error: 'Missing multipart boundary' });
        const rawChunks = [];
        for await (const chunk of req) rawChunks.push(chunk);
        const raw = Buffer.concat(rawChunks);
        const parts = parseMultipart(raw, boundary);
        const filePart = parts.find((p) => p.name === 'invoice' || p.name === 'file');
        if (!filePart || !filePart.data || filePart.data.length === 0) {
          return sendJson(res, 400, {
            success: false,
            error: 'No file found in form-data. Use field name "invoice" or "file"',
          });
        }
        buffer = filePart.data;
        filename = filePart.filename || 'manual-upload.pdf';
        mimeType = filePart.contentType || 'application/pdf';
      } else {
        // JSON with base64 file
        const body = await readJsonBody(req);
        const fileData = body.file;
        if (!fileData)
          return sendJson(res, 400, { success: false, error: 'file (base64) is required' });
        buffer = Buffer.from(fileData, 'base64');
        mimeType = body.mimeType || 'application/pdf';
        filename = body.filename || 'manual-upload.pdf';
      }

      console.log(
        `[ManualUpload] Processing ${filename} (${(buffer.length / 1024).toFixed(1)} KB, ${mimeType})`
      );

      const logId = randomUUID();
      await query(
        `INSERT INTO invoice_ingestion_log (id, message_id, sender_email, sender_name, subject, received_at, attachment_count, status)
         VALUES (?, ?, 'manual', 'Manual Upload', ?, CURRENT_TIMESTAMP, 1, 'processing')`,
        [logId, `manual-${logId}`, filename]
      );

      try {
        console.log('[ManualUpload] Step 1: Gemini OCR...');
        const extracted = await extractInvoiceData(buffer, mimeType);
        console.log(
          '[ManualUpload] Step 1 done. Invoice:',
          extracted.invoice_number,
          'Vendor:',
          extracted.vendor_name,
          'Amount:',
          extracted.total_amount,
          'Confidence:',
          extracted.confidence_score
        );

        console.log('[ManualUpload] Step 2: Validating...');
        const duplicateRows = await query(
          `SELECT id FROM invoices
           WHERE vendor_name = ? AND invoice_number = ? AND YEAR(invoice_date) = YEAR(?)
           LIMIT 1`,
          [
            extracted.vendor_name || '',
            extracted.invoice_number || '',
            extracted.invoice_date || new Date().toISOString().slice(0, 10),
          ]
        );
        const validation = await validateInvoiceDataWithPolicy(extracted, {
          existingInvoiceByVendorInvoiceNo: duplicateRows.length > 0,
          vendor: {
            vendor_type: 'company',
            pan_valid: true,
            tds_exempt: false,
            itr_filed: true,
            lower_cert: false,
            lower_rate: 0,
            is_msme: false,
          },
        });
        console.log(
          '[ManualUpload] Step 2 done. Valid:',
          validation.valid,
          'Errors:',
          validation.errors.length,
          'Warnings:',
          validation.warnings.length
        );

        console.log('[ManualUpload] Step 3: PO matching...');
        const match = await matchToPO(extracted, null);
        console.log(
          '[ManualUpload] Step 3 done. Matched:',
          match.matched,
          'Type:',
          match.matchType
        );

        console.log('[ManualUpload] Step 4: Creating invoice...');
        const { invoiceId, status } = await createInvoiceFromExtraction(
          extracted,
          validation,
          match,
          logId,
          null,
          buffer,
          filename
        );
        console.log('[ManualUpload] Step 4 done. Invoice ID:', invoiceId, 'Status:', status);
        await appendInvoiceAuditLog({
          invoiceId,
          userId: req.userId || req.headers['x-user-id'] || null,
          action: status === 'pending_approval' ? 'submitted' : 'created',
          before: null,
          after: extracted,
        });

        console.log('[ManualUpload] Step 5: Checking exceptions...');
        const exceptions = await handleExceptions(invoiceId, extracted, validation, match);
        console.log('[ManualUpload] Step 5 done. Exceptions:', exceptions.length);

        console.log('[ManualUpload] Step 6: Triggering workflow...');
        await triggerWorkflow(invoiceId, validation, match);
        console.log('[ManualUpload] Step 6 done.');

        await query(
          'UPDATE invoice_ingestion_log SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['processed', logId]
        );
        console.log('[ManualUpload] ✓ Complete. Invoice', invoiceId, 'created.');
        return sendJson(res, 201, {
          success: true,
          invoiceId,
          status,
          extracted,
          validation,
          match,
          exceptions,
        });
      } catch (err) {
        console.error('[ManualUpload] ✗ Failed:', err.message);
        console.error(err.stack);
        await query('UPDATE invoice_ingestion_log SET status = ?, error_message = ? WHERE id = ?', [
          'failed',
          err.message,
          logId,
        ]);
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    // ── GL Codes Master (search / list / create) ──────────────
    if (req.method === 'GET' && pathname === '/api/gl-codes/search') {
      const entityId = url.searchParams.get('entityId') || '';
      const q = url.searchParams.get('q') || '';
      const type = url.searchParams.get('type') || '';
      let sql = 'SELECT * FROM p2p_schema_mt.gl_codes WHERE is_active = TRUE';
      const params = [];
      if (entityId) {
        sql += ' AND entity_id = ?';
        params.push(entityId);
      }
      if (type) {
        sql += ' AND gl_type = ?';
        params.push(type);
      }
      if (q) {
        sql += ' AND (gl_code LIKE ? OR gl_description LIKE ?)';
        params.push(`%${q}%`, `%${q}%`);
      }
      sql += ' ORDER BY gl_code LIMIT 10';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'GET' && pathname === '/api/gl-codes') {
      const entityId = url.searchParams.get('entityId') || '';
      let sql = 'SELECT * FROM p2p_schema_mt.gl_codes WHERE is_active = TRUE';
      const params = [];
      if (entityId) {
        sql += ' AND entity_id = ?';
        params.push(entityId);
      }
      sql += ' ORDER BY gl_code';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'POST' && pathname === '/api/gl-codes') {
      const body = await readJsonBody(req);
      const id = randomUUID();
      await query(
        'INSERT INTO p2p_schema_mt.gl_codes (id, gl_code, gl_description, gl_type, entity_id) VALUES (?,?,?,?,?)',
        [id, body.gl_code, body.gl_description, body.gl_type, body.entity_id]
      );
      return sendJson(res, 200, { success: true, data: { id, ...body } });
    }

    // ── GL Code Mappings for Items ──────────────────────────
    if (req.method === 'GET' && pathname.match(/^\/api\/items\/[^/]+\/gl-mappings$/)) {
      const itemId = pathname.split('/')[3];
      const rows = await query(
        'SELECT * FROM p2p_schema_mt.item_gl_mappings WHERE item_id = ? ORDER BY entity_id',
        [itemId]
      );
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/items\/[^/]+\/gl-mappings$/)) {
      const itemId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const mappings = Array.isArray(body.mappings) ? body.mappings : [];
      for (const m of mappings) {
        const id = m.id || randomUUID();
        await query(
          `INSERT INTO p2p_schema_mt.item_gl_mappings
          (id, item_id, entity_id, expense_gl_code, expense_gl_description, asset_gl_code, asset_gl_description, cogs_gl_code, cogs_gl_description, revenue_gl_code, revenue_gl_description, input_tax_gl_code, input_tax_gl_description, output_tax_gl_code, output_tax_gl_description, stock_gl_code, stock_gl_description, purchase_price_variance_gl, cost_centre, profit_centre, is_active, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            expense_gl_code=VALUES(expense_gl_code), expense_gl_description=VALUES(expense_gl_description),
            asset_gl_code=VALUES(asset_gl_code), asset_gl_description=VALUES(asset_gl_description),
            cogs_gl_code=VALUES(cogs_gl_code), cogs_gl_description=VALUES(cogs_gl_description),
            revenue_gl_code=VALUES(revenue_gl_code), revenue_gl_description=VALUES(revenue_gl_description),
            input_tax_gl_code=VALUES(input_tax_gl_code), input_tax_gl_description=VALUES(input_tax_gl_description),
            output_tax_gl_code=VALUES(output_tax_gl_code), output_tax_gl_description=VALUES(output_tax_gl_description),
            stock_gl_code=VALUES(stock_gl_code), stock_gl_description=VALUES(stock_gl_description),
            purchase_price_variance_gl=VALUES(purchase_price_variance_gl),
            cost_centre=VALUES(cost_centre), profit_centre=VALUES(profit_centre),
            is_active=VALUES(is_active)`,
          [
            id,
            itemId,
            m.entity_id,
            m.expense_gl_code || null,
            m.expense_gl_description || null,
            m.asset_gl_code || null,
            m.asset_gl_description || null,
            m.cogs_gl_code || null,
            m.cogs_gl_description || null,
            m.revenue_gl_code || null,
            m.revenue_gl_description || null,
            m.input_tax_gl_code || null,
            m.input_tax_gl_description || null,
            m.output_tax_gl_code || null,
            m.output_tax_gl_description || null,
            m.stock_gl_code || null,
            m.stock_gl_description || null,
            m.purchase_price_variance_gl || null,
            m.cost_centre || null,
            m.profit_centre || null,
            m.is_active !== false,
            m.created_by || 'System',
          ]
        );
      }
      return sendJson(res, 200, { success: true, count: mappings.length });
    }

    // ── Vendor CRUD API (new vendor tables) ──────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/vendors') {
      const search = url.searchParams.get('search') || '';
      let sql = 'SELECT * FROM p2p_schema_mt.vendors WHERE is_active = TRUE';
      const params = [];
      if (search) {
        sql += ' AND (vendor_legal_name LIKE ? OR vendor_code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      sql += ' ORDER BY created_at DESC';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (
      req.method === 'GET' &&
      pathname.match(/^\/api\/vendors\/[^/]+$/) &&
      !pathname.includes('/audit')
    ) {
      const vendorId = pathname.split('/')[3];
      const [vendor] = await query('SELECT * FROM p2p_schema_mt.vendors WHERE id = ?', [vendorId]);
      if (!vendor) return sendJson(res, 404, { error: 'Vendor not found' });
      const spocs = await query(
        'SELECT * FROM p2p_schema_mt.vendor_spocs WHERE vendor_id = ? ORDER BY sort_order',
        [vendorId]
      );
      const [pan] = await query(
        'SELECT * FROM p2p_schema_mt.vendor_pan_compliance WHERE vendor_id = ?',
        [vendorId]
      );
      const gst = await query(
        'SELECT * FROM p2p_schema_mt.vendor_gst_registrations WHERE vendor_id = ? ORDER BY sort_order',
        [vendorId]
      );
      const banks = await query(
        'SELECT * FROM p2p_schema_mt.vendor_bank_accounts WHERE vendor_id = ? ORDER BY sort_order',
        [vendorId]
      );
      const entityMappings = await query(
        'SELECT * FROM p2p_schema_mt.vendor_entity_mappings WHERE vendor_id = ?',
        [vendorId]
      );
      return sendJson(res, 200, {
        success: true,
        data: {
          ...vendor,
          spocs,
          pan_compliance: pan || null,
          gst_registrations: gst,
          bank_accounts: banks,
          entity_mappings: entityMappings,
        },
      });
    }

    // Helper: convert ISO datetime to MySQL DATETIME format
    const toMysqlDatetime = (v) => {
      if (!v) return null;
      const d = new Date(v);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().slice(0, 19).replace('T', ' ');
    };

    if (req.method === 'POST' && pathname === '/api/vendors') {
      const body = await readJsonBody(req);
      const vendorId = randomUUID();
      const tenantId = req.headers['x-tenant-id'] || null;
      // Always auto-generate vendor_code — never trust client input.
      // Sequential format V0001..N scoped by tenant; falls back to a
      // timestamp-based unique code if the lookup fails.
      let vendorCode;
      try {
        const maxRows = await query(
          `SELECT vendor_code FROM p2p_schema_mt.vendors
             WHERE tenant_id ${tenantId ? '= ?' : 'IS NULL'}
               AND vendor_code REGEXP '^V[0-9]+$'
             ORDER BY CAST(SUBSTRING(vendor_code, 2) AS UNSIGNED) DESC
             LIMIT 1`,
          tenantId ? [tenantId] : []
        );
        const last = maxRows?.[0]?.vendor_code;
        const nextNum = last ? parseInt(String(last).slice(1), 10) + 1 : 1;
        vendorCode = `V${String(nextNum).padStart(4, '0')}`;
      } catch {
        vendorCode = `V-${Date.now().toString(36).toUpperCase()}`;
      }
      const vendorStatus = body.status || 'draft';
      // Drift fix 1: persist client_erp_vendor_code
      await query(
        'INSERT INTO p2p_schema_mt.vendors (id, vendor_code, client_erp_vendor_code, vendor_legal_name, vendor_trade_name, vendor_group_id, vendor_group_name, vendor_group_code, vendor_type, address_line, city, state, pin_code, country, status, tenant_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        [
          vendorId,
          vendorCode,
          body.client_erp_vendor_code || null,
          body.vendor_legal_name,
          body.vendor_trade_name || null,
          body.vendor_group_id || null,
          body.vendor_group_name || null,
          body.vendor_group_code || null,
          body.vendor_type || 'goods_supplier',
          body.address_line || null,
          body.city || null,
          body.state || null,
          body.pin_code || null,
          body.country || 'India',
          vendorStatus,
          tenantId,
        ]
      );
      // Mirror to governance table so the approval dashboard can see pending vendors
      if (vendorStatus === 'pending_approval') {
        await query(
          'INSERT INTO `vendor_master`.`vendor_master` (id, record_code, record_name, status, approval_status, payload) VALUES (?,?,?,?,?,?)',
          [
            vendorId,
            vendorCode,
            body.vendor_legal_name,
            'Draft',
            'Pending Approval',
            JSON.stringify({ ...body, id: vendorId, vendor_code: vendorCode }),
          ]
        );
      }
      for (const s of body.spocs || []) {
        await query(
          'INSERT INTO p2p_schema_mt.vendor_spocs (id, vendor_id, spoc_name, designation, email, phone, is_primary, location_label, city, state, pin_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          [
            randomUUID(),
            vendorId,
            s.spoc_name,
            s.designation || null,
            s.email,
            s.phone || null,
            s.is_primary || false,
            s.location_label || null,
            s.city || null,
            s.state || null,
            s.pin_code || null,
          ]
        );
      }
      if (body.pan_compliance) {
        const p = body.pan_compliance;
        const panSrc = p.pan_verification_source || 'manual';
        const panAt =
          panSrc !== 'not_verified' ? toMysqlDatetime(p.pan_verified_at || new Date()) : null;
        await query(
          `INSERT INTO p2p_schema_mt.vendor_pan_compliance (id, vendor_id, pan, entity_type, pan_status, cin_number, msme_number, msme_category, section_206ab, gst_return_filed, tds_sections, rcm_applicable, lower_tds_section, lower_tds_cert_number, lower_tds_cert_valid_from, lower_tds_cert_valid_to, lower_tds_cert_rate, pan_verification_source, pan_verified_at, pan_verification_reference, msme_verification_source, msme_verified_at, msme_verification_reference, cin_verification_source, cin_verified_at, cin_verification_reference, section_206ab_verification_source, section_206ab_verified_at, section_206ab_verification_reference) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            randomUUID(),
            vendorId,
            p.pan || null,
            p.entity_type || null,
            p.pan_status || 'not_verified',
            p.cin_number || null,
            p.msme_number || null,
            p.msme_category || null,
            p.section_206ab || 'not_applicable',
            p.gst_return_filed || 'regular_filer',
            JSON.stringify(p.tds_sections || []),
            p.rcm_applicable || 'no_forward_charge',
            p.lower_tds_section || 'not_applicable',
            p.lower_tds_cert_number || null,
            p.lower_tds_cert_valid_from || null,
            p.lower_tds_cert_valid_to || null,
            p.lower_tds_cert_rate != null ? Number(p.lower_tds_cert_rate) : null,
            panSrc,
            panAt,
            p.pan_verification_reference || null,
            p.msme_verification_source || 'not_verified',
            toMysqlDatetime(p.msme_verified_at),
            p.msme_verification_reference || null,
            p.cin_verification_source || 'not_verified',
            toMysqlDatetime(p.cin_verified_at),
            p.cin_verification_reference || null,
            p.section_206ab_verification_source || 'not_verified',
            toMysqlDatetime(p.section_206ab_verified_at),
            p.section_206ab_verification_reference || null,
          ]
        );
      }
      for (const g of body.gst_registrations || []) {
        const gSrc = g.verification_source || 'not_verified';
        const gAt = gSrc !== 'not_verified' ? toMysqlDatetime(g.verified_at || new Date()) : null;
        await query(
          'INSERT INTO p2p_schema_mt.vendor_gst_registrations (id, vendor_id, gstin, gst_type, state, gst_state_code, city, pin_code, address, spoc_id, status, verification_source, verified_at, verification_reference, verification_raw_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))',
          [
            randomUUID(),
            vendorId,
            g.gstin,
            g.gst_type,
            g.state || null,
            g.gst_state_code || null,
            g.city || null,
            g.pin_code || null,
            g.address || null,
            g.spoc_id || null,
            g.status || 'active',
            gSrc,
            gAt,
            g.verification_reference || null,
            g.verification_raw_response ? JSON.stringify(g.verification_raw_response) : null,
          ]
        );
      }
      for (const b of body.bank_accounts || []) {
        const bSrc = b.verification_source || 'not_verified';
        const bAt = bSrc !== 'not_verified' ? toMysqlDatetime(b.verified_at || new Date()) : null;
        await query(
          'INSERT INTO p2p_schema_mt.vendor_bank_accounts (id, vendor_id, account_number, ifsc_code, branch_name, bank_name, account_type, currency, is_primary, status, verification_source, verified_at, verification_reference, verification_raw_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))',
          [
            randomUUID(),
            vendorId,
            b.account_number,
            b.ifsc_code,
            b.branch_name || null,
            b.bank_name || null,
            b.account_type || 'current',
            b.currency || 'INR',
            b.is_primary || false,
            b.status || 'active',
            bSrc,
            bAt,
            b.verification_reference || null,
            b.verification_raw_response ? JSON.stringify(b.verification_raw_response) : null,
          ]
        );
      }
      // Drift fix 5: CREATE path includes block_for_po/payment + drift fixes 2-3: credit_days/limit + default_tds_section_override
      for (const e of body.entity_mappings || []) {
        await query(
          'INSERT INTO p2p_schema_mt.vendor_entity_mappings (id, vendor_id, entity_id, gl_code_expense, gl_code_expense_desc, gl_code_cogs, gl_code_cogs_desc, payment_terms, credit_days, credit_limit, cost_centre_id, profit_centre_id, block_for_po, block_for_po_reason, block_for_payment, block_for_payment_reason, default_tds_section_override) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
          [
            randomUUID(),
            vendorId,
            e.entity_id,
            e.gl_code_expense || null,
            e.gl_code_expense_desc || null,
            e.gl_code_cogs || null,
            e.gl_code_cogs_desc || null,
            e.payment_terms || null,
            e.credit_days != null ? Number(e.credit_days) : null,
            e.credit_limit != null ? Number(e.credit_limit) : null,
            e.cost_centre_id || null,
            e.profit_centre_id || null,
            e.block_for_po || false,
            e.block_for_po_reason || null,
            e.block_for_payment || false,
            e.block_for_payment_reason || null,
            e.default_tds_section_override || null,
          ]
        );
      }
      return sendJson(res, 200, {
        success: true,
        data: { id: vendorId, vendor_code: vendorCode },
      });
    }

    if (req.method === 'PUT' && pathname.match(/^\/api\/vendors\/[^/]+$/)) {
      const vendorId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      // Drift fix 1: persist client_erp_vendor_code
      await query(
        'UPDATE p2p_schema_mt.vendors SET vendor_legal_name=?, vendor_trade_name=?, vendor_group_id=?, vendor_group_name=?, vendor_group_code=?, vendor_type=?, address_line=?, city=?, state=?, pin_code=?, country=?, status=?, client_erp_vendor_code=? WHERE id=?',
        [
          body.vendor_legal_name,
          body.vendor_trade_name || null,
          body.vendor_group_id || null,
          body.vendor_group_name || null,
          body.vendor_group_code || null,
          body.vendor_type,
          body.address_line || null,
          body.city || null,
          body.state || null,
          body.pin_code || null,
          body.country || 'India',
          body.status || 'draft',
          body.client_erp_vendor_code || null,
          vendorId,
        ]
      );
      if (body.spocs) {
        await query('DELETE FROM p2p_schema_mt.vendor_spocs WHERE vendor_id=?', [vendorId]);
        for (const s of body.spocs) {
          await query(
            'INSERT INTO p2p_schema_mt.vendor_spocs (id, vendor_id, spoc_name, designation, email, phone, is_primary, location_label, city, state, pin_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            [
              randomUUID(),
              vendorId,
              s.spoc_name,
              s.designation || null,
              s.email,
              s.phone || null,
              s.is_primary || false,
              s.location_label || null,
              s.city || null,
              s.state || null,
              s.pin_code || null,
            ]
          );
        }
      }
      if (body.pan_compliance) {
        await query('DELETE FROM p2p_schema_mt.vendor_pan_compliance WHERE vendor_id=?', [
          vendorId,
        ]);
        const p = body.pan_compliance;
        const panSrc = p.pan_verification_source || 'manual';
        const panAt =
          panSrc !== 'not_verified' ? toMysqlDatetime(p.pan_verified_at || new Date()) : null;
        await query(
          `INSERT INTO p2p_schema_mt.vendor_pan_compliance (id, vendor_id, pan, entity_type, pan_status, cin_number, msme_number, msme_category, section_206ab, gst_return_filed, tds_sections, rcm_applicable, lower_tds_section, lower_tds_cert_number, lower_tds_cert_valid_from, lower_tds_cert_valid_to, lower_tds_cert_rate, pan_verification_source, pan_verified_at, pan_verification_reference, msme_verification_source, msme_verified_at, msme_verification_reference, cin_verification_source, cin_verified_at, cin_verification_reference, section_206ab_verification_source, section_206ab_verified_at, section_206ab_verification_reference) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            randomUUID(),
            vendorId,
            p.pan || null,
            p.entity_type || null,
            p.pan_status || 'not_verified',
            p.cin_number || null,
            p.msme_number || null,
            p.msme_category || null,
            p.section_206ab || 'not_applicable',
            p.gst_return_filed || 'regular_filer',
            JSON.stringify(p.tds_sections || []),
            p.rcm_applicable || 'no_forward_charge',
            p.lower_tds_section || 'not_applicable',
            p.lower_tds_cert_number || null,
            p.lower_tds_cert_valid_from || null,
            p.lower_tds_cert_valid_to || null,
            p.lower_tds_cert_rate != null ? Number(p.lower_tds_cert_rate) : null,
            panSrc,
            panAt,
            p.pan_verification_reference || null,
            p.msme_verification_source || 'not_verified',
            toMysqlDatetime(p.msme_verified_at),
            p.msme_verification_reference || null,
            p.cin_verification_source || 'not_verified',
            toMysqlDatetime(p.cin_verified_at),
            p.cin_verification_reference || null,
            p.section_206ab_verification_source || 'not_verified',
            toMysqlDatetime(p.section_206ab_verified_at),
            p.section_206ab_verification_reference || null,
          ]
        );
      }
      if (body.gst_registrations) {
        await query('DELETE FROM p2p_schema_mt.vendor_gst_registrations WHERE vendor_id=?', [
          vendorId,
        ]);
        for (const g of body.gst_registrations) {
          const gSrc = g.verification_source || 'not_verified';
          const gAt = gSrc !== 'not_verified' ? toMysqlDatetime(g.verified_at || new Date()) : null;
          await query(
            'INSERT INTO p2p_schema_mt.vendor_gst_registrations (id, vendor_id, gstin, gst_type, state, gst_state_code, city, pin_code, address, spoc_id, status, verification_source, verified_at, verification_reference, verification_raw_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))',
            [
              randomUUID(),
              vendorId,
              g.gstin,
              g.gst_type,
              g.state || null,
              g.gst_state_code || null,
              g.city || null,
              g.pin_code || null,
              g.address || null,
              g.spoc_id || null,
              g.status || 'active',
              gSrc,
              gAt,
              g.verification_reference || null,
              g.verification_raw_response ? JSON.stringify(g.verification_raw_response) : null,
            ]
          );
        }
      }
      if (body.bank_accounts) {
        await query('DELETE FROM p2p_schema_mt.vendor_bank_accounts WHERE vendor_id=?', [vendorId]);
        for (const b of body.bank_accounts) {
          const bSrc = b.verification_source || 'not_verified';
          const bAt = bSrc !== 'not_verified' ? toMysqlDatetime(b.verified_at || new Date()) : null;
          await query(
            'INSERT INTO p2p_schema_mt.vendor_bank_accounts (id, vendor_id, account_number, ifsc_code, branch_name, bank_name, account_type, currency, is_primary, status, verification_source, verified_at, verification_reference, verification_raw_response) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS JSON))',
            [
              randomUUID(),
              vendorId,
              b.account_number,
              b.ifsc_code,
              b.branch_name || null,
              b.bank_name || null,
              b.account_type || 'current',
              b.currency || 'INR',
              b.is_primary || false,
              b.status || 'active',
              bSrc,
              bAt,
              b.verification_reference || null,
              b.verification_raw_response ? JSON.stringify(b.verification_raw_response) : null,
            ]
          );
        }
      }
      if (body.entity_mappings) {
        await query('DELETE FROM p2p_schema_mt.vendor_entity_mappings WHERE vendor_id=?', [
          vendorId,
        ]);
        // Drift fixes 2-3: credit_days/limit + drift fix 5: block_for_* on both paths + default_tds_section_override
        for (const e of body.entity_mappings) {
          await query(
            'INSERT INTO p2p_schema_mt.vendor_entity_mappings (id, vendor_id, entity_id, gl_code_expense, gl_code_expense_desc, gl_code_cogs, gl_code_cogs_desc, payment_terms, credit_days, credit_limit, cost_centre_id, profit_centre_id, block_for_po, block_for_po_reason, block_for_payment, block_for_payment_reason, default_tds_section_override) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            [
              randomUUID(),
              vendorId,
              e.entity_id,
              e.gl_code_expense || null,
              e.gl_code_expense_desc || null,
              e.gl_code_cogs || null,
              e.gl_code_cogs_desc || null,
              e.payment_terms || null,
              e.credit_days != null ? Number(e.credit_days) : null,
              e.credit_limit != null ? Number(e.credit_limit) : null,
              e.cost_centre_id || null,
              e.profit_centre_id || null,
              e.block_for_po || false,
              e.block_for_po_reason || null,
              e.block_for_payment || false,
              e.block_for_payment_reason || null,
              e.default_tds_section_override || null,
            ]
          );
        }
      }
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'DELETE' && pathname.match(/^\/api\/vendors\/[^/]+$/)) {
      const vendorId = pathname.split('/')[3];
      await query('UPDATE p2p_schema_mt.vendors SET is_active = FALSE, status = ? WHERE id = ?', [
        'inactive',
        vendorId,
      ]);
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/vendors\/[^/]+\/submit$/)) {
      const vendorId = pathname.split('/')[3];
      await query("UPDATE p2p_schema_mt.vendors SET status = 'pending_approval' WHERE id = ?", [
        vendorId,
      ]);
      return sendJson(res, 200, { success: true });
    }

    // ── Agent Config API ──────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/ap/agent-config') {
      const agent = url.searchParams.get('agent');
      let sql = 'SELECT * FROM ap_agent_config WHERE is_active = TRUE';
      const params = [];
      if (agent) {
        sql += ' AND agent_name = ?';
        params.push(agent);
      }
      sql += ' ORDER BY agent_name, display_order';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'PUT' && pathname === '/api/ap/agent-config') {
      const body = await readJsonBody(req);
      const { id, config_value } = body;
      if (!id || config_value === undefined)
        return sendJson(res, 400, { success: false, error: 'id and config_value required' });
      await query(
        'UPDATE ap_agent_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [String(config_value), id]
      );
      return sendJson(res, 200, { success: true });
    }

    // ── AP Agentic Invoices API ─────────────────────────
    if (req.method === 'GET' && pathname === '/api/ap/invoices') {
      const lane = url.searchParams.get('lane');
      const status = url.searchParams.get('status');
      let sql =
        'SELECT id, invoice_number, invoice_date, due_date, vendor_name, vendor_gstin, currency, subtotal, tax_amount, total_amount, po_number, po_id, status, source, lane, posting_readiness_score, processing_status, auto_post_flag, human_touched_flag, attachment_path, created_at FROM invoices WHERE source = ?';
      const params = ['email_ingestion'];
      if (lane) {
        sql += ' AND lane = ?';
        params.push(lane);
      }
      if (status) {
        const mappedLifecycle = mapProcessingStatusToLifecycle(status);
        if (mappedLifecycle) {
          sql += ' AND (processing_status = ? OR lifecycle_state = ?)';
          params.push(status, mappedLifecycle);
        } else {
          sql += ' AND processing_status = ?';
          params.push(status);
        }
      }
      sql += ' ORDER BY created_at DESC LIMIT 100';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (
      req.method === 'GET' &&
      pathname.startsWith('/api/ap/invoices/') &&
      pathname.endsWith('/decisions')
    ) {
      const invoiceId = pathname.split('/')[4];
      const decisions = await query(
        'SELECT * FROM ap_invoice_agent_decisions WHERE invoice_id = ? ORDER BY created_at ASC',
        [invoiceId]
      );
      const explanations = await query(
        'SELECT * FROM ap_invoice_explainability_logs WHERE invoice_id = ? ORDER BY created_at ASC',
        [invoiceId]
      );
      return sendJson(res, 200, { success: true, data: { decisions, explanations } });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/ap/invoices/') &&
      pathname.endsWith('/approve')
    ) {
      const invoiceId = pathname.split('/')[4];
      const [currentInv] = await query('SELECT lifecycle_state FROM invoices WHERE id = ?', [
        invoiceId,
      ]);
      try {
        assertValidTransition(currentInv?.lifecycle_state ?? null, LIFECYCLE_STATES.PROCESSED);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }
      await query(
        'UPDATE invoices SET status = ?, processing_status = ?, lifecycle_state = ?, human_touched_flag = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Approved', 'posted', LIFECYCLE_STATES.PROCESSED, invoiceId]
      );
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, actor, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), invoiceId, 'approve', 'API User']
      );
      return sendJson(res, 200, { success: true });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/ap/invoices/') &&
      pathname.endsWith('/reject')
    ) {
      const invoiceId = pathname.split('/')[4];
      const [currentInv] = await query('SELECT lifecycle_state FROM invoices WHERE id = ?', [
        invoiceId,
      ]);
      try {
        assertValidTransition(currentInv?.lifecycle_state ?? null, LIFECYCLE_STATES.REJECTED);
      } catch (e) {
        return sendJson(res, 422, { success: false, error: e.message });
      }
      await query(
        'UPDATE invoices SET status = ?, processing_status = ?, lifecycle_state = ?, human_touched_flag = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['Rejected', 'rejected', LIFECYCLE_STATES.REJECTED, invoiceId]
      );
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, actor, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), invoiceId, 'reject', 'API User']
      );
      return sendJson(res, 200, { success: true });
    }

    if (
      req.method === 'POST' &&
      pathname.startsWith('/api/ap/invoices/') &&
      pathname.endsWith('/correct')
    ) {
      const invoiceId = pathname.split('/')[4];
      const body = await readJsonBody(req);
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, field_corrections, comments, actor, created_at) VALUES (?, ?, ?, CAST(? AS JSON), ?, ?, CURRENT_TIMESTAMP)',
        [
          randomUUID(),
          invoiceId,
          'correct',
          JSON.stringify(body.corrections || {}),
          body.comments || '',
          'API User',
        ]
      );
      // Apply corrections to invoice
      if (body.corrections) {
        const corr = body.corrections;
        const sets = [];
        const vals = [];
        for (const [field, value] of Object.entries(corr)) {
          if (
            [
              'vendor_name',
              'invoice_number',
              'invoice_date',
              'total_amount',
              'currency',
              'vendor_gstin',
            ].includes(field)
          ) {
            sets.push(`${field} = ?`);
            vals.push(value);
          }
        }
        if (sets.length > 0) {
          sets.push('human_touched_flag = TRUE', 'updated_at = CURRENT_TIMESTAMP');
          vals.push(invoiceId);
          await query(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?`, vals);
        }
      }
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'GET' && pathname === '/api/ap/dashboard/stats') {
      const lanes = await query(
        "SELECT lane, COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion' AND lane IS NOT NULL GROUP BY lane"
      );
      const [total] = await query(
        "SELECT COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion'"
      );
      const [autoPosted] = await query(
        "SELECT COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion' AND auto_post_flag = TRUE"
      );
      const [exceptions] = await query(
        'SELECT COUNT(*) as cnt FROM ap_invoice_exception_cases WHERE resolved = FALSE'
      );
      const [avgReadiness] = await query(
        "SELECT AVG(posting_readiness_score) as avg_score FROM invoices WHERE source = 'email_ingestion' AND posting_readiness_score IS NOT NULL"
      );

      const laneMap = {};
      if (Array.isArray(lanes))
        lanes.forEach((r) => {
          laneMap[r.lane] = r.cnt;
        });

      return sendJson(res, 200, {
        success: true,
        data: {
          total: total?.cnt || 0,
          green: laneMap.green || 0,
          amber: laneMap.amber || 0,
          red: laneMap.red || 0,
          autoPosted: autoPosted?.cnt || 0,
          exceptions: exceptions?.cnt || 0,
          avgReadiness: avgReadiness?.avg_score ? Number(avgReadiness.avg_score).toFixed(1) : 0,
          stpRate: total?.cnt > 0 ? (((laneMap.green || 0) / total.cnt) * 100).toFixed(1) : 0,
        },
      });
    }

    // ── Agentic Pipeline Trigger ────────────────────────
    if (req.method === 'POST' && pathname === '/api/ap/process-invoice') {
      if (!checkGeminiKey()) {
        return sendJson(res, 503, {
          success: false,
          error: 'GOOGLE_AI_API_KEY not configured — cannot run OCR',
        });
      }
      const contentType = req.headers['content-type'] || '';
      let buffer, mimeType, filename;

      if (contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (!boundary)
          return sendJson(res, 400, { success: false, error: 'Missing multipart boundary' });
        const rawChunks = [];
        for await (const chunk of req) rawChunks.push(chunk);
        const raw = Buffer.concat(rawChunks);
        const parts = parseMultipart(raw, boundary);
        const filePart = parts.find((p) => p.name === 'invoice' || p.name === 'file');
        if (!filePart?.data?.length)
          return sendJson(res, 400, { success: false, error: 'No file in form-data' });
        buffer = filePart.data;
        filename = filePart.filename || 'upload.pdf';
        mimeType = filePart.contentType || 'application/pdf';
      } else {
        const body = await readJsonBody(req);
        if (!body.file)
          return sendJson(res, 400, { success: false, error: 'file (base64) required' });
        buffer = Buffer.from(body.file, 'base64');
        mimeType = body.mimeType || 'application/pdf';
        filename = body.filename || 'upload.pdf';
      }

      console.log(`[AP] Processing ${filename} via agentic pipeline...`);
      const fakeEmail = {
        messageId: `manual-${randomUUID()}`,
        senderEmail: 'manual',
        senderName: 'Manual Upload',
        subject: filename,
        date: new Date(),
        attachments: [{ filename, mimeType, buffer }],
        _logId: null,
      };

      // Create ingestion log
      const logId = randomUUID();
      await query(
        `INSERT INTO invoice_ingestion_log (id, message_id, sender_email, sender_name, subject, received_at, attachment_count, status)
         VALUES (?, ?, 'manual', 'Manual Upload', ?, CURRENT_TIMESTAMP, 1, 'processing')`,
        [logId, fakeEmail.messageId, filename]
      );
      fakeEmail._logId = logId;

      const results = await processInvoiceWithAgents(fakeEmail);
      return sendJson(res, 201, { success: true, results });
    }

    // ═══════════════════════════════════════════════════════════════
    // PO Management endpoints (Force Closure, Expiry, Amendments)
    // ═══════════════════════════════════════════════════════════════

    // --- Force Closure ---
    if (
      req.method === 'GET' &&
      pathname.match(/^\/api\/purchase-orders\/[^/]+\/closure-preview$/)
    ) {
      const poId = pathname.split('/')[3];
      const preview = await getForceClosurePreview(query, poId);
      return sendJson(res, 200, { success: true, data: preview });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/purchase-orders\/[^/]+\/force-close$/)) {
      const poId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const result = await forceclosePO(query, poId, body.userId || 'system', body);
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- PO Expiry ---
    if (req.method === 'GET' && pathname === '/api/purchase-orders/expiring') {
      const entityId = url.searchParams.get('entityId') || '';
      const data = await getExpiringPOs(query, entityId);
      return sendJson(res, 200, { success: true, data });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/purchase-orders\/[^/]+\/extend$/)) {
      const poId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const result = await extendPO(query, poId, body.userId || 'system', body);
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- PO Amendments ---
    if (req.method === 'GET' && pathname.match(/^\/api\/purchase-orders\/[^/]+\/amendments$/)) {
      const poId = pathname.split('/')[3];
      const amendments = await getAmendmentHistory(query, poId);
      return sendJson(res, 200, { success: true, data: amendments });
    }

    if (req.method === 'POST' && pathname.match(/^\/api\/purchase-orders\/[^/]+\/amendments$/)) {
      const poId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const result = await createAmendment(query, poId, body.userId || 'system', body);
      return sendJson(res, 200, { success: true, data: result });
    }

    if (
      req.method === 'PUT' &&
      pathname.match(/^\/api\/purchase-orders\/[^/]+\/amendments\/[^/]+\/approve$/)
    ) {
      const parts = pathname.split('/');
      const amendmentId = parts[5];
      const body = await readJsonBody(req);
      const result = await approveAmendment(query, amendmentId, body.userId || 'system');
      return sendJson(res, 200, { success: true, data: result });
    }

    if (
      req.method === 'PUT' &&
      pathname.match(/^\/api\/purchase-orders\/[^/]+\/amendments\/[^/]+\/reject$/)
    ) {
      const parts = pathname.split('/');
      const amendmentId = parts[5];
      const body = await readJsonBody(req);
      const result = await rejectAmendment(
        query,
        amendmentId,
        body.userId || 'system',
        body.rejectionReason || ''
      );
      return sendJson(res, 200, { success: true, data: result });
    }

    // ═══════════════════════════════════════════════════════════════
    // Agent Configurator endpoints
    // ═══════════════════════════════════════════════════════════════

    // --- AI helper endpoints (must be before :id routes) ---
    const buildRuleSuggestionsFallback = (body = {}) => {
      const fieldName = String(body.field_name || body.fieldName || 'field_value');
      const fieldType = String(body.field_type || body.fieldType || 'Text');
      const lowerName = fieldName.toLowerCase();
      const suggestions = [];
      const push = (description, ruleType, severity = 'Error', confidence = 0.72) => {
        suggestions.push({
          id: randomUUID(),
          type: 'rule',
          description,
          confidence,
          suggested: {
            fieldName,
            ruleType,
            ruleConfig: {},
            severity,
          },
          status: 'pending',
          source: 'fallback',
        });
      };

      push(`${fieldName} must be provided before submission.`, 'Required', 'Error', 0.82);

      if (lowerName.includes('email')) {
        push(`${fieldName} should match valid email format.`, 'Format validation', 'Error', 0.78);
      } else if (lowerName.includes('gst')) {
        push(
          `${fieldName} should match standard GSTIN pattern.`,
          'Format validation',
          'Error',
          0.8
        );
      } else if (lowerName.includes('date') || fieldType.toLowerCase() === 'date') {
        push(
          `${fieldName} should be a valid date and not in invalid range.`,
          'Format validation',
          'Warning',
          0.74
        );
      } else if (lowerName.includes('amount') || lowerName.includes('total')) {
        push(
          `${fieldName} should be positive and within threshold.`,
          'Threshold check',
          'Warning',
          0.73
        );
      } else {
        push(
          `${fieldName} should follow expected ${fieldType} format.`,
          'Format validation',
          'Warning',
          0.7
        );
      }

      return suggestions.slice(0, 3);
    };

    const buildReviewFallback = (body = {}) => {
      const rules = Array.isArray(body.rules) ? body.rules : [];
      const requiredCoverage = rules.filter((r) =>
        String(r?.type || r?.ruleType || '')
          .toLowerCase()
          .includes('required')
      ).length;
      const predicted_accuracy = Math.min(
        95,
        Math.max(60, 62 + rules.length * 3 + requiredCoverage * 2)
      );
      return {
        predicted_accuracy,
        gaps:
          rules.length < 3
            ? [
                {
                  field: 'General',
                  missing_rule: 'Coverage is low across key fields',
                  severity: 'Medium',
                  recommendation:
                    'Add required, format, and cross-field validations for critical columns.',
                },
              ]
            : [],
        recommendations: [
          'Add at least one format validation for identity fields.',
          'Use threshold checks for numeric amount fields.',
          'Use warning severity for soft checks and error for hard blocks.',
        ],
        fraud_risks:
          rules.length < 2 ? ['Insufficient rules can allow malformed records to pass.'] : [],
      };
    };

    if (req.method === 'POST' && pathname === '/api/agents/ai/review-rules') {
      const body = await readJsonBody(req);
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey)
        return sendJson(res, 500, {
          success: false,
          error: 'GOOGLE_AI_API_KEY is not configured in .env.mysql.local',
        });
      let review;
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Review these validation rules for a ${body.module || 'P2P'} form and analyze completeness. Rules: ${JSON.stringify(body.rules || [])}. Form: ${body.form_context || ''}. Return JSON: { "predicted_accuracy": number 0-100, "gaps": [{"field": "...", "missing_rule": "...", "severity": "High|Medium|Low", "recommendation": "..."}], "recommendations": ["..."], "fraud_risks": ["..."], "compliance_gaps": ["..."] }. Return ONLY valid JSON, no markdown.`,
                },
              ],
            },
          ],
        });
        const text = result.response?.text?.() || '{}';
        try {
          review = JSON.parse(
            text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()
          );
        } catch {
          review = buildReviewFallback(body);
        }
      } catch (error) {
        console.warn(
          '[agents/ai/review-rules] AI provider unavailable, using fallback:',
          error?.message || error
        );
        review = buildReviewFallback(body);
      }
      return sendJson(res, 200, { success: true, review });
    }

    if (req.method === 'POST' && pathname === '/api/agents/ai/suggest-rules') {
      const body = await readJsonBody(req);
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey)
        return sendJson(res, 500, {
          success: false,
          error: 'GOOGLE_AI_API_KEY is not configured in .env.mysql.local',
        });
      let suggestions;
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `You are an expert at P2P (procure-to-pay) data validation. Given the following agent context, suggest validation rules as a JSON array. Each rule: { "id": "unique-id", "type": "rule", "description": "human readable", "confidence": 0.0-1.0, "suggested": { "fieldName": "...", "ruleType": "Required|Format validation|Duplicate check|Cross-reference|Math validation|Threshold check|Custom", "ruleConfig": {}, "severity": "Error|Warning|Info" }, "status": "pending" }. Return ONLY a valid JSON array, no markdown.\n\nContext: ${JSON.stringify(body)}`,
                },
              ],
            },
          ],
        });
        const text = result.response?.text?.() || '[]';
        try {
          suggestions = JSON.parse(
            text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()
          );
        } catch {
          suggestions = [];
        }
      } catch (error) {
        console.warn(
          '[agents/ai/suggest-rules] AI provider unavailable, using fallback:',
          error?.message || error
        );
        suggestions = buildRuleSuggestionsFallback(body);
      }
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestions = buildRuleSuggestionsFallback(body);
      }
      return sendJson(res, 200, { success: true, suggestions });
    }

    if (req.method === 'POST' && pathname === '/api/agents/ai/generate-rules') {
      const body = await readJsonBody(req);
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey)
        return sendJson(res, 500, {
          success: false,
          error: 'GOOGLE_AI_API_KEY is not configured in .env.mysql.local',
        });
      const prompt =
        typeof body.description === 'string'
          ? body.description
          : typeof body.prompt === 'string'
            ? body.prompt
            : JSON.stringify(body);
      let suggestions;
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent({
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Convert this plain-English validation description into structured rule JSON. Return a JSON array of rules: { "id": "unique-id", "type": "rule", "description": "...", "confidence": 0.0-1.0, "suggested": { "fieldName": "...", "ruleType": "Required|Format validation|Duplicate check|Cross-reference|Math validation|Threshold check|Custom", "ruleConfig": {}, "severity": "Error|Warning|Info" }, "status": "pending" }. Return ONLY a valid JSON array, no markdown.\n\nDescription: ${prompt}\nForm: ${body.formName || ''}\nModule: ${body.module || ''}\nFields: ${JSON.stringify(body.fields || [])}`,
                },
              ],
            },
          ],
        });
        const text = result.response?.text?.() || '[]';
        try {
          suggestions = JSON.parse(
            text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()
          );
        } catch {
          suggestions = [];
        }
      } catch (error) {
        console.warn(
          '[agents/ai/generate-rules] AI provider unavailable, using fallback:',
          error?.message || error
        );
        suggestions = buildRuleSuggestionsFallback({
          field_name: body.field_name || 'custom_field',
          field_type: 'Text',
        }).map((rule) => ({
          ...rule,
          description: prompt
            ? `${rule.description} Context: ${prompt.slice(0, 120)}`
            : rule.description,
        }));
      }
      if (!Array.isArray(suggestions) || suggestions.length === 0) {
        suggestions = buildRuleSuggestionsFallback({
          field_name: body.field_name || 'custom_field',
          field_type: 'Text',
        });
      }
      return sendJson(res, 200, { success: true, suggestions });
    }

    if (req.method === 'POST' && pathname === '/api/agents/ai/suggest-actions') {
      const body = await readJsonBody(req);
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey)
        return sendJson(res, 500, {
          success: false,
          error: 'GOOGLE_AI_API_KEY is not configured in .env.mysql.local',
        });
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `You are an expert at P2P automation. Given agent context, suggest post-validation actions as a JSON array. Each action: { "id": "unique-id", "type": "action", "description": "...", "confidence": 0.0-1.0, "suggested": { "actionType": "Create record|Link entity|Trigger approval|Send notification|Create exception|Webhook", "triggerCondition": "Always|On success|On failure", "actionConfig": {} }, "status": "pending" }. Return ONLY a valid JSON array, no markdown.\n\nContext: ${JSON.stringify(body)}`,
              },
            ],
          },
        ],
      });
      const text = result.response?.text?.() || '[]';
      let suggestions;
      try {
        suggestions = JSON.parse(
          text
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim()
        );
      } catch {
        suggestions = [];
      }
      return sendJson(res, 200, { success: true, suggestions });
    }

    // --- List all agents ---
    if (req.method === 'GET' && pathname === '/api/agents') {
      const rows = await query('SELECT * FROM p2p_schema_mt.agents ORDER BY updated_at DESC');
      return sendJson(res, 200, { success: true, data: rows });
    }

    // --- Create agent ---
    if (req.method === 'POST' && pathname === '/api/agents') {
      const body = await readJsonBody(req);
      const id = randomUUID();
      await query(
        `INSERT INTO p2p_schema_mt.agents (id, name, type, purpose, module, form_name, application_on, entity_scope, trigger_event, target_accuracy, fallback_action, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          body.name || 'Untitled Agent',
          body.type || 'Validation',
          body.purpose || null,
          body.module || null,
          body.form_name || null,
          body.application_on || 'Form',
          body.entity_scope || '',
          body.trigger_event || 'Manual',
          body.target_accuracy ?? 95,
          body.fallback_action || 'Create exception',
          body.status || 'Draft',
          body.created_by || 'System',
        ]
      );
      const [created] = await query('SELECT * FROM p2p_schema_mt.agents WHERE id = ?', [id]);
      return sendJson(res, 201, { success: true, data: created });
    }

    // --- Get agent with rules + actions ---
    if (
      req.method === 'GET' &&
      pathname.match(/^\/api\/agents\/[^/]+$/) &&
      !pathname.includes('/ai/')
    ) {
      const agentId = pathname.split('/')[3];
      try {
        const { agent, rules, actions } = await loadAgent(query, agentId);
        if (!agent || !agent.id) {
          return sendJson(res, 404, { success: false, error: 'Agent not found' });
        }
        return sendJson(res, 200, { success: true, agent, rules, actions });
      } catch {
        return sendJson(res, 404, { success: false, error: 'Agent not found' });
      }
    }

    // --- Update agent ---
    if (req.method === 'PUT' && pathname.match(/^\/api\/agents\/[^/]+$/)) {
      const agentId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const fields = [];
      const values = [];
      const allowed = [
        'name',
        'type',
        'purpose',
        'module',
        'form_name',
        'application_on',
        'entity_scope',
        'trigger_event',
        'target_accuracy',
        'fallback_action',
        'status',
      ];
      for (const key of allowed) {
        if (body[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(body[key]);
        }
      }
      if (fields.length === 0) {
        return sendJson(res, 400, { success: false, error: 'No valid fields to update' });
      }
      values.push(agentId);
      await query(`UPDATE p2p_schema_mt.agents SET ${fields.join(', ')} WHERE id = ?`, values);
      const [updated] = await query('SELECT * FROM p2p_schema_mt.agents WHERE id = ?', [agentId]);
      return sendJson(res, 200, { success: true, data: updated });
    }

    // --- Delete agent (soft) ---
    if (req.method === 'DELETE' && pathname.match(/^\/api\/agents\/[^/]+$/)) {
      const agentId = pathname.split('/')[3];
      await query("UPDATE p2p_schema_mt.agents SET status = 'Inactive' WHERE id = ?", [agentId]);
      return sendJson(res, 200, { success: true, message: 'Agent deactivated' });
    }

    // --- Test agent ---
    if (req.method === 'POST' && pathname.match(/^\/api\/agents\/[^/]+\/test$/)) {
      const agentId = pathname.split('/')[3];
      const { agent } = await loadAgent(query, agentId);

      // Try to fetch test data from the relevant table
      let testData = [];
      const body = await readJsonBody(req);
      if (body.testData && Array.isArray(body.testData)) {
        testData = body.testData;
      } else {
        // Attempt to load last 20 records from agent's target
        const tableName = agent.form_name || agent.module;
        if (tableName && /^[A-Za-z0-9_]+$/.test(tableName)) {
          try {
            testData = await query(
              `SELECT * FROM p2p_schema_mt.${tableName} ORDER BY created_at DESC LIMIT 20`
            );
          } catch {
            // Table may not exist; try generic_masters with module filter
            try {
              testData = await query(
                `SELECT * FROM p2p_schema_mt.generic_masters WHERE master_key = ? ORDER BY created_at DESC LIMIT 20`,
                [agent.module || agent.form_name]
              );
            } catch {
              testData = [];
            }
          }
        }
      }

      if (testData.length === 0) {
        return sendJson(res, 400, {
          success: false,
          error: 'No test data available. Provide testData in request body.',
        });
      }

      const result = await testAgent(query, agentId, testData);
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- Activate agent ---
    if (req.method === 'POST' && pathname.match(/^\/api\/agents\/[^/]+\/activate$/)) {
      const agentId = pathname.split('/')[3];
      const [agent] = await query('SELECT * FROM p2p_schema_mt.agents WHERE id = ?', [agentId]);
      if (!agent) return sendJson(res, 404, { success: false, error: 'Agent not found' });

      await query(
        "UPDATE p2p_schema_mt.agents SET status = 'Active', accuracy_score = GREATEST(accuracy_score, 95) WHERE id = ?",
        [agentId]
      );
      return sendJson(res, 200, { success: true, message: 'Agent activated' });
    }

    // --- Run agent ---
    if (req.method === 'POST' && pathname.match(/^\/api\/agents\/[^/]+\/run$/)) {
      const agentId = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const result = await runAgent(query, agentId, body.data || body, body.context || {});
      return sendJson(res, 200, { success: true, data: result });
    }

    // --- Agent run logs ---
    if (req.method === 'GET' && pathname.match(/^\/api\/agents\/[^/]+\/logs$/)) {
      const agentId = pathname.split('/')[3];
      const rows = await query(
        'SELECT * FROM p2p_schema_mt.agent_run_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50',
        [agentId]
      );
      return sendJson(res, 200, { success: true, data: rows });
    }

    // --- AI Chatbot ---
    if (req.method === 'POST' && pathname === '/api/chat') {
      const body = await readJsonBody(req);
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) return sendJson(res, 500, { error: 'GOOGLE_AI_API_KEY not configured' });

      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const chatModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const systemPrompt = `You are the Procinix AI Assistant for a Procure-to-Pay (P2P) enterprise application. You can:

1. ANSWER questions about the app, procurement processes, AP workflows, master data, approvals
2. EXECUTE commands by returning structured actions:
   - Create masters: department, employee, vendor, entity, item, etc.
   - Create transactions: purchase requisition, purchase order, invoice, payment, advance request
   - Navigate to pages
   - Look up data

When the user gives a command, determine if you have enough information to execute it. If not, ask the MINIMUM required questions to complete it.

ALWAYS respond with JSON in this format:
{
  "message": "Your response text to the user",
  "actions": [
    {
      "label": "Button text",
      "type": "navigate|create|confirm",
      "payload": { "route": "/path", "masterKey": "department_master", "data": {} }
    }
  ],
  "needsInfo": false,
  "followUpQuestion": null
}

For create commands, if the user says "create a department called Marketing":
{
  "message": "I'll create a department 'Marketing' for you. Please confirm:",
  "actions": [
    { "label": "Create Department", "type": "create", "payload": { "masterKey": "department_master", "data": { "deptCode": "MKT", "deptName": "Marketing", "status": "Active", "approvalStatus": "Pending Approval" } } },
    { "label": "Edit before creating", "type": "navigate", "payload": { "route": "/masters/department-master" } }
  ]
}

If info is missing, e.g. "create a department":
{
  "message": "I'd be happy to create a department. What should it be called?",
  "needsInfo": true,
  "followUpQuestion": "department name"
}

Available modules: Procurement (PR, PO), Accounts Payable (Invoice, Payment), Masters (26 types), Vendor Management, GRN, Budget, Advances, Debit Notes.
Available masters: department, employee, vendor, entity, category, color, country, state, tax_code, cost_centre, profit_centre, item, product, SKU, UOM, currency, roles, user, contract, exchange_rate, payment_method, tds_section, location, bank, account_code.

Current app routes:
/masters/department-master, /masters/employee-master, /masters/entity-master, /masters/vendor-master (etc)
/invoices/create-direct, /invoices/create-po, /purchase-orders/create, /procurement/pr/create
/approvals, /dashboards, /create (quick create hub)

Return ONLY valid JSON. No markdown wrapping.`;

      const history = (body.messages || []).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      try {
        const result = await chatModel.generateContent({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            {
              role: 'model',
              parts: [
                {
                  text: '{"message": "Hello! I\'m the Procinix AI Assistant. I can help you navigate the app, create records, answer questions about procurement workflows, or execute commands. How can I help?", "actions": [], "needsInfo": false}',
                },
              ],
            },
            ...history,
            { role: 'user', parts: [{ text: body.message || '' }] },
          ],
        });

        const text = result.response?.text?.() || '{}';
        let parsed;
        try {
          parsed = JSON.parse(
            text
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim()
          );
        } catch {
          parsed = { message: text, actions: [] };
        }

        return sendJson(res, 200, { success: true, ...parsed });
      } catch (chatErr) {
        console.error('[Chat API Error]', chatErr);
        return sendJson(res, 500, {
          success: false,
          error: 'AI service error',
          message: 'Sorry, I encountered an error. Please try again.',
        });
      }
    }

    // Production: serve React app
    if (IS_PRODUCTION) {
      const filePath = join(DIST_PATH, pathname === '/' ? 'index.html' : pathname);
      if (await serveStaticFile(res, filePath)) return;
      // SPA fallback — serve index.html for all non-API routes
      if (!pathname.startsWith('/api')) {
        if (await serveStaticFile(res, join(DIST_PATH, 'index.html'))) return;
      }
    }

    return sendJson(res, 404, { ok: false, error: 'Route not found' });
  } catch (error) {
    let statusCode = error.statusCode ?? 500;
    let clientMessage = 'Internal server error';

    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      statusCode = 400;
      clientMessage = 'Invalid JSON in request body';
    } else if (statusCode === 413) {
      clientMessage = 'Request body too large';
    }

    if (statusCode >= 500) {
      console.error('[API Error]', req.method, req.url, error);
    }
    return sendJson(res, statusCode, { ok: false, error: clientMessage });
  }
});

const port = parseInt(process.env.APP_PORT || process.env.PORT || '8787', 10);
const host = IS_PRODUCTION ? '0.0.0.0' : '127.0.0.1';
server.listen(port, host, async () => {
  console.log(
    `Procinix P2P API listening on http://${host}:${port} [${process.env.NODE_ENV || 'development'}]`
  );

  // Load runtime settings from DB and overlay onto process.env BEFORE any service
  // reads env (OCR check, email poller, etc.).
  await loadSettingsToEnv();
  checkAndExitIfInvalid();

  // When IMAP credentials or interval change, stop+restart the poller.
  onSettingsChange('AP_EMAIL_', () => {
    restartEmailPoller();
  });
  onSettingsChange('AP_POLL_INTERVAL_MINUTES', () => {
    restartEmailPoller();
  });

  await ensureSessionsTable().catch((err) =>
    console.warn('[startup] sessions table check failed (non-fatal):', err.message)
  );
  checkGeminiKey();
  startEmailPoller(processInvoiceWithAgents);
  startAgentRetryScheduler();
  startApprovalSyncLoop(
    {
      execute: async (sql, params = []) => [await query(sql, params)],
      getConnection: getMysqlConnection,
    },
    '1',
    60000
  );

  // PO Expiry cron jobs
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Running PO expiry check...');
    try {
      await checkAndProcessExpiries(query);
    } catch (e) {
      console.error('[CRON] Expiry check failed:', e.message);
    }
  });

  cron.schedule('0 9 * * *', async () => {
    console.log('[CRON] Sending PO expiry reminders...');
    try {
      await sendExpiryReminders(query);
    } catch (e) {
      console.error('[CRON] Reminder failed:', e.message);
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    try {
      const breached = await query(
        `SELECT a.*, sla.sla_hours, sla.escalation_hours
         FROM approvals a
         JOIN approval_sla_config sla ON a.module = sla.module
         WHERE a.status = 'pending'
           AND a.sla_breached = 0
           AND TIMESTAMPDIFF(HOUR, a.created_at, NOW()) >= sla.sla_hours`
      );

      for (const approval of breached) {
        await query(
          `UPDATE approvals SET
            sla_breached = 1,
            sla_breached_at = NOW(),
            approval_priority = 'critical'
          WHERE id = ?`,
          [approval.id]
        );

        if (!approval.escalated) {
          await query(
            `UPDATE approvals
             SET escalated = 1,
                 escalated_at = NOW(),
                 escalated_to = COALESCE(?, escalated_to)
             WHERE id = ?`,
            [approval.assigned_to, approval.id]
          );
        }
      }

      console.log(`[CRON] SLA check complete: ${breached.length} breached approvals`);
    } catch (err) {
      console.error('[CRON] SLA cron error:', err);
    }
  });
});

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  stopAgentRetryScheduler();
  server.close(() => {
    console.log('HTTP server closed');
  });
  await closePool();
  console.log('MySQL pool closed');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
