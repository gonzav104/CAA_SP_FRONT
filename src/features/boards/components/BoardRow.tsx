import { LayoutGrid, Pencil, Star, Trash2 } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { Button, buttonVariants } from '@/components/ui/button'
import { formatBirthDate } from '@/features/patients/format'
import { cn } from '@/lib/utils'
import type { BoardSummary } from '../types'
import { BoardNameForm } from './BoardNameForm'
import { DeleteBoardConfirmation } from './DeleteBoardConfirmation'

interface BoardRowProps {
  patientId: string
  board: BoardSummary
  /** May rename and open the Editor. */
  canEdit: boolean
  /** May delete the cartilla (clinical team). */
  canDelete: boolean
  /** Clinical team and the cartilla is not the principal yet. */
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

const ICON_ACTION_CLASS = 'size-11 sm:size-10'

export function BoardRow({
  patientId,
  board,
  canEdit,
  canDelete,
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
        'flex flex-wrap items-center gap-x-3 gap-y-3 rounded-xl border p-4 transition-colors',
        board.isPrimary ? 'border-caa-azul/40 bg-caa-azul-suave/60' : 'border-border bg-background',
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
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg',
              board.isPrimary ? 'bg-background text-caa-azul-hover' : 'bg-caa-azul-suave text-caa-azul',
            )}
          >
            <LayoutGrid className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2">
              <span className="truncate font-semibold text-foreground" title={name}>
                {name}
              </span>
              {board.isPrimary && (
                <span className="flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-caa-azul-hover">
                  <Star aria-hidden="true" className="size-3.5 fill-current" />
                  Principal
                </span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {`Creada el ${formatBirthDate(board.createdAt.slice(0, 10))}`}
              {!canEdit && (
                <>
                  {' · '}
                  <span>Solo lectura</span>
                </>
              )}
            </span>
          </div>
        </div>
      )}
      <div className="flex w-full flex-wrap items-center justify-end gap-x-1 gap-y-2 sm:w-auto">
        <div className="flex items-center gap-1">
          {isPrimaryPending && <span className="text-sm text-muted-foreground">Marcando…</span>}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-lg"
              className={ICON_ACTION_CLASS}
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
              className={ICON_ACTION_CLASS}
              disabled={actionsDisabled}
              aria-busy={isPrimaryPending || undefined}
              onClick={onSetPrimary}
              aria-label={`Marcar ${name} como principal`}
            >
              <Star aria-hidden="true" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon-lg"
              className={cn(ICON_ACTION_CLASS, 'text-destructive hover:text-destructive')}
              disabled={actionsDisabled}
              onClick={onStartDelete}
              aria-label={`Eliminar ${name}`}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          )}
        </div>
        <div className="flex w-full gap-2 sm:ml-1 sm:w-auto">
          {canEdit && (
            <Link
              to={paths.boardEditor(patientId, board.id)}
              className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 flex-1 bg-background sm:h-10 sm:flex-none' })}
            >
              Editar
            </Link>
          )}
          <Link
            to={paths.boardUse(patientId, board.id)}
            className={buttonVariants({ size: 'lg', className: 'h-11 flex-1 sm:h-10 sm:flex-none' })}
          >
            Modo Uso
          </Link>
        </div>
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
