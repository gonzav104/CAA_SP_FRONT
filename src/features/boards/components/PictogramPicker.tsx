import { cn } from '@/lib/utils'
import { mockPictograms } from '../data/mockPictograms'
import { getPickerOptions } from '../pictograms'
import type { Pictogram } from '../types'

interface PictogramPickerProps {
  selected: Pictogram | null
  /** Real pictograms already on the board; offered first. */
  boardPictograms: Pictogram[]
  onChange: (pictogram: Pictogram) => void
  labelledBy: string
}

/**
 * Real pictograms already on the board first, then the temporary local library (ARASAAC set).
 * Local entries have no backend id: they are registered through the save, which the tile title explains.
 */
export function PictogramPicker({ selected, boardPictograms, onChange, labelledBy }: PictogramPickerProps) {
  const options = getPickerOptions(boardPictograms, mockPictograms)
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
            title={
              pictogram.kind === 'LOCAL_MOCK'
                ? `${pictogram.label} (biblioteca ARASAAC: se registra al guardar)`
                : pictogram.label
            }
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
