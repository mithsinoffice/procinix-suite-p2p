import { randomUUID } from 'node:crypto';
import http from 'node:http';
import { URL } from 'node:url';
import { pingDatabase, query } from './mysql.mjs';
import {
  MASTER_STORAGE,
  getQualifiedAuditTableName,
  getQualifiedTableName,
} from './masterStorage.mjs';
import { sendVendorInvitationEmailServer } from './vendorInvitationMail.mjs';
import { sendPortalWelcomeEmailServer } from './portalWelcomeMail.mjs';

const MASTER_SCHEMA_NAMES = [...new Set(Object.values(MASTER_STORAGE).map((storage) => storage.database))];
const PENDING_APPROVAL_STATUSES = ['Draft', 'Pending Approval', 'Pending', 'Changes Requested'];
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
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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
  const rows = await query(
    `
      SELECT id, payload, approval_status, created_at, updated_at
      FROM ${tableName}
      WHERE id = ?
      LIMIT 1
    `,
    [recordId]
  );

  if (!rows[0]) {
    return null;
  }

  const previousRecord = mapGenericMasterRow(rows[0]);
  const updatedRecord = applyApprovalActionToRecord(previousRecord, nextStatus, action, actor, comments);

  await query(
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
  );

  return updatedRecord;
}

async function updateItemApproval(recordId, nextStatus, action, actor, comments) {
  const tableName = getQualifiedTableName('item_master');
  const rows = await query(
    `
      SELECT *
      FROM ${tableName}
      WHERE id = ?
      LIMIT 1
    `,
    [recordId]
  );

  if (!rows[0]) {
    return null;
  }

  const previousRecord = mapItemRow(rows[0]);
  const updatedRecord = applyApprovalActionToRecord(previousRecord, nextStatus, action, actor, comments);

  await query(
    `
      UPDATE ${tableName}
      SET approval_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
    [nextStatus, recordId]
  );

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
  );

  return updatedRecord;
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    return sendJson(res, 400, { ok: false, error: 'Invalid request' });
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    return res.end();
  }

  const url = new URL(req.url, 'http://127.0.0.1');
  const pathname = url.pathname;

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
      }

      return sendJson(res, 200, { success: true, count: records.length });
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
        const previousRows = await query(`SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);
        const existingRows = previousRows;
        if (existingRows.length === 0) {
          return sendJson(res, 404, { success: false, error: 'Item not found' });
        }

        await query(
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

        const updatedRows = await query(`SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);
        await appendMasterVersion('item_master', id, mapItemRow(previousRows[0]), mapItemRow(updatedRows[0]), 'UPDATE');
        return sendJson(res, 200, { success: true, data: mapItemRow(updatedRows[0]) });
      }

      if (req.method === 'DELETE') {
        const existingRows = await query(
          `SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`,
          [id]
        );

        if (existingRows.length === 0) {
          return sendJson(res, 404, { success: false, error: 'Item not found' });
        }

        if (existingRows[0].approval_status === 'Approved') {
          return sendJson(res, 403, {
            success: false,
            error: 'Cannot delete approved items. Please deactivate instead.',
          });
        }

        await query(`DELETE FROM ${itemTableName} WHERE id = ?`, [id]);
        await appendMasterVersion('item_master', id, mapItemRow(existingRows[0]), {}, 'DELETE');
        return sendJson(res, 200, { success: true, message: 'Item deleted successfully' });
      }
    }

    if (req.method === 'POST' && pathname === '/api/items') {
      const body = await readJsonBody(req);
      const id = body.id || randomUUID();
      const itemTableName = getQualifiedTableName('item_master');

      await query(
        `
          INSERT INTO ${itemTableName} (
            id,
            item_code,
            item_name,
            item_alias,
            item_status,
            item_description,
            uom,
            item_group_master,
            procurement_category,
            entity_name,
            expenditure_type,
            gl_account_code,
            gl_account_description,
            nature,
            rcm_applicable,
            hsn_code,
            sac_code,
            gst_rate,
            default_itc_eligibility,
            po_required,
            reorder_level,
            max_order_qty,
            approval_status
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

      const createdRows = await query(`SELECT * FROM ${itemTableName} WHERE id = ? LIMIT 1`, [id]);
      await appendMasterVersion('item_master', id, {}, mapItemRow(createdRows[0]), 'CREATE');
      return sendJson(res, 201, { success: true, data: mapItemRow(createdRows[0]) });
    }

    return sendJson(res, 404, { ok: false, error: 'Route not found' });
  } catch (error) {
    return sendJson(res, 500, { ok: false, error: String(error) });
  }
});

const port = Number(process.env.APP_PORT ?? 8787);
server.listen(port, '127.0.0.1', () => {
  console.log(`Azure MySQL API listening on http://127.0.0.1:${port}`);
});
