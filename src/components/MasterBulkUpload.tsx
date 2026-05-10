import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  File as FileIcon,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  ShieldCheck,
  ClipboardList,
  Hash,
  Mail,
  Link2,
  List,
  Calendar,
  ToggleLeft,
  ArrowRight,
  Copy,
  Sparkles,
  Save,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import type {
  ParsedFile,
  ParsedSheet,
  IdentificationOutcome,
  MasterSchema,
  ColumnMapping,
  ValidationResult,
  ValidatedRow,
  ValidationIssue,
  PrerequisiteReport,
  UploadQueueItem,
} from '../lib/masters/bulkUploadTypes';

import { parseWorkbookFile, normalizeHeader } from '../lib/masters/excelParser';
import { identifySheet } from '../lib/masters/masterIdentifier';
import { validateRows } from '../lib/masters/masterValidator';
import { resolvePrerequisites } from '../lib/masters/masterPrerequisites';
import { masterSchemaRegistry } from '../lib/masters/masterSchemaRegistry';

import {
  saveRelationalMasterRecords,
  ensureRelationalMasterRecords,
} from '../lib/mysql/masterTables';
import type { MasterKey } from '../lib/mysql/masterTables';
import { ensureDomainDocument, saveDomainDocument } from '../lib/mysql/documentStore';
import { suggestMappings } from '../lib/masters/fieldSuggester';
import type { FieldSuggestion } from '../lib/masters/fieldSuggester';

type QueueSheet = UploadQueueItem['sheets'][number];

interface ToastState {
  type: 'success' | 'error' | 'info';
  message: string;
}

