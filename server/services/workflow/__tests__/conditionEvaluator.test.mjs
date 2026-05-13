import { describe, it, expect, vi } from 'vitest';
import {
  evaluateConditions,
  evaluateSingleCondition,
  selectWorkflowForDocument,
} from '../conditionEvaluator.mjs';

describe('evaluateSingleCondition', () => {
  it('handles numeric gt/lt/gte/lte', () => {
    expect(
      evaluateSingleCondition(
        { field: 'amount', operator: 'gt', value: '50000' },
        { amount: 75000 }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'amount', operator: 'gt', value: '50000' },
        { amount: 30000 }
      )
    ).toBe(false);
    expect(
      evaluateSingleCondition(
        { field: 'amount', operator: 'lt', value: '50000' },
        { amount: 30000 }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'amount', operator: 'gte', value: '50000' },
        { amount: 50000 }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'amount', operator: 'lte', value: '50000' },
        { amount: 50000 }
      )
    ).toBe(true);
  });

  it('handles eq/neq with numeric AND string coercion', () => {
    expect(
      evaluateSingleCondition({ field: 'dept', operator: 'eq', value: 'Admin' }, { dept: 'admin' })
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'dept', operator: 'neq', value: 'Admin' },
        { dept: 'Finance' }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition({ field: 'qty', operator: 'eq', value: '100' }, { qty: 100 })
    ).toBe(true);
  });

  it('handles contains case-insensitively', () => {
    expect(
      evaluateSingleCondition(
        { field: 'name', operator: 'contains', value: 'amazon' },
        { name: 'Amazon Web Services' }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'name', operator: 'contains', value: 'xyz' },
        { name: 'Amazon Web Services' }
      )
    ).toBe(false);
  });

  it('handles in/not_in with array and CSV value', () => {
    expect(
      evaluateSingleCondition(
        { field: 'currency', operator: 'in', value: ['INR', 'USD'] },
        { currency: 'INR' }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'currency', operator: 'in', value: 'INR,USD' },
        { currency: 'USD' }
      )
    ).toBe(true);
    expect(
      evaluateSingleCondition(
        { field: 'currency', operator: 'not_in', value: 'INR,USD' },
        { currency: 'EUR' }
      )
    ).toBe(true);
  });

  it('returns false for unknown operators', () => {
    expect(evaluateSingleCondition({ field: 'x', operator: 'magic', value: '1' }, { x: 1 })).toBe(
      false
    );
  });

  it('falls back to aliased document keys (total_amount → invoice_amount)', () => {
    expect(
      evaluateSingleCondition(
        { field: 'invoice_amount', operator: 'gt', value: '100' },
        { total_amount: 500 }
      )
    ).toBe(true);
  });
});

describe('evaluateConditions', () => {
  it('returns true for empty conditions', () => {
    expect(evaluateConditions([], { x: 1 })).toBe(true);
    expect(evaluateConditions(undefined, { x: 1 })).toBe(true);
  });

  it('ANDs sequential conditions by default', () => {
    const result = evaluateConditions(
      [
        { field: 'amount', operator: 'gt', value: '50000' },
        { field: 'dept', operator: 'eq', value: 'Admin' },
      ],
      { amount: 75000, dept: 'admin' }
    );
    expect(result).toBe(true);
  });

  it('respects logicalOp=OR on the prior condition', () => {
    const result = evaluateConditions(
      [
        { field: 'amount', operator: 'gt', value: '50000', logicalOp: 'OR' },
        { field: 'dept', operator: 'eq', value: 'Admin' },
      ],
      { amount: 30000, dept: 'admin' } // amount fails, dept passes → OR → true
    );
    expect(result).toBe(true);
  });
});

describe('selectWorkflowForDocument', () => {
  function stubDb(rows) {
    return { execute: vi.fn().mockResolvedValue([rows]) };
  }
  it('returns the unconditional default when no conditional rule matches', async () => {
    const db = stubDb([
      {
        id: 'wf-default',
        workflow_name: 'AP Invoice Approval',
        module_name: 'ap_invoice',
        description: null,
        trigger_event: 'On Record Submission',
        conditions: '[]',
        steps: '[]',
        status: 'Active',
        created_at: new Date('2026-05-12T08:00:00Z'),
      },
    ]);
    const wf = await selectWorkflowForDocument(
      'ap_invoice',
      { invoice_amount: 1000 },
      'tenant-default-001',
      db
    );
    expect(wf?.id).toBe('wf-default');
  });

  it('prefers a conditional rule when its conditions match', async () => {
    const db = stubDb([
      {
        id: 'wf-high',
        workflow_name: 'High',
        module_name: 'ap_invoice',
        description: null,
        trigger_event: 'On Record Submission',
        conditions: JSON.stringify([{ field: 'invoice_amount', operator: 'gt', value: '50000' }]),
        steps: '[]',
        status: 'Active',
        created_at: new Date('2026-05-12T07:00:00Z'),
      },
      {
        id: 'wf-default',
        workflow_name: 'Default',
        module_name: 'ap_invoice',
        description: null,
        trigger_event: 'On Record Submission',
        conditions: '[]',
        steps: '[]',
        status: 'Active',
        created_at: new Date('2026-05-12T08:00:00Z'),
      },
    ]);
    const wf = await selectWorkflowForDocument(
      'ap_invoice',
      { invoice_amount: 75000 },
      'tenant-default-001',
      db
    );
    expect(wf?.id).toBe('wf-high');
  });
});
