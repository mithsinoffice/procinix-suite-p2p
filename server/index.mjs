import { randomUUID, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import { pingDatabase, query, closePool, withTransaction, connExecute } from './mysql.mjs';
import {
  MASTER_STORAGE,
  getQualifiedAuditTableName,
  getQualifiedTableName,
} from './masterStorage.mjs';
import { sendVendorInvitationEmailServer } from './vendorInvitationMail.mjs';
import { sendPortalWelcomeEmailServer } from './portalWelcomeMail.mjs';
import { startEmailPoller, pollOnce, checkAnthropicKey } from './services/invoiceIngestion/emailPoller.mjs';
import { processInvoiceEmail } from './services/invoiceIngestion/orchestrator.mjs';
import { extractInvoiceData } from './services/invoiceIngestion/claudeOCR.mjs';
import { validateInvoiceData } from './services/invoiceIngestion/validator.mjs';
import { matchToPO } from './services/invoiceIngestion/poMatcher.mjs';
import { createInvoiceFromExtraction } from './services/invoiceIngestion/invoiceCreator.mjs';
import { handleExceptions } from './services/invoiceIngestion/exceptionHandler.mjs';
import { triggerWorkflow } from './services/invoiceIngestion/workflowTrigger.mjs';
import { processInvoiceWithAgents } from './services/agents/orchestrator.mjs';

const MASTER_SCHEMA_NAMES = [...new Set(Object.values(MASTER_STORAGE).map((storage) => storage.database))];
const PENDING_APPROVAL_STATUSES = ['Draft', 'Pending Approval', 'Pending', 'Changes Requested'];

// --- CORS ---
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

function getAllowedOrigin(req) {
  const origin = req.headers['origin'];
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }
  return undefined;
}

// --- Auth ---
const API_KEY = process.env.API_SECRET_KEY || '';
const PUBLIC_PATHS = new Set(['/health', '/api/mysql/health']);

function isAuthenticated(req, pathname) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }
  // Vendor invite portal is semi-public (token in URL validates on its own)
  if (pathname === '/api/vendor-invitations/send') {
    // still require auth — only internal callers should send invites
  }

  if (!API_KEY) {
    // If no API_SECRET_KEY is configured, auth is disabled (dev mode).
    return true;
  }

  const authHeader = req.headers['authorization'] ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  if (!token) {
    return false;
  }

  // Timing-safe comparison to prevent timing attacks
  try {
    const expected = Buffer.from(API_KEY, 'utf8');
    const received = Buffer.from(token, 'utf8');
    if (expected.length !== received.length) {
      return false;
    }
    return timingSafeEqual(expected, received);
  } catch {
    return false;
  }
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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
  if (res._corsOrigin) {
    headers['Access-Control-Allow-Origin'] = res._corsOrigin;
    headers['Vary'] = 'Origin';
  }
  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
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

