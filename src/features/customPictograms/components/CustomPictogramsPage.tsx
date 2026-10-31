import { useState } from 'react'
import { Image as ImageIcon, Plus } from 'lucide-react'
import { Navigate, useParams, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import {
  getCustomPictogramDeleteErrorMessage,
  getCustomPictogramWriteErrorMessage,
  getReadErrorMessage,
} from '@/api/errors'
import { EmptyPanel } from '@/components/EmptyPanel'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { usePatient } from '@/features/patients/hooks'
import { BRAND_SECTION_TITLE_CLASS } from '@/layouts/brand'
import { useCreateCustomPictogram, useCustomPictograms, useDeleteCustomPictogram, useUpdateCustomPictogram } from '../hooks'
import { canDeleteCustomPictogram, canEditCustomPictograms } from '../permissions'
import { CustomPictogramCard } from './CustomPictogramCard'
import { UploadPictogramForm } from './UploadPictogramForm'

const GRID_CLASS = 'grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'

type Editor = { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string }

/** Pictogramas tab of the patient workspace: the patient's own image library (not ARASAAC). */
export function CustomPictogramsPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <CustomPictogramsPageContent patientId={pacienteId} />
}

function CustomPictogramsPageContent({ patientId }: { patientId: string }) {
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

  if (isPending || !patient.data) {
    return (
      <>
        <p role="status" className="sr-only">
          Cargando pictogramas…
        </p>
        <div aria-hidden="true" className={GRID_CLASS}>
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="aspect-square animate-pulse rounded-xl border border-border bg-background" />
          ))}
        </div>
      </>
    )
  }
  if (isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(error, 'No encontramos pictogramas para este paciente o no tenés acceso.')}
        onRetry={() => void refetch()}
      />
    )
  }

  const canEdit = canEditCustomPictograms(patient.data)
  const canDelete = canDeleteCustomPictogram(patient.data)
  const isCreating = editor?.kind === 'create'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={BRAND_SECTION_TITLE_CLASS}>Pictogramas</h2>
        {canEdit && !isCreating && pictograms.length > 0 && (
          <Button type="button" variant="outline" size="lg" className="h-10 bg-background" onClick={() => openEditor({ kind: 'create' })}>
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
        !isCreating && (
          <EmptyPanel
            icon={ImageIcon}
            hint={canEdit ? 'Son imágenes propias para usar en sus cartillas.' : undefined}
            action={
              canEdit ? (
                <Button type="button" size="lg" className="h-10" onClick={() => openEditor({ kind: 'create' })}>
                  <Plus aria-hidden="true" />
                  Subir pictograma
                </Button>
              ) : undefined
            }
          >
            Este paciente todavía no tiene pictogramas propios.
          </EmptyPanel>
        )
      ) : (
        <ul className={GRID_CLASS}>
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
