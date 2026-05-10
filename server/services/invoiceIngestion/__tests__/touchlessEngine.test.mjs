import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../mysql.mjs', () => ({ query: vi.fn() }));

const { query } = await import('../../../mysql.mjs');
const { evaluateTouchless } = await import('../touchlessEngine.mjs');

const INVOICE_ID = 'inv-test-001';
const TENANT_ID = 'tenant-default-001';

const BASE_EXTRACTED = {
  vendor_name: 'Acme Supplies Pvt Ltd',
  vendor_gstin: '27AAPCA8719R1Z5',
  invoice_number: 'INV-2026-001',
  invoice_date: '2026-01-15',
  due_date: '2026-02-15',
  total_amount: 50000,
  subtotal: 42373,
  tax_amount: 7627,
  po_number: null,
  ocr_overall_confidence: 0.97,
  confidence_score: 0.97,
};

// Helper: simulate a fully-passing scenario DB responses
function mockAllPassing() {
  query.mockImplementation((sql) => {
    const s = sql.trim().toLowerCase();
    // vendor master lookup
    if (s.includes('erp_master_vendors')) {
      return Promise.resolve([
        {
          id: 'vendor-001',
          vendor_legal_name: 'Acme Supplies Pvt Ltd',
          msme_category: null,
          tds_sections: null,
        },
      ]);
    }
    // duplicate check
    if (s.includes('from invoices') && s.includes('vendor_gstin') && s.includes('invoice_number')) {
      return Promise.resolve([]);
    }
    // first-time vendor check (has prior approved)
    if (
      s.includes('lifecycle_state in') ||
      s.includes("lifecycle_state in ('under verification'")
    ) {
      return Promise.resolve([{ n: 2 }]);
    }
    return Promise.resolve([]);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('evaluateTouchless — CHECK 1: OCR confidence', () => {
  it('routes to workbench when confidence < 0.95', async () => {
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, ocr_overall_confidence: 0.88 },
      TENANT_ID
    );
    expect(result.decision).toBe('workbench');
    expect(result.reasons[0]).toMatch(/OCR confidence below/i);
    expect(result.assignTo).toBe('ap_team');
  });

  it('proceeds when confidence >= 0.95', async () => {
    mockAllPassing();
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, ocr_overall_confidence: 0.95 },
      TENANT_ID
    );
    expect(result.decision).toBe('touchless');
  });
});

describe('evaluateTouchless — CHECK 2: Vendor in master', () => {
  it('routes to workbench when vendor not found', async () => {
    query.mockResolvedValue([]); // no vendor row
    const result = await evaluateTouchless(INVOICE_ID, BASE_EXTRACTED, TENANT_ID);
    expect(result.decision).toBe('workbench');
    expect(result.reasons[0]).toMatch(/vendor not found/i);
  });
});

describe('evaluateTouchless — CHECK 3: GSTIN format', () => {
  it('routes to exception for invalid GSTIN', async () => {
    query.mockImplementation((sql) => {
      if (sql.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, vendor_gstin: 'INVALID123' },
      TENANT_ID
    );
    expect(result.decision).toBe('exception');
    expect(result.reasons[0]).toMatch(/invalid gstin/i);
    expect(result.priority).toBe('high');
  });
});

describe('evaluateTouchless — CHECK 4: Duplicate invoice', () => {
  it('routes to hold when duplicate found', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      if (s.includes('from invoices')) {
        return Promise.resolve([{ id: 'existing-dup-id' }]);
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(INVOICE_ID, BASE_EXTRACTED, TENANT_ID);
    expect(result.decision).toBe('hold');
    expect(result.reasons[0]).toMatch(/duplicate/i);
    expect(result.priority).toBe('critical');
  });
});

describe('evaluateTouchless — CHECK 5: PO matching', () => {
  it('routes to workbench when PO not found', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      if (s.includes('from invoices') && s.includes('vendor_gstin')) {
        return Promise.resolve([]); // no dup
      }
      if (s.includes('purchase_orders')) {
        return Promise.resolve([]); // PO not found
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, po_number: 'PO-9999' },
      TENANT_ID
    );
    expect(result.decision).toBe('workbench');
    expect(result.reasons[0]).toMatch(/po number not found/i);
  });

  it('routes to exception when invoice exceeds PO by >2%', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      if (s.includes('from invoices') && s.includes('vendor_gstin')) {
        return Promise.resolve([]);
      }
      if (s.includes('purchase_orders')) {
        return Promise.resolve([{ id: 'po-1', total_amount: 40000 }]); // invoice is 50000 > 40800
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, po_number: 'PO-001', total_amount: 50000 },
      TENANT_ID
    );
    expect(result.decision).toBe('exception');
    expect(result.reasons[0]).toMatch(/exceeds po by/i);
    expect(result.assignTo).toBe('finance');
  });
});

describe('evaluateTouchless — CHECK 6: MSME 45-day rule', () => {
  it('routes to exception when due date exceeds 45 days for MSME vendor', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: 'micro', tds_sections: null },
        ]);
      }
      if (s.includes('from invoices') && s.includes('vendor_gstin')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(
      INVOICE_ID,
      {
        ...BASE_EXTRACTED,
        po_number: null,
        invoice_date: '2026-01-01',
        due_date: '2026-03-15', // 73 days later
      },
      TENANT_ID
    );
    expect(result.decision).toBe('exception');
    expect(result.reasons[0]).toMatch(/msme.*45.day/i);
  });
});

describe('evaluateTouchless — CHECK 7: CFO threshold', () => {
  it('routes to exception when total > ₹10L', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      if (s.includes('from invoices') && s.includes('vendor_gstin')) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(
      INVOICE_ID,
      { ...BASE_EXTRACTED, total_amount: 1_500_000 },
      TENANT_ID
    );
    expect(result.decision).toBe('exception');
    expect(result.reasons[0]).toMatch(/10l.*cfo/i);
    expect(result.assignTo).toBe('cfo');
  });
});

describe('evaluateTouchless — CHECK 9: First-time vendor', () => {
  it('routes to workbench for first invoice from vendor', async () => {
    query.mockImplementation((sql) => {
      const s = sql.trim().toLowerCase();
      if (s.includes('erp_master_vendors')) {
        return Promise.resolve([
          { id: 'v-1', vendor_legal_name: 'Acme', msme_category: null, tds_sections: null },
        ]);
      }
      if (
        s.includes('from invoices') &&
        s.includes('vendor_gstin') &&
        s.includes('invoice_number')
      ) {
        return Promise.resolve([]); // no dup
      }
      if (s.includes('lifecycle_state')) {
        return Promise.resolve([{ n: 0 }]); // no prior approved invoices
      }
      return Promise.resolve([]);
    });
    const result = await evaluateTouchless(INVOICE_ID, BASE_EXTRACTED, TENANT_ID);
    expect(result.decision).toBe('workbench');
    expect(result.reasons[0]).toMatch(/first invoice/i);
  });
});

describe('evaluateTouchless — CHECK 10: All pass → touchless', () => {
  it('returns touchless when all checks pass', async () => {
    mockAllPassing();
    const result = await evaluateTouchless(INVOICE_ID, BASE_EXTRACTED, TENANT_ID);
    expect(result.decision).toBe('touchless');
    expect(result.autoApprove).toBe(true);
    expect(result.lifecycleState).toBe('Under Verification');
    expect(result.assignTo).toBe('auto');
  });
});
