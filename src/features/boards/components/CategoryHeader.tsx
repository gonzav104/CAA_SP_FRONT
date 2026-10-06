import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { describeCardCount } from '../categoryPlan'
import type { BoardCategory } from '../types'
import { CategoryNameForm } from './CategoryNameForm'

/** What deleting the category takes with it, from the SERVER snapshot, plus whether unsaved edits would be lost. */
export interface DeleteConsequence {
  cards: number
  hidden: number
  hasUnsavedChanges: boolean
}

interface CategoryHeaderProps {
  category: BoardCategory
  /** 1-based position in the current order. */
  position: number
  total: number
  /** Draft cards of the category, and how many of them are hidden. */
  cardCount: number
  hiddenCount: number
  /** The selected card (or the new-card form) belongs to this category. */
  isHighlighted: boolean
  /** "Agregar tarjeta en ..." is disabled under the same conditions as the footer button. */
  canAddCard: boolean
  /** False while an operation is pending. */
  isEnabled: boolean
  /** The inline editor open on THIS header, if any. */
  mode: 'view' | 'rename' | 'delete'
  renameValue: string
  deleteConsequence: DeleteConsequence
  /** True while the operation of the open editor is pending. */
  isPending: boolean
  /** Failure message to show under this header (inside the open editor, or after a failed move). */
  error: string | null
  onAddCard: () => void
  onStartRename: () => void
  onRenameChange: (name: string) => void
  onMove: (direction: -1 | 1) => void
  onStartDelete: () => void
  /** Submits the open editor (rename or delete). */
  onSubmit: () => void
  onCancel: () => void
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
      {message}
    </p>
  )
}

/** Header of one category group in the card list: position, name, counts and its actions. */
export function CategoryHeader({
  category,
  position,
  total,
  cardCount,
  hiddenCount,
  isHighlighted,
  canAddCard,
  isEnabled,
  mode,
  renameValue,
  deleteConsequence,
  isPending,
  error,
  onAddCard,
  onStartRename,
  onRenameChange,
  onMove,
  onStartDelete,
  onSubmit,
  onCancel,
}: CategoryHeaderProps) {
  const { name } = category

  return (
    <div className="flex flex-col gap-1">
      <div
        role="group"
        aria-label={`Categoría ${name}`}
        aria-current={isHighlighted || undefined}
        data-testid="category-header"
        className={cn(
          'flex flex-col gap-1 rounded-lg border-l-4 px-2 py-1.5',
          isHighlighted ? 'border-primary bg-muted' : 'border-transparent',
        )}
      >
        {mode === 'rename' ? (
          <CategoryNameForm
            label="Nombre de la categoría"
            value={renameValue}
            submitLabel="Guardar"
            pendingLabel="Guardando…"
            isPending={isPending}
            isUnchanged={renameValue.trim() === name.trim()}
            error={error}
            onChange={onRenameChange}
            onSubmit={onSubmit}
            onCancel={onCancel}
          />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="w-5 shrink-0 text-right text-sm font-semibold tabular-nums text-muted-foreground">{position}</span>
            <span title={name} className="min-w-0 flex-1 truncate font-semibold">
              {name}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{describeCardCount(cardCount, hiddenCount)}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={!canAddCard || !isEnabled}
            onClick={onAddCard}
            aria-label={`Agregar tarjeta en ${name}`}
          >
            <Plus aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={!isEnabled}
            onClick={onStartRename}
            aria-label={`Renombrar ${name}`}
          >
            <Pencil aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={!isEnabled || position === 1}
            onClick={() => onMove(-1)}
            aria-label={`Subir ${name}`}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            disabled={!isEnabled || position === total}
            onClick={() => onMove(1)}
            aria-label={`Bajar ${name}`}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-destructive hover:text-destructive"
            disabled={!isEnabled}
            onClick={onStartDelete}
            aria-label={`Eliminar ${name}`}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>

      {mode === 'delete' && (
        <div
          role="group"
          aria-label="Confirmar eliminación de categoría"
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
        >
          <p className="font-medium">¿Eliminar la categoría «{name}»?</p>
          <p>
            {deleteConsequence.cards > 0
              ? `También se eliminarán sus ${deleteConsequence.cards} ${deleteConsequence.cards === 1 ? 'tarjeta' : 'tarjetas'}${
                  deleteConsequence.hidden > 0
                    ? ` (${deleteConsequence.hidden} ${deleteConsequence.hidden === 1 ? 'oculta' : 'ocultas'})`
                    : ''
                } de forma permanente.`
              : 'La categoría no tiene tarjetas.'}
          </p>
          <p>No se puede deshacer.</p>
          {deleteConsequence.hasUnsavedChanges && (
            <p>Se perderán también los cambios sin guardar de esas tarjetas.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              aria-busy={isPending || undefined}
              onClick={onSubmit}
            >
              {isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
              Cancelar
            </Button>
          </div>
          {error && <ErrorAlert message={error} />}
        </div>
      )}

      {mode === 'view' && error && <ErrorAlert message={error} />}
    </div>
  )
}
