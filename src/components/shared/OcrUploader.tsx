import { useRef, useState } from 'react'
import { Upload, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { http } from '../../lib/http'
import { cn } from '../../lib/utils'

interface OcrResult {
  jobId:     string
  invoiceId: string
  lane:      string
  score:     number
}

interface Props {
  onIngested: (result: OcrResult) => void
  onExtracted?: (data: Record<string, unknown>) => void
}

type UploadState = 'idle' | 'uploading' | 'done' | 'error'

export function OcrUploader({ onIngested, onExtracted: _onExtracted }: Props) {
  const inputRef               = useRef<HTMLInputElement>(null)
  const [state, setState]      = useState<UploadState>('idle')
  const [fileName, setFileName] = useState<string>('')
  const [error, setError]       = useState<string>('')
  const [score, setScore]       = useState<number | null>(null)
  const [lane, setLane]         = useState<string>('')

  async function handleFile(file: File) {
    if (!file) return
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Only PDF, JPG, PNG, or WebP files are supported')
      setState('error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File must be under 10MB')
      setState('error')
      return
    }

    setFileName(file.name)
    setState('uploading')
    setError('')

    try {
      // Convert to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload  = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const result = await http.post<OcrResult>('/api/invoices/ingest', {
        base64Data:  base64,
        mimeType:    file.type,
        fileName:    file.name,
        channelType: 'MANUAL_UPLOAD',
      })

      setScore(result.score)
      setLane(result.lane)
      setState('done')
      onIngested(result)
    } catch (e: any) {
      setError(e?.error?.message ?? 'Upload failed — please try again')
      setState('error')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const laneColor: Record<string, string> = {
    STP:    'text-green-600',
    REVIEW: 'text-amber-600',
    MANUAL: 'text-red-600',
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => state === 'idle' || state === 'error' ? inputRef.current?.click() : null}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
          state === 'idle'      && 'cursor-pointer border-border hover:border-primary/50 hover:bg-muted/30',
          state === 'uploading' && 'border-primary/30 bg-primary/5',
          state === 'done'      && 'border-green-300 bg-green-50',
          state === 'error'     && 'cursor-pointer border-red-300 bg-red-50',
        )}
      >
        <input
          ref={inputRef} type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />

        {state === 'idle' && (
          <>
            <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm font-medium">Drop invoice PDF or image here</p>
            <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, WebP · max 10MB · OCR powered by Gemini</p>
          </>
        )}

        {state === 'uploading' && (
          <>
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
            <p className="text-sm font-medium">Reading invoice…</p>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
          </>
        )}

        {state === 'done' && (
          <>
            <CheckCircle className="h-8 w-8 text-green-600 mb-2" />
            <p className="text-sm font-medium text-green-700">Invoice processed</p>
            <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
            {score !== null && (
              <p className={cn('text-xs font-medium mt-1', laneColor[lane] ?? 'text-muted-foreground')}>
                Match score {score}/100 · {lane} lane
              </p>
            )}
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-red-700">Upload failed</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">Click to try again</p>
          </>
        )}
      </div>

      {state === 'idle' && (
        <div className="flex items-center gap-2">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or fill in manually below</span>
          <div className="flex-1 border-t border-border" />
        </div>
      )}
    </div>
  )
}
