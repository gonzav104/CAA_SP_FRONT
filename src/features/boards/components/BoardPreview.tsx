import { useState } from 'react'
import { CategoryNav } from '@/features/communication/components/CategoryNav'
import { CommunicationGrid } from '@/features/communication/components/CommunicationGrid'
import type { CommunicationCategory } from '@/features/communication/types'

interface BoardPreviewProps {
  patientName: string
  categories: CommunicationCategory[]
  hiddenCount: number
  onSelect: (itemId: string) => void
}

/**
 * Live preview of Use Mode in a landscape tablet frame. It renders the real CategoryNav and
 * CommunicationGrid, so the editor and Use Mode share a single visual representation — including
 * category navigation. The active category is local to the preview only: it never drives editor
 * selection, and a card tap keeps selecting the card for editing, never speaking it.
 */
export function BoardPreview({ patientName, categories, hiddenCount, onSelect }: BoardPreviewProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(() => categories[0]?.id ?? null)
  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0]

  return (
    <section aria-labelledby="board-preview-title" className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-4">
        <h2 id="board-preview-title" className="font-semibold">Vista previa</h2>
        <span className="text-sm text-muted-foreground">
          Así lo ve {patientName} en la tablet
          {hiddenCount > 0 && ` · ${hiddenCount} ${hiddenCount === 1 ? 'oculta' : 'ocultas'}`}
        </span>
      </header>

      <div
        data-testid="board-preview"
        className="aspect-[4/3] w-full rounded-[1.5rem] border-[10px] border-neutral-800 bg-caa-surface p-[3%] font-caa text-caa-ink shadow-sm"
      >
        {categories.length > 0 ? (
          <div className="flex size-full gap-[clamp(0.4rem,2cqw,1rem)] landscape:flex-row flex-col">
            <CategoryNav categories={categories} activeCategoryId={activeCategory?.id ?? null} onSelect={setActiveCategoryId} />
            <div className="min-h-0 min-w-0 flex-1">
              {activeCategory && (
                <CommunicationGrid items={activeCategory.items} speakingId={null} onSelect={(item) => onSelect(item.id)} />
              )}
            </div>
          </div>
        ) : (
          <p className="flex size-full items-center justify-center text-center text-caa-muted">
            No hay tarjetas visibles en el Modo Uso.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tocar una tarjeta de la vista previa la selecciona para editarla. Tocar una categoría solo cambia lo que se ve en la vista previa.
      </p>
    </section>
  )
}
