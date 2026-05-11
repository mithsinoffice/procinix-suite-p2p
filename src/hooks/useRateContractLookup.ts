import { useCallback, useEffect, useRef, useState } from 'react';
import { mysqlApiRequest } from '../lib/mysql/client';

/**
 * Hook: given a vendorId, entityId, and an iterable of line items with
 * (id, itemCode), fetch the active rate contract line for each (vendor, item)
 * pair. Used by InvoiceFormDirectV2 and NonPOInvoiceForm to auto-enforce
 * pre-negotiated rates.
 *
 * The lookup is fire-and-forget per (lineId, itemCode) pair, debounced by
 * cache (same key won't re-fetch). Results are exposed as a Map keyed by
 * lineId. Vendor change clears the entire cache and result map.
 *
 * Per-line override: callers can flip a line into "manual override" mode via
 * `overrideLine(lineId)`. When overridden, the match is still reported but
 * the chip should render amber and the rate input becomes editable. Re-pick
 * the item to clear the override (or call `clearOverride(lineId)`).
 */

export interface RateContractMatch {
  matched: true;
  contractId: string;
  contractCode: string;
  contractName: string;
  endDate: string | null;
  agreedRate: number;
  currency: string;
  uom: string;
  gstRate: number;
  hsnCode: string;
  itemName: string;
}

export interface RateContractNoMatch {
  matched: false;
}

export type RateContractResult = RateContractMatch | RateContractNoMatch;

interface RateContractLookupLine {
  id: string;
  itemCode: string;
}

interface UseRateContractLookupOptions {
  vendorId: string;
  entityId?: string;
  lines: RateContractLookupLine[];
  /** Disable network calls (e.g. in test renders or when no vendor selected). */
  disabled?: boolean;
}

interface UseRateContractLookupResult {
  matchByLineId: Record<string, RateContractMatch>;
  overrides: Record<string, boolean>;
  overrideLine: (lineId: string) => void;
  clearOverride: (lineId: string) => void;
  isActive: (lineId: string) => boolean;
}

export function useRateContractLookup(
  opts: UseRateContractLookupOptions
): UseRateContractLookupResult {
  const { vendorId, entityId = '', lines, disabled = false } = opts;

  const [matchByLineId, setMatchByLineId] = useState<Record<string, RateContractMatch>>({});
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // Cache: vendor|entity|itemCode → result. Survives line renders so we don't
  // re-fetch on every keystroke.
  const cacheRef = useRef(new Map<string, RateContractResult>());
  const lastVendorRef = useRef<string>('');

  // Vendor change resets cache + matches + overrides.
  useEffect(() => {
    if (vendorId !== lastVendorRef.current) {
      cacheRef.current.clear();
      setMatchByLineId({});
      setOverrides({});
      lastVendorRef.current = vendorId;
    }
  }, [vendorId]);

  useEffect(() => {
    if (disabled || !vendorId) return;
    let cancelled = false;

    (async () => {
      const next: Record<string, RateContractMatch> = { ...matchByLineId };
      let dirty = false;
      for (const line of lines) {
        if (!line.itemCode || !line.id) continue;
        const key = `${vendorId}|${entityId}|${line.itemCode}`;
        let cached = cacheRef.current.get(key);
        if (!cached) {
          try {
            const params = new URLSearchParams({
              vendorId,
              itemCode: line.itemCode,
            });
            if (entityId) params.set('entityId', entityId);
            const res = await mysqlApiRequest<RateContractResult & { success: boolean }>(
              `/masters/rate_contract/lookup?${params.toString()}`
            );
            cached = res?.matched
              ? {
                  matched: true,
                  contractId: res.contractId,
                  contractCode: res.contractCode,
                  contractName: res.contractName,
                  endDate: res.endDate,
                  agreedRate: res.agreedRate,
                  currency: res.currency,
                  uom: res.uom,
                  gstRate: res.gstRate,
                  hsnCode: res.hsnCode,
                  itemName: res.itemName,
                }
              : { matched: false };
            cacheRef.current.set(key, cached);
          } catch {
            cacheRef.current.set(key, { matched: false });
            cached = { matched: false };
          }
        }
        if (cached.matched) {
          if (next[line.id]?.contractCode !== cached.contractCode) {
            next[line.id] = cached;
            dirty = true;
          }
        } else if (next[line.id]) {
          delete next[line.id];
          dirty = true;
        }
      }
      if (!cancelled && dirty) setMatchByLineId(next);
    })();

    return () => {
      cancelled = true;
    };
    // We intentionally omit matchByLineId from deps — the dirty diff guards
    // against unnecessary state writes and including it would loop.
  }, [vendorId, entityId, JSON.stringify(lines.map((l) => `${l.id}:${l.itemCode}`)), disabled]);

  const overrideLine = useCallback((lineId: string) => {
    setOverrides((prev) => ({ ...prev, [lineId]: true }));
  }, []);

  const clearOverride = useCallback((lineId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[lineId];
      return next;
    });
  }, []);

  const isActive = useCallback(
    (lineId: string) => Boolean(matchByLineId[lineId]) && !overrides[lineId],
    [matchByLineId, overrides]
  );

  return { matchByLineId, overrides, overrideLine, clearOverride, isActive };
}