function getSchema(masterKey: MasterKey | undefined): MasterSchema | undefined {
  if (!masterKey) return undefined;
  return (masterSchemaRegistry as Record<string, MasterSchema | undefined>)[masterKey];
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatPercent(value: number): string {
  if (Number.isNaN(value)) return '0%';
  return `${Math.round(value * 100)}%`;
}

function getConfidenceTone(outcome: IdentificationOutcome): {
  label: string;
  tone: 'teal' | 'amber' | 'red';
  confidence: number;
} {
  if (outcome.unresolved || !outcome.best) {
    return { label: 'Unresolved', tone: 'red', confidence: 0 };
  }
  const confidence = outcome.best.confidence;
  if (confidence >= 0.75) return { label: 'Detected', tone: 'teal', confidence };
  return { label: 'Possible match', tone: 'amber', confidence };
}

function toneStyles(tone: 'teal' | 'amber' | 'red' | 'green'): {
  bg: string;
  fg: string;
  border: string;
} {
  switch (tone) {
    case 'teal':
      return {
        bg: 'var(--color-teal-tint, #E6F4F3)',
        fg: 'var(--color-teal, #117B7B)',
        border: 'var(--color-teal, #117B7B)',
      };
    case 'amber':
      return { bg: '#FEF5E7', fg: '#A15C07', border: '#E8A23B' };
    case 'red':
      return { bg: '#FDEDEC', fg: '#A23939', border: '#D94A4A' };
    case 'green':
      return { bg: '#E7F6EC', fg: '#137333', border: '#34A853' };
  }
}

interface UploadDraft {
  id: string;
  fileName: string;
  fileSize: number;
  savedAt: string; // ISO
  sheets: Array<{
    sheetName: string;
    masterKey: string;
    mapping: Record<string, string | null>;
    manualFields: string[];
    skipped: boolean;
  }>;
}

function newDraftId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function MasterBulkUpload() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [globalBusy, setGlobalBusy] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [expandedPrereqs, setExpandedPrereqs] = useState<Record<string, boolean>>({});
  const [savedDrafts, setSavedDrafts] = useState<UploadDraft[]>([]);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [pendingResumeDraftId, setPendingResumeDraftId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement | null>(null);
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load drafts on mount
  useEffect(() => {
    void (async () => {
      try {
        const doc = await ensureDomainDocument<{ drafts: UploadDraft[] }>('upload_drafts', {
          drafts: [],
        });
        setSavedDrafts(doc.drafts ?? []);
      } catch {
        // ignore
      }
    })();
  }, []);

  // Debounced draft save function
  const scheduleDraftSave = useCallback((currentQueue: UploadQueueItem[]) => {
    if (draftTimerRef.current) {
      clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = setTimeout(() => {
      const drafts: UploadDraft[] = currentQueue
        .filter((item) => item.parsed && !item.fatalError && item.sheets.length > 0)
        .filter((item) => !item.sheets.every((s) => s.uploaded))
        .map((item) => ({
          id: newDraftId(),
          fileName: item.file.name,
          fileSize: item.file.size,
          savedAt: new Date().toISOString(),
          sheets: item.sheets.map((s) => ({
            sheetName: s.sheetName,
            masterKey: s.identification.best?.masterKey ?? '',
            mapping: s.mapping,
            manualFields: [],
            skipped: s.skipped,
          })),
        }));
      if (drafts.length > 0) {
        setSavedDrafts(drafts);
        setDraftSavedAt(new Date().toISOString());
        void saveDomainDocument('upload_drafts', { drafts });
      }
    }, 1500);
  }, []);

  const aggregate = useMemo(() => {
    const filesCount = queue.length;
    let sheetsDetected = 0;
    let readyToUpload = 0;
    for (const item of queue) {
      for (const sheet of item.sheets) {
        sheetsDetected += 1;
        if (
          !sheet.skipped &&
          !sheet.uploaded &&
          sheet.identification.best &&
          sheet.prerequisites.allSatisfied &&
          sheet.validation.summary.withErrors === 0 &&
          sheet.validation.summary.valid > 0
        ) {
          readyToUpload += 1;
        }
      }
    }
    return { filesCount, sheetsDetected, readyToUpload };
  }, [queue]);

  const showToast = useCallback((next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 4200);
  }, []);

  const handleFilesAdded = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      const id = newId();
      setQueue((q) => [...q, { id, file, sheets: [] }]);
      try {
        const parsed: ParsedFile = await parseWorkbookFile(file);
        const processedSheets: QueueSheet[] = await Promise.all(
          parsed.sheets.map(async (sheet: ParsedSheet) => {
            const ident = identifySheet(sheet, masterSchemaRegistry, file.name);
            const schema = getSchema(ident.best?.masterKey);
            if (!ident.best || !schema) {
              return {
                sheetName: sheet.sheetName,
                identification: ident,
                mapping: {},
                validation: {
                  rows: [],
                  issues: [],
                  summary: {
                    total: sheet.rows.length,
                    valid: 0,
                    withWarnings: 0,
                    withErrors: 0,
                  },
                },
                prerequisites: {
                  prerequisites: [],
                  allSatisfied: true,
                  unresolvedForeignKeys: [],
                },
                skipped: false,
                uploaded: false,
              };
            }
            const validation = validateRows(sheet, schema, ident.best.mapping);
            const prereqs = await resolvePrerequisites(schema, validation.rows);
            return {
              sheetName: sheet.sheetName,
              identification: ident,
              mapping: ident.best.mapping,
              validation,
              prerequisites: prereqs,
              skipped: false,
              uploaded: false,
            };
          })
        );
        setQueue((q) =>
          q.map((it) => (it.id === id ? { ...it, parsed, sheets: processedSheets } : it))
        );
      } catch (err) {
        setQueue((q) => q.map((it) => (it.id === id ? { ...it, fatalError: String(err) } : it)));
      }
    }
  }, []);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleFilesAdded(e.target.files);
      }
      e.target.value = '';
    },
    [handleFilesAdded]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        void handleFilesAdded(e.dataTransfer.files);
      }
    },
    [handleFilesAdded]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      setQueue((q) => q.filter((it) => it.id !== itemId));
      if (expandedItem === itemId) setExpandedItem(null);
    },
    [expandedItem]
  );

  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedItem((cur) => (cur === itemId ? null : itemId));
  }, []);

  const handleSkipSheet = useCallback(
    (itemId: string, sheetIndex: number) => {
      setQueue((q) => {
        const next = q.map((it) => {
          if (it.id !== itemId) return it;
          const sheets = it.sheets.map((s, i) =>
            i === sheetIndex ? { ...s, skipped: !s.skipped } : s
          );
          return { ...it, sheets };
        });
        scheduleDraftSave(next);
        return next;
      });
    },
    [scheduleDraftSave]
  );

  const handleMappingChange = useCallback(
    (itemId: string, sheetIndex: number, fieldKey: string, newRawHeader: string | null) => {
      setQueue((q) => {
        const next = q.map((it) => {
          if (it.id !== itemId) return it;
          const sheet = it.sheets[sheetIndex];
          if (!sheet || !it.parsed) return it;
          const parsedSheet = it.parsed.sheets.find((ps) => ps.sheetName === sheet.sheetName);
          if (!parsedSheet) return it;
          const schema = getSchema(sheet.identification.best?.masterKey);
          if (!schema) return it;
          const newMapping: ColumnMapping = {
            ...sheet.mapping,
            [fieldKey]: newRawHeader,
          };
          let validation: ValidationResult;
          try {
            validation = validateRows(parsedSheet, schema, newMapping);
          } catch (err) {
            validation = sheet.validation;
          }
          const sheets = it.sheets.map((s, i) =>
            i === sheetIndex
              ? {
                  ...s,
                  mapping: newMapping,
                  validation,
                }
              : s
          );
          return { ...it, sheets };
        });
        scheduleDraftSave(next);
        return next;
      });
    },
    [scheduleDraftSave]
  );

  const handleUploadSheet = useCallback(
    async (itemId: string, sheetIndex: number) => {
      const item = queue.find((it) => it.id === itemId);
      if (!item) return;
      const sheet = item.sheets[sheetIndex];
      if (!sheet || sheet.skipped || sheet.uploaded) return;
      const schema = getSchema(sheet.identification.best?.masterKey);
      if (!schema) {
        showToast({ type: 'error', message: 'No schema resolved for this sheet.' });
        return;
      }
      if (!sheet.prerequisites.allSatisfied) {
        showToast({
          type: 'error',
          message: 'Cannot upload: prerequisites are not satisfied.',
        });
        return;
      }
      const validRows = sheet.validation.rows.filter((r) => r.valid);
      if (validRows.length === 0) {
        showToast({ type: 'error', message: 'No valid rows to upload.' });
        return;
      }

      setGlobalBusy(true);
      try {
        const existing = await ensureRelationalMasterRecords<Record<string, unknown>>(
          schema.masterKey,
          []
        );
        const incoming = validRows.map((r) => ({
          ...r.record,
          approvalStatus: 'Pending Approval',
        }));
        const merged = [...existing, ...incoming];
        const ok = await saveRelationalMasterRecords(schema.masterKey, merged);
        if (ok) {
          setQueue((q) =>
            q.map((it) =>
              it.id === itemId
                ? {
                    ...it,
                    sheets: it.sheets.map((s, i) =>
                      i === sheetIndex ? { ...s, uploaded: true } : s
                    ),
                  }
                : it
            )
          );
          showToast({
            type: 'success',
            message: `Uploaded ${incoming.length} rows to ${schema.displayName}.`,
          });
          // Auto-delete draft for this file
          setSavedDrafts((prev) => {
            const next = prev.filter(
              (d) =>
                d.fileName.toLowerCase() !== item.file.name.toLowerCase() ||
                d.fileSize !== item.file.size
            );
            void saveDomainDocument('upload_drafts', { drafts: next });
            return next;
          });
        } else {
          showToast({
            type: 'error',
            message: `Upload to ${schema.displayName} failed.`,
          });
        }
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        showToast({ type: 'error', message: `Upload failed: ${detail}` });
      } finally {
        setGlobalBusy(false);
      }
    },
    [queue, showToast]
  );

  const handleUploadAllValid = useCallback(async () => {
    setGlobalBusy(true);
    let uploadedSheets = 0;
    let totalRows = 0;
    let failed = 0;
    try {
      for (const item of queue) {
        for (let sIdx = 0; sIdx < item.sheets.length; sIdx += 1) {
          const sheet = item.sheets[sIdx];
          if (
            sheet.skipped ||
            sheet.uploaded ||
            !sheet.prerequisites.allSatisfied ||
            sheet.validation.summary.withErrors > 0
          ) {
            continue;
          }
          const schema = getSchema(sheet.identification.best?.masterKey);
          if (!schema) continue;
          const validRows = sheet.validation.rows.filter((r) => r.valid);
          if (validRows.length === 0) continue;
          try {
            const existing = await ensureRelationalMasterRecords<Record<string, unknown>>(
              schema.masterKey,
              []
            );
            const incoming = validRows.map((r) => ({
              ...r.record,
              approvalStatus: 'Pending Approval',
            }));
            const merged = [...existing, ...incoming];
            const ok = await saveRelationalMasterRecords(schema.masterKey, merged);
            if (ok) {
              uploadedSheets += 1;
              totalRows += incoming.length;
              setQueue((q) =>
                q.map((it) =>
                  it.id === item.id
                    ? {
                        ...it,
                        sheets: it.sheets.map((s, i) =>
                          i === sIdx ? { ...s, uploaded: true } : s
                        ),
                      }
                    : it
                )
              );
            } else {
              failed += 1;
            }
          } catch {
            failed += 1;
          }
        }
      }
      if (uploadedSheets === 0 && failed === 0) {
        showToast({ type: 'info', message: 'Nothing to upload.' });
      } else if (failed > 0) {
        showToast({
          type: 'error',
          message: `Uploaded ${uploadedSheets} sheet(s), ${totalRows} row(s). ${failed} failed.`,
        });
      } else {
        showToast({
          type: 'success',
          message: `Uploaded ${uploadedSheets} sheet(s) and ${totalRows} row(s).`,
        });
      }
    } finally {
      setGlobalBusy(false);
    }
  }, [queue, showToast]);

  const handleCopyText = useCallback(
    (text: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        void navigator.clipboard.writeText(text);
        showToast({ type: 'info', message: 'Copied to clipboard.' });
      }
    },
    [showToast]
  );

  const handleMasterOverride = useCallback(
    async (itemId: string, sheetIndex: number, newMasterKey: string) => {
      const item = queue.find((it) => it.id === itemId);
      if (!item || !item.parsed) return;
      const sheet = item.sheets[sheetIndex];
      if (!sheet) return;
      const parsedSheet = item.parsed.sheets.find((ps) => ps.sheetName === sheet.sheetName);
      if (!parsedSheet) return;
      const newSchema = getSchema(newMasterKey as MasterKey);
      if (!newSchema) return;

      // Build mapping from scratch using the new schema's aliases
      const newMapping: ColumnMapping = {};
      const normalizedHeaders = parsedSheet.rawHeaders.map((h) => ({
        raw: h,
        normalized: normalizeHeader(h),
      }));
      for (const field of newSchema.fields) {
        for (const alias of field.aliases) {
          const match = normalizedHeaders.find((nh) => nh.normalized === alias);
          if (match) {
            newMapping[field.key] = match.raw;
            break;
          }
        }
      }

      let validation: ValidationResult;
      try {
        validation = validateRows(parsedSheet, newSchema, newMapping);
      } catch {
        validation = {
          rows: [],
          issues: [],
          summary: { total: parsedSheet.rows.length, valid: 0, withWarnings: 0, withErrors: 0 },
        };
      }
      const prereqs = await resolvePrerequisites(newSchema, validation.rows);

      const newIdentification: IdentificationOutcome = {
        best: {
          masterKey: newSchema.masterKey,
          confidence: 1,
          mapping: newMapping,
          missingRequired: newSchema.fields
            .filter((f) => f.required && !newMapping[f.key])
            .map((f) => f.key),
          mappedOptional: newSchema.fields
            .filter((f) => !f.required && !!newMapping[f.key])
            .map((f) => f.key),
        },
        alternatives: sheet.identification.alternatives,
        unresolved: false,
      };

      setQueue((q) => {
        const next = q.map((it) =>
          it.id === itemId
            ? {
                ...it,
                sheets: it.sheets.map((s, i) =>
                  i === sheetIndex
                    ? {
                        ...s,
                        identification: newIdentification,
                        mapping: newMapping,
                        validation,
                        prerequisites: prereqs,
                      }
                    : s
                ),
              }
            : it
        );
        scheduleDraftSave(next);
        return next;
      });
    },
    [queue, scheduleDraftSave]
  );

  const handleDiscardDraft = useCallback((draftId: string) => {
    setSavedDrafts((prev) => {
      const next = prev.filter((d) => d.id !== draftId);
      void saveDomainDocument('upload_drafts', { drafts: next });
      return next;
    });
  }, []);

  const handleResumeDraft = useCallback((draftId: string) => {
    setPendingResumeDraftId(draftId);
    resumeFileInputRef.current?.click();
  }, []);

  const handleResumeFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0 || !pendingResumeDraftId) {
        setPendingResumeDraftId(null);
        e.target.value = '';
        return;
      }
      const file = files[0];
      const draft = savedDrafts.find((d) => d.id === pendingResumeDraftId);
      if (!draft) {
        setPendingResumeDraftId(null);
        e.target.value = '';
        return;
      }

      // Check match
      const nameMatch = file.name.toLowerCase() === draft.fileName.toLowerCase();
      const sizeMatch = file.size === draft.fileSize;
      if (!nameMatch || !sizeMatch) {
        showToast({
          type: 'info',
          message: "File size doesn't match saved draft -- mappings may not apply correctly.",
        });
      }

      // Parse the file
      const id = newId();
      setQueue((q) => [...q, { id, file, sheets: [] }]);
      try {
        const parsed: ParsedFile = await parseWorkbookFile(file);
        const processedSheets: QueueSheet[] = await Promise.all(
          parsed.sheets.map(async (sheet: ParsedSheet) => {
            // Try to find matching draft sheet
            const draftSheet = draft.sheets.find((ds) => ds.sheetName === sheet.sheetName);
            if (draftSheet && draftSheet.masterKey) {
              const schema = getSchema(draftSheet.masterKey as MasterKey);
              if (schema) {
                // Restore mapping from draft
                const mapping = draftSheet.mapping as ColumnMapping;
                let validation: ValidationResult;
                try {
                  validation = validateRows(sheet, schema, mapping);
                } catch {
                  validation = {
                    rows: [],
                    issues: [],
                    summary: { total: sheet.rows.length, valid: 0, withWarnings: 0, withErrors: 0 },
                  };
                }
                const prereqs = await resolvePrerequisites(schema, validation.rows);
                const ident: IdentificationOutcome = {
                  best: {
                    masterKey: schema.masterKey,
                    confidence: 1,
                    mapping,
                    missingRequired: schema.fields
                      .filter((f) => f.required && !mapping[f.key])
                      .map((f) => f.key),
                    mappedOptional: schema.fields
                      .filter((f) => !f.required && !!mapping[f.key])
                      .map((f) => f.key),
                  },
                  alternatives: [],
                  unresolved: false,
                };
                return {
                  sheetName: sheet.sheetName,
                  identification: ident,
                  mapping,
                  validation,
                  prerequisites: prereqs,
                  skipped: draftSheet.skipped,
                  uploaded: false,
                };
              }
            }
            // Fallback: normal identification
            const ident = identifySheet(sheet, masterSchemaRegistry, file.name);
            const schema = getSchema(ident.best?.masterKey);
            if (!ident.best || !schema) {
              return {
                sheetName: sheet.sheetName,
                identification: ident,
                mapping: {},
                validation: {
                  rows: [],
                  issues: [],
                  summary: { total: sheet.rows.length, valid: 0, withWarnings: 0, withErrors: 0 },
                },
                prerequisites: { prerequisites: [], allSatisfied: true, unresolvedForeignKeys: [] },
                skipped: false,
                uploaded: false,
              };
            }
            const validation = validateRows(sheet, schema, ident.best.mapping);
            const prereqs = await resolvePrerequisites(schema, validation.rows);
            return {
              sheetName: sheet.sheetName,
              identification: ident,
              mapping: ident.best.mapping,
              validation,
              prerequisites: prereqs,
              skipped: false,
              uploaded: false,
            };
          })
        );
        setQueue((q) =>
          q.map((it) => (it.id === id ? { ...it, parsed, sheets: processedSheets } : it))
        );
        showToast({
          type: 'info',
          message: 'Draft restored -- mappings loaded from your previous session.',
        });
      } catch (err) {
        setQueue((q) => q.map((it) => (it.id === id ? { ...it, fatalError: String(err) } : it)));
      }
      setPendingResumeDraftId(null);
      e.target.value = '';
    },
    [pendingResumeDraftId, savedDrafts, showToast]
  );

  return (
    <div
      className="min-h-screen p-8"
      style={{ backgroundColor: 'var(--color-cloud, #F7F8FA)', color: 'var(--color-ink, #111827)' }}
    >
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-ink)' }}>
              Master Bulk Upload
            </h1>
            <p className="text-sm mt-1 max-w-3xl" style={{ color: 'var(--color-silver, #6B7280)' }}>
              Upload Excel or CSV files and we will auto-identify the master, check prerequisites,
              validate every row, and ship the approved rows to MySQL via the standard master save
              path.
            </p>
          </div>
          <button
            type="button"
            onClick={handleBrowseClick}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
            style={{
              backgroundColor: 'var(--color-teal, #117B7B)',
              color: '#FFFFFF',
            }}
          >
            <Upload className="w-4 h-4" />
            Upload Files
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileInputChange}
          />
        </div>

        {/* Drag-and-drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleBrowseClick}
          className="w-full rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center cursor-pointer transition"
          style={{
            borderColor: dragActive
              ? 'var(--color-teal, #117B7B)'
              : 'var(--color-mercury-grey, #D9DEE4)',
            backgroundColor: dragActive ? 'var(--color-teal-tint, #E6F4F3)' : '#FFFFFF',
            padding: '44px 24px',
          }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{
              backgroundColor: 'var(--color-teal-tint, #E6F4F3)',
              color: 'var(--color-teal, #117B7B)',
            }}
          >
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
            Drag files here or click to browse
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-silver, #6B7280)' }}>
            Accepts .xlsx, .xls, .csv. Multiple files supported.
          </div>
        </div>

        {/* Hidden file input for draft resume */}
        <input
          ref={resumeFileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleResumeFileChange}
        />

        {/* Saved Drafts section */}
        {savedDrafts.length > 0 && queue.length === 0 && (
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
            }}
          >
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{
                borderBottom: '1px solid var(--color-mercury-grey, #D9DEE4)',
                backgroundColor: 'var(--color-cloud, #F7F8FA)',
              }}
            >
              <ClipboardList className="w-4 h-4" style={{ color: 'var(--color-teal, #117B7B)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--color-ink)' }}>
                Saved Drafts
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-mercury-grey, #D9DEE4)' }}>
              {savedDrafts.map((draft) => {
                const masterNames = draft.sheets
                  .map((s) => {
                    const sch = getSchema(s.masterKey as MasterKey);
                    return sch?.displayName ?? s.masterKey;
                  })
                  .filter(Boolean)
                  .join(', ');
                return (
                  <div key={draft.id} className="px-5 py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {draft.fileName}
                        {masterNames && (
                          <span style={{ color: 'var(--color-silver, #6B7280)', fontWeight: 400 }}>
                            {' '}
                            &middot; {masterNames}
                          </span>
                        )}
                        <span
                          style={{
                            color: 'var(--color-silver, #6B7280)',
                            fontWeight: 400,
                            fontSize: 12,
                          }}
                        >
                          {' '}
                          &middot; {relativeTime(draft.savedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResumeDraft(draft.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition"
                        style={{
                          backgroundColor: 'var(--color-teal, #117B7B)',
                          color: '#FFFFFF',
                        }}
                      >
                        <RotateCcw className="w-3 h-3" />
                        Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDiscardDraft(draft.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition"
                        style={{
                          borderColor: 'var(--color-mercury-grey, #D9DEE4)',
                          color: '#A23939',
                          backgroundColor: '#FFFFFF',
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                        Discard
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Queue header */}
        {queue.length > 0 && (
          <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
            }}
          >
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {aggregate.filesCount}
                </span>{' '}
                <span style={{ color: 'var(--color-silver, #6B7280)' }}>file(s) queued</span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: 'var(--color-ink)' }}>
                  {aggregate.sheetsDetected}
                </span>{' '}
                <span style={{ color: 'var(--color-silver, #6B7280)' }}>sheet(s) detected</span>
              </div>
              <div>
                <span className="font-semibold" style={{ color: 'var(--color-teal, #117B7B)' }}>
                  {aggregate.readyToUpload}
                </span>{' '}
                <span style={{ color: 'var(--color-silver, #6B7280)' }}>ready to upload</span>
              </div>
            </div>
            <button
              type="button"
              disabled={globalBusy || aggregate.readyToUpload === 0}
              onClick={handleUploadAllValid}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--color-teal, #117B7B)',
                color: '#FFFFFF',
              }}
            >
              <CheckCircle className="w-4 h-4" />
              Upload All Valid
            </button>
          </div>
        )}

        {/* Queue list */}
        {queue.length === 0 ? (
          <div
            className="rounded-xl px-8 py-10 text-center"
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
              color: 'var(--color-silver, #6B7280)',
            }}
          >
            No files uploaded yet. Drop Excel or CSV files above to begin.
          </div>
        ) : (
          <div className="space-y-4">
            {queue.map((item) => (
              <QueueItemCard
                key={item.id}
                item={item}
                expanded={expandedItem === item.id}
                onToggleExpand={() => handleToggleExpand(item.id)}
                onRemove={() => handleRemoveItem(item.id)}
                onSkipSheet={(sheetIndex) => handleSkipSheet(item.id, sheetIndex)}
                onUploadSheet={(sheetIndex) => handleUploadSheet(item.id, sheetIndex)}
                onMappingChange={(sheetIndex, fieldKey, header) =>
                  handleMappingChange(item.id, sheetIndex, fieldKey, header)
                }
                onMasterOverride={(sheetIndex, masterKey) =>
                  handleMasterOverride(item.id, sheetIndex, masterKey)
                }
                expandedPrereqs={expandedPrereqs}
                setExpandedPrereqs={setExpandedPrereqs}
                onCopyText={handleCopyText}
                busy={globalBusy}
                draftSavedAt={draftSavedAt}
              />
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium"
          style={{
            backgroundColor:
              toast.type === 'success'
                ? '#137333'
                : toast.type === 'error'
                  ? '#A23939'
                  : 'var(--color-teal, #117B7B)',
            color: '#FFFFFF',
            maxWidth: '360px',
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Queue item card                                                     */
/* ------------------------------------------------------------------ */

interface QueueItemCardProps {
  item: UploadQueueItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onRemove: () => void;
  onSkipSheet: (sheetIndex: number) => void;
  onUploadSheet: (sheetIndex: number) => void;
  onMappingChange: (sheetIndex: number, fieldKey: string, header: string | null) => void;
  onMasterOverride: (sheetIndex: number, masterKey: string) => void;
  expandedPrereqs: Record<string, boolean>;
  setExpandedPrereqs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onCopyText: (text: string) => void;
  busy: boolean;
  draftSavedAt: string | null;
}

function QueueItemCard({
  item,
  expanded,
  onToggleExpand,
  onRemove,
  onSkipSheet,
  onUploadSheet,
  onMappingChange,
  onMasterOverride,
  expandedPrereqs,
  setExpandedPrereqs,
  onCopyText,
  busy,
  draftSavedAt,
}: QueueItemCardProps) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--color-mercury-grey, #D9DEE4)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-mercury-grey, #D9DEE4)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              backgroundColor: 'var(--color-teal-tint, #E6F4F3)',
              color: 'var(--color-teal, #117B7B)',
            }}
          >
            <FileIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-sm truncate" style={{ color: 'var(--color-ink)' }}>
              {item.file.name}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-silver, #6B7280)' }}>
              {item.parsed
                ? `${item.parsed.sheets.length} sheet${item.parsed.sheets.length === 1 ? '' : 's'}`
                : item.fatalError
                  ? 'Parse failed'
                  : 'Parsing...'}
            </div>
          </div>
          {draftSavedAt && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
              style={{
                backgroundColor: 'var(--color-teal-tint, #E6F4F3)',
                color: 'var(--color-teal, #117B7B)',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <Save className="w-3 h-3" />
              Draft saved {relativeTime(draftSavedAt)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-md transition hover:bg-gray-100"
          style={{ color: 'var(--color-silver, #6B7280)' }}
          aria-label="Remove file"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Fatal error */}
      {item.fatalError && (
        <div
          className="px-5 py-3 text-sm flex items-start gap-2"
          style={{
            backgroundColor: '#FDEDEC',
            color: '#A23939',
          }}
        >
          <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold">Failed to parse file</div>
            <div className="text-xs mt-0.5 break-all">{item.fatalError}</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {item.parsed && item.sheets.length === 0 && !item.fatalError && (
        <div
          className="px-5 py-4 text-sm text-center"
          style={{ color: 'var(--color-silver, #6B7280)' }}
        >
          This file contains no sheets.
        </div>
      )}

      {/* Sheets */}
      {item.sheets.map((sheet, idx) => {
        const key = `${item.id}:${idx}`;
        const prereqOpen = expandedPrereqs[key] ?? false;
        return (
          <SheetRow
            key={key}
            itemId={item.id}
            sheetIndex={idx}
            sheet={sheet}
            parsed={item.parsed}
            expanded={expanded}
            busy={busy}
            onToggleExpand={onToggleExpand}
            onSkipSheet={() => onSkipSheet(idx)}
            onUploadSheet={() => onUploadSheet(idx)}
            onMappingChange={(fieldKey, header) => onMappingChange(idx, fieldKey, header)}
            onMasterOverride={(masterKey) => onMasterOverride(idx, masterKey)}
            prereqOpen={prereqOpen}
            onTogglePrereq={() => setExpandedPrereqs((prev) => ({ ...prev, [key]: !prereqOpen }))}
            onCopyText={onCopyText}
          />
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sheet row                                                           */
/* ------------------------------------------------------------------ */

interface SheetRowProps {
  itemId: string;
  sheetIndex: number;
  sheet: QueueSheet;
  parsed?: ParsedFile;
  expanded: boolean;
  busy: boolean;
  onToggleExpand: () => void;
  onSkipSheet: () => void;
  onUploadSheet: () => void;
  onMappingChange: (fieldKey: string, header: string | null) => void;
  onMasterOverride: (masterKey: string) => void;
  prereqOpen: boolean;
  onTogglePrereq: () => void;
  onCopyText: (text: string) => void;
}

function SheetRow({
  sheet,
  parsed,
  expanded,
  busy,
  onToggleExpand,
  onSkipSheet,
  onUploadSheet,
  onMappingChange,
  onMasterOverride,
  prereqOpen,
  onTogglePrereq,
  onCopyText,
}: SheetRowProps) {
  const schema = getSchema(sheet.identification.best?.masterKey);
  const parsedSheet = parsed?.sheets.find((ps) => ps.sheetName === sheet.sheetName);
  const confTone = getConfidenceTone(sheet.identification);
  const tone = toneStyles(confTone.tone);
  const displayName = schema?.displayName ?? 'Unresolved';
  const { summary } = sheet.validation;
  const prereqSatisfied = sheet.prerequisites.allSatisfied;
  const missingPrereqCount = sheet.prerequisites.prerequisites.filter((p) => !p.satisfied).length;

  const canUploadSheet =
    !sheet.skipped &&
    !sheet.uploaded &&
    !!schema &&
    prereqSatisfied &&
    summary.withErrors === 0 &&
    summary.valid > 0;

  return (
    <div
      style={{
        borderTop: '1px solid var(--color-mercury-grey, #D9DEE4)',
        opacity: sheet.skipped ? 0.55 : 1,
      }}
    >
      <div className="px-5 py-4 flex items-center gap-4 flex-wrap">
        {/* Sheet name */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <FileSpreadsheet className="w-4 h-4" style={{ color: 'var(--color-silver, #6B7280)' }} />
          <span className="font-medium text-sm" style={{ color: 'var(--color-ink)' }}>
            {sheet.sheetName}
          </span>
        </div>

        {/* Identification */}
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: tone.bg,
              color: tone.fg,
              border: `1px solid ${tone.border}`,
            }}
          >
            {displayName}
          </span>
          <span className="text-xs" style={{ color: 'var(--color-silver, #6B7280)' }}>
            {formatPercent(confTone.confidence)} confidence
          </span>
        </div>

        {/* Prereq */}
        <button
          type="button"
          onClick={onTogglePrereq}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold"
          style={{
            backgroundColor: prereqSatisfied ? '#E7F6EC' : '#FDEDEC',
            color: prereqSatisfied ? '#137333' : '#A23939',
            border: `1px solid ${prereqSatisfied ? '#34A853' : '#D94A4A'}`,
          }}
        >
          {prereqSatisfied ? (
            <>
              <ShieldCheck className="w-3 h-3" /> All prereqs met
            </>
          ) : (
            <>
              <AlertTriangle className="w-3 h-3" /> {missingPrereqCount} prereqs missing
            </>
          )}
        </button>

        {/* Validation summary */}
        <div className="text-xs flex items-center gap-2">
          <span style={{ color: 'var(--color-silver, #6B7280)' }}>Validation:</span>
          <span style={{ color: '#137333' }} className="font-semibold">
            {summary.valid}
          </span>
          <span style={{ color: 'var(--color-silver, #6B7280)' }}>/</span>
          <span style={{ color: 'var(--color-ink)' }} className="font-semibold">
            {summary.total}
          </span>
          <span style={{ color: 'var(--color-silver, #6B7280)' }}>rows valid</span>
          {summary.withErrors > 0 && (
            <span className="ml-1 inline-flex items-center gap-1" style={{ color: '#A23939' }}>
              <XCircle className="w-3 h-3" />
              {summary.withErrors} errors
            </span>
          )}
          {summary.withWarnings > 0 && (
            <span className="ml-1 inline-flex items-center gap-1" style={{ color: '#A15C07' }}>
              <AlertCircle className="w-3 h-3" />
              {summary.withWarnings} warnings
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {sheet.uploaded && (
            <span
              className="inline-flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#137333' }}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Uploaded
            </span>
          )}
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition"
            style={{
              borderColor: 'var(--color-mercury-grey, #D9DEE4)',
              color: 'var(--color-ink)',
              backgroundColor: '#FFFFFF',
            }}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Expand
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onUploadSheet}
            disabled={busy || !canUploadSheet}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--color-teal, #117B7B)',
              color: '#FFFFFF',
            }}
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Sheet
          </button>
          <button
            type="button"
            onClick={onSkipSheet}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold border transition"
            style={{
              borderColor: 'var(--color-mercury-grey, #D9DEE4)',
              color: 'var(--color-silver, #6B7280)',
              backgroundColor: '#FFFFFF',
            }}
          >
            {sheet.skipped ? 'Unskip' : 'Skip'}
          </button>
        </div>
      </div>

      {/* Prereq drawer */}
      {prereqOpen && (
        <div className="px-5 pb-4 text-xs" style={{ color: 'var(--color-silver, #6B7280)' }}>
          <div
            className="rounded-lg p-3 space-y-2"
            style={{
              backgroundColor: 'var(--color-cloud, #F7F8FA)',
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
            }}
          >
            <div className="font-semibold" style={{ color: 'var(--color-ink)' }}>
              Prerequisite status
            </div>
            {sheet.prerequisites.prerequisites.length === 0 ? (
              <div>No prerequisites for this master.</div>
            ) : (
              <ul className="space-y-1">
                {sheet.prerequisites.prerequisites.map((p) => (
                  <li key={p.masterKey} className="flex items-center gap-2">
                    {p.satisfied ? (
                      <CheckCircle className="w-3.5 h-3.5" style={{ color: '#137333' }} />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" style={{ color: '#A23939' }} />
                    )}
                    <span style={{ color: 'var(--color-ink)' }}>{p.displayName}</span>
                    <span>- {p.approvedCount} approved</span>
                  </li>
                ))}
              </ul>
            )}
            {sheet.prerequisites.unresolvedForeignKeys.length > 0 && (
              <div>
                <div className="font-semibold mt-2" style={{ color: 'var(--color-ink)' }}>
                  Unresolved foreign keys (first 10)
                </div>
                <ul className="space-y-0.5 mt-1">
                  {sheet.prerequisites.unresolvedForeignKeys.slice(0, 10).map((fk, i) => (
                    <li key={i}>
                      Row {fk.rowIndex + 1}, <em>{fk.field}</em> = "{fk.lookupValue}" (not found in{' '}
                      {fk.refMaster})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <SheetDetail
          sheet={sheet}
          schema={schema}
          parsedSheet={parsedSheet}
          onMappingChange={onMappingChange}
          onMasterOverride={onMasterOverride}
          onCopyText={onCopyText}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Expanded sheet detail (redesigned)                                  */
/* ------------------------------------------------------------------ */

const FIELD_TYPE_ICONS: Record<string, typeof ClipboardList> = {
  string: ClipboardList,
  number: Hash,
  integer: Hash,
  email: Mail,
  url: Link2,
  enum: List,
  date: Calendar,
  boolean: ToggleLeft,
};

function getFieldIcon(type: string) {
  return FIELD_TYPE_ICONS[type] ?? ClipboardList;
}

function getColumnPreview(parsedSheet: ParsedSheet, rawHeader: string | null | undefined): string {
  if (!rawHeader) return '';
  const samples = parsedSheet.rows
    .slice(0, 3)
    .map((r) => {
      const v = (r as Record<string, unknown>)[rawHeader];
      return v === undefined || v === null || v === '' ? null : String(v);
    })
    .filter(Boolean);
  if (samples.length === 0) return '';
  return samples.join(', ') + (parsedSheet.rows.length > 3 ? '...' : '');
}

interface SheetDetailProps {
  sheet: QueueSheet;
  schema: MasterSchema | undefined;
  parsedSheet: ParsedSheet | undefined;
  onMappingChange: (fieldKey: string, header: string | null) => void;
  onMasterOverride: (masterKey: string) => void;
  onCopyText: (text: string) => void;
}

function SheetDetail({
  sheet,
  schema,
  parsedSheet,
  onMappingChange,
  onMasterOverride,
  onCopyText,
}: SheetDetailProps) {
  const [manualFields, setManualFields] = useState<Set<string>>(new Set());
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  // All registry master keys for the override dropdown
  const allMasterKeys = useMemo(() => Object.keys(masterSchemaRegistry) as string[], []);

  // AI field suggestions
  const suggestions = useMemo<Map<string, FieldSuggestion[]>>(() => {
    if (!schema || !parsedSheet) return new Map();
    return suggestMappings(schema.fields, parsedSheet, sheet.mapping, schema.primaryCodeField);
  }, [schema, parsedSheet, sheet.mapping]);

  if (!schema || !parsedSheet) {
    return (
      <div
        className="px-5 py-5 text-sm"
        style={{
          backgroundColor: 'var(--color-cloud, #F7F8FA)',
          color: 'var(--color-silver, #6B7280)',
          borderTop: '1px solid var(--color-mercury-grey, #D9DEE4)',
        }}
      >
        This sheet could not be resolved to a known master. Column mapping and row preview are
        unavailable.
        {sheet.identification.alternatives.length > 0 && (
          <div className="mt-2">
            Possible matches:{' '}
            {sheet.identification.alternatives
              .map((a) => `${a.masterKey} (${formatPercent(a.confidence)})`)
              .join(', ')}
          </div>
        )}
        {/* Master override even when unresolved */}
        <div style={{ marginTop: 12 }}>
          <label
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--color-silver, #6B7280)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.05em',
            }}
          >
            Override target master
          </label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) onMasterOverride(e.target.value);
            }}
            style={{
              display: 'block',
              marginTop: 4,
              padding: '6px 10px',
              fontSize: 13,
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              color: 'var(--color-ink, #111827)',
            }}
          >
            <option value="">-- Select a master --</option>
            {allMasterKeys.map((mk) => {
              const s = (masterSchemaRegistry as Record<string, MasterSchema>)[mk];
              return (
                <option key={mk} value={mk}>
                  {s?.displayName ?? mk}
                </option>
              );
            })}
          </select>
        </div>
      </div>
    );
  }

  const orderedFields = schema.fields;
  const headerOptions = parsedSheet.rawHeaders;
  const currentMasterKey = sheet.identification.best?.masterKey ?? '';

  // TODO(F4-followup): there is an early return upstream before this
  // useMemo, which is technically a rules-of-hooks violation. The function
  // is invoked from a stable code path today, so behaviour is consistent.
  // Proper fix: lift the hook above the early return.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const headerUsedBy = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of schema.fields) {
      const h = sheet.mapping[f.key];
      if (h) map.set(h, f.label);
    }
    return map;
  }, [sheet.mapping, schema.fields]);

  // Compute mapping stats
  const autoMappedCount = orderedFields.filter(
    (f) => !!sheet.mapping[f.key] && !manualFields.has(f.key)
  ).length;
  const manualMappedCount = orderedFields.filter(
    (f) => !!sheet.mapping[f.key] && manualFields.has(f.key)
  ).length;
  const unmappedRequired = orderedFields.filter((f) => f.required && !sheet.mapping[f.key]).length;
  const unmappedOptional = orderedFields.filter((f) => !f.required && !sheet.mapping[f.key]).length;
  const totalFields = orderedFields.length;

  const { summary } = sheet.validation;
  const errorRows = sheet.validation.rows.filter((r) => !r.valid);
  const previewRows = sheet.validation.rows.slice(0, 10);
  const issues = sheet.validation.issues;
  const errorIssues = issues.filter((i) => i.severity === 'error');
  const warningIssues = issues.filter((i) => i.severity === 'warning');

  const handleLocalMappingChange = (fieldKey: string, value: string) => {
    setManualFields((prev) => {
      const next = new Set(prev);
      next.add(fieldKey);
      return next;
    });
    onMappingChange(fieldKey, value === '' ? null : value);
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--color-cloud, #F7F8FA)',
        borderTop: '1px solid var(--color-mercury-grey, #D9DEE4)',
        padding: '20px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Master override dropdown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--color-silver, #6B7280)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
            }}
          >
            TARGET MASTER
          </label>
          <select
            value={currentMasterKey}
            onChange={(e) => {
              if (e.target.value && e.target.value !== currentMasterKey) {
                onMasterOverride(e.target.value);
                setManualFields(new Set());
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: 600,
              border: '1px solid var(--color-mercury-grey, #D9DEE4)',
              borderRadius: 8,
              backgroundColor: '#FFFFFF',
              color: 'var(--color-ink, #111827)',
              cursor: 'pointer',
            }}
          >
            {allMasterKeys.map((mk) => {
              const s = (masterSchemaRegistry as Record<string, MasterSchema>)[mk];
              return (
                <option key={mk} value={mk}>
                  {s?.displayName ?? mk}
                </option>
              );
            })}
          </select>
          <ArrowRight style={{ width: 14, height: 14, color: 'var(--color-silver, #6B7280)' }} />
          <span style={{ fontSize: 12, color: 'var(--color-silver, #6B7280)' }}>
            Change to re-identify with a different schema
          </span>
        </div>

        {/* Summary bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap' as const,
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Total */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--color-cloud, #F7F8FA)',
              color: 'var(--color-ink, #111827)',
              border: '1px solid var(--color-fog, #E5E7EB)',
            }}
          >
            <FileSpreadsheet style={{ width: 13, height: 13 }} />
            {totalFields} fields
          </span>
          {/* Auto-mapped */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 999,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: '#E8F7F0',
              color: '#0A7E4A',
            }}
          >
            <CheckCircle style={{ width: 13, height: 13 }} />
            {autoMappedCount} auto
          </span>
          {/* Manual */}
          {manualMappedCount > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: 'var(--color-teal-tint, #E6F4F3)',
                color: 'var(--color-teal, #117B7B)',
              }}
            >
              <CheckCircle style={{ width: 13, height: 13 }} />
              {manualMappedCount} manual
            </span>
          )}
          {/* Unmapped required */}
          {unmappedRequired > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: '#FFE8EA',
                color: '#D32F2F',
                animation: 'pulse 2s ease-in-out infinite',
              }}
            >
              <XCircle style={{ width: 13, height: 13 }} />
              {unmappedRequired} missing
            </span>
          )}
          {/* Unmapped optional */}
          {unmappedOptional > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                backgroundColor: 'var(--color-cloud, #F7F8FA)',
                color: '#64748B',
              }}
            >
              {unmappedOptional} optional unmapped
            </span>
          )}
        </div>

        {/* Mapping table */}
        <div
          style={{
            borderRadius: 16,
            border: '1px solid var(--color-fog, #E5E7EB)',
            overflow: 'hidden',
            backgroundColor: '#FFFFFF',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr
                style={{
                  background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                  position: 'sticky' as const,
                  top: 0,
                  zIndex: 1,
                }}
              >
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-silver, #6B7280)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                  }}
                >
                  FIELD
                </th>
                <th
                  style={{
                    textAlign: 'center',
                    padding: '10px 12px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-silver, #6B7280)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                    width: 120,
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'var(--color-silver, #6B7280)',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.06em',
                  }}
                >
                  MAPPED EXCEL COLUMN
                </th>
              </tr>
            </thead>
            <tbody>
              {orderedFields.map((field, idx) => {
                const currentHeader = sheet.mapping[field.key] ?? '';
                const isMapped = !!currentHeader;
                const isManual = manualFields.has(field.key);
                const FieldIcon_ = getFieldIcon(field.type);
                const isEvenRow = idx % 2 === 0;
                const isUnmappedRequired = field.required && !isMapped;
                const preview = getColumnPreview(parsedSheet, currentHeader || undefined);

                // Status chip
                let statusChip: { label: string; bg: string; fg: string };
                if (isMapped && !isManual) {
                  statusChip = { label: '\u2713 Auto', bg: '#E8F7F0', fg: '#0A7E4A' };
                } else if (isMapped && isManual) {
                  statusChip = {
                    label: '\u2713 Manual',
                    bg: 'var(--color-teal-tint, #E6F4F3)',
                    fg: 'var(--color-teal, #117B7B)',
                  };
                } else if (!isMapped && field.required) {
                  statusChip = { label: '\u2717 Missing', bg: '#FFE8EA', fg: '#D32F2F' };
                } else {
                  statusChip = {
                    label: '\u2014 Optional',
                    bg: 'var(--color-cloud, #F7F8FA)',
                    fg: '#64748B',
                  };
                }

                return (
                  <tr
                    key={field.key}
                    style={{
                      height: 52,
                      backgroundColor: isEvenRow ? '#FFFFFF' : '#FAFBFC',
                      borderLeft: isUnmappedRequired
                        ? '4px solid #FCA5A5'
                        : '4px solid transparent',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#F0F7FA';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLTableRowElement).style.backgroundColor = isEvenRow
                        ? '#FFFFFF'
                        : '#FAFBFC';
                    }}
                  >
                    {/* Column 1: Field */}
                    <td style={{ padding: '0 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FieldIcon_
                          style={{
                            width: 15,
                            height: 15,
                            color: field.required ? 'var(--color-ink, #111827)' : '#64748B',
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontWeight: field.required ? 600 : 500,
                            color: field.required ? 'var(--color-ink, #111827)' : '#475569',
                            fontSize: 13,
                          }}
                        >
                          {field.label}
                        </span>
                        {field.required && (
                          <span
                            style={{
                              backgroundColor: '#FFE8EA',
                              color: '#D32F2F',
                              fontSize: 10,
                              borderRadius: 999,
                              padding: '2px 8px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap' as const,
                            }}
                          >
                            REQUIRED
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Column 2: Status chip */}
                    <td style={{ textAlign: 'center', padding: '0 12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          borderRadius: 999,
                          padding: '3px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: statusChip.bg,
                          color: statusChip.fg,
                          whiteSpace: 'nowrap' as const,
                        }}
                      >
                        {statusChip.label}
                      </span>
                    </td>
                    {/* Column 3: Mapped Excel Column */}
                    <td style={{ padding: '6px 16px' }}>
                      {(() => {
                        const fieldSuggestions = !isMapped
                          ? (suggestions.get(field.key) ?? [])
                          : [];
                        const topSugg = fieldSuggestions[0];
                        const extraCount = fieldSuggestions.length - 1;
                        const isExpanded = expandedSuggestions.has(field.key);

                        return (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <select
                                value={currentHeader}
                                onChange={(e) =>
                                  handleLocalMappingChange(field.key, e.target.value)
                                }
                                style={{
                                  flex: 1,
                                  padding: '6px 10px',
                                  fontSize: 12,
                                  border: '1px solid var(--color-mercury-grey, #D9DEE4)',
                                  borderRadius: 8,
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--color-ink, #111827)',
                                  cursor: 'pointer',
                                }}
                              >
                                <option value="">-- Select column --</option>
                                {headerOptions.map((h) => {
                                  const usedByLabel = headerUsedBy.get(h);
                                  const isUsedByOther = usedByLabel && h !== currentHeader;
                                  return (
                                    <option
                                      key={h}
                                      value={h}
                                      style={isUsedByOther ? { color: '#94A3B8' } : undefined}
                                    >
                                      {h}
                                      {isUsedByOther ? ` \u2713 \u2192 ${usedByLabel}` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                              {topSugg && (
                                <Sparkles
                                  style={{
                                    width: 14,
                                    height: 14,
                                    color: 'var(--color-teal, #117B7B)',
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                            </div>
                            {preview && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#64748B',
                                  marginTop: 3,
                                  whiteSpace: 'nowrap' as const,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  maxWidth: 320,
                                }}
                              >
                                {preview}
                              </div>
                            )}
                            {topSugg && (
                              <div style={{ marginTop: 3 }}>
                                <span
                                  onClick={() =>
                                    handleLocalMappingChange(field.key, topSugg.header)
                                  }
                                  style={{
                                    fontSize: 11,
                                    color: 'var(--color-teal, #117B7B)',
                                    fontStyle: 'italic',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                      'underline';
                                  }}
                                  onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                      'none';
                                  }}
                                >
                                  Suggested: &ldquo;{topSugg.header}&rdquo;
                                </span>
                                <span
                                  style={{ fontSize: 11, color: '#64748B', fontStyle: 'italic' }}
                                >
                                  {' '}
                                  &mdash; {topSugg.reason}
                                </span>
                                {extraCount > 0 && (
                                  <span
                                    onClick={() =>
                                      setExpandedSuggestions((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(field.key)) next.delete(field.key);
                                        else next.add(field.key);
                                        return next;
                                      })
                                    }
                                    style={{
                                      fontSize: 11,
                                      color: 'var(--color-teal, #117B7B)',
                                      fontStyle: 'italic',
                                      cursor: 'pointer',
                                      marginLeft: 6,
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                        'underline';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                        'none';
                                    }}
                                  >
                                    +{extraCount} more
                                  </span>
                                )}
                              </div>
                            )}
                            {isExpanded && fieldSuggestions.length > 1 && (
                              <div
                                style={{
                                  marginTop: 4,
                                  padding: '6px 8px',
                                  borderRadius: 8,
                                  backgroundColor: 'var(--color-cloud, #F7F8FA)',
                                  border: '1px solid var(--color-fog, #E5E7EB)',
                                }}
                              >
                                {fieldSuggestions.slice(1).map((s) => (
                                  <div key={s.header} style={{ marginBottom: 3 }}>
                                    <span
                                      onClick={() => handleLocalMappingChange(field.key, s.header)}
                                      style={{
                                        fontSize: 11,
                                        color: 'var(--color-teal, #117B7B)',
                                        fontStyle: 'italic',
                                        cursor: 'pointer',
                                      }}
                                      onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                          'underline';
                                      }}
                                      onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLSpanElement).style.textDecoration =
                                          'none';
                                      }}
                                    >
                                      &ldquo;{s.header}&rdquo;
                                    </span>
                                    <span
                                      style={{
                                        fontSize: 11,
                                        color: '#64748B',
                                        fontStyle: 'italic',
                                      }}
                                    >
                                      {' '}
                                      &mdash; {s.reason}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation summary bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '10px 16px',
            borderRadius: 12,
            backgroundColor: '#FFFFFF',
            border: '1px solid var(--color-fog, #E5E7EB)',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span style={{ color: '#0A7E4A', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <CheckCircle style={{ width: 14, height: 14 }} />
            {summary.valid} rows valid
          </span>
          <span style={{ color: 'var(--color-fog, #E5E7EB)' }}>&middot;</span>
          <span style={{ color: '#A15C07', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            {summary.withWarnings} with warnings
          </span>
          <span style={{ color: 'var(--color-fog, #E5E7EB)' }}>&middot;</span>
          <span style={{ color: '#D32F2F', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <XCircle style={{ width: 14, height: 14 }} />
            {summary.withErrors} with errors
          </span>
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--color-silver, #6B7280)',
            }}
          >
            {summary.total} total rows
          </span>
        </div>

        {/* Prerequisites (compact horizontal pills) */}
        {sheet.prerequisites.prerequisites.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap' as const,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--color-silver, #6B7280)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                marginRight: 4,
              }}
            >
              PREREQUISITES
            </span>
            {sheet.prerequisites.prerequisites.map((p) => (
              <span
                key={p.masterKey}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  backgroundColor: p.satisfied ? '#E8F7F0' : '#FFE8EA',
                  color: p.satisfied ? '#0A7E4A' : '#D32F2F',
                }}
              >
                {p.satisfied ? (
                  <ShieldCheck style={{ width: 13, height: 13 }} />
                ) : (
                  <AlertTriangle style={{ width: 13, height: 13 }} />
                )}
                {p.displayName}
                <span style={{ fontWeight: 400, fontSize: 11 }}>({p.approvedCount})</span>
              </span>
            ))}
          </div>
        )}

        {/* Row preview */}
        <section>
          <h4
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--color-ink, #111827)',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Eye style={{ width: 15, height: 15 }} /> Row preview (first 10)
          </h4>
          <div
            style={{
              borderRadius: 12,
              overflow: 'auto',
              backgroundColor: '#FFFFFF',
              border: '1px solid var(--color-fog, #E5E7EB)',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr
                  style={{
                    background: 'linear-gradient(180deg, #F8FBFD 0%, #F3F8FB 100%)',
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-silver, #6B7280)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      width: 40,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-silver, #6B7280)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}
                  >
                    RAW VALUES
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-silver, #6B7280)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}
                  >
                    CANONICAL RECORD
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '8px 12px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--color-silver, #6B7280)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                      width: 80,
                    }}
                  >
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {previewRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      style={{
                        padding: '16px 12px',
                        textAlign: 'center',
                        color: 'var(--color-silver, #6B7280)',
                      }}
                    >
                      No rows to preview.
                    </td>
                  </tr>
                ) : (
                  previewRows.map((r: ValidatedRow) => {
                    const rawRow = parsedSheet.rows[r.rowIndex] ?? {};
                    const rawStr = parsedSheet.rawHeaders
                      .map((h) => {
                        const v = (rawRow as Record<string, unknown>)[h];
                        return v === undefined || v === null || v === '' ? '-' : String(v);
                      })
                      .join(' | ');
                    const canonicalStr = Object.entries(r.record)
                      .map(([k, v]) => `${k}: ${v === null || v === undefined ? '-' : String(v)}`)
                      .join(' | ');
                    return (
                      <tr
                        key={r.rowIndex}
                        style={{
                          borderTop: '1px solid var(--color-fog, #E5E7EB)',
                          borderLeft: r.valid ? 'none' : '3px solid #FCA5A5',
                        }}
                      >
                        <td
                          style={{
                            padding: '8px 12px',
                            fontFamily: 'monospace',
                            color: 'var(--color-silver, #6B7280)',
                          }}
                        >
                          {r.rowIndex + 1}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                            color: 'var(--color-ink, #111827)',
                          }}
                          title={rawStr}
                        >
                          {rawStr}
                        </td>
                        <td
                          style={{
                            padding: '8px 12px',
                            maxWidth: 280,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap' as const,
                            color: 'var(--color-ink, #111827)',
                          }}
                          title={canonicalStr}
                        >
                          {canonicalStr}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          {r.valid ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#0A7E4A',
                              }}
                            >
                              <CheckCircle style={{ width: 12, height: 12 }} /> Valid
                            </span>
                          ) : (
                            <button
                              type="button"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 11,
                                fontWeight: 600,
                                color: '#D32F2F',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                onCopyText(
                                  r.issues
                                    .map((i) => `Row ${i.rowIndex + 1} ${i.field}: ${i.message}`)
                                    .join('\n')
                                )
                              }
                            >
                              <XCircle style={{ width: 12, height: 12 }} /> issues
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {errorRows.length > 10 && (
            <div
              style={{
                fontSize: 11,
                marginTop: 6,
                color: 'var(--color-silver, #6B7280)',
              }}
            >
              {errorRows.length - previewRows.filter((r) => !r.valid).length} more row(s) with
              issues not shown.
            </div>
          )}
        </section>

        {/* Issues list */}
        {(errorIssues.length > 0 || warningIssues.length > 0) && (
          <section>
            <h4
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-ink, #111827)',
                marginBottom: 8,
              }}
            >
              Validation issues
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {errorIssues.length > 0 && (
                <IssueGroup
                  title={`Errors (${errorIssues.length})`}
                  tone="red"
                  issues={errorIssues}
                  onCopyText={onCopyText}
                />
              )}
              {warningIssues.length > 0 && (
                <IssueGroup
                  title={`Warnings (${warningIssues.length})`}
                  tone="amber"
                  issues={warningIssues}
                  onCopyText={onCopyText}
                />
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Issue group                                                         */
/* ------------------------------------------------------------------ */

function IssueGroup({
  title,
  tone,
  issues,
  onCopyText,
}: {
  title: string;
  tone: 'red' | 'amber';
  issues: ValidationIssue[];
  onCopyText: (text: string) => void;
}) {
  const styles = toneStyles(tone);
  return (
    <div
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
        border: `1px solid ${styles.border}`,
      }}
    >
      <div
        style={{
          padding: '8px 14px',
          fontSize: 12,
          fontWeight: 700,
          backgroundColor: styles.bg,
          color: styles.fg,
        }}
      >
        {title}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {issues.slice(0, 40).map((issue, i) => {
          const text = `Row ${issue.rowIndex + 1} [${issue.field}]: ${issue.message}`;
          return (
            <li
              key={i}
              style={{
                padding: '8px 14px',
                fontSize: 12,
                color: 'var(--color-ink, #111827)',
                borderTop: i > 0 ? '1px solid var(--color-fog, #E5E7EB)' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {tone === 'red' ? (
                <XCircle
                  style={{
                    width: 14,
                    height: 14,
                    marginTop: 1,
                    flexShrink: 0,
                    color: '#D32F2F',
                  }}
                />
              ) : (
                <AlertCircle
                  style={{
                    width: 14,
                    height: 14,
                    marginTop: 1,
                    flexShrink: 0,
                    color: '#A15C07',
                  }}
                />
              )}
              <span style={{ flex: 1 }}>{text}</span>
              <button
                type="button"
                onClick={() => onCopyText(text)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.04em',
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--color-fog, #E5E7EB)',
                  color: 'var(--color-silver, #6B7280)',
                  backgroundColor: '#FFFFFF',
                  cursor: 'pointer',
                }}
              >
                <Copy style={{ width: 10, height: 10 }} />
                copy
              </button>
            </li>
          );
        })}
        {issues.length > 40 && (
          <li
            style={{
              padding: '8px 14px',
              fontSize: 12,
              color: 'var(--color-silver, #6B7280)',
              borderTop: '1px solid var(--color-fog, #E5E7EB)',
            }}
          >
            {issues.length - 40} more not shown.
          </li>
        )}
      </ul>
    </div>
  );
}
