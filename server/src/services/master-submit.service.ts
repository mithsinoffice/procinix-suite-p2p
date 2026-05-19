// Shared pure helpers for the master "submit for approval" flow.
//
// Generalises the pattern already in place for ItemMaster:
//   DRAFT or REJECTED → submittable (kicks off a workflow + flips status)
//   PENDING_APPROVAL / ACTIVE / INACTIVE → 422 — not submittable
//
// Used by every master that flows through the approval engine: vendor,
// employee, user, budget, financial year, currency, profit centre, item
// category, plus the existing item master + the 10 generic-CRUD masters.
// Pure functions so the rules can be unit-tested without a DB.

export type MasterStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'REJECTED' | string

export interface MasterSubmitValidation {
  ok:       boolean
  reason?:  'NOT_SUBMITTABLE'
  status?:  string
  message?: string
}

export function validateMasterSubmittable(
  entityLabel: string,
  status:      string,
): MasterSubmitValidation {
  if (status === 'DRAFT' || status === 'REJECTED') return { ok: true }
  return {
    ok: false,
    reason: 'NOT_SUBMITTABLE',
    status,
    message: `Cannot submit — ${entityLabel} is ${status}. Only DRAFT or REJECTED records can be submitted for approval.`,
  }
}

// Post-submit status:
//   workflow.ok && autoApproved → ACTIVE (auto-approve threshold met)
//   workflow.ok                 → PENDING_APPROVAL (stages running)
//   NO_WORKFLOW_DEFINED         → PENDING_APPROVAL (still leaves DRAFT, but
//                                  no instance — TENANT_ADMIN must hand-flip)
export interface WorkflowOutcome {
  ok:                 boolean
  autoApproved?:      boolean
  noWorkflowDefined?: boolean
}

export function resolveMasterStatusAfterSubmit(o: WorkflowOutcome): MasterStatus {
  if (o.ok && o.autoApproved) return 'ACTIVE'
  return 'PENDING_APPROVAL'
}

// Post-reject status:
//   RETURN_TO_DRAFT / RETURN_TO_PREV_STAGE → DRAFT (single-stage default flow)
//   REQUEST_INFO                           → PENDING_APPROVAL (hold open
//                                             while the chat thread resolves)
export function resolveMasterStatusAfterReject(
  mode: 'RETURN_TO_DRAFT' | 'RETURN_TO_PREV_STAGE' | 'REQUEST_INFO',
): MasterStatus {
  if (mode === 'REQUEST_INFO') return 'PENDING_APPROVAL'
  return 'DRAFT'
}

// Maps an entityType (used by the workflow engine) to the WfModule label
// passed into startWorkflow(). Kept centralised so the seed's WF-XXX-001
// definitions, the /submit endpoints, and the workflow approve/reject
// branches stay in lockstep — changing one place breaks the chain at the
// type level rather than silently at runtime.
export const ENTITY_TO_WF_MODULE = {
  vendor:         'VENDOR',
  employee:       'EMPLOYEE',
  user:           'USER',
  budget:         'BUDGET',
  financial_year: 'FINANCIAL_YEAR',
  currency:       'CURRENCY',
  profit_centre:  'PROFIT_CENTRE',
  item_category:  'ITEM_CATEGORY',
} as const

export type MasterEntityType = keyof typeof ENTITY_TO_WF_MODULE
