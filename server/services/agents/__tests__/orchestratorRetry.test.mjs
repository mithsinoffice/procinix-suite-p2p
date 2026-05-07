import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks (hoisted by Vitest before imports) ──────────────────────────

vi.mock('../../../mysql.mjs', () => ({
  query: vi.fn(),
}));

vi.mock('../intakeAgent.mjs',           () => ({ processIntake:        vi.fn() }));
vi.mock('../extractionAgent.mjs',       () => ({ processExtraction:     vi.fn() }));
vi.mock('../vendorIdentityAgent.mjs',   () => ({ processVendorMatch:    vi.fn() }));
vi.mock('../duplicateFraudAgent.mjs',   () => ({ processDuplicateCheck: vi.fn() }));
vi.mock('../matchAgent.mjs',            () => ({ processMatch:          vi.fn() }));
vi.mock('../taxComplianceAgent.mjs',    () => ({ processTaxValidation:  vi.fn() }));
vi.mock('../codingAgent.mjs',           () => ({ processCoding:         vi.fn() }));
vi.mock('../workflowRoutingAgent.mjs',  () => ({ processRouting:        vi.fn() }));
vi.mock('../agentRunner.mjs',           () => ({ runAgent:              vi.fn() }));
vi.mock('nodemailer',                   () => ({
  default: { createTransport: vi.fn(() => ({ sendMail: vi.fn().mockResolvedValue({}) })) },
}));
vi.mock('../../../appMail.mjs', () => ({ getAppMailFrom: () => 'test@procinix.ai' }));

// ── Imports (after mocks) ────────────────────────────────────────────────────

const { query }               = await import('../../../mysql.mjs');
const { processVendorMatch }  = await import('../vendorIdentityAgent.mjs');
const { processDuplicateCheck } = await import('../duplicateFraudAgent.mjs');
const { processMatch }        = await import('../matchAgent.mjs');
const { processTaxValidation } = await import('../taxComplianceAgent.mjs');
const { processCoding }       = await import('../codingAgent.mjs');
const { processRouting }      = await import('../workflowRoutingAgent.mjs');

const {
  reprocessAgentPipeline,
  processRetryQueue,
  MAX_AGENT_RETRIES,
} = await import('../orchestrator.mjs');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const INVOICE_ID = 'test-invoice-abc';
const METADATA = {
  extractedData: {
    invoice_number: 'INV-001',
    vendor_name: 'Acme Corp',
    total_amount: 5000,
    currency: 'INR',
  },
  extraction: { headerScore: 0.9, linesScore: 0.8 },
};

const GOOD_VENDOR_MATCH = {
  matchedVendorName: 'Acme Corp', matchConfidence: 0.95, method: 'exact',
  isNewVendor: false, explanation: 'Matched',
};
const GOOD_DUP_CHECK = { riskScore: 0, isDuplicate: false, checks: [], explanation: 'Clean' };
const GOOD_MATCH     = { matchType: 'po_match', poNumber: 'PO-1', matchConfidence: 0.9, poId: 'po-uuid-1', explanation: 'Matched' };
const GOOD_TAX       = { score: 100, arithmeticValid: true, gstTypeValid: true, issues: [], explanation: 'Valid' };
const GOOD_CODING    = { overallCertainty: 0.9, suggestions: [], explanation: 'Coded' };
const GOOD_ROUTING   = { lane: 'auto', postingReadiness: 'ready', laneReason: 'All checks pass', explanation: 'Auto', confidenceScores: {} };

