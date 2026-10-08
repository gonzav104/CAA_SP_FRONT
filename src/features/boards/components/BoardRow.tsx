import { Pencil, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { BoardSummary } from '../types'
import { BoardNameForm } from './BoardNameForm'
import { DeleteBoardConfirmation } from './DeleteBoardConfirmation'

interface BoardRowProps {
  patientId: string
  board: BoardSummary
  /** Creator: may rename, delete and open the Editor. */
  canEdit: boolean
  /** Responsible therapist and the cartilla is not the principal yet. */
  canSetPrimary: boolean
  /** The inline editor open on THIS row, if any. */
  mode: 'view' | 'rename' | 'delete'
  /** True while any list operation is pending: every action button is disabled. */
  actionsDisabled: boolean
  /** True while the operation of the open editor is pending. */
  isEditorPending: boolean
  /** True while marking THIS cartilla as principal. */
  isPrimaryPending: boolean
  /** Failure message to show inside the open editor. */
  error: string | null
  onStartRename: () => void
  onStartDelete: () => void
  onSetPrimary: () => void
  onRename: (name: string) => void
  onConfirmDelete: () => void
  onCancel: () => void
}

export function BoardRow({
  patientId,
  board,
  canEdit,
  canSetPrimary,
  mode,
  actionsDisabled,
  isEditorPending,
  isPrimaryPending,
  error,
  onStartRename,
  onStartDelete,
  onSetPrimary,
  onRename,
  onConfirmDelete,
  onCancel,
}: BoardRowProps) {
  const { name } = board

  return (
    <li
      className={cn(
        'flex min-h-16 flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background px-5 py-3',
        board.isPrimary && 'border-caa-accent/50',
      )}
    >
      {mode === 'rename' ? (
        <BoardNameForm
          label="Nombre de la cartilla"
          initialValue={name}
          originalName={name}
          submitLabel="Guardar"
          pendingLabel="Guardando…"
          isPending={isEditorPending}
          error={error}
          onSubmit={onRename}
          onCancel={onCancel}
        />
      ) : (
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-base font-medium">{name}</span>
          {board.isPrimary && (
            <span className="flex items-center gap-1 rounded-full bg-caa-accent/10 px-2.5 py-0.5 text-xs font-medium text-caa-accent">
              <Star aria-hidden="true" className="size-3.5 fill-current" />
              Principal
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        {!canEdit && <span className="text-sm text-muted-foreground">Solo lectura</span>}
        <div className="flex items-center gap-1">
          {isPrimaryPending && <span className="text-sm text-muted-foreground">Marcando…</span>}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-lg"
              disabled={actionsDisabled}
              onClick={onStartRename}
              aria-label={`Renombrar ${name}`}
            >
              <Pencil aria-hidden="true" />
            </Button>
          )}
          {canSetPrimary && (
            <Button
              variant="ghost"
              size="icon-lg"
              disabled={actionsDisabled}
              aria-busy={isPrimaryPending || undefined}
              onClick={onSetPrimary}
              aria-label={`Marcar ${name} como principal`}
            >
              <Star aria-hidden="true" />
            </Button>
          )}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-destructive hover:text-destructive"
              disabled={actionsDisabled}
              onClick={onStartDelete}
              aria-label={`Eliminar ${name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
        {canEdit && (
          <Link
            to={paths.boardEditor(patientId, board.id)}
            className={buttonVariants({ variant: 'outline', size: 'lg' })}
          >
            Editar
          </Link>
        )}
        <Link to={paths.boardUse(patientId, board.id)} className={buttonVariants({ size: 'lg' })}>
          Modo Uso
        </Link>
      </div>
      {mode === 'delete' && (
        <DeleteBoardConfirmation
          patientId={patientId}
          boardId={board.id}
          name={name}
          isPrimary={board.isPrimary}
          isPending={isEditorPending}
          error={error}
          onConfirm={onConfirmDelete}
          onCancel={onCancel}
        />
      )}
    </li>
  )
}
