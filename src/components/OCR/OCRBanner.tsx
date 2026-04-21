import { Sparkles } from 'lucide-react';
import type { OCRInvoiceScores } from '../../types/ocr';

export function OCRBanner({
  scores,
  onAcceptAll,
  onReviewConflicts,
}: {
  scores: OCRInvoiceScores;
  onAcceptAll: () => void;
  onReviewConflicts: () => void;
}) {
  const pct = Math.round((scores.overall_confidence || 0) * 100);
  const invoiceNumber = scores.fields?.invoice_number?.value || scores.fields?.invoice_number?.ocr_raw || 'Invoice';
  const vendorName = scores.fields?.vendor_name?.value || scores.fields?.vendor_name?.ocr_raw || 'Unknown vendor';
  return (
    <div className="ocr-banner">
      <div className="ocr-banner-icon"><Sparkles size={16} /></div>
      <div className="ocr-banner-content">
        <div className="ocr-banner-title">Gemini AI OCR — invoice processed · {pct}% overall confidence</div>
        <div className="ocr-banner-subtitle">{invoiceNumber} · {vendorName}</div>
        <div className="ocr-banner-pills">
          <span className="badge-success">Matched {scores.fields_matched}</span>
          <span className="badge-warning">Conflicts {scores.fields_conflicted}</span>
          <span className="badge-error">Low {scores.fields_low_confidence}</span>
          <span className="badge-neutral">Not found {scores.fields_not_found}</span>
        </div>
      </div>
      <div className="ocr-banner-actions">
        <button type="button" className="btn-success" onClick={onAcceptAll}>✓ Accept all matched</button>
        <button type="button" className="btn-secondary" onClick={onReviewConflicts}>Review conflicts →</button>
      </div>
    </div>
  );
}
