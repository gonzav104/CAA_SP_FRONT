import { cn } from '@/lib/utils'
import { mockPictograms } from '../data/mockPictograms'
import { getPickerOptions } from '../pictograms'
import type { Pictogram } from '../types'

export type PictogramLibraryStatus = 'pending' | 'error' | 'success'

interface PictogramPickerProps {
  selected: Pictogram | null
  /** Real pictograms already on the board; offered first. */
  boardPictograms: Pictogram[]
  /** State of the global library request. */
  libraryStatus: PictogramLibraryStatus
  /** Global library (real pictograms with backend ids); empty until `libraryStatus` is `success`. */
  globalLibrary: Pictogram[]
  onChange: (pictogram: Pictogram) => void
  labelledBy: string
}

/**
 * Real pictograms first (board, then the global library), then the local ARASAAC complement for
 * what the backend does not have yet. Local entries have no backend id: they are registered through
 * the save, which the tile title explains. While the library loads no tile is shown, so a local
 * entry is never chosen when a real one exists.
 */
export function PictogramPicker({
  selected,
  boardPictograms,
  libraryStatus,
  globalLibrary,
  onChange,
  labelledBy,
}: PictogramPickerProps) {
  if (libraryStatus === 'pending') {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Cargando pictogramas…
      </p>
    )
  }

  const options = getPickerOptions(boardPictograms, libraryStatus === 'success' ? globalLibrary : [], mockPictograms)
  const selectedId = selected?.id

  return (
    <>
      {libraryStatus === 'error' && (
        <p role="status" className="text-xs text-muted-foreground">
          No se pudo cargar la biblioteca de pictogramas. Se muestran solo los disponibles en este equipo.
        </p>
      )}
      <div className="max-h-[22rem] overflow-y-auto pr-1">
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
      </div>
    </>
  )
}
