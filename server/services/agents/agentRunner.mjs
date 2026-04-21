/**
 * Agent Runner — core execution engine for the Agent Configurator.
 * Loads agent config from DB, executes rules + actions, logs results.
 */

import { randomUUID } from 'node:crypto';
import {
  executeRequired,
  executeFormat,
  executeDuplicate,
  executeCrossReference,
  executeMathValidation,
  executeThreshold,
  executeCustom,
} from './ruleExecutors.mjs';
import {
  executeCreateRecord,
  executeLinkEntity,
  executeTriggerApproval,
  executeSendNotification,
  executeCreateException,
  executeWebhook,
} from './actionExecutors.mjs';

// ─── Load Agent ──────────────────────────────────────────────────
export async function loadAgent(queryFn, agentId) {
  const agents = await queryFn(
    'SELECT * FROM p2p_schema_mt.agents WHERE id = ?',
    [agentId]
  );
  if (!agents.length) {
    throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
  }
  const agent = agents[0];

  const rules = await queryFn(
    'SELECT * FROM p2p_schema_mt.agent_field_rules WHERE agent_id = ? ORDER BY field_name',
    [agentId]
  );

  const actions = await queryFn(
    'SELECT * FROM p2p_schema_mt.agent_actions WHERE agent_id = ? AND is_active = TRUE ORDER BY execution_order',
    [agentId]
  );

  return { agent, rules, actions };
}

// ─── Execute a single rule ───────────────────────────────────────
async function executeRule(rule, data, queryFn) {
  const value = data[rule.field_name];
  const config = typeof rule.rule_config === 'string'
    ? JSON.parse(rule.rule_config)
    : (rule.rule_config || {});

  switch (rule.rule_type) {
    case 'Required':
      return executeRequired(value);

    case 'Format validation':
      return executeFormat(value, config.pattern || '.*');

    case 'Duplicate check':
      return executeDuplicate(
        value,
        config.table || '',
        config.field || rule.field_name,
        config.excludeId || null,
        queryFn
      );

    case 'Cross-reference':
      return executeCrossReference(
        value,
        config.refTable || '',
        config.refField || '',
        queryFn
      );

    case 'Math validation':
      return executeMathValidation(
        config.fields ? pickFields(data, config.fields) : data,
        config.formula || '0',
        config.tolerance ?? 0
      );

    case 'Threshold check':
      return executeThreshold(value, config.min ?? null, config.max ?? null);

    case 'Custom':
      return executeCustom(value, config.code || 'return true;');

    default:
      return { passed: false, error: `Unknown rule type: ${rule.rule_type}` };
  }
}

function pickFields(data, fieldNames) {
  const out = {};
  for (const f of fieldNames) {
    out[f] = data[f];
  }
  return out;
}

// ─── Execute a single action ────────────────────────────────────
async function executeAction(action, context, queryFn) {
  const config = typeof action.action_config === 'string'
    ? JSON.parse(action.action_config)
    : (action.action_config || {});

  switch (action.action_type) {
    case 'Create record':
      return executeCreateRecord(queryFn, context.data, config.mapping || {}, config.table || '');

    case 'Link entity':
      return executeLinkEntity(queryFn, context.recordId, config.entityId, config.linkTable || '');

    case 'Trigger approval':
      return executeTriggerApproval(queryFn, context.recordId, config.routingLogic || {}, context.agentId);

    case 'Send notification':
      return executeSendNotification(config.recipients || [], config.template || '', context.data);

    case 'Create exception':
      return executeCreateException(
        queryFn,
        context.recordId || context.agentId,
        config.type || 'validation_error',
        config.severity || 'Medium',
        config.detail || ''
      );

    case 'Webhook':
      return executeWebhook(config.url || '', context.data, config.headers || {});

    default:
      return { success: false, error: `Unknown action type: ${action.action_type}` };
  }
}

// ─── Run Agent ───────────────────────────────────────────────────
export async function runAgent(queryFn, agentId, data, context = {}) {
  const startTime = Date.now();
  const { agent, rules, actions } = await loadAgent(queryFn, agentId);

  // Execute all rules
  const ruleResults = [];
  let passedCount = 0;
  let errorCount = 0;

  for (const rule of rules) {
    const result = await executeRule(rule, data, queryFn);
    ruleResults.push({
      ruleId: rule.id,
      fieldName: rule.field_name,
      ruleType: rule.rule_type,
      severity: rule.severity,
      ...result,
    });
    if (result.passed) {
      passedCount++;
    } else if (rule.severity === 'Error') {
      errorCount++;
    }
  }

  const totalRules = rules.length || 1;
  const confidence = Math.round((passedCount / totalRules) * 100 * 100) / 100;
  const passed = errorCount === 0;
  const touchless = passed && confidence >= (agent.target_accuracy || 95);

  // Execute actions based on outcome
  const actionResults = [];
  for (const action of actions) {
    const trigger = action.trigger_condition || 'Always';
    const shouldRun =
      trigger === 'Always' ||
      (trigger === 'On success' && passed) ||
      (trigger === 'On failure' && !passed);

    if (shouldRun) {
      const actionCtx = { ...context, data, agentId, recordId: context.recordId || data.id };
      const aResult = await executeAction(action, actionCtx, queryFn);
      actionResults.push({
        actionId: action.id,
        actionType: action.action_type,
        ...aResult,
      });
    }
  }

  const durationMs = Date.now() - startTime;

  // Log the run
  const logId = randomUUID();
  await queryFn(
    `INSERT INTO p2p_schema_mt.agent_run_logs (id, agent_id, trigger_data, results, accuracy_score, touchless, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      logId,
      agentId,
      JSON.stringify({ data: Object.keys(data), context }),
      JSON.stringify({ ruleResults, actionResults, passed, confidence }),
      confidence,
      touchless,
      durationMs,
    ]
  );

  return { passed, confidence, touchless, ruleResults, actionResults, logId, durationMs };
}

// ─── Test Agent ──────────────────────────────────────────────────
export async function testAgent(queryFn, agentId, testData) {
  const results = [];
  let totalPassed = 0;
  let totalTouchless = 0;

  for (const record of testData) {
    const result = await runAgent(queryFn, agentId, record, { mode: 'test' });
    results.push(result);
    if (result.passed) totalPassed++;
    if (result.touchless) totalTouchless++;
  }

  const total = testData.length || 1;
  const overallAccuracy = Math.round((totalPassed / total) * 100 * 100) / 100;
  const touchlessRate = Math.round((totalTouchless / total) * 100 * 100) / 100;

  // Per-rule accuracy
  const { rules } = await loadAgent(queryFn, agentId);
  const ruleAccuracy = rules.map((rule) => {
    let rulePassCount = 0;
    for (const r of results) {
      const match = r.ruleResults.find((rr) => rr.ruleId === rule.id);
      if (match?.passed) rulePassCount++;
    }
    return {
      ruleId: rule.id,
      fieldName: rule.field_name,
      ruleType: rule.rule_type,
      accuracy: Math.round((rulePassCount / total) * 100 * 100) / 100,
    };
  });

  // Update agent accuracy score
  await queryFn(
    'UPDATE p2p_schema_mt.agents SET accuracy_score = ? WHERE id = ?',
    [overallAccuracy, agentId]
  );

  return { overallAccuracy, touchlessRate, totalRecords: testData.length, ruleAccuracy, results };
}
