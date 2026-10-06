import { ArrowDown, ArrowUp, EyeOff, FolderPlus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MAX_BOARD_ITEMS } from '../boardReducer'
import type { CategoryEditor, CategoryEditorError } from '../categoryEditor'
import type { BoardCategory, BoardItem } from '../types'
import { CategoryHeader } from './CategoryHeader'
import { CategoryNameForm } from './CategoryNameForm'

interface BoardItemListProps {
  items: BoardItem[]
  selectedId: string | null
  onSelect: (itemId: string) => void
  onMove: (itemId: string, direction: -1 | 1) => void
  onAdd: () => void
  /** False while an operation is pending, the new-card form is open, there are no categories or the limit is reached. */
  canAdd: boolean
  /** Every category in display order, including the empty ones. */
  categories: BoardCategory[]
  /** Cards of the SERVER snapshot: the consequences of deleting a category are counted on them. */
  baselineItems: BoardItem[]
  /** Cards with unsaved local changes. */
  changedItemIds: ReadonlySet<string>
  /** Category of the selected card, or of the new-card form while it is open. */
  highlightedCategoryId: string | null
  /** The one open inline category editor, if any. */
  editor: CategoryEditor | null
  editorError: CategoryEditorError | null
  /** Operation of the category editor/action that is pending, if any. */
  pending: 'create' | 'rename' | 'move' | 'delete' | null
  onAddInCategory: (categoryId: string) => void
  onMoveCategory: (categoryId: string, direction: -1 | 1) => void
  /** Opens an editor, replacing the open one. */
  onOpenEditor: (editor: CategoryEditor) => void
  onChangeEditorName: (name: string) => void
  onCloseEditor: () => void
  /** Submits the open editor (create, rename or confirmed delete). */
  onSubmitEditor: () => void
}

const CATEGORY_BOUNDARY_TITLE = 'No se puede mover entre categorías'

/** Board structure: every card (including hidden ones) in its configured order, grouped by category. */
export function BoardItemList({
  items,
  selectedId,
  onSelect,
  onMove,
  onAdd,
  canAdd,
  categories,
  baselineItems,
  changedItemIds,
  highlightedCategoryId,
  editor,
  editorError,
  pending,
  onAddInCategory,
  onMoveCategory,
  onOpenEditor,
  onChangeEditorName,
  onCloseEditor,
  onSubmitEditor,
}: BoardItemListProps) {
  const hasCategories = categories.length > 0
  const isFull = hasCategories && items.length >= MAX_BOARD_ITEMS
  const isIdle = pending === null
  const canAddCard = canAdd && !isFull
  // Server boards may already exceed the limit that applies to adding cards.
  const counterText = items.length <= MAX_BOARD_ITEMS ? `${items.length} de ${MAX_BOARD_ITEMS}` : `${items.length} tarjetas`

  // Cards of an unknown category (never expected) stay visible after the groups.
  const knownIds = new Set(categories.map((category) => category.id))
  const orphans = items.filter((item) => item.categoryId === null || !knownIds.has(item.categoryId))

  const renderItem = (item: BoardItem) => {
    const index = items.indexOf(item)
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
  }

  const renderCategory = (category: BoardCategory, cards: BoardItem[], position: number) => {
    const serverCards = baselineItems.filter((item) => item.categoryId === category.id)
    const mode = editor && editor.kind !== 'create' && editor.categoryId === category.id ? editor.kind : 'view'
    return (
      <div key={category.id} className="flex flex-col gap-1">
        <CategoryHeader
          category={category}
          position={position}
          total={categories.length}
          cardCount={cards.length}
          hiddenCount={cards.filter((item) => !item.isActive).length}
          isHighlighted={category.id === highlightedCategoryId}
          canAddCard={canAddCard}
          isEnabled={isIdle}
          mode={mode}
          renameValue={editor?.kind === 'rename' && editor.categoryId === category.id ? editor.name : category.name}
          deleteConsequence={{
            cards: serverCards.length,
            hidden: serverCards.filter((item) => !item.isActive).length,
            hasUnsavedChanges: items.some((item) => item.categoryId === category.id && changedItemIds.has(item.id)),
          }}
          isPending={pending === mode}
          error={editorError?.categoryId === category.id ? editorError.message : null}
          onAddCard={() => onAddInCategory(category.id)}
          onStartRename={() => onOpenEditor({ kind: 'rename', categoryId: category.id, name: category.name })}
          onRenameChange={onChangeEditorName}
          onMove={(direction) => onMoveCategory(category.id, direction)}
          onStartDelete={() => onOpenEditor({ kind: 'delete', categoryId: category.id })}
          onSubmit={onSubmitEditor}
          onCancel={onCloseEditor}
        />
        {cards.length === 0 ? (
          <p className="px-2 py-1 pl-10 text-sm text-muted-foreground">Sin tarjetas</p>
        ) : (
          <ol className="flex flex-col gap-1">{cards.map(renderItem)}</ol>
        )}
      </div>
    )
  }

  return (
    <section aria-labelledby="board-items-title" className="flex flex-col rounded-xl border bg-background">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 id="board-items-title" className="font-semibold">Tarjetas</h2>
        <span className="text-sm text-muted-foreground">
          {counterText}
        </span>
      </header>

      <div className="flex flex-col gap-3 p-2">
        {categories.map((category, index) =>
          renderCategory(category, items.filter((item) => item.categoryId === category.id), index + 1),
        )}
        {orphans.length > 0 && <ol className="flex flex-col gap-1">{orphans.map(renderItem)}</ol>}

        {editor?.kind === 'create' && (
          <div className="rounded-lg border p-3">
            <CategoryNameForm
              label="Nombre de la nueva categoría"
              value={editor.name}
              submitLabel="Crear categoría"
              pendingLabel="Creando…"
              isPending={pending === 'create'}
              error={editorError?.categoryId === null ? editorError.message : null}
              onChange={onChangeEditorName}
              onSubmit={onSubmitEditor}
              onCancel={onCloseEditor}
            />
          </div>
        )}
      </div>

      <footer className="mt-auto border-t p-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={!canAddCard}
            onClick={onAdd}
          >
            <Plus aria-hidden="true" />
            Agregar tarjeta
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={!isIdle}
            onClick={() => onOpenEditor({ kind: 'create', name: '' })}
          >
            <FolderPlus aria-hidden="true" />
            Nueva categoría
          </Button>
        </div>
        {!hasCategories && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Esta cartilla no tiene categorías. Crea una con «Nueva categoría» para poder agregar tarjetas.
          </p>
        )}
        {isFull && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Se alcanzó el máximo de {MAX_BOARD_ITEMS} tarjetas.
          </p>
        )}
      </footer>
    </section>
  )
}
