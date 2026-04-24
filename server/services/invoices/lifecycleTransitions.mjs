// Lifecycle state transition guard per ws1a-implementation-plan.md §2.1 DAG.
//
// The 7-state DAG:
//   Ingested → OCR Extracted, Exception Hold, Rejected
//   OCR Extracted → Under Verification, Exception Hold, Rejected
//   Under Verification → Processed, Exception Hold, Rejected
//   Exception Hold → Under Verification, Rejected
//   Processed → Queued for Payment
//   Queued for Payment → (terminal)
//   Rejected → (terminal)

import { LIFECYCLE_STATES } from './lifecycleMapping.mjs';

const {
  INGESTED, OCR_EXTRACTED, UNDER_VERIFICATION, EXCEPTION_HOLD,
  PROCESSED, QUEUED_FOR_PAYMENT, REJECTED,
} = LIFECYCLE_STATES;

export const VALID_TRANSITIONS = Object.freeze({
  [INGESTED]:           Object.freeze([OCR_EXTRACTED, EXCEPTION_HOLD, REJECTED]),
  [OCR_EXTRACTED]:      Object.freeze([UNDER_VERIFICATION, EXCEPTION_HOLD, REJECTED]),
  [UNDER_VERIFICATION]: Object.freeze([PROCESSED, EXCEPTION_HOLD, REJECTED]),
  [EXCEPTION_HOLD]:     Object.freeze([UNDER_VERIFICATION, REJECTED]),
  [PROCESSED]:          Object.freeze([QUEUED_FOR_PAYMENT]),
  [QUEUED_FOR_PAYMENT]: Object.freeze([]),
  [REJECTED]:           Object.freeze([]),
});

// States allowed when fromState is null (new invoice creation).
const VALID_INITIAL_STATES = Object.freeze([INGESTED, OCR_EXTRACTED]);

/**
 * Check whether a lifecycle state transition is valid per the §2.1 DAG.
 *
 * Special cases:
 *   - null/undefined fromState: only Ingested and OCR Extracted are valid targets
 *   - same-state (fromState === toState): always valid (idempotent writes)
 */
export function isValidTransition(fromState, toState) {
  if (!toState) return false;

  // Null fromState — new invoice creation
  if (fromState == null) {
    return VALID_INITIAL_STATES.includes(toState);
  }

  // Idempotent same-state write
  if (fromState === toState) return true;

  const allowed = VALID_TRANSITIONS[fromState];
  if (!allowed) return false;

  return allowed.includes(toState);
}

/**
 * Assert that a lifecycle state transition is valid. Throws on invalid.
 */
export function assertValidTransition(fromState, toState) {
  if (isValidTransition(fromState, toState)) return;

  const from = fromState ?? '(null)';
  const allowed = fromState == null
    ? VALID_INITIAL_STATES
    : VALID_TRANSITIONS[fromState];

  if (!allowed) {
    throw new Error(
      `Invalid lifecycle transition: unknown fromState '${from}'. Valid states: ${Object.keys(VALID_TRANSITIONS).join(', ')}`
    );
  }

  const allowedStr = allowed.length > 0 ? allowed.join(', ') : '(none — terminal state)';
  throw new Error(
    `Invalid lifecycle transition: '${from}' → '${toState}'. Allowed from '${from}': ${allowedStr}`
  );
}
