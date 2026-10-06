import { cn } from '@/lib/utils'
import { mockPictograms } from '../data/mockPictograms'
import type { Pictogram } from '../types'

interface PictogramPickerProps {
  selected: Pictogram | null
  onChange: (pictogram: Pictogram) => void
  labelledBy: string
}

/**
 * Temporary local library (ARASAAC set). The item's current pictogram is always offered first
 * when it is not part of the library, so a real pictogram stays visible and selected.
 */
export function PictogramPicker({ selected, onChange, labelledBy }: PictogramPickerProps) {
  const options =
    selected && !mockPictograms.some((pictogram) => pictogram.id === selected.id)
      ? [selected, ...mockPictograms]
      : mockPictograms
  const selectedId = selected?.id

  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-4">
      {options.map((pictogram) => {
        const isSelected = pictogram.id === selectedId
        return (
          <button
            key={pictogram.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={pictogram.label}
            title={pictogram.label}
            onClick={() => onChange(pictogram)}
            className={cn(
              'aspect-square rounded-lg border bg-white p-1 outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
              isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-foreground/30',
            )}
          >
            <img src={pictogram.imageUrl} alt="" className="size-full object-contain" />
          </button>
        )
      })}
    </div>
  )
}
