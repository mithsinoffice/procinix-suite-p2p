import { Mail, Upload, Globe, Folder, Code } from 'lucide-react'
import { cn } from '../../lib/utils'

const CHANNEL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  EMAIL:         { icon: Mail,   label: 'Email',         color: 'bg-blue-50 text-blue-700 border-blue-200'   },
  MANUAL_UPLOAD: { icon: Upload, label: 'Manual upload', color: 'bg-gray-50 text-gray-600 border-gray-200'   },
  VENDOR_PORTAL: { icon: Globe,  label: 'Vendor portal', color: 'bg-teal-50 text-teal-700 border-teal-200'   },
  FOLDER_WATCH:  { icon: Folder, label: 'Folder watch',  color: 'bg-purple-50 text-purple-700 border-purple-200' },
  API:           { icon: Code,   label: 'API',           color: 'bg-orange-50 text-orange-700 border-orange-200' },
}

interface Props { channelType: string; ocrConfidence?: number; isEInvoice?: boolean }

export function ChannelBadge({ channelType, ocrConfidence, isEInvoice }: Props) {
  const config = CHANNEL_CONFIG[channelType] ?? CHANNEL_CONFIG.MANUAL_UPLOAD
  const Icon   = config.icon

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', config.color)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </span>

      {ocrConfidence !== undefined && (
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
          ocrConfidence >= 95 ? 'bg-green-50 text-green-700 border-green-200' :
          ocrConfidence >= 80 ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                'bg-red-50 text-red-700 border-red-200'
        )}>
          OCR {ocrConfidence}%
        </span>
      )}

      {isEInvoice && (
        <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
          e-Invoice ✓
        </span>
      )}
    </div>
  )
}
