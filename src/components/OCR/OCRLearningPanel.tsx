import type { OCRCorrection } from '../../types/ocr';

export function OCRLearningPanel({
  corrections,
  onConfirm,
  onDiscard,
  onConfirmAll,
}: {
  corrections: OCRCorrection[];
  onConfirm: (ids: string[]) => void;
  onDiscard: (id: string) => void;
  onConfirmAll: () => void;
}) {
  return (
    <div className="ocr-learning-panel">
      <div className="ocr-learning-header">
        <strong>✦ AI learning — corrections in this session</strong>
        <span className="badge-teal">{corrections.length}</span>
      </div>
      <div className="ocr-learning-list">
        {corrections.map((c) => (
          <div key={c.id} className="ocr-learning-item">
            <div className="ocr-learning-text">
              <div className="ocr-learning-type">{c.correction_type}</div>
              <div className="ocr-learning-map">
                {c.ocr_extracted_value} → {c.correct_value}
              </div>
            </div>
            <div className="ocr-learning-actions">
              <button type="button" className="btn-success" onClick={() => onConfirm([c.id])}>
                ✓ Confirm learning
              </button>
              <button type="button" className="btn-secondary" onClick={() => onDiscard(c.id)}>
                Discard
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="ocr-learning-footer">
        <span>Confirmed learnings improve future extraction accuracy for this vendor</span>
        <button type="button" className="btn-primary" onClick={onConfirmAll}>
          ✓ Confirm all learnings
        </button>
      </div>
    </div>
  );
}
