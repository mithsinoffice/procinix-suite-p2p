export interface POInvoicePolicyThresholds {
  l1MaxAmount: number;
  l2MaxAmount: number;
  l1Approver: string;
  l2Approver: string;
  cfoApprover: string;
}

export const DEFAULT_PO_INVOICE_POLICY: POInvoicePolicyThresholds = {
  l1MaxAmount: 500000,
  l2MaxAmount: 2000000,
  l1Approver: 'Finance Manager',
  l2Approver: 'Procurement Head',
  cfoApprover: 'CFO',
};

export function deriveApprovalMatrix(
  totalAmount: number,
  policy: POInvoicePolicyThresholds = DEFAULT_PO_INVOICE_POLICY
) {
  if (totalAmount <= policy.l1MaxAmount) {
    return [policy.l1Approver];
  }
  if (totalAmount <= policy.l2MaxAmount) {
    return [policy.l1Approver, policy.l2Approver];
  }
  return [policy.l1Approver, policy.l2Approver, policy.cfoApprover];
}
