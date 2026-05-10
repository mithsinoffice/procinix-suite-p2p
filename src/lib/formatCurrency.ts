/**
 * INR formatting helpers.
 *
 * - `formatINR`        — full digits with Indian thousands grouping (lakh/crore commas)
 * - `formatINRCompact` — compact representation (₹1.5L, ₹2.3Cr) for chart axes + KPI cards
 *
 * Both round to whole rupees. Negative values keep the sign before the symbol.
 */

export function formatINR(amount: number): string {
  const value = Math.round(Number(amount) || 0);
  const sign = value < 0 ? '-' : '';
  return `${sign}₹${Math.abs(value).toLocaleString('en-IN')}`;
}

export function formatINRCompact(amount: number): string {
  const v = Number(amount) || 0;
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 10_000_000) return `${sign}₹${(abs / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `${sign}₹${(abs / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}₹${(abs / 1_000).toFixed(1)}K`;
  return formatINR(v);
}
