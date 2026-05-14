import { useRef, useState } from 'react'
import { X, Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { http } from '../../lib/http'

interface Props {
  open:       boolean
  onClose:    () => void
  onSuccess:  (result: { created: number; failed: number }) => void
  masterName: string
  apiPath:    string
  csvHeaders: string[]
  csvExample: Record<string, string>
}

type UploadState = 'idle' | 'preview' | 'uploading' | 'done' | 'error'

export function BulkUploadModal({ open, onClose, onSuccess, masterName, apiPath, csvHeaders, csvExample }: Props) {
  const fileRef               = useRef<HTMLInputElement>(null)
  const [state, setState]      = useState<UploadState>('idle')
  const [rows, setRows]         = useState<Record<string, unknown>[]>([])
  const [errors, setErrors]     = useState<{ row: number; reason: string }[]>([])
  const [result, setResult]     = useState<{ created: number; failed: number } | null>(null)
  const [submitApproval, setSubmitApproval] = useState(false)

  function downloadTemplate() {
    const csv  = [csvHeaders.join(','), Object.values(csvExample).join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `${masterName.toLowerCase().replace(/\s/g, '_')}_template.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const parsed = res.data as Record<string, unknown>[]
        setRows(parsed)
        setState('preview')
      },
      error: () => setState('error'),
    })
  }

  async function handleUpload() {
    setState('uploading')
    try {
      const res = await http.post<{ created: number; failed: { row: number; reason: string }[] }>(
        `${apiPath}/bulk`,
        { rows, submitForApproval: submitApproval }
      )
      setErrors(res.failed)
      setResult({ created: res.created, failed: res.failed.length })
      setState('done')
      if (res.created > 0) onSuccess({ created: res.created, failed: res.failed.length })
    } catch {
      setState('error')
    }
  }

  function reset() { setState('idle'); setRows([]); setErrors([]); setResult(null) }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-background shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="text-sm font-semibold">Bulk upload — {masterName}</p>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Step 1: Download template */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Step 1 — Download template</p>
              <p className="text-xs text-muted-foreground mt-0.5">Fill in the CSV and upload below</p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </button>
          </div>

          {/* Step 2: Upload */}
          {state === 'idle' && (
            <div
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 hover:bg-muted/30"
            >
              <input ref={fileRef} type="file" accept=".csv" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Step 2 — Upload your filled CSV</p>
              <p className="text-xs text-muted-foreground mt-1">Click to browse or drag and drop</p>
            </div>
          )}

          {/* Preview */}
          {state === 'preview' && rows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{rows.length} rows parsed — preview</p>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">Reset</button>
              </div>
              <div className="max-h-52 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                      {csvHeaders.map(h => <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        {csvHeaders.map(h => <td key={h} className="px-3 py-2 max-w-xs truncate">{String(row[h] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 10 && (
                  <p className="text-center py-2 text-xs text-muted-foreground">+ {rows.length - 10} more rows</p>
                )}
              </div>

              {/* Submit for approval toggle */}
              <div className="flex items-center gap-2">
                <input type="checkbox" id="submitApproval" checked={submitApproval}
                  onChange={e => setSubmitApproval(e.target.checked)}
                  className="h-4 w-4 rounded border-input accent-primary" />
                <label htmlFor="submitApproval" className="text-sm text-muted-foreground">
                  Submit all for approval (unchecked = save as draft)
                </label>
              </div>
            </div>
          )}

          {/* Done */}
          {state === 'done' && result && (
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-4 w-4" />
                <p className="text-sm font-medium">{result.created} records created successfully</p>
              </div>
              {errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-red-600">{errors.length} rows failed:</p>
                  {errors.slice(0, 5).map(e => (
                    <p key={e.row} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">Upload failed. Check your CSV format and try again.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={state === 'done' ? onClose : reset} className="rounded-md border border-input px-3 py-1.5 text-sm hover:bg-muted">
            {state === 'done' ? 'Close' : 'Cancel'}
          </button>
          {state === 'preview' && (
            <button
              onClick={handleUpload}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              Upload {rows.length} rows
            </button>
          )}
          {state === 'uploading' && (
            <button disabled className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground opacity-60">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
