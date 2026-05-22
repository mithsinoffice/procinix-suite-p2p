// Invoice file storage — Azure Blob in prod, local disk for dev/demo, with
// transparent fallback when Azure isn't configured.
//
// Selection rule:
//   • AZURE_STORAGE_CONNECTION_STRING set → upload to Azure Blob container
//     `invoices` (override via AZURE_STORAGE_INVOICES_CONTAINER). fileUrl
//     stores the absolute blob URL (https://…/invoices/…/<file>).
//   • Otherwise → write to local disk under uploads/invoices/<tenantId>/.
//     fileUrl stores the *relative* path so existing GET /:id/file serves it.
//
// `Invoice.fileUrl` thus carries either an absolute https URL (Azure) OR a
// relative path (local). `readInvoiceFile()` branches on the prefix.
//
// Back-compat: invoices ingested via the email poller before disk storage
// existed stash bytes in `ocrRawData.attachmentData`. `readInvoiceFile()`
// transparently falls back to that source so old rows still preview.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { BlobServiceClient } from '@azure/storage-blob'

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

// Lazy-init the Azure client so it doesn't try to connect when no env var is
// set (dev/demo); reused across saves to keep the connection alive.
let azureClient: BlobServiceClient | null = null
function getAzureClient(): BlobServiceClient | null {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING
  if (!conn) return null
  if (!azureClient) azureClient = BlobServiceClient.fromConnectionString(conn)
  return azureClient
}

const AZURE_CONTAINER = process.env.AZURE_STORAGE_INVOICES_CONTAINER ?? 'invoices'

export async function saveInvoiceFile(
  tenantId:   string,
  invoiceId:  string,
  base64Data: string,
  mimeType:   string,
  fileName:   string,
): Promise<SavedFile> {
  const ext     = EXT_BY_MIME[mimeType] ?? 'bin'
  const objPath = path.posix.join('invoices', tenantId, `${invoiceId}.${ext}`)
  const bytes   = Buffer.from(base64Data, 'base64')

  // Azure path — used when AZURE_STORAGE_CONNECTION_STRING is set. Falls
  // through to local disk on any Azure error so dev/demo doesn't break if
  // the blob service is briefly unavailable.
  const azure = getAzureClient()
  if (azure) {
    try {
      const container = azure.getContainerClient(AZURE_CONTAINER)
      await container.createIfNotExists()
      const blob = container.getBlockBlobClient(objPath)
      await blob.uploadData(bytes, { blobHTTPHeaders: { blobContentType: mimeType } })
      return { fileUrl: blob.url, fileName, mimeType }
    } catch (e) {
      console.warn('[invoice-file-storage] Azure upload failed, falling back to local:', e instanceof Error ? e.message : e)
      // fall through
    }
  }

  // Local disk — historical path. Returns a *relative* fileUrl that
  // GET /api/invoices/:id/file resolves against UPLOADS_ROOT.
  const absPath = path.join(UPLOADS_ROOT, objPath)
  await fs.mkdir(path.dirname(absPath), { recursive: true })
  await fs.writeFile(absPath, bytes)
  return { fileUrl: objPath, fileName, mimeType }
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

// Reads bytes — branches on whether fileUrl is an absolute Azure URL or a
// relative local path. Falls back to ocrRawData.attachmentData for legacy
// rows that pre-date disk storage.
export async function readInvoiceFile(inv: InvoiceFileSource): Promise<InvoiceFileBytes | null> {
  if (inv.fileUrl) {
    // Azure path — fileUrl starts with https://...blob.core.windows.net/...
    if (inv.fileUrl.startsWith('http://') || inv.fileUrl.startsWith('https://')) {
      const azure = getAzureClient()
      if (!azure) return null   // URL persisted from prod, dev can't read it
      try {
        // Reconstruct container + blob path from the stored URL. Same client
        // we wrote with, so service-side auth applies.
        const url = new URL(inv.fileUrl)
        // URL.pathname is "/<container>/<blob>"; split off the container.
        const [, container, ...rest] = url.pathname.split('/')
        const blobPath = rest.join('/')
        const blob = azure.getContainerClient(container).getBlockBlobClient(blobPath)
        const dl = await blob.downloadToBuffer()
        return {
          buffer:   dl,
          mimeType: inv.mimeType ?? 'application/octet-stream',
          fileName: inv.fileName ?? path.basename(blobPath),
        }
      } catch {
        return null
      }
    }

    // Local path — historical default.
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
