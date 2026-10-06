import { CommunicationGrid } from '@/features/communication/components/CommunicationGrid'
import type { CommunicationItem } from '@/features/communication/types'

interface BoardPreviewProps {
  patientName: string
  items: CommunicationItem[]
  hiddenCount: number
  onSelect: (itemId: string) => void
}

/**
 * Live preview of Use Mode in a landscape tablet frame. It renders the real
 * CommunicationGrid, so the editor and Use Mode share a single visual representation.
 */
export function BoardPreview({ patientName, items, hiddenCount, onSelect }: BoardPreviewProps) {
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
        {items.length > 0 ? (
          <CommunicationGrid items={items} speakingId={null} onSelect={(item) => onSelect(item.id)} />
        ) : (
          <p className="flex size-full items-center justify-center text-center text-caa-muted">
            No hay tarjetas visibles en el Modo Uso.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Tocar una tarjeta de la vista previa la selecciona para editarla.
      </p>
    </section>
  )
}
