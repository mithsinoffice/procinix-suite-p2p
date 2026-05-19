// Invoice file storage — disk-backed with JSON-blob fallback.
//
// Storage layout (relative to repo root):
//   uploads/invoices/<tenantId>/<invoiceId>.<ext>
//
// `Invoice.fileUrl` holds the relative path from `uploads/`
// (e.g. "invoices/<tenantId>/<invoiceId>.pdf") — never an absolute path,
// so a future swap to object storage only needs to change this resolver.
//
// Back-compat: invoices ingested via the email poller before disk storage
// existed stash bytes in `ocrRawData.attachmentData`. `readInvoiceFile()`
// transparently falls back to that source so old rows still preview.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Anchor to the source file, not process.cwd(). The dev script runs the server
// from server/ (via `cd server && tsx ...`), so cwd-based resolution would land
// uploads under server/uploads/ — which the repo-root .gitignore can't match.
// This file lives at server/src/services/, so three "../" hops lands at repo root.
const __filename   = fileURLToPath(import.meta.url)
const __dirname    = path.dirname(__filename)
const UPLOADS_ROOT = path.resolve(__dirname, '..', '..', '..', 'uploads')

const EXT_BY_MIME: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg':      'jpg',
  'image/png':       'png',
  'image/webp':      'webp',
}

export interface SavedFile {
  fileUrl:  string   // relative to uploads/, persisted on Invoice.fileUrl
  fileName: string
  mimeType: string
}

export async function saveInvoiceFile(
  tenantId:   string,
  invoiceId:  string,
  base64Data: string,
  mimeType:   string,
  fileName:   string,
): Promise<SavedFile> {
  const ext = EXT_BY_MIME[mimeType] ?? 'bin'
  const relPath = path.posix.join('invoices', tenantId, `${invoiceId}.${ext}`)
  const absPath = path.join(UPLOADS_ROOT, relPath)

  await fs.mkdir(path.dirname(absPath), { recursive: true })
  await fs.writeFile(absPath, Buffer.from(base64Data, 'base64'))

  return { fileUrl: relPath, fileName, mimeType }
}

export interface InvoiceFileSource {
  fileUrl?:    string | null
  fileName?:   string | null
  mimeType?:   string | null
  ocrRawData?: unknown
}

export interface InvoiceFileBytes {
  buffer:   Buffer
  mimeType: string
  fileName: string
}

// Reads bytes from disk (preferred) or from ocrRawData.attachmentData
// (back-compat). Returns null when neither source has the file.
export async function readInvoiceFile(inv: InvoiceFileSource): Promise<InvoiceFileBytes | null> {
  if (inv.fileUrl) {
    const absPath = path.join(UPLOADS_ROOT, inv.fileUrl)
    // Refuse path traversal — fileUrl should never escape UPLOADS_ROOT.
    if (!absPath.startsWith(UPLOADS_ROOT)) return null
    try {
      const buffer = await fs.readFile(absPath)
      return {
        buffer,
        mimeType: inv.mimeType ?? 'application/octet-stream',
        fileName: inv.fileName ?? path.basename(absPath),
      }
    } catch {
      return null
    }
  }

  const ocr = inv.ocrRawData as { attachmentData?: string; attachmentMime?: string } | null
  if (ocr?.attachmentData) {
    return {
      buffer:   Buffer.from(ocr.attachmentData, 'base64'),
      mimeType: ocr.attachmentMime ?? inv.mimeType ?? 'application/pdf',
      fileName: inv.fileName ?? 'invoice.pdf',
    }
  }

  return null
}

// Cheap check — whether the invoice has any file bytes attached.
// Used by the detail endpoint to set `hasFile` without loading the bytes.
export function hasInvoiceFile(inv: InvoiceFileSource): boolean {
  if (inv.fileUrl) return true
  const ocr = inv.ocrRawData as { attachmentData?: string } | null
  return !!ocr?.attachmentData
}
