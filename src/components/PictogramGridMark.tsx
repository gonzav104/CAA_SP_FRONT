import { cn } from '@/lib/utils'

interface PictogramGridMarkProps {
  /** `mark`: small, crisp, next to the wordmark. `field`: large, faint, decorative hero texture. */
  variant?: 'mark' | 'field'
  className?: string
}

/**
 * Abstract motif of rounded tiles — an echo of the pictogram cards CAA_SP is built on, not a
 * generic shape. Purely decorative: always `aria-hidden`, never carries information.
 */
export function PictogramGridMark({ variant = 'mark', className }: PictogramGridMarkProps) {
  if (variant === 'field') {
    return (
      <div
        aria-hidden="true"
        className={cn('grid grid-cols-4 gap-3 opacity-[0.07]', className)}
      >
        {FIELD_PATTERN.map((filled, index) => (
          <span
            key={index}
            className={cn('aspect-square rounded-xl', filled ? 'bg-caa-accent' : 'bg-transparent')}
          />
        ))}
      </div>
    )
  }

  return (
    <div aria-hidden="true" className={cn('grid grid-cols-2 gap-1', className)}>
      {MARK_PATTERN.map((filled, index) => (
        <span key={index} className={cn('size-2 rounded-[3px]', filled ? 'bg-caa-accent' : 'bg-caa-accent/30')} />
      ))}
    </div>
  )
}

// 1 = filled tile. Deliberately asymmetric — a board mid-use, not a checkerboard.
const MARK_PATTERN = [1, 0, 1, 1]
const FIELD_PATTERN = [
  1, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0,
]