// query mock factory — returns different data based on the SQL statement
function buildQueryMock({ attemptCount = 1, invoiceExists = true } = {}) {
  return vi.fn().mockImplementation((sql) => {
    // CREATE TABLE
    if (/CREATE TABLE/i.test(sql)) return Promise.resolve([]);
    // SELECT invoice
    if (/FROM invoices WHERE id/i.test(sql)) {
      return invoiceExists
        ? Promise.resolve([{ id: INVOICE_ID, metadata: JSON.stringify(METADATA), document_id: 'doc-1' }])
        : Promise.resolve([]);
    }
    // SELECT retry queue
    if (/FROM agent_retry_queue/i.test(sql)) {
      return Promise.resolve(attemptCount > 0 ? [{ attempt_count: attemptCount, invoice_id: INVOICE_ID }] : []);
    }
    // All other queries (INSERT, UPDATE) → success
    return Promise.resolve({ affectedRows: 1 });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('orchestrator agent retry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all agents succeed
    processVendorMatch.mockResolvedValue(GOOD_VENDOR_MATCH);
    processDuplicateCheck.mockResolvedValue(GOOD_DUP_CHECK);
    processMatch.mockResolvedValue(GOOD_MATCH);
    processTaxValidation.mockResolvedValue(GOOD_TAX);
    processCoding.mockResolvedValue(GOOD_CODING);
    processRouting.mockResolvedValue(GOOD_ROUTING);
  });

  // ── (a) Exception row written ────────────────────────────────────────────

  describe('(a) exception recording', () => {
    it('inserts an AGENT_FAILURE exception row when an agent throws', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));
      processVendorMatch.mockRejectedValueOnce(new Error('vendor API down'));

      await reprocessAgentPipeline(INVOICE_ID);

      const exceptionInserts = query.mock.calls.filter(
        ([sql]) => /INSERT INTO invoice_exceptions/i.test(sql)
      );
      expect(exceptionInserts.length).toBeGreaterThanOrEqual(1);

      const [, params] = exceptionInserts[0];
      expect(params[1]).toBe(INVOICE_ID);           // invoice_id positional param
      const detail = JSON.parse(params[2]);          // exception_detail JSON
      expect(detail.agent).toBe('vendorIdentityAgent');
      expect(detail.message).toBe('vendor API down');
      expect(detail.attempt).toBe(1);
    });

    it('records exceptions for multiple failing agents in the same run', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));
      processVendorMatch.mockRejectedValueOnce(new Error('vendor error'));
      processMatch.mockRejectedValueOnce(new Error('match error'));

      await reprocessAgentPipeline(INVOICE_ID);

      const exceptionInserts = query.mock.calls.filter(
        ([sql]) => /INSERT INTO invoice_exceptions/i.test(sql)
      );
      expect(exceptionInserts.length).toBeGreaterThanOrEqual(2);
      const agents = exceptionInserts.map(([, p]) => JSON.parse(p[2]).agent);
      expect(agents).toContain('vendorIdentityAgent');
      expect(agents).toContain('matchAgent');
    });
  });

  // ── (b) Retry is scheduled ───────────────────────────────────────────────

  describe('(b) retry scheduling', () => {
    it('inserts a row in agent_retry_queue when an agent fails and retries remain', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));
      processVendorMatch.mockRejectedValueOnce(new Error('transient error'));

      await reprocessAgentPipeline(INVOICE_ID);

      const retryInserts = query.mock.calls.filter(
        ([sql]) => /INSERT INTO agent_retry_queue/i.test(sql)
      );
      expect(retryInserts.length).toBeGreaterThanOrEqual(1);

      const [, params] = retryInserts[0];
      // params: [uuid, invoiceId, agentName, attemptCount, nextAt, lastError]
      expect(params[1]).toBe(INVOICE_ID);
      expect(params[2]).toBe('vendorIdentityAgent');
      expect(params[3]).toBe(2); // attempt 1 → next attempt is 2
    });

    it('returns success=false with the list of failed agents', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));
      processVendorMatch.mockRejectedValueOnce(new Error('error'));

      const result = await reprocessAgentPipeline(INVOICE_ID);
      expect(result.success).toBe(false);
      expect(result.failedAgents).toContain('vendorIdentityAgent');
    });

    it('returns success=true and resolves the retry row when all agents pass', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));

      const result = await reprocessAgentPipeline(INVOICE_ID);
      expect(result.success).toBe(true);
      expect(result.lane).toBe('auto');

      const resolveUpdates = query.mock.calls.filter(
        ([sql]) => /UPDATE agent_retry_queue/i.test(sql) && /resolved/i.test(sql)
      );
      expect(resolveUpdates.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── (c) agent_failed after max retries ───────────────────────────────────

  describe('(c) exhaustion after max retries', () => {
    it('marks invoice as agent_failed when attempt count reaches MAX_AGENT_RETRIES', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: MAX_AGENT_RETRIES }));
      processVendorMatch.mockRejectedValue(new Error('persistent error'));

      await reprocessAgentPipeline(INVOICE_ID);

      const failedUpdates = query.mock.calls.filter(
        ([sql]) => /UPDATE invoices SET/i.test(sql) && /agent_failed/i.test(sql)
      );
      expect(failedUpdates.length).toBeGreaterThanOrEqual(1);
    });

    it('marks the retry queue row as exhausted', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: MAX_AGENT_RETRIES }));
      processVendorMatch.mockRejectedValue(new Error('persistent error'));

      await reprocessAgentPipeline(INVOICE_ID);

      const exhaustedUpdates = query.mock.calls.filter(
        ([sql]) => /UPDATE agent_retry_queue/i.test(sql) && /exhausted/i.test(sql)
      );
      expect(exhaustedUpdates.length).toBeGreaterThanOrEqual(1);
    });

    it('does NOT schedule another retry when exhausted', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: MAX_AGENT_RETRIES }));
      processVendorMatch.mockRejectedValue(new Error('persistent error'));

      await reprocessAgentPipeline(INVOICE_ID);

      const retryInserts = query.mock.calls.filter(
        ([sql]) => /INSERT INTO agent_retry_queue/i.test(sql)
      );
      expect(retryInserts.length).toBe(0);
    });
  });

  // ── processRetryQueue ────────────────────────────────────────────────────

  describe('processRetryQueue', () => {
    it('calls reprocessAgentPipeline for each due invoice', async () => {
      // First call: SELECT due rows; second call: SELECT invoice (for reprocess); rest: bookkeeping
      let callCount = 0;
      query.mockImplementation((sql) => {
        if (/CREATE TABLE/i.test(sql)) return Promise.resolve([]);
        if (/FROM agent_retry_queue WHERE status = 'pending'/i.test(sql)) {
          return Promise.resolve([{ invoice_id: INVOICE_ID }]);
        }
        if (/FROM invoices WHERE id/i.test(sql)) {
          return Promise.resolve([{ id: INVOICE_ID, metadata: JSON.stringify(METADATA), document_id: 'doc-1' }]);
        }
        if (/FROM agent_retry_queue/i.test(sql)) {
          return Promise.resolve([{ attempt_count: 1 }]);
        }
        return Promise.resolve({ affectedRows: 1 });
      });

      await processRetryQueue();

      // Should have queried for due retries
      const dueCalls = query.mock.calls.filter(
        ([sql]) => /FROM agent_retry_queue WHERE status = 'pending'/i.test(sql)
      );
      expect(dueCalls.length).toBeGreaterThanOrEqual(1);

      // Should have attempted to reprocess the invoice
      const invoiceCalls = query.mock.calls.filter(
        ([sql]) => /FROM invoices WHERE id/i.test(sql)
      );
      expect(invoiceCalls.length).toBeGreaterThanOrEqual(1);
    });

    it('returns early without error when no retries are due', async () => {
      query.mockImplementation((sql) => {
        if (/CREATE TABLE/i.test(sql)) return Promise.resolve([]);
        if (/FROM agent_retry_queue/i.test(sql)) return Promise.resolve([]);
        return Promise.resolve({ affectedRows: 0 });
      });

      await expect(processRetryQueue()).resolves.toBeUndefined();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns null gracefully when invoice does not exist in DB', async () => {
      query.mockImplementation(buildQueryMock({ invoiceExists: false }));

      const result = await reprocessAgentPipeline('nonexistent-id');
      expect(result).toBeNull();
    });

    it('continues pipeline after one agent fails — remaining agents still run', async () => {
      query.mockImplementation(buildQueryMock({ attemptCount: 1 }));
      processVendorMatch.mockRejectedValueOnce(new Error('vendor error'));
      // All others succeed

      await reprocessAgentPipeline(INVOICE_ID);

      // processMatch should still have been called despite vendorMatch failing
      expect(processMatch).toHaveBeenCalledOnce();
      expect(processTaxValidation).toHaveBeenCalledOnce();
    });
  });
});
