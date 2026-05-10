export type MatchStatus = 'matched' | 'conflict' | 'low_confidence' | 'not_found';

export interface OCRCandidate {
  value: string;
  score: number;
  source?: string;
  context?: string;
  note?: string;
}

export interface OCRFieldScore {
  value: string | null;
  confidence: number;
  ocr_raw: string | null;
  match_status: MatchStatus;
  conflict_candidates: OCRCandidate[];
  validation_passed: boolean;
  validation_message: string | null;
  learned?: boolean;
}

export interface OCRInvoiceScores {
  overall_confidence: number;
  fields_matched: number;
  fields_conflicted: number;
  fields_low_confidence: number;
  fields_not_found: number;
  touchless_eligible: boolean;
  fields: Record<string, OCRFieldScore>;
}

export interface OCRCorrection {
  id: string;
  field_name: string;
  ocr_extracted_value: string;
  correct_value: string;
  correction_type: string;
  correction_description: string;
  confirmed: boolean;
}
