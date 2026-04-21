import type { MatchStatus } from '../../types/ocr';

export function MatchScoreBadge({ confidence, status }: { confidence: number; status: MatchStatus }) {
  const pct = Math.max(0, Math.min(100, Math.round((confidence || 0) * 100)));
  if (status === 'matched') return <span className="ocr-match-badge match-badge-high">● {pct}% match</span>;
  if (status === 'conflict') return <span className="ocr-match-badge match-badge-med">⚠ {pct}% match</span>;
  if (status === 'low_confidence') return <span className="ocr-match-badge match-badge-low">✗ {pct}% confidence</span>;
  return <span className="ocr-match-badge match-badge-neutral">— Not extracted</span>;
}
