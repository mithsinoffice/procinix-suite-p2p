import { describe, it, expect } from 'vitest';
import {
  VALID_TRANSITIONS,
  isValidTransition,
  assertValidTransition,
} from '../lifecycleTransitions.mjs';
import { LIFECYCLE_STATES } from '../lifecycleMapping.mjs';

const {
  INGESTED,
  OCR_EXTRACTED,
  UNDER_VERIFICATION,
  EXCEPTION_HOLD,
  PROCESSED,
  QUEUED_FOR_PAYMENT,
  REJECTED,
} = LIFECYCLE_STATES;

// ---------------------------------------------------------------------------
// Every valid transition per the §2.1 DAG
// ---------------------------------------------------------------------------

describe('isValidTransition — valid DAG edges', () => {
  const validEdges = [
    // Ingested →
    [INGESTED, OCR_EXTRACTED],
    [INGESTED, EXCEPTION_HOLD],
    [INGESTED, REJECTED],
    // OCR Extracted →
    [OCR_EXTRACTED, UNDER_VERIFICATION],
    [OCR_EXTRACTED, EXCEPTION_HOLD],
    [OCR_EXTRACTED, REJECTED],
    // Under Verification →
    [UNDER_VERIFICATION, PROCESSED],
    [UNDER_VERIFICATION, EXCEPTION_HOLD],
    [UNDER_VERIFICATION, REJECTED],
    // Exception Hold →
    [EXCEPTION_HOLD, UNDER_VERIFICATION],
    [EXCEPTION_HOLD, REJECTED],
    // Processed →
    [PROCESSED, QUEUED_FOR_PAYMENT],
  ];

  it.each(validEdges)('%s → %s is valid', (from, to) => {
    expect(isValidTransition(from, to)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Representative invalid transitions
// ---------------------------------------------------------------------------

describe('isValidTransition — invalid transitions', () => {
  const invalidEdges = [
    [REJECTED, PROCESSED, 'terminal → non-terminal'],
    [REJECTED, INGESTED, 'terminal → start'],
    [REJECTED, UNDER_VERIFICATION, 'terminal → mid-flow'],
    [PROCESSED, INGESTED, 'backward jump'],
    [PROCESSED, UNDER_VERIFICATION, 'backward jump'],
    [PROCESSED, REJECTED, 'Processed is not rejectable'],
    [QUEUED_FOR_PAYMENT, PROCESSED, 'terminal backward'],
    [QUEUED_FOR_PAYMENT, REJECTED, 'payment-terminal → rejected'],
    [INGESTED, PROCESSED, 'skip multiple states'],
    [INGESTED, QUEUED_FOR_PAYMENT, 'skip to payment'],
    [OCR_EXTRACTED, PROCESSED, 'skip verification'],
    [EXCEPTION_HOLD, PROCESSED, 'exception must go through verification'],
    [EXCEPTION_HOLD, OCR_EXTRACTED, 'backward from exception'],
  ];

  it.each(invalidEdges)('%s → %s is invalid (%s)', (from, to) => {
    expect(isValidTransition(from, to)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Null fromState (new invoice creation)
// ---------------------------------------------------------------------------

describe('isValidTransition — null fromState (new invoice)', () => {
  it('allows Ingested as initial state', () => {
    expect(isValidTransition(null, INGESTED)).toBe(true);
  });

  it('allows OCR Extracted as initial state', () => {
    expect(isValidTransition(null, OCR_EXTRACTED)).toBe(true);
  });

  it('allows undefined fromState same as null', () => {
    expect(isValidTransition(undefined, INGESTED)).toBe(true);
  });

  it('rejects Under Verification as initial state', () => {
    expect(isValidTransition(null, UNDER_VERIFICATION)).toBe(false);
  });

  it('rejects Processed as initial state', () => {
    expect(isValidTransition(null, PROCESSED)).toBe(false);
  });

  it('rejects Rejected as initial state', () => {
    expect(isValidTransition(null, REJECTED)).toBe(false);
  });

  it('rejects null toState', () => {
    expect(isValidTransition(null, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Idempotent same-state transitions
// ---------------------------------------------------------------------------

describe('isValidTransition — idempotent same-state', () => {
  const allStates = Object.values(LIFECYCLE_STATES);

  it.each(allStates)('%s → %s (same) is valid', (state) => {
    expect(isValidTransition(state, state)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('isValidTransition — edge cases', () => {
  it('returns false for unknown fromState', () => {
    expect(isValidTransition('SomeGarbage', INGESTED)).toBe(false);
  });

  it('returns false for unknown toState', () => {
    expect(isValidTransition(INGESTED, 'SomeGarbage')).toBe(false);
  });

  it('returns false when toState is null', () => {
    expect(isValidTransition(INGESTED, null)).toBe(false);
  });

  it('returns false when toState is undefined', () => {
    expect(isValidTransition(INGESTED, undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// assertValidTransition
// ---------------------------------------------------------------------------

describe('assertValidTransition', () => {
  it('does not throw on valid transition', () => {
    expect(() => assertValidTransition(INGESTED, OCR_EXTRACTED)).not.toThrow();
  });

  it('does not throw on valid null → Ingested', () => {
    expect(() => assertValidTransition(null, INGESTED)).not.toThrow();
  });

  it('does not throw on idempotent same-state', () => {
    expect(() => assertValidTransition(PROCESSED, PROCESSED)).not.toThrow();
  });

  it('throws on invalid transition with descriptive message', () => {
    expect(() => assertValidTransition(REJECTED, PROCESSED)).toThrow(
      /Invalid lifecycle transition.*Rejected.*Processed.*none.*terminal/
    );
  });

  it('throws on invalid null → Processed', () => {
    expect(() => assertValidTransition(null, PROCESSED)).toThrow(
      /Invalid lifecycle transition.*null.*Processed/
    );
  });

  it('throws on unknown fromState', () => {
    expect(() => assertValidTransition('Bogus', INGESTED)).toThrow(/unknown fromState.*Bogus/);
  });

  it('error message includes allowed targets', () => {
    try {
      assertValidTransition(INGESTED, PROCESSED);
    } catch (e) {
      expect(e.message).toContain('OCR Extracted');
      expect(e.message).toContain('Exception Hold');
      expect(e.message).toContain('Rejected');
    }
  });
});

// ---------------------------------------------------------------------------
// VALID_TRANSITIONS structure
// ---------------------------------------------------------------------------

describe('VALID_TRANSITIONS', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(VALID_TRANSITIONS)).toBe(true);
  });

  it('has entries for all 7 states', () => {
    expect(Object.keys(VALID_TRANSITIONS)).toHaveLength(7);
  });

  it('terminal states have empty arrays', () => {
    expect(VALID_TRANSITIONS[QUEUED_FOR_PAYMENT]).toEqual([]);
    expect(VALID_TRANSITIONS[REJECTED]).toEqual([]);
  });

  it('each value array is frozen', () => {
    for (const arr of Object.values(VALID_TRANSITIONS)) {
      expect(Object.isFrozen(arr)).toBe(true);
    }
  });
});
