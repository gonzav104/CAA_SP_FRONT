import { useState } from 'react'
import { CalendarDays, Image, LayoutGrid, Pencil, Play, Trash2, Users } from 'lucide-react'
import { Link, Navigate, Outlet, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getPatientDeleteErrorMessage, getPatientUpdateErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { useBoards } from '@/features/boards/hooks'
import { PageLayout } from '@/layouts/PageLayout'
import { initialOf } from '@/lib/utils'
import { ageFrom } from '../age'
import { formatBirthDate } from '../format'
import { useDeletePatient, usePatient, useUpdatePatient } from '../hooks'
import { canAccessCollaborators, canAccessSessions, canDeletePatient, canEditPatientData } from '../permissions'
import type { Patient } from '../types'
import { DeletePatientConfirmation } from './DeletePatientConfirmation'
import { EditPatientForm } from './EditPatientForm'
import type { EditPatientSubmitValues } from './EditPatientForm'
import type { PatientSection } from './PatientSectionNav'
import { PatientSectionNav } from './PatientSectionNav'

type HeaderAction = 'edit' | 'delete' | null

interface PatientHeaderProps {
  patient: Patient
  gridSize: number | null
  principalBoardId: string | undefined
  canEdit: boolean
  canDelete: boolean
  activeAction: HeaderAction
  onStartEdit: () => void
  onStartDelete: () => void
  onCancelAction: () => void
  isUpdatePending: boolean
  updateError: string | null
  onSubmitEdit: (values: EditPatientSubmitValues) => void
  isDeletePending: boolean
  deleteError: string | null
  onConfirmDelete: () => void
}

/** Identity, age, a direct way into the principal cartilla, and the patient's own edit/delete actions. */
function PatientHeader({
  patient,
  gridSize,
  principalBoardId,
  canEdit,
  canDelete,
  activeAction,
  onStartEdit,
  onStartDelete,
  onCancelAction,
  isUpdatePending,
  updateError,
  onSubmitEdit,
  isDeletePending,
  deleteError,
  onConfirmDelete,
}: PatientHeaderProps) {
  const age = ageFrom(patient.birthDate, new Date())

  return (
    <div className="flex flex-col gap-4">
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
        <div className="flex flex-wrap items-center gap-2">
          {principalBoardId && (
            <Link
              to={paths.boardUse(patient.id, principalBoardId)}
              className={buttonVariants({ size: 'lg', className: 'shrink-0' })}
            >
              <Play aria-hidden="true" />
              Abrir Modo Uso
            </Link>
          )}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Editar datos del paciente"
              disabled={activeAction !== null}
              onClick={onStartEdit}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Eliminar paciente"
              disabled={activeAction !== null}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onStartDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </section>

      {activeAction === 'edit' && (
        <EditPatientForm
          patient={patient}
          gridSize={gridSize}
          isPending={isUpdatePending}
          error={updateError}
          onSubmit={onSubmitEdit}
          onCancel={onCancelAction}
        />
      )}
      {activeAction === 'delete' && (
        <DeletePatientConfirmation
          name={patient.fullName}
          isPending={isDeletePending}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={onCancelAction}
        />
      )}
    </div>
  )
}

export function PatientWorkspaceLayout() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <PatientWorkspaceLayoutContent patientId={pacienteId} />
}

function PatientWorkspaceLayoutContent({ patientId }: { patientId: string }) {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const patient = usePatient(patientId)
  // Same cache entry the Cartillas tab reads (boardKeys.list): a shared GET, not a second request.
  const boards = useBoards(patientId)
  const principal = boards.data?.find((board) => board.isPrimary)

  const [activeAction, setActiveAction] = useState<HeaderAction>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const updatePatient = useUpdatePatient(patientId)
  const deletePatientMutation = useDeletePatient()

  if (patient.isError) {
    return (
      <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }} tone="warm">
        <ErrorState
          message={getReadErrorMessage(patient.error, 'No encontramos al paciente o no tienes acceso.')}
          onRetry={() => void patient.refetch()}
        />
      </PageLayout>
    )
  }

  if (!patient.data) {
    return (
      <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }} tone="warm">
        <LoadingState message="Cargando paciente…" />
      </PageLayout>
    )
  }

  const data = patient.data
  const gridSize = patient.data.gridSize
  const canEdit = canEditPatientData(user, data)
  const canDelete = canDeletePatient(user, data)

  const sections: PatientSection[] = [
    { label: 'Cartillas', to: paths.boards(patientId), icon: LayoutGrid },
    ...(canAccessSessions(user, data) ? [{ label: 'Sesiones', to: paths.sessions(patientId), icon: CalendarDays }] : []),
    ...(canAccessCollaborators(user, data) ? [{ label: 'Familia', to: paths.collaborators(patientId), icon: Users }] : []),
    { label: 'Pictogramas', to: paths.customPictograms(patientId), icon: Image },
  ]

  const handleSubmitEdit = async (values: EditPatientSubmitValues) => {
    setUpdateError(null)
    try {
      await updatePatient.mutateAsync(values)
      setActiveAction(null)
    } catch (error) {
      setUpdateError(getPatientUpdateErrorMessage(error))
    }
  }

  const handleConfirmDelete = async () => {
    setDeleteError(null)
    try {
      await deletePatientMutation.mutateAsync(patientId)
      navigate(paths.patients(), { replace: true })
    } catch (error) {
      setDeleteError(getPatientDeleteErrorMessage(error))
    }
  }

  return (
    <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }} tone="warm">
      <PatientHeader
        patient={data}
        gridSize={gridSize}
        principalBoardId={principal?.id}
        canEdit={canEdit}
        canDelete={canDelete}
        activeAction={activeAction}
        onStartEdit={() => {
          setUpdateError(null)
          setActiveAction('edit')
        }}
        onStartDelete={() => {
          setDeleteError(null)
          setActiveAction('delete')
        }}
        onCancelAction={() => setActiveAction(null)}
        isUpdatePending={updatePatient.isPending}
        updateError={updateError}
        onSubmitEdit={(values) => void handleSubmitEdit(values)}
        isDeletePending={deletePatientMutation.isPending}
        deleteError={deleteError}
        onConfirmDelete={() => void handleConfirmDelete()}
      />
      <PatientSectionNav sections={sections} />
      <Outlet />
    </PageLayout>
  )
}
