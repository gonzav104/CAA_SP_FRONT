import { useState } from 'react'
import { Image as ImageIcon, Plus } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import {
  getCustomPictogramDeleteErrorMessage,
  getCustomPictogramWriteErrorMessage,
  getReadErrorMessage,
} from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatient } from '@/features/patients/hooks'
import { useCreateCustomPictogram, useCustomPictograms, useDeleteCustomPictogram, useUpdateCustomPictogram } from '../hooks'
import { canDeleteCustomPictogram, canEditCustomPictograms } from '../permissions'
import { CustomPictogramCard } from './CustomPictogramCard'
import { UploadPictogramForm } from './UploadPictogramForm'

type Editor = { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string }

/** Pictogramas tab of the patient workspace: the patient's own image library (not ARASAAC). */
export function CustomPictogramsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <CustomPictogramsPageContent patientId={pacienteId} />
}

function CustomPictogramsPageContent({ patientId }: { patientId: string }) {
  const { data: user } = useCurrentUser()
  // Same cache entry the workspace header reads: one shared GET, not a second request.
  const patient = usePatient(patientId)
  const { data: pictograms, isPending, isError, error, refetch } = useCustomPictograms(patientId)
  const createPictogram = useCreateCustomPictogram(patientId)
  const updatePictogram = useUpdateCustomPictogram(patientId)
  const deletePictogram = useDeleteCustomPictogram(patientId)

  const [searchParams] = useSearchParams()
  // A workspace-nav shortcut ("Subir pictograma") can land here with the form already open.
  const [editor, setEditor] = useState<Editor | null>(() => (searchParams.get('crear') === '1' ? { kind: 'create' } : null))
  const [editorError, setEditorError] = useState<string | null>(null)

  const openEditor = (next: Editor) => {
    setEditor(next)
    setEditorError(null)
  }
  const closeEditor = () => {
    setEditor(null)
    setEditorError(null)
  }

  const handleCreate = async (values: { etiqueta: string; archivo: File }) => {
    setEditorError(null)
    try {
      await createPictogram.mutateAsync(values)
      closeEditor()
    } catch (err) {
      setEditorError(getCustomPictogramWriteErrorMessage(err))
    }
  }

  const handleUpdate = async (id: string, values: { etiqueta?: string; archivo?: File }) => {
    setEditorError(null)
    try {
      await updatePictogram.mutateAsync({ id, input: values })
      closeEditor()
    } catch (err) {
      setEditorError(getCustomPictogramWriteErrorMessage(err))
    }
  }

  const handleDelete = async (id: string) => {
    setEditorError(null)
    try {
      await deletePictogram.mutateAsync(id)
      closeEditor()
    } catch (err) {
      setEditorError(getCustomPictogramDeleteErrorMessage(err))
    }
  }

  if (isPending || !patient.data) return <LoadingState message="Cargando pictogramas…" />
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos pictogramas para este paciente o no tienes acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  const canEdit = canEditCustomPictograms(user, patient.data)
  const canDelete = canDeleteCustomPictogram(user, patient.data)
  const isCreating = editor?.kind === 'create'

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">Pictogramas</h2>
        {canEdit && !isCreating && (
          <Button type="button" variant="outline" size="lg" onClick={() => openEditor({ kind: 'create' })}>
            <Plus aria-hidden="true" />
            Subir pictograma
          </Button>
        )}
      </div>

      {canEdit && isCreating && (
        <UploadPictogramForm
          isPending={createPictogram.isPending}
          error={editorError}
          onSubmit={(values) => void handleCreate(values)}
          onCancel={closeEditor}
        />
      )}

      {pictograms.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <ImageIcon aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">Este paciente todavía no tiene pictogramas propios.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pictograms.map((pictogram) => {
            const mode = editor && editor.kind !== 'create' && editor.id === pictogram.id ? editor.kind : 'view'
            return (
              <CustomPictogramCard
                key={pictogram.id}
                pictogram={pictogram}
                canEdit={canEdit}
                canDelete={canDelete}
                mode={mode}
                isEditPending={updatePictogram.isPending}
                editError={mode === 'edit' ? editorError : null}
                isDeletePending={deletePictogram.isPending}
                deleteError={mode === 'delete' ? editorError : null}
                onStartEdit={() => openEditor({ kind: 'edit', id: pictogram.id })}
                onStartDelete={() => openEditor({ kind: 'delete', id: pictogram.id })}
                onCancel={closeEditor}
                onSubmitEdit={(values) => void handleUpdate(pictogram.id, values)}
                onConfirmDelete={() => void handleDelete(pictogram.id)}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
