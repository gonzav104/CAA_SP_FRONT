import { useMemo, useReducer, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play, Plus, Save, Star } from 'lucide-react'
import {
  getCategoryErrorMessage,
  getCreateErrorMessage,
  getDeleteErrorMessage,
  getMaterializeErrorMessage,
  getWriteErrorMessage,
} from '@/api/errors'
import { paths } from '@/app/paths'
import { Button, buttonVariants } from '@/components/ui/button'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useSpeech } from '@/features/communication/speech/useSpeech'
import { cn } from '@/lib/utils'
import { UNSAVED_CHANGES_MESSAGE, useUnsavedChangesGuard } from '@/lib/useUnsavedChangesGuard'
import { boardReducer, MAX_BOARD_ITEMS, rebaseDraft, sortByVisualOrder } from '../boardReducer'
import { BoardOperationError } from '../boardOperations'
import { isCategoryEditorDirty } from '../categoryEditor'
import type { CategoryEditor, CategoryEditorError } from '../categoryEditor'
import { validateCategoryName } from '../categoryPlan'
import { createEmptyNewCard, isNewCardDirty, isNewCardValid } from '../newCardForm'
import type { NewCardForm } from '../newCardForm'
import { useGlobalPictograms } from '../pictogramHooks'
import { describeBlocker, planBoardSave } from '../savePlan'
import { toCommunicationCategories } from '../toCommunicationCategories'
import { useCategoryOperations } from '../useCategoryOperations'
import { useCreateBoardItem } from '../useCreateBoardItem'
import { useDeleteBoardItem } from '../useDeleteBoardItem'
import { SaveBoardError, useSaveBoard } from '../useSaveBoard'
import type { ItemSaveFailure } from '../useSaveBoard'
import type { Patient } from '@/features/patients/types'
import type { Board, BoardItem, Pictogram } from '../types'
import { BoardItemList } from './BoardItemList'
import { BoardPreview } from './BoardPreview'
import { ItemEditorPanel } from './ItemEditorPanel'
import { NewItemPanel } from './NewItemPanel'

