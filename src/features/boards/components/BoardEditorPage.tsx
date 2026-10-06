import { useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play, Plus, Save, Star } from 'lucide-react'
import { getMaterializeErrorMessage, getWriteErrorMessage } from '@/api/errors'
import { paths } from '@/app/paths'
import { Button, buttonVariants } from '@/components/ui/button'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useSpeech } from '@/features/communication/speech/useSpeech'
import { cn } from '@/lib/utils'
import { boardReducer, sortByVisualOrder } from '../boardReducer'
import { describeBlocker, planBoardSave } from '../savePlan'
import { toCommunicationItems } from '../toCommunicationItems'
import { SaveBoardError, useSaveBoard } from '../useSaveBoard'
import type { ItemSaveFailure } from '../useSaveBoard'
import type { Patient } from '@/features/patients/types'
import type { Board, BoardItem, Pictogram } from '../types'
import { BoardItemList } from './BoardItemList'
import { BoardPreview } from './BoardPreview'
import { ItemEditorPanel } from './ItemEditorPanel'

interface BoardEditorPageProps {
  patient: Patient
  serverBoard: Board
}

const noop = () => undefined

function describeFailure(failure: ItemSaveFailure): string {
  return failure.stage === 'pictogram' ? getMaterializeErrorMessage(failure.error) : getWriteErrorMessage(failure.error)
}

export function BoardEditorPage({ patient, serverBoard }: BoardEditorPageProps) {
  // `baseline` is the last server snapshot; `board` is the local draft. Only an explicit save
  // sends anything (PUT per changed item); background refetches of the route data never touch them.
  const [baseline, setBaseline] = useState(serverBoard)
  const [board, dispatch] = useReducer(boardReducer, baseline)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<SaveBoardError | null>(null)
  const save = useSaveBoard(patient.id, board.id)
  const plan = useMemo(() => planBoardSave(baseline, board), [baseline, board])
  const isDirty = plan.updates.length > 0 || plan.blockers.length > 0
  const hasBlockers = plan.blockers.length > 0
  const canSave = isDirty && !hasBlockers && !save.isPending
  const items = sortByVisualOrder(board.items)
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const { say } = useSpeech()

  const selectedItem = items.find((item) => item.id === selectedId)
  const previewItems = toCommunicationItems(board)
  const boardPictograms = [...baseline.items, ...board.items].flatMap((item): Pictogram[] =>
    item.pictogram ? [item.pictogram] : [],
  )

  const edit = (action: Parameters<typeof dispatch>[0]) => {
    setSaved(false)
    dispatch(action)
  }

  const handleDiscard = () => {
    setSaveError(null)
    dispatch({ type: 'reset', board: baseline })
  }

  const handleSave = async () => {
    setSaved(false)
    setSaveError(null)
    try {
      const fresh = await save.mutateAsync(plan.updates)
      setBaseline(fresh)
      dispatch({ type: 'reset', board: fresh })
      setSaved(true)
    } catch (error) {
      if (!(error instanceof SaveBoardError)) throw error
      // Keep the draft; the refreshed baseline leaves only the still-unsaved items pending.
      if (error.fresh) setBaseline(error.fresh)
      setSaveError(error)
    }
  }

  const handleListen = (item: BoardItem) => say(item.id, item.spokenText)

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to={paths.boards(patient.id)}
            aria-label={`Volver a las cartillas de ${patient.firstName}`}
            className={buttonVariants({ variant: 'ghost', size: 'icon-lg' })}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Editor de cartillas</span>
            <h1 className="text-lg font-semibold">{patient.fullName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={!canSave}
            aria-busy={save.isPending || undefined}
            onClick={() => void handleSave()}
          >
            <Save aria-hidden="true" />
            {save.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
          <Link to={paths.boardUse(patient.id, board.id)} className={buttonVariants({ size: 'lg' })}>
            <Play aria-hidden="true" />
            Abrir Modo Uso
          </Link>
          <LogoutButton />
        </div>
      </header>

      {save.isPending && (
        <div role="status" className="border-b bg-background px-6 py-2 text-sm text-muted-foreground">
          Guardando…
        </div>
      )}

      {saveError && (
        <div role="alert" className="border-b border-red-300 bg-red-50 px-6 py-2 text-sm text-red-900">
          {saveError.failed.length > 0
            ? `No se pudieron guardar ${saveError.failed.length} de ${saveError.total} tarjetas. ${describeFailure(saveError.failed[0])} Tus cambios siguen en pantalla.`
            : 'Los cambios se guardaron, pero no se pudo recargar la cartilla. Recarga la página.'}
        </div>
      )}

      {isDirty && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-900"
        >
          {hasBlockers ? (
            <div>
              <p className="font-medium">No se puede guardar todavía:</p>
              <ul className="list-disc pl-5">
                {plan.blockers.map((blocker) => (
                  <li key={`${blocker.itemId}-${blocker.reason}`}>{describeBlocker(blocker)}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>
              <span className="font-medium">Cambios sin guardar</span>
              {' · '}Se guardan al presionar «Guardar cambios». El Modo Uso muestra la versión guardada.
            </p>
          )}
          <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={handleDiscard}>
            Descartar cambios
          </Button>
        </div>
      )}

      {saved && !isDirty && !save.isPending && !saveError && (
        <div
          role="status"
          className="border-b border-green-300 bg-green-50 px-6 py-2 text-sm font-medium text-green-900"
        >
          Cambios guardados.
        </div>
      )}

      <nav aria-label="Cartillas" className="flex items-end gap-2 border-b bg-background px-6">
        <span
          aria-current="page"
          className="flex items-center gap-2 border-b-2 border-primary px-3 py-2.5 text-sm font-medium"
        >
          {board.name}
          {board.isPrimary && (
            <span title="Cartilla principal" className="text-muted-foreground">
              <Star aria-hidden="true" className="size-3.5 fill-current" />
              <span className="sr-only">(cartilla principal)</span>
            </span>
          )}
        </span>
        <button
          type="button"
          disabled
          title="Próximamente"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-1.5')}
        >
          <Plus aria-hidden="true" />
          Nueva cartilla
        </button>
      </nav>

      <main
        inert={save.isPending}
        className="grid flex-1 grid-cols-1 items-start gap-6 p-6 md:grid-cols-2 lg:grid-cols-[19rem_minmax(0,1fr)_19rem]"
      >
        <div className="order-first md:col-span-2 lg:sticky lg:top-6 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <BoardPreview
            patientName={patient.firstName}
            items={previewItems}
            hiddenCount={items.length - previewItems.length}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <BoardItemList
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(itemId, direction) => edit({ type: 'moveItem', itemId, direction })}
            onAdd={noop}
            canAdd={false}
          />
        </div>
        <div className="lg:col-start-3 lg:row-start-1">
          <ItemEditorPanel
            item={selectedItem}
            totalItems={items.length}
            boardPictograms={boardPictograms}
            canRemove={false}
            onChange={(itemId, changes) => edit({ type: 'updateItem', itemId, changes })}
            onRemove={noop}
            onListen={handleListen}
          />
        </div>
      </main>
    </div>
  )
}
