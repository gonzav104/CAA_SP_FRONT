import { useState } from 'react'
import { Play, Plus } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getCartillaErrorMessage, getErrorStatus, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { ageFrom } from '@/features/patients/age'
import { formatBirthDate } from '@/features/patients/format'
import { usePatient } from '@/features/patients/hooks'
import type { Patient } from '@/features/patients/types'
import { PageLayout } from '@/layouts/PageLayout'
import { initialOf } from '@/lib/utils'
import { CartillaOperationError } from '../cartillaOperations'
import type { CartillaOperation } from '../cartillaOperations'
import { useBoards } from '../hooks'
import { canCreateBoard, canEditBoard, canSetPrimaryBoard } from '../permissions'
import type { BoardSummary } from '../types'
import { useBoardListOperations } from '../useBoardListOperations'
import { BoardNameForm } from './BoardNameForm'
import { BoardRow } from './BoardRow'
import { ListNotice } from './ListNotice'
import type { Notice } from './ListNotice'

type Editor = { kind: 'create' } | { kind: 'rename'; boardId: string } | { kind: 'delete'; boardId: string }

const RELOAD_NOTICE: Notice = {
  tone: 'error',
  message: getCartillaErrorMessage(null, 'reload', 'create'),
  retry: true,
}

function describeFailure(error: unknown): { stage: 'request' | 'reload'; cause: unknown } {
  if (error instanceof CartillaOperationError) return { stage: error.stage, cause: error.cause }
  return { stage: 'request', cause: error }
}

interface BoardsContentProps {
  patientId: string
  patient: Patient | undefined
}

