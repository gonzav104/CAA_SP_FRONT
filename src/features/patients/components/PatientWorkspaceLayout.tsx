import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Building2, CalendarDays, HeartHandshake, Image, LayoutGrid, Pencil, Play, Stethoscope, Trash2, Users } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getPatientDeleteErrorMessage, getPatientUpdateErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { Button, buttonVariants } from '@/components/ui/button'
import { useBoards } from '@/features/boards/hooks'
import type { OrganizacionResponse } from '@/features/organizations/apiTypes'
import { useOrganizations } from '@/features/organizations/hooks'
import { SHARED_SPACE_ID } from '@/features/organizations/spaces'
import { BRAND_TITLE_CLASS } from '@/layouts/brand'
import { PageLayout } from '@/layouts/PageLayout'
import { initialOf } from '@/lib/utils'
import { ageFrom } from '../age'
import { formatBirthDate, PERMISSION_LABELS } from '../format'
import { useDeletePatient, usePatient, useUpdatePatient } from '../hooks'
import {
  canAccessCollaborators,
  canAccessSessions,
  canDeletePatient,
  canEditPatientData,
  canViewTherapists,
} from '../permissions'
import type { Patient } from '../types'
import { DeletePatientConfirmation } from './DeletePatientConfirmation'
import { EditPatientForm } from './EditPatientForm'
import type { EditPatientSubmitValues } from './EditPatientForm'
import { PatientCreatedPanel } from './PatientCreatedPanel'
import type { PatientSection } from './PatientSectionNav'
import { PatientSectionNav } from './PatientSectionNav'

type HeaderAction = 'edit' | 'delete' | null

/** Set in the history state by the Pacientes page right after registering this patient. */
function cameFromCreation(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'patientCreated' in state && state.patientCreated === true
}

interface PatientSpace {
  label: string
  to: string
  icon: LucideIcon
}

/** Where this patient lives for the user. Same rule as the spaces: a family link is the shared space. */
function spaceOf(patient: Patient, organizations: readonly OrganizacionResponse[] | undefined): PatientSpace | null {
  if (patient.collaboratorPermission) {
    return {
      label: `Compartido como familiar · ${PERMISSION_LABELS[patient.collaboratorPermission]}`,
      to: paths.patientsInSpace(SHARED_SPACE_ID),
      icon: HeartHandshake,
    }
  }
  const organization = organizations?.find((candidate) => candidate.id === patient.organizationId)
  return organization ? { label: organization.nombre, to: paths.patientsInSpace(organization.id), icon: Building2 } : null
}

interface PatientHeaderProps {
  patient: Patient
  space: PatientSpace | null
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
  space,
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-caa-azul-suave font-display text-xl font-bold text-caa-azul"
          >
            {initialOf(patient.firstName)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className={BRAND_TITLE_CLASS}>{patient.fullName}</h1>
            <p className="text-sm text-muted-foreground">
              {age !== null && `${age} ${age === 1 ? 'año' : 'años'} · `}
              Nacimiento: {formatBirthDate(patient.birthDate)}
            </p>
            {space && (
              <Link
                to={space.to}
                className="flex min-h-6 w-fit max-w-full items-center gap-1.5 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <space.icon aria-hidden="true" className="size-3.5 shrink-0" />
                <span className="truncate">{space.label}</span>
              </Link>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {principalBoardId && (
            <Link
              to={paths.boardUse(patient.id, principalBoardId)}
              className={buttonVariants({ size: 'lg', className: 'h-11 flex-1 sm:h-10 sm:flex-none' })}
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
              className="size-11 bg-background sm:size-10"
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
              className="size-11 bg-background text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-10"
              onClick={onStartDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      </header>

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
  return <PatientWorkspaceLayoutContent key={pacienteId} patientId={pacienteId} />
}

function HeaderSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando paciente…
      </p>
      <div aria-hidden="true" className="flex items-center gap-4">
        <span className="size-14 animate-pulse rounded-xl bg-background" />
        <span className="flex flex-col gap-2">
          <span className="h-7 w-52 animate-pulse rounded bg-background" />
          <span className="h-4 w-36 animate-pulse rounded bg-background" />
        </span>
      </div>
    </>
  )
}

function PatientWorkspaceLayoutContent({ patientId }: { patientId: string }) {
  const navigate = useNavigate()
  const location = useLocation()
  const patient = usePatient(patientId)
  const { data: organizations } = useOrganizations()
  // Same cache entry the Cartillas tab reads (boardKeys.list): a shared GET, not a second request.
  const boards = useBoards(patientId)
  const principal = boards.data?.find((board) => board.isPrimary)

  const [activeAction, setActiveAction] = useState<HeaderAction>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const updatePatient = useUpdatePatient(patientId)
  const deletePatientMutation = useDeletePatient()

  // The confirmation belongs to the registration, not to the history entry: it is read once and taken
  // out of the entry, so a reload or coming back never announces an alta that did not just happen.
  const [justCreated, setJustCreated] = useState(() => cameFromCreation(location.state))
  useEffect(() => {
    if (cameFromCreation(location.state)) navigate(location.pathname + location.search, { replace: true, state: null })
  }, [location.state, location.pathname, location.search, navigate])

  if (patient.isError) {
    return (
      <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }}>
        <ErrorState
          message={getReadErrorMessage(patient.error, 'No encontramos al paciente o no tenés acceso.')}
          onRetry={() => void patient.refetch()}
        />
      </PageLayout>
    )
  }

  if (!patient.data) {
    return (
      <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }}>
        <HeaderSkeleton />
      </PageLayout>
    )
  }

  const data = patient.data
  const gridSize = patient.data.gridSize
  const canEdit = canEditPatientData(data)
  const canDelete = canDeletePatient(data)

  const sections: PatientSection[] = [
    { label: 'Cartillas', to: paths.boards(patientId), icon: LayoutGrid },
    ...(canAccessSessions(data) ? [{ label: 'Sesiones', to: paths.sessions(patientId), icon: CalendarDays }] : []),
    ...(canAccessCollaborators(data) ? [{ label: 'Familia', to: paths.collaborators(patientId), icon: Users }] : []),
    ...(canViewTherapists(data) ? [{ label: 'Equipo', to: paths.therapists(patientId), icon: Stethoscope }] : []),
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
    <PageLayout backLink={{ to: paths.patients(), label: 'Volver a pacientes' }}>
      <PatientHeader
        patient={data}
        space={spaceOf(data, organizations)}
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
      {justCreated && <PatientCreatedPanel patient={data} onDismiss={() => setJustCreated(false)} />}
      <PatientSectionNav sections={sections} />
      <Outlet />
    </PageLayout>
  )
}
