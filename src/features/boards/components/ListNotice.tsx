import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** One message above the cartilla list. `retry` adds a "Reintentar" button (reloads the list). */
export interface Notice {
  tone: 'success' | 'info' | 'error'
  message: string
  retry?: boolean
}

const TONE_CLASSES: Record<Notice['tone'], string> = {
  success: 'border-green-300 bg-green-50 text-green-900',
  info: 'border-amber-300 bg-amber-50 text-amber-900',
  error: 'border-red-300 bg-red-50 text-red-900',
}

interface ListNoticeProps {
  notice: Notice
  onRetry: () => void
}

export function ListNotice({ notice, onRetry }: ListNoticeProps) {
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm',
        TONE_CLASSES[notice.tone],
      )}
    >
      <p>{notice.message}</p>
      {notice.retry && (
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
