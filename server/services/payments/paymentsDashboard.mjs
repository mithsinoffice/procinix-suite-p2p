import { query } from '../../mysql.mjs';

const PAYMENT_SUBQUERY = `
  SELECT invoice_id,
         SUM(amount) AS payment_total,
         COUNT(id) AS payment_count
  FROM payments WHERE status = 'confirmed' GROUP BY invoice_id
`;

function outstanding(row) {
  const total = Number(row.total_amount) || 0;
  const paid = Number(row.payment_total) || 0;
  return Math.max(0, total - paid);
}

function mapCategory(vendorType, vendorLegalName) {
  const t = String(vendorType || '').toLowerCase();
  const n = String(vendorLegalName || '').toLowerCase();
  if (t.includes('government') || n.includes('tax') || n.includes('income tax')) return 'Statutory';
  if (t.includes('payroll') || n.includes('payroll')) return 'Payroll';
  if (t.includes('technology') || t.includes('software')) return 'Strategic Vendor';
  return 'Operational';
}

function mapVendorCategory(vendorType) {
  const t = String(vendorType || '').trim();
  if (t) return t.charAt(0).toUpperCase() + t.slice(1).replace(/_/g, ' ');
  return 'Supplier';
}

function mapStatus(row, out) {
  if (out <= 0.009) return 'paid';
  const due = row.due_date ? new Date(row.due_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (due) {
    due.setHours(0, 0, 0, 0);
    if (due < today) return 'overdue';
  }
  const ls = row.lifecycle_state;
  if (ls === 'Processed' || ls === 'Queued for Payment') return 'approved';
  return 'pending';
}

function mapPriority(row) {
  const p = String(row.approval_priority || 'normal').toLowerCase();
  if (p === 'critical') return 'critical';
  if (p === 'high') return 'high';
  if (p === 'low') return 'low';
  return 'medium';
}

function mapRiskFlag(row) {
  if (Number(row.sla_breached) === 1) return 'sla-breach';
  const d = String(row.duplicate_decision || '').toLowerCase();
  if (d.includes('duplicate') || d === 'likely_duplicate') return 'duplicate';
  return undefined;
}

export async function getPaymentsDashboardPayload({ tenantId, entityId }) {
  if (!tenantId) {
    const err = new Error('tenant_required');
    err.statusCode = 400;
    throw err;
  }

  const params = [tenantId];
  let entityClause = '';
  if (entityId) {
    entityClause = ' AND i.entity_id = ? ';
    params.push(entityId);
  }

  const invSql = `
    SELECT i.id, i.invoice_number, i.vendor_name, i.vendor_id, i.currency, i.total_amount,
           i.invoice_date, i.due_date, i.lifecycle_state, i.status, i.approval_priority,
           i.sla_breached, i.duplicate_decision,
           COALESCE(pay.payment_total, 0) AS payment_total,
           v.vendor_type, v.vendor_legal_name
    FROM invoices i
    LEFT JOIN vendors v ON v.id = i.vendor_id
    LEFT JOIN (${PAYMENT_SUBQUERY}) pay ON pay.invoice_id = i.id
    WHERE i.tenant_id = ?
      ${entityClause}
      AND (i.lifecycle_state IS NULL OR i.lifecycle_state <> 'Rejected')
      AND (COALESCE(i.total_amount, 0) - COALESCE(pay.payment_total, 0)) > 0.009
    ORDER BY COALESCE(i.due_date, i.invoice_date) ASC, i.id ASC
    LIMIT 500
  `;

  const invRows = await query(invSql, params);

  const invoices = invRows.map((row) => {
    const out = outstanding(row);
    const due = row.due_date ? String(row.due_date).slice(0, 10) : '';
    const invDate = row.invoice_date ? String(row.invoice_date).slice(0, 10) : '';
    const cat = mapCategory(row.vendor_type, row.vendor_legal_name);
    const vendorCat = mapVendorCategory(row.vendor_type);
    return {
      id: row.id,
      invoiceNo: row.invoice_number || row.id,
      vendor: row.vendor_name || '—',
      vendorCategory: vendorCat,
      amount: out,
      currency: row.currency || 'INR',
      dueDate: due,
      status: mapStatus(row, out),
      priority: mapPriority(row),
      paymentMode: 'NEFT',
      riskFlag: mapRiskFlag(row),
      invoiceDate: invDate,
      category: cat,
    };
  });

  const paidRows = await query(
    `
    SELECT DATE(payment_date) AS dt, SUM(amount) AS paid_amount
    FROM payments
    WHERE tenant_id = ?
      AND status = 'confirmed'
      AND payment_date >= DATE_SUB(CURDATE(), INTERVAL 13 DAY)
      AND payment_date <= CURDATE()
    GROUP BY DATE(payment_date)
    `,
    [tenantId]
  );

  const paidByDay = {};
  for (const r of paidRows) {
    const raw = r.dt;
    const key =
      raw instanceof Date
        ? raw.toISOString().slice(0, 10)
        : String(raw || '')
            .slice(0, 10)
            .replace(/\//g, '-');
    if (key.length >= 10) paidByDay[key] = Number(r.paid_amount) / 100000;
  }

  return { invoices, paidByDay };
}
