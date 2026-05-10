import type { OCRInvoiceScores } from '../../types/ocr';

export function OCRScoreCards({ scores }: { scores: OCRInvoiceScores }) {
  const confidence = Math.round((scores.overall_confidence || 0) * 100);
  const confidenceClass =
    confidence > 80 ? 'ocr-score-good' : confidence >= 50 ? 'ocr-score-mid' : 'ocr-score-low';
  const reviewFields = Object.entries(scores.fields || {})
    .filter(([, v]) => v.match_status === 'conflict' || v.match_status === 'low_confidence')
    .map(([k]) => k.replaceAll('_', ' '))
    .slice(0, 3);
  return (
    <div className="ocr-score-cards">
      <div className={`ocr-score-card ${confidenceClass}`}>
        <div className="ocr-score-title">Overall confidence</div>
        <div className="ocr-score-value">{confidence}%</div>
      </div>
      <div className="ocr-score-card">
        <div className="ocr-score-title">Fields needing review</div>
        <div className="ocr-score-value">
          {scores.fields_conflicted + scores.fields_low_confidence}
        </div>
        <div className="ocr-score-subtext">
          {reviewFields.length ? reviewFields.join(', ') : 'No fields'}
        </div>
      </div>
      <div className="ocr-score-card ocr-score-learning">
        <div className="ocr-score-title">AI learning status</div>
        <div className="ocr-score-value">Active</div>
        <div className="ocr-score-subtext">Auto-learning enabled</div>
      </div>
      <div className="ocr-score-card">
        <div className="ocr-score-title">Touchless eligible</div>
        <div className="ocr-score-value">{scores.touchless_eligible ? 'Yes' : 'No'}</div>
        <div className="ocr-score-subtext">
          {scores.touchless_eligible ? 'No conflicts detected' : 'Blocked by unresolved fields'}
        </div>
      </div>
    </div>
  );
}
