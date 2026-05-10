/**
 * Pure excel/csv/xls parsing utilities for the Master Bulk Upload feature.
 *
 * Uses SheetJS (xlsx) to read a File into a ParsedFile structure consumable by
 * masterIdentifier, masterValidator, and the bulk upload UI. This module has no
 * dependency on the master schema registry — the identifier consumes both.
 */

import * as XLSX from 'xlsx';
import type { ParsedFile, ParsedSheet } from './bulkUploadTypes';

/**
 * Normalize a raw header cell into a comparable, alias-friendly token:
 * lowercase, punctuation stripped, whitespace collapsed.
 */
export function normalizeHeader(raw: string): string {
  return String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[_\-./\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Parse an uploaded File (xlsx/xls/csv) into a ParsedFile structure.
 * Assumes the first row of every sheet is the header row.
 */
export async function parseWorkbookFile(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });

  const sheets: ParsedSheet[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: true,
      defval: null,
    }) as unknown[][];

    const headerRow = (aoa[0] ?? []) as unknown[];
    const rawHeaders: string[] = headerRow
      .map((c) => String(c ?? '').trim())
      .filter((h) => h.length > 0);
    const normalizedHeaders = rawHeaders.map(normalizeHeader);

    const rows: Array<Record<string, unknown>> = [];
    for (let i = 1; i < aoa.length; i++) {
      const row = (aoa[i] ?? []) as unknown[];
      const allEmpty = row.every((c) => c == null || String(c).trim() === '');
      if (allEmpty) continue;
      const obj: Record<string, unknown> = {};
      rawHeaders.forEach((h, idx) => {
        obj[h] = row[idx] ?? null;
      });
      rows.push(obj);
    }

    return { sheetName: name, rawHeaders, normalizedHeaders, rows };
  });

  return { fileName: file.name, sheets };
}