interface BoardEditorPageProps {
  patient: Patient
  serverBoard: Board
}

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
  const [newCard, setNewCard] = useState<NewCardForm | null>(null)
  // `createdUnreloaded`: the card WAS created but the reload failed, so creating again would duplicate it.
  const [createError, setCreateError] = useState<{ message: string; createdUnreloaded: boolean } | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const save = useSaveBoard(patient.id, board.id)
  const create = useCreateBoardItem(patient.id, board.id)
  const remove = useDeleteBoardItem(patient.id, board.id)
  const categoryOps = useCategoryOperations(patient.id, board.id)
  const [categoryEditor, setCategoryEditor] = useState<CategoryEditor | null>(null)
  const [categoryError, setCategoryError] = useState<CategoryEditorError | null>(null)
  // Page-level failure of a category write that DID succeed (only the reload failed): its editor is closed so it cannot be repeated.
  const [categoryReloadError, setCategoryReloadError] = useState<string | null>(null)
  const pendingCategoryOperation = categoryOps.create.isPending
    ? 'create'
    : categoryOps.rename.isPending
      ? 'rename'
      : categoryOps.move.isPending
        ? 'move'
        : categoryOps.remove.isPending
          ? 'delete'
          : null
  const isBusy = save.isPending || create.isPending || remove.isPending || pendingCategoryOperation !== null
  const plan = useMemo(() => planBoardSave(baseline, board), [baseline, board])
  const isDirty = plan.updates.length > 0 || plan.blockers.length > 0
  const hasBlockers = plan.blockers.length > 0
  const canSave = isDirty && !hasBlockers && !isBusy
  const items = sortByVisualOrder(board.items)
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const { say } = useSpeech()
  const library = useGlobalPictograms()
  const isFormDirty = isNewCardDirty(newCard)
  const isCategoryEditorOpenDirty = isCategoryEditorDirty(categoryEditor, board.categories)
  useUnsavedChangesGuard(isDirty || isFormDirty || isCategoryEditorOpenDirty)

  const selectedItem = items.find((item) => item.id === selectedId)
  const previewCategories = toCommunicationCategories(board)
  const previewVisibleCount = previewCategories.reduce((sum, category) => sum + category.items.length, 0)
  const boardPictograms = [...baseline.items, ...board.items].flatMap((item): Pictogram[] =>
    item.pictogram ? [item.pictogram] : [],
  )

  const changedItemIds = new Set([...plan.updates.map((update) => update.itemId), ...plan.blockers.map((blocker) => blocker.itemId)])
  const highlightedCategoryId = newCard ? newCard.categoryId : (selectedItem?.categoryId ?? null)

  const canAdd = board.categories.length > 0 && items.length < MAX_BOARD_ITEMS && !isBusy && newCard === null

  const edit = (action: Parameters<typeof dispatch>[0]) => {
    setSaved(false)
    setStatusMessage(null)
    dispatch(action)
  }

  const select = (itemId: string | null) => {
    setSelectedId(itemId)
    setRemoveError(null)
  }

  // After an immediate create/delete: the server snapshot becomes the baseline and the draft keeps its pending edits.
  const applyFresh = (fresh: Board) => {
    setBaseline(fresh)
    dispatch({ type: 'rebase', fresh })
  }

  // Like `applyFresh`, and keeps the selected card when it still exists (else the first card, or none).
  const applyFreshKeepingSelection = (fresh: Board) => {
    const remaining = sortByVisualOrder(rebaseDraft(board, fresh).items)
    applyFresh(fresh)
    if (!remaining.some((item) => item.id === selectedId)) select(remaining[0]?.id ?? null)
  }

  // `categoryId` preselects a category ("Agregar tarjeta en ..."); otherwise the selected card's one, else the first.
  const handleOpenNewCard = (categoryId?: string) => {
    const preselected = board.categories.find((category) => category.id === (categoryId ?? selectedItem?.categoryId))
    setSaved(false)
    setStatusMessage(null)
    setCreateError(null)
    setCategoryEditor(null)
    setCategoryError(null)
    setNewCard(createEmptyNewCard((preselected ?? board.categories[0]).id))
  }

  const handleOpenCategoryEditor = (editor: CategoryEditor) => {
    setCategoryError(null)
    setCategoryEditor(editor)
  }

  const handleChangeCategoryName = (name: string) => {
    setCategoryEditor((current) => (current && current.kind !== 'delete' ? { ...current, name } : current))
  }

  const handleCloseCategoryEditor = () => {
    setCategoryError(null)
    setCategoryEditor(null)
  }

  // Every category operation ends in the server truth. On failure, `fresh` (when known) is still applied and the
  // editor stays open with what the user typed.
  const runCategoryOperation = async (
    operation: 'create' | 'rename' | 'move' | 'delete',
    run: () => Promise<Board>,
    errorCategoryId: string | null,
    successMessage: string,
    closesEditor: boolean,
  ) => {
    setCategoryError(null)
    setCategoryReloadError(null)
    setStatusMessage(null)
    setSaved(false)
    try {
      applyFreshKeepingSelection(await run())
      if (closesEditor) setCategoryEditor(null)
      setStatusMessage(successMessage)
    } catch (error) {
      if (!(error instanceof BoardOperationError)) throw error
      if (error.fresh) applyFreshKeepingSelection(error.fresh)
      const message = getCategoryErrorMessage(error.cause, error.stage === 'reload' ? 'reload' : 'request', operation)
      if (error.stage === 'reload' && (operation === 'create' || operation === 'delete')) {
        // The category was created/deleted on the server: a second submit would duplicate it or fail with 404.
        setCategoryEditor(null)
        setCategoryReloadError(message)
        return
      }
      setCategoryError({ categoryId: errorCategoryId, message })
    }
  }

  const handleSubmitCategoryEditor = () => {
    if (!categoryEditor) return
    if (categoryEditor.kind === 'create') {
      if (validateCategoryName(categoryEditor.name) !== null) return
      void runCategoryOperation('create', () => categoryOps.create.mutateAsync(categoryEditor.name), null, 'Categoría creada.', true)
      return
    }
    const category = board.categories.find((candidate) => candidate.id === categoryEditor.categoryId)
    if (!category) return
    if (categoryEditor.kind === 'rename') {
      if (validateCategoryName(categoryEditor.name) !== null) return
      void runCategoryOperation(
        'rename',
        () => categoryOps.rename.mutateAsync({ category, name: categoryEditor.name }),
        category.id,
        'Categoría renombrada.',
        true,
      )
      return
    }
    void runCategoryOperation('delete', () => categoryOps.remove.mutateAsync(category), category.id, 'Categoría eliminada.', true)
  }

  const handleMoveCategory = (categoryId: string, direction: -1 | 1) => {
    void runCategoryOperation(
      'move',
      () => categoryOps.move.mutateAsync({ categories: board.categories, categoryId, direction }),
      categoryId,
      'Categoría movida.',
      false,
    )
  }

  const handleCancelNewCard = () => {
    setCreateError(null)
    setNewCard(null)
  }

  const handleCreate = async () => {
    if (!newCard?.pictogram || !isNewCardValid(newCard, board.categories)) return
    setCreateError(null)
    setStatusMessage(null)
    setSaved(false)
    try {
      const { fresh, createdId } = await create.mutateAsync({
        categoryId: newCard.categoryId,
        pictogram: newCard.pictogram,
        label: newCard.label,
        spokenText: newCard.spokenText,
        isActive: newCard.isActive,
      })
      applyFresh(fresh)
      select(createdId)
      setNewCard(null)
      setStatusMessage('Tarjeta creada.')
    } catch (error) {
      if (!(error instanceof BoardOperationError)) throw error
      // The form keeps exactly what the user typed.
      if (error.fresh) applyFresh(error.fresh)
      setCreateError({
        message: getCreateErrorMessage(error.cause, error.stage),
        createdUnreloaded: error.stage === 'reload',
      })
    }
  }

  const handleRemove = async (item: BoardItem) => {
    if (item.categoryId === null) return
    const position = items.findIndex((candidate) => candidate.id === item.id)
    setRemoveError(null)
    setStatusMessage(null)
    setSaved(false)
    try {
      const fresh = await remove.mutateAsync({ categoryId: item.categoryId, itemId: item.id })
      const remaining = sortByVisualOrder(rebaseDraft(board, fresh).items)
      applyFresh(fresh)
      select((remaining[position] ?? remaining.at(-1))?.id ?? null)
      setStatusMessage('Tarjeta eliminada.')
    } catch (error) {
      if (!(error instanceof BoardOperationError)) throw error
      if (error.fresh) applyFresh(error.fresh)
      setRemoveError(getDeleteErrorMessage(error.cause, error.stage === 'reload' ? 'reload' : 'request'))
    }
  }

  const handleDiscard = () => {
    setSaveError(null)
    dispatch({ type: 'reset', board: baseline })
  }

  const handleSave = async () => {
    setSaved(false)
    setStatusMessage(null)
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
          <LogoutButton confirmMessage={isDirty || isFormDirty || isCategoryEditorOpenDirty ? UNSAVED_CHANGES_MESSAGE : undefined} />
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

      {categoryReloadError && (
        <div role="alert" className="border-b border-red-300 bg-red-50 px-6 py-2 text-sm text-red-900">
          {categoryReloadError}
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
          <Button type="button" variant="ghost" size="sm" disabled={isBusy} onClick={handleDiscard}>
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

      {statusMessage && !isBusy && (
        <div
          role="status"
          className="border-b border-green-300 bg-green-50 px-6 py-2 text-sm font-medium text-green-900"
        >
          {statusMessage}
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
        inert={isBusy}
        className="grid flex-1 grid-cols-1 items-start gap-6 p-6 md:grid-cols-2 lg:grid-cols-[19rem_minmax(0,1fr)_19rem]"
      >
        <div
          inert={newCard !== null}
          className="order-first md:col-span-2 lg:sticky lg:top-6 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1"
        >
          <BoardPreview
            patientName={patient.firstName}
            categories={previewCategories}
            hiddenCount={items.length - previewVisibleCount}
            onSelect={select}
          />
        </div>
        <div inert={newCard !== null} className="lg:col-start-1 lg:row-start-1">
          <BoardItemList
            items={items}
            selectedId={selectedId}
            onSelect={select}
            onMove={(itemId, direction) => edit({ type: 'moveItem', itemId, direction })}
            onAdd={() => handleOpenNewCard()}
            canAdd={canAdd}
            categories={board.categories}
            baselineItems={baseline.items}
            changedItemIds={changedItemIds}
            highlightedCategoryId={highlightedCategoryId}
            editor={categoryEditor}
            editorError={categoryError}
            pending={pendingCategoryOperation}
            onAddInCategory={handleOpenNewCard}
            onMoveCategory={handleMoveCategory}
            onOpenEditor={handleOpenCategoryEditor}
            onChangeEditorName={handleChangeCategoryName}
            onCloseEditor={handleCloseCategoryEditor}
            onSubmitEditor={handleSubmitCategoryEditor}
          />
        </div>
        <div className="lg:col-start-3 lg:row-start-1">
          {newCard ? (
            <NewItemPanel
              form={newCard}
              categories={board.categories}
              boardPictograms={boardPictograms}
              libraryStatus={library.status}
              globalLibrary={library.data ?? []}
              isCreating={create.isPending}
              error={createError?.message ?? null}
              blockSubmit={createError?.createdUnreloaded === true}
              onChange={setNewCard}
              onSubmit={() => void handleCreate()}
              onCancel={handleCancelNewCard}
            />
          ) : (
            <ItemEditorPanel
              key={selectedItem?.id ?? 'none'}
              item={selectedItem}
              totalItems={items.length}
              boardPictograms={boardPictograms}
              libraryStatus={library.status}
              globalLibrary={library.data ?? []}
              canRemove={!isBusy && selectedItem?.categoryId != null}
              isRemoving={remove.isPending}
              removeError={removeError}
              onChange={(itemId, changes) => edit({ type: 'updateItem', itemId, changes })}
              onConfirmRemove={(item) => void handleRemove(item)}
              onListen={handleListen}
            />
          )}
        </div>
      </main>
    </div>
  )
}