async function appendMasterVersion(masterKey, recordId, oldValues, newValues, actionType) {
  const auditTableName = getQualifiedAuditTableName(masterKey);
  if (!auditTableName) {
    return;
  }

  await query(
    `
      INSERT INTO ${auditTableName} (
        id,
        record_id,
        action_type,
        old_values,
        new_values,
        changed_at
      ) VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CURRENT_TIMESTAMP(6))
    `,
    [
      randomUUID(),
      recordId,
      actionType,
      JSON.stringify(oldValues ?? {}),
      JSON.stringify(newValues ?? {}),
    ]
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

  const rows = await query(
    `
      SELECT action_type, old_values, new_values, changed_at
      FROM ${auditTableName}
      WHERE record_id = ?
      ORDER BY changed_at DESC, id DESC
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

async function updateGenericMasterApproval(masterKey, recordId, nextStatus, action, actor, comments) {
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
    const updatedRecord = applyApprovalActionToRecord(previousRecord, nextStatus, action, actor, comments);

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
      await connExecute(
        conn,
        `
          INSERT INTO ${auditTableName} (
            id, record_id, action_type, old_values, new_values, changed_at
          ) VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CURRENT_TIMESTAMP(6))
        `,
        [
          randomUUID(),
          recordId,
          action.toUpperCase(),
          JSON.stringify(previousRecord),
          JSON.stringify({
            ...updatedRecord,
            _workflowActor: actor,
            _workflowComments: comments,
          }),
        ]
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
    const updatedRecord = applyApprovalActionToRecord(previousRecord, nextStatus, action, actor, comments);

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
      await connExecute(
        conn,
        `
          INSERT INTO ${auditTableName} (
            id, record_id, action_type, old_values, new_values, changed_at
          ) VALUES (?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CURRENT_TIMESTAMP(6))
        `,
        [
          randomUUID(),
          recordId,
          action.toUpperCase(),
          JSON.stringify(previousRecord),
          JSON.stringify({
            ...updatedRecord,
            _workflowActor: actor,
            _workflowComments: comments,
          }),
        ]
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
  if (!isAuthenticated(req, pathname)) {
    return sendJson(res, 401, { ok: false, error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET' && pathname === '/health') {
      const database = await pingDatabase();
      return sendJson(res, 200, { ok: true, database });
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
        action === 'approve'
          ? 'Approved'
          : action === 'reject'
            ? 'Rejected'
            : 'Changes Requested';

      const updatedRecord =
        masterKey === 'item_master'
          ? await updateItemApproval(recordId, nextStatus, action, actor, comments)
          : await updateGenericMasterApproval(masterKey, recordId, nextStatus, action, actor, comments);

      if (!updatedRecord) {
        return sendJson(res, 404, { success: false, error: 'Master record not found' });
      }

      return sendJson(res, 200, { success: true, data: updatedRecord });
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
        ? (typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload)
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
        return sendJson(res, 404, { success: false, error: `Unsupported master key: ${masterKey}` });
      }

      const rows = await query(
        `
          SELECT id, payload
          FROM ${tableName}
          ORDER BY
            COALESCE(record_code, '') ASC,
            COALESCE(record_name, '') ASC,
            id ASC
        `
      );

      const records = rows.map((row) =>
        typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      );

      return sendJson(res, 200, { success: true, data: records });
    }

    if (req.method === 'PUT' && pathname.startsWith('/api/masters/')) {
      const masterKey = pathname.replace('/api/masters/', '');
      const tableName = getQualifiedTableName(masterKey);
      if (!tableName) {
        return sendJson(res, 404, { success: false, error: `Unsupported master key: ${masterKey}` });
      }

      const body = await readJsonBody(req);
      const records = Array.isArray(body.records) ? body.records : [];
      const purgeAbsent = body.purgeAbsent === true;
      const existingRows = await query(
        `
          SELECT id, payload
          FROM ${tableName}
        `
      );

      const existingById = new Map(
        existingRows.map((row) => [
          row.id,
          typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
        ])
      );

      const seenIds = new Set();
      for (const record of records) {
        const id = String(record?.id ?? randomUUID());
        const payload = { ...record, id };
        const previous = existingById.get(id) ?? null;

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
            inferStatus(payload),
            inferApprovalStatus(payload),
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
        conditions: typeof row.conditions === 'string' ? JSON.parse(row.conditions) : row.conditions,
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
          const previousRows = await connExecute(conn, `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
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

          const updatedRows = await connExecute(conn, `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);

          if (itemAuditTable) {
            await connExecute(
              conn,
              `INSERT INTO ${itemAuditTable} (id, record_id, action_type, old_values, new_values, changed_at) VALUES (?, ?, 'UPDATE', CAST(? AS JSON), CAST(? AS JSON), CURRENT_TIMESTAMP(6))`,
              [randomUUID(), id, JSON.stringify(mapItemRow(previousRows[0])), JSON.stringify(mapItemRow(updatedRows[0]))]
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
          const existingRows = await connExecute(conn, `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1 FOR UPDATE`, [id]);
          if (existingRows.length === 0) {
            return { notFound: true };
          }
          if (existingRows[0].approval_status === 'Approved') {
            return { forbidden: true };
          }

          await connExecute(conn, `DELETE FROM ${itemTableName} WHERE id = ?`, [id]);

          if (itemAuditTable) {
            await connExecute(
              conn,
              `INSERT INTO ${itemAuditTable} (id, record_id, action_type, old_values, new_values, changed_at) VALUES (?, ?, 'DELETE', CAST(? AS JSON), CAST('{}' AS JSON), CURRENT_TIMESTAMP(6))`,
              [randomUUID(), id, JSON.stringify(mapItemRow(existingRows[0]))]
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

        const createdRows = await connExecute(conn, `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);

        if (itemAuditTable) {
          await connExecute(
            conn,
            `INSERT INTO ${itemAuditTable} (id, record_id, action_type, old_values, new_values, changed_at) VALUES (?, ?, 'CREATE', CAST('{}' AS JSON), CAST(? AS JSON), CURRENT_TIMESTAMP(6))`,
            [randomUUID(), id, JSON.stringify(mapItemRow(createdRows[0]))]
          );
        }

        return mapItemRow(createdRows[0]);
      });

      return sendJson(res, 201, { success: true, data });
    }

    // ── PDF file serving ──────────────────────────────────
    if (req.method === 'GET' && pathname.startsWith('/api/invoices/') && pathname.endsWith('/pdf')) {
      const invoiceId = pathname.split('/')[3];
      const rows = await query('SELECT attachment_path FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
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
    if (req.method === 'GET' && pathname.startsWith('/api/invoices/') && !pathname.includes('ingestion')) {
      const invoiceId = pathname.replace('/api/invoices/', '');
      const rows = await query('SELECT * FROM invoices WHERE id = ? LIMIT 1', [invoiceId]);
      if (rows.length === 0) return sendJson(res, 404, { success: false, error: 'Invoice not found' });
      const invoice = rows[0];
      invoice.metadata = typeof invoice.metadata === 'string' ? JSON.parse(invoice.metadata) : invoice.metadata;
      invoice.bank_details = typeof invoice.bank_details === 'string' ? JSON.parse(invoice.bank_details) : invoice.bank_details;
      const lineItems = await query('SELECT * FROM invoice_line_items WHERE invoice_id = ? ORDER BY line_number', [invoiceId]);
      return sendJson(res, 200, { success: true, data: { ...invoice, line_items: lineItems } });
    }

    if (req.method === 'GET' && pathname === '/api/invoices') {
      const source = url.searchParams.get('source');
      const status = url.searchParams.get('status');
      let sql = 'SELECT id, invoice_number, invoice_date, due_date, vendor_name, vendor_gstin, currency, subtotal, tax_amount, total_amount, po_number, po_id, status, source, ingestion_log_id, attachment_path, lane, created_at FROM invoices';
      const conditions = [];
      const params = [];
      if (source) { conditions.push('source = ?'); params.push(source); }
      if (status) { conditions.push('status = ?'); params.push(status); }
      if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY created_at DESC LIMIT 100';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    // ── Invoice Ingestion API ──────────────────────────────
    if (req.method === 'POST' && pathname === '/api/invoice-ingestion/trigger') {
      const { emails, results } = await pollOnce();
      for (const email of emails) {
        try { await processInvoiceEmail(email); } catch (err) {
          console.error('[Ingestion] trigger process error:', err.message);
        }
      }
      return sendJson(res, 200, { success: true, ...results });
    }

    if (req.method === 'GET' && pathname === '/api/invoice-ingestion/logs') {
      const status = url.searchParams.get('status');
      const limit = Math.min(Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50), 200);
      const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
      let sql = 'SELECT * FROM invoice_ingestion_log';
      const params = [];
      if (status) { sql += ' WHERE status = ?'; params.push(status); }
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
      if (severity) { sql += ' AND severity = ?'; params.push(severity); }
      if (invoiceId) { sql += ' AND invoice_id = ?'; params.push(invoiceId); }
      sql += ' ORDER BY created_at DESC';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'PATCH' && pathname.startsWith('/api/invoice-ingestion/exceptions/') && pathname.endsWith('/resolve')) {
      const exId = pathname.split('/')[4];
      await query(
        'UPDATE invoice_exceptions SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP WHERE id = ?',
        [exId]
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname.startsWith('/api/invoice-ingestion/reprocess/')) {
      const logId = pathname.replace('/api/invoice-ingestion/reprocess/', '');
      const logs = await query('SELECT * FROM invoice_ingestion_log WHERE id = ? LIMIT 1', [logId]);
      if (logs.length === 0) return sendJson(res, 404, { success: false, error: 'Log not found' });
      await query('UPDATE invoice_ingestion_log SET status = ?, error_message = NULL WHERE id = ?', ['received', logId]);
      return sendJson(res, 200, { success: true, message: 'Queued for reprocessing' });
    }

    if (req.method === 'POST' && pathname === '/api/invoice-ingestion/manual-upload') {
      // Check API key before OCR
      if (!checkAnthropicKey()) {
        return sendJson(res, 503, { success: false, error: 'ANTHROPIC_API_KEY not configured — cannot run OCR' });
      }

      let buffer, mimeType, filename;
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        // Parse multipart/form-data
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) return sendJson(res, 400, { success: false, error: 'Missing multipart boundary' });
        const rawChunks = [];
        for await (const chunk of req) rawChunks.push(chunk);
        const raw = Buffer.concat(rawChunks);
        const parts = parseMultipart(raw, boundary);
        const filePart = parts.find((p) => p.name === 'invoice' || p.name === 'file');
        if (!filePart || !filePart.data || filePart.data.length === 0) {
          return sendJson(res, 400, { success: false, error: 'No file found in form-data. Use field name "invoice" or "file"' });
        }
        buffer = filePart.data;
        filename = filePart.filename || 'manual-upload.pdf';
        mimeType = filePart.contentType || 'application/pdf';
      } else {
        // JSON with base64 file
        const body = await readJsonBody(req);
        const fileData = body.file;
        if (!fileData) return sendJson(res, 400, { success: false, error: 'file (base64) is required' });
        buffer = Buffer.from(fileData, 'base64');
        mimeType = body.mimeType || 'application/pdf';
        filename = body.filename || 'manual-upload.pdf';
      }

      console.log(`[ManualUpload] Processing ${filename} (${(buffer.length / 1024).toFixed(1)} KB, ${mimeType})`);

      const logId = randomUUID();
      await query(
        `INSERT INTO invoice_ingestion_log (id, message_id, sender_email, sender_name, subject, received_at, attachment_count, status)
         VALUES (?, ?, 'manual', 'Manual Upload', ?, CURRENT_TIMESTAMP, 1, 'processing')`,
        [logId, `manual-${logId}`, filename]
      );

      try {
        console.log('[ManualUpload] Step 1: Claude OCR...');
        const extracted = await extractInvoiceData(buffer, mimeType);
        console.log('[ManualUpload] Step 1 done. Invoice:', extracted.invoice_number, 'Vendor:', extracted.vendor_name, 'Amount:', extracted.total_amount, 'Confidence:', extracted.confidence_score);

        console.log('[ManualUpload] Step 2: Validating...');
        const validation = validateInvoiceData(extracted);
        console.log('[ManualUpload] Step 2 done. Valid:', validation.valid, 'Errors:', validation.errors.length, 'Warnings:', validation.warnings.length);

        console.log('[ManualUpload] Step 3: PO matching...');
        const match = await matchToPO(extracted, null);
        console.log('[ManualUpload] Step 3 done. Matched:', match.matched, 'Type:', match.matchType);

        console.log('[ManualUpload] Step 4: Creating invoice...');
        const { invoiceId, status } = await createInvoiceFromExtraction(extracted, validation, match, logId, null, buffer, filename);
        console.log('[ManualUpload] Step 4 done. Invoice ID:', invoiceId, 'Status:', status);

        console.log('[ManualUpload] Step 5: Checking exceptions...');
        const exceptions = await handleExceptions(invoiceId, extracted, validation, match);
        console.log('[ManualUpload] Step 5 done. Exceptions:', exceptions.length);

        console.log('[ManualUpload] Step 6: Triggering workflow...');
        await triggerWorkflow(invoiceId, validation, match);
        console.log('[ManualUpload] Step 6 done.');

        await query('UPDATE invoice_ingestion_log SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?', ['processed', logId]);
        console.log('[ManualUpload] ✓ Complete. Invoice', invoiceId, 'created.');
        return sendJson(res, 201, { success: true, invoiceId, status, extracted, validation, match, exceptions });
      } catch (err) {
        console.error('[ManualUpload] ✗ Failed:', err.message);
        console.error(err.stack);
        await query('UPDATE invoice_ingestion_log SET status = ?, error_message = ? WHERE id = ?', ['failed', err.message, logId]);
        return sendJson(res, 500, { ok: false, error: err.message });
      }
    }

    // ── Agent Config API ──────────────────────────────────
    if (req.method === 'GET' && pathname === '/api/ap/agent-config') {
      const agent = url.searchParams.get('agent');
      let sql = 'SELECT * FROM ap_agent_config WHERE is_active = TRUE';
      const params = [];
      if (agent) { sql += ' AND agent_name = ?'; params.push(agent); }
      sql += ' ORDER BY agent_name, display_order';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'PUT' && pathname === '/api/ap/agent-config') {
      const body = await readJsonBody(req);
      const { id, config_value } = body;
      if (!id || config_value === undefined) return sendJson(res, 400, { success: false, error: 'id and config_value required' });
      await query('UPDATE ap_agent_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [String(config_value), id]);
      return sendJson(res, 200, { success: true });
    }

    // ── AP Agentic Invoices API ─────────────────────────
    if (req.method === 'GET' && pathname === '/api/ap/invoices') {
      const lane = url.searchParams.get('lane');
      const status = url.searchParams.get('status');
      let sql = 'SELECT id, invoice_number, invoice_date, due_date, vendor_name, vendor_gstin, currency, subtotal, tax_amount, total_amount, po_number, po_id, status, source, lane, posting_readiness_score, processing_status, auto_post_flag, human_touched_flag, attachment_path, created_at FROM invoices WHERE source = ?';
      const params = ['email_ingestion'];
      if (lane) { sql += ' AND lane = ?'; params.push(lane); }
      if (status) { sql += ' AND processing_status = ?'; params.push(status); }
      sql += ' ORDER BY created_at DESC LIMIT 100';
      const rows = await query(sql, params);
      return sendJson(res, 200, { success: true, data: rows });
    }

    if (req.method === 'GET' && pathname.startsWith('/api/ap/invoices/') && pathname.endsWith('/decisions')) {
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

    if (req.method === 'POST' && pathname.startsWith('/api/ap/invoices/') && pathname.endsWith('/approve')) {
      const invoiceId = pathname.split('/')[4];
      await query('UPDATE invoices SET status = ?, processing_status = ?, human_touched_flag = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Approved', 'posted', invoiceId]);
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, actor, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), invoiceId, 'approve', 'API User']
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname.startsWith('/api/ap/invoices/') && pathname.endsWith('/reject')) {
      const invoiceId = pathname.split('/')[4];
      await query('UPDATE invoices SET status = ?, processing_status = ?, human_touched_flag = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['Rejected', 'rejected', invoiceId]);
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, actor, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), invoiceId, 'reject', 'API User']
      );
      return sendJson(res, 200, { success: true });
    }

    if (req.method === 'POST' && pathname.startsWith('/api/ap/invoices/') && pathname.endsWith('/correct')) {
      const invoiceId = pathname.split('/')[4];
      const body = await readJsonBody(req);
      await query(
        'INSERT INTO ap_invoice_reviewer_actions (id, invoice_id, action_type, field_corrections, comments, actor, created_at) VALUES (?, ?, ?, CAST(? AS JSON), ?, ?, CURRENT_TIMESTAMP)',
        [randomUUID(), invoiceId, 'correct', JSON.stringify(body.corrections || {}), body.comments || '', 'API User']
      );
      // Apply corrections to invoice
      if (body.corrections) {
        const corr = body.corrections;
        const sets = [];
        const vals = [];
        for (const [field, value] of Object.entries(corr)) {
          if (['vendor_name','invoice_number','invoice_date','total_amount','currency','vendor_gstin'].includes(field)) {
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
      const [lanes] = await query("SELECT lane, COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion' AND lane IS NOT NULL GROUP BY lane");
      const [total] = await query("SELECT COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion'");
      const [autoPosted] = await query("SELECT COUNT(*) as cnt FROM invoices WHERE source = 'email_ingestion' AND auto_post_flag = TRUE");
      const [exceptions] = await query("SELECT COUNT(*) as cnt FROM ap_invoice_exception_cases WHERE resolved = FALSE");
      const [avgReadiness] = await query("SELECT AVG(posting_readiness_score) as avg_score FROM invoices WHERE source = 'email_ingestion' AND posting_readiness_score IS NOT NULL");

      const laneMap = {};
      if (Array.isArray(lanes)) lanes.forEach(r => { laneMap[r.lane] = r.cnt; });

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
          stpRate: total?.cnt > 0 ? ((laneMap.green || 0) / total.cnt * 100).toFixed(1) : 0,
        },
      });
    }

    // ── Agentic Pipeline Trigger ────────────────────────
    if (req.method === 'POST' && pathname === '/api/ap/process-invoice') {
      if (!checkAnthropicKey()) {
        // checkAnthropicKey now checks all providers
      }
      const contentType = req.headers['content-type'] || '';
      let buffer, mimeType, filename;

      if (contentType.includes('multipart/form-data')) {
        const boundary = contentType.split('boundary=')[1];
        if (!boundary) return sendJson(res, 400, { success: false, error: 'Missing multipart boundary' });
        const rawChunks = [];
        for await (const chunk of req) rawChunks.push(chunk);
        const raw = Buffer.concat(rawChunks);
        const parts = parseMultipart(raw, boundary);
        const filePart = parts.find((p) => p.name === 'invoice' || p.name === 'file');
        if (!filePart?.data?.length) return sendJson(res, 400, { success: false, error: 'No file in form-data' });
        buffer = filePart.data;
        filename = filePart.filename || 'upload.pdf';
        mimeType = filePart.contentType || 'application/pdf';
      } else {
        const body = await readJsonBody(req);
        if (!body.file) return sendJson(res, 400, { success: false, error: 'file (base64) required' });
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

const port = Number(process.env.APP_PORT ?? 8787);
server.listen(port, '127.0.0.1', () => {
  console.log(`Azure MySQL API listening on http://127.0.0.1:${port}`);
  checkAnthropicKey();
  startEmailPoller(processInvoiceWithAgents);
});

async function gracefulShutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully…`);
  server.close(() => {
    console.log('HTTP server closed');
  });
  await closePool();
  console.log('MySQL pool closed');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
