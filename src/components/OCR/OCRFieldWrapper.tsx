import { useMemo, useState, type ReactNode } from 'react';
import type { OCRCandidate, OCRCorrection, OCRFieldScore } from '../../types/ocr';
import { MatchScoreBadge } from './MatchScoreBadge';

function toCorrection(fieldName: string, ocrScore: OCRFieldScore | undefined, value: string, correctionType: string, correctionDescription: string): OCRCorrection {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    field_name: fieldName,
    ocr_extracted_value: String(ocrScore?.ocr_raw || ''),
    correct_value: String(value || ''),
    correction_type: correctionType,
    correction_description: correctionDescription,
    confirmed: false,
  };
}

export function OCRFieldWrapper({
  fieldName,
  label,
  required,
  ocrScore,
  onCorrection,
  onApplyValue,
  children,
}: {
  fieldName: string;
  label: string;
  required?: boolean;
  ocrScore?: OCRFieldScore;
  onCorrection: (correction: OCRCorrection) => void;
  onApplyValue?: (value: string) => void;
  children: ReactNode;
}) {
  const [selectedCandidate, setSelectedCandidate] = useState<OCRCandidate | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const statusClass = useMemo(() => {
    if (!ocrScore) return '';
    if (ocrScore.match_status === 'matched') return 'ocr-field-matched';
    if (ocrScore.match_status === 'conflict') return 'ocr-field-conflict';
    if (ocrScore.match_status === 'low_confidence') return 'ocr-field-low';
    return '';
  }, [ocrScore]);

  const applyAndRecord = (value: string, correctionType: string, description: string) => {
    onApplyValue?.(value);
    onCorrection(toCorrection(fieldName, ocrScore, value, correctionType, description));
    setCollapsed(true);
  };

  return (
    <div className={`ocr-field-wrapper ${statusClass}`}>
      <div className="ocr-field-label-row">
        <label className="px-label">
          {label}
          {required ? <span className="ocr-required">*</span> : null}
        </label>
        {ocrScore ? <MatchScoreBadge confidence={ocrScore.confidence} status={ocrScore.match_status} /> : null}
      </div>
      {children}
      {ocrScore?.match_status === 'matched' && (
        <div className="ocr-field-help">✓ OCR extracted: "{ocrScore.value || ocrScore.ocr_raw || ''}"</div>
      )}
      {!collapsed && (ocrScore?.match_status === 'conflict' || ocrScore?.match_status === 'low_confidence') && (
        <div className="ocr-conflict-panel">
          <div className="ocr-conflict-title">
            {ocrScore.match_status === 'conflict' ? '⚠ OCR extracted:' : '✗ Low confidence — OCR extracted:'} {ocrScore.ocr_raw || '—'}
          </div>
          <div className="ocr-candidates">
            {(ocrScore.conflict_candidates || []).map((c) => (
              <button
                type="button"
                key={`${c.value}-${c.score}`}
                className={`ocr-candidate-btn ${selectedCandidate?.value === c.value ? 'selected' : ''}`}
                onClick={() => setSelectedCandidate(c)}
              >
                {c.value} ({Math.round((c.score || 0) * 100)}%)
              </button>
            ))}
          </div>
          <div className="ocr-action-row">
            <button
              type="button"
              className="btn-success"
              onClick={() => selectedCandidate && applyAndRecord(selectedCandidate.value, 'custom', 'Use selected OCR candidate')}
              disabled={!selectedCandidate}
            >
              ✓ Use selected match
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => selectedCandidate && applyAndRecord(selectedCandidate.value, 'vendor_name_mapping', 'Use mapped master value')}
              disabled={!selectedCandidate}
            >
              Use master value
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => selectedCandidate && applyAndRecord(selectedCandidate.value, 'custom', 'Teach AI this mapping')}
              disabled={!selectedCandidate}
            >
              ✦ Teach AI this mapping
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCollapsed(true)}>Skip</button>
          </div>
        </div>
      )}
      {ocrScore?.match_status === 'not_found' && (
        <div className="ocr-field-help">Enter manually — not found in invoice</div>
      )}
    </div>
  );
}
