import { ArrowDown, ArrowUp, EyeOff, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MAX_BOARD_ITEMS } from '../boardReducer'
import type { BoardItem } from '../types'

interface BoardItemListProps {
  items: BoardItem[]
  selectedId: string | null
  onSelect: (itemId: string) => void
  onMove: (itemId: string, direction: -1 | 1) => void
  onAdd: () => void
  /** False while the backend has no POST endpoint for items. */
  canAdd: boolean
}

const CATEGORY_BOUNDARY_TITLE = 'No se puede mover entre categorías'

/** Board structure: every card (including hidden ones) in its configured order. */
export function BoardItemList({ items, selectedId, onSelect, onMove, onAdd, canAdd }: BoardItemListProps) {
  const isFull = canAdd && items.length >= MAX_BOARD_ITEMS
  // Server boards may already exceed the limit that applies to adding cards.
  const counterText = items.length <= MAX_BOARD_ITEMS ? `${items.length} de ${MAX_BOARD_ITEMS}` : `${items.length} tarjetas`

  return (
    <section aria-labelledby="board-items-title" className="flex flex-col rounded-xl border bg-background">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 id="board-items-title" className="font-semibold">Tarjetas</h2>
        <span className="text-sm text-muted-foreground">
          {counterText}
        </span>
      </header>

      <ol className="flex flex-col gap-1 p-2">
        {items.map((item, index) => {
          const isSelected = item.id === selectedId
          // The backend cannot move an item to another category.
          const blocksBefore = index > 0 && items[index - 1].categoryId !== item.categoryId
          const blocksAfter = index < items.length - 1 && items[index + 1].categoryId !== item.categoryId
          return (
            <li
              key={item.id}
              data-testid="board-item"
              className={cn(
                'flex items-center gap-1 rounded-lg pr-1',
                isSelected ? 'bg-muted ring-2 ring-primary/70' : 'hover:bg-muted/60',
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={isSelected || undefined}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-2 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="w-5 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {item.visualOrder}
                </span>
                <img
                  src={item.pictogram?.imageUrl}
                  alt=""
                  className={cn('size-10 shrink-0 rounded-md border bg-white object-contain p-0.5', !item.isActive && 'opacity-40')}
                />
                <span className={cn('min-w-0 flex-1', !item.isActive && 'text-muted-foreground')}>
                  <span className="block truncate font-medium uppercase">{item.label || 'Sin texto'}</span>
                  <span className="block truncate text-xs text-muted-foreground">{item.spokenText}</span>
                </span>
                {!item.isActive && (
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    <EyeOff aria-hidden="true" className="size-3.5" />
                    Oculta
                  </span>
                )}
              </button>

              <Button
                variant="ghost"
                size="icon-lg"
                disabled={index === 0 || blocksBefore}
                title={blocksBefore ? CATEGORY_BOUNDARY_TITLE : undefined}
                onClick={() => onMove(item.id, -1)}
                aria-label={`Mover ${item.label} antes`}
              >
                <ArrowUp aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                disabled={index === items.length - 1 || blocksAfter}
                title={blocksAfter ? CATEGORY_BOUNDARY_TITLE : undefined}
                onClick={() => onMove(item.id, 1)}
                aria-label={`Mover ${item.label} después`}
              >
                <ArrowDown aria-hidden="true" />
              </Button>
            </li>
          )
        })}
      </ol>

      <footer className="mt-auto border-t p-3">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          disabled={!canAdd || isFull}
          title={canAdd ? undefined : 'Próximamente'}
          onClick={onAdd}
        >
          <Plus aria-hidden="true" />
          Agregar tarjeta
        </Button>
        {isFull && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Se alcanzó el máximo de {MAX_BOARD_ITEMS} tarjetas.
          </p>
        )}
      </footer>
    </section>
  )
}