function BoardsContent({ patientId, patient }: BoardsContentProps) {
  const { data: user } = useCurrentUser()
  const { data: boards, isError, error, refetch } = useBoards(patientId)
  const operations = useBoardListOperations(patientId)
  // Only ONE inline editor is open at a time; opening another replaces it.
  const [editor, setEditor] = useState<Editor | null>(null)
  const [editorError, setEditorError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const isAnyPending =
    operations.create.isPending ||
    operations.rename.isPending ||
    operations.setPrimary.isPending ||
    operations.remove.isPending

  const openEditor = (next: Editor) => {
    setEditor(next)
    setEditorError(null)
  }
  const closeEditor = () => {
    setEditor(null)
    setEditorError(null)
  }

  const fail = (error: unknown, operation: CartillaOperation) => {
    const { stage, cause } = describeFailure(error)
    const message = getCartillaErrorMessage(cause, stage, operation)
    const status = getErrorStatus(cause)
    if (stage === 'reload') {
      // The write DID succeed: close the editor and keep the stale list with a retry.
      closeEditor()
      setNotice(RELOAD_NOTICE)
    } else if (operation === 'primary') {
      setNotice({ tone: status === 409 ? 'info' : 'error', message })
    } else if (status === 404 && operation !== 'create') {
      // The cartilla is gone (or not ours any more): the list was reloaded, so there is nothing left to edit.
      closeEditor()
      setNotice({ tone: 'error', message })
    } else {
      setEditorError(message)
    }
  }

  const handleCreate = async (name: string) => {
    setNotice(null)
    setEditorError(null)
    try {
      await operations.create.mutateAsync(name)
      closeEditor()
      setNotice({ tone: 'success', message: 'Cartilla creada.' })
    } catch (failure) {
      fail(failure, 'create')
    }
  }

  const handleRename = async (boardId: string, name: string) => {
    setNotice(null)
    setEditorError(null)
    try {
      await operations.rename.mutateAsync({ boardId, name })
      closeEditor()
      setNotice({ tone: 'success', message: 'Cartilla renombrada.' })
    } catch (failure) {
      fail(failure, 'rename')
    }
  }

  const handleSetPrimary = async (boardId: string, name: string) => {
    setNotice(null)
    try {
      await operations.setPrimary.mutateAsync(boardId)
      setNotice({ tone: 'success', message: `«${name}» es ahora la cartilla principal.` })
    } catch (failure) {
      fail(failure, 'primary')
    }
  }

  const handleDelete = async (boardId: string) => {
    setNotice(null)
    setEditorError(null)
    try {
      await operations.remove.mutateAsync(boardId)
      closeEditor()
      setNotice({ tone: 'success', message: 'Cartilla eliminada.' })
    } catch (failure) {
      fail(failure, 'delete')
    }
  }

  if (!boards) {
    if (isError) {
      return (
        <ErrorState
          message={getReadErrorMessage(error, 'No encontramos las cartillas o no tienes acceso.')}
          onRetry={() => void refetch()}
        />
      )
    }
    return <LoadingState message="Cargando cartillas…" />
  }

  const retry = () => void refetch()
  const canCreate = canCreateBoard(user, patient)
  const isCreating = editor?.kind === 'create'
  // A reload notice already says the list is stale (and offers the retry): never show two alerts for it.
  const showListError = isError && !notice?.retry
  const visibleNotice = notice && (!notice.retry || isError) ? notice : null

  const createForm = (
    <div className="flex rounded-2xl border border-border/60 bg-background px-5 py-3">
      <BoardNameForm
        label="Nombre de la nueva cartilla"
        submitLabel="Crear cartilla"
        pendingLabel="Creando…"
        isPending={operations.create.isPending}
        error={editorError}
        onSubmit={(name) => void handleCreate(name)}
        onCancel={closeEditor}
      />
    </div>
  )
  const createButton = (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={isAnyPending}
      onClick={() => {
        setNotice(null)
        openEditor({ kind: 'create' })
      }}
    >
      <Plus aria-hidden="true" />
      Nueva cartilla
    </Button>
  )

  return (
    <div className="flex flex-col gap-3">
      {visibleNotice && <ListNotice notice={visibleNotice} onRetry={retry} />}
      {showListError && (
        <ListNotice notice={{ tone: 'error', message: 'No se pudo actualizar la lista.', retry: true }} onRetry={retry} />
      )}

      {boards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <p className="text-muted-foreground">Este paciente todavía no tiene cartillas.</p>
          {canCreate && (isCreating ? createForm : createButton)}
        </div>
      ) : (
        <>
          {canCreate && !isCreating && <div className="flex">{createButton}</div>}
          {canCreate && isCreating && createForm}
          <ul className="flex flex-col gap-3">
            {boards.map((board) => {
              const mode = editor && editor.kind !== 'create' && editor.boardId === board.id ? editor.kind : 'view'
              return (
                <BoardRow
                  key={board.id}
                  patientId={patientId}
                  board={board}
                  canEdit={canEditBoard(user, board.creatorId)}
                  canSetPrimary={canSetPrimaryBoard(user, patient, board)}
                  mode={mode}
                  actionsDisabled={isAnyPending}
                  isEditorPending={mode === 'rename' ? operations.rename.isPending : operations.remove.isPending}
                  isPrimaryPending={operations.setPrimary.isPending && operations.setPrimary.variables === board.id}
                  error={mode === 'view' ? null : editorError}
                  onStartRename={() => {
                    setNotice(null)
                    openEditor({ kind: 'rename', boardId: board.id })
                  }}
                  onStartDelete={() => {
                    setNotice(null)
                    openEditor({ kind: 'delete', boardId: board.id })
                  }}
                  onSetPrimary={() => void handleSetPrimary(board.id, board.name)}
                  onRename={(name) => void handleRename(board.id, name)}
                  onConfirmDelete={() => void handleDelete(board.id)}
                  onCancel={closeEditor}
                />
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}

/** Identity, age and (when the patient has one) a direct way into their principal cartilla. */
function PatientSpaceHeader({ patient, principal }: { patient: Patient; principal: BoardSummary | undefined }) {
  const age = ageFrom(patient.birthDate, new Date())

  return (
    <section className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-background px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
      <div className="flex items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-lg font-semibold text-caa-accent"
        >
          {initialOf(patient.firstName)}
        </span>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold text-foreground">{patient.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {age !== null && `${age} ${age === 1 ? 'año' : 'años'} · `}
            Nacimiento: {formatBirthDate(patient.birthDate)}
          </p>
        </div>
      </div>
      {principal && (
        <Link
          to={paths.boardUse(patient.id, principal.id)}
          className={buttonVariants({ size: 'lg', className: 'shrink-0' })}
        >
          <Play aria-hidden="true" />
          Abrir Modo Uso
        </Link>
      )}
    </section>
  )
}

export function BoardsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <BoardsPageContent patientId={pacienteId} />
}

function BoardsPageContent({ patientId }: { patientId: string }) {
  const patient = usePatient(patientId)
  // Same query the "Cartillas" section below reads: one shared cache entry, not a second request.
  const boards = useBoards(patientId)
  const principal = boards.data?.find((board) => board.isPrimary)

  return (
    <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }} tone="warm">
      {patient.isError && (
        <ErrorState
          message={getReadErrorMessage(patient.error, 'No encontramos al paciente o no tienes acceso.')}
          onRetry={() => void patient.refetch()}
        />
      )}
      {!patient.isError && patient.data && <PatientSpaceHeader patient={patient.data} principal={principal} />}
      {!patient.isError && !patient.data && <LoadingState message="Cargando paciente…" />}
      {!patient.isError && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold text-foreground">Cartillas</h2>
          <BoardsContent patientId={patientId} patient={patient.data} />
        </section>
      )}
    </PageLayout>
  )
}
