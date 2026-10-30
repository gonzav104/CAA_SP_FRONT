import { useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage, getTherapistAssignmentErrorMessage } from '@/api/errors'
import { EmptyPanel } from '@/components/EmptyPanel'
import { ErrorState } from '@/components/ErrorState'
import { FormAlert } from '@/components/FormAlert'
import { RowsSkeleton } from '@/components/RowsSkeleton'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import { useMembers } from '@/features/organizations/hooks'
import { usePatient } from '@/features/patients/hooks'
import { canManageTherapists, canViewTherapists } from '@/features/patients/permissions'
import type { Patient } from '@/features/patients/types'
import { BRAND_ACTION_CLASS, BRAND_PANEL_CLASS, BRAND_SECTION_TITLE_CLASS } from '@/layouts/brand'
import { cn, initialOf } from '@/lib/utils'
import { useAssignedTherapists, useAssignTherapist, useUnassignTherapist } from '../hooks'

/**
 * Equipo tab of the patient workspace: the therapists clinically assigned to this patient. Being a
 * member (even a therapist) of the organization is not the same as being assigned to the patient.
 */
export function PatientTherapistsPage() {
  const { pacienteId } = useParams()
  const patient = usePatient(pacienteId ?? '')
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  // The workspace layout already loads the patient (and handles its errors); this reads the same entry.
  if (!patient.data) return <RowsSkeleton message="Cargando equipo…" />
  if (!canViewTherapists(patient.data)) {
    return <EmptyPanel icon={Stethoscope}>Solo el equipo clínico del paciente puede ver a sus terapeutas.</EmptyPanel>
  }
  return <TherapistsContent patient={patient.data} />
}

function TherapistsContent({ patient }: { patient: Patient }) {
  const canManage = canManageTherapists(patient)
  const assigned = useAssignedTherapists(patient.id, true)
  // Candidates come from the patient's own organization only: the backend refuses anyone else.
  const members = useMembers(patient.organizationId, canManage)
  const assign = useAssignTherapist(patient.id, patient.organizationId)
  const unassign = useUnassignTherapist(patient.id)

  const [selected, setSelected] = useState('')
  const [assignError, setAssignError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [rowError, setRowError] = useState<{ userId: string; message: string } | null>(null)

  if (assigned.isPending) return <RowsSkeleton message="Cargando equipo…" />
  if (assigned.isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(assigned.error, 'No encontramos el equipo de este paciente o no tenés acceso.')}
        onRetry={() => void assigned.refetch()}
      />
    )
  }

  const assignedIds = new Set(assigned.data.map((therapist) => therapist.usuarioId))
  const candidates = (members.data ?? []).filter((member) => member.esTerapeuta && !assignedIds.has(member.usuarioId))
  const isPending = assign.isPending || unassign.isPending

  const handleAssign = async () => {
    if (!selected || isPending) return
    setAssignError(null)
    try {
      await assign.mutateAsync(selected)
      setSelected('')
    } catch (err) {
      setAssignError(getTherapistAssignmentErrorMessage(err))
    }
  }

  const handleUnassign = async (userId: string) => {
    setRowError(null)
    try {
      await unassign.mutateAsync(userId)
      setConfirmingId(null)
    } catch (err) {
      setRowError({ userId, message: getTherapistAssignmentErrorMessage(err) })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className={BRAND_SECTION_TITLE_CLASS}>Equipo</h2>
        <p className="text-sm text-muted-foreground">
          Terapeutas asignados a este paciente. Ser miembro del espacio no implica atenderlo.
        </p>
      </div>

      {assigned.data.length === 0 ? (
        <EmptyPanel icon={Stethoscope}>Este paciente todavía no tiene terapeutas asignados.</EmptyPanel>
      ) : (
        <ul aria-label="Terapeutas asignados" className="flex flex-col gap-3">
          {assigned.data.map((therapist) => (
            <li key={therapist.usuarioId} className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-3 p-4')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-azul-suave font-display font-bold text-caa-azul"
                  >
                    {initialOf(therapist.nombre)}
                  </span>
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-semibold wrap-anywhere text-foreground">{therapist.nombre}</span>
                    <span className="text-sm wrap-anywhere text-muted-foreground">{therapist.email}</span>
                  </div>
                </div>
                {canManage && confirmingId !== therapist.usuarioId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    className="h-11 w-full sm:h-10 sm:w-auto"
                    disabled={isPending}
                    onClick={() => setConfirmingId(therapist.usuarioId)}
                  >
                    Quitar asignación
                  </Button>
                )}
              </div>
              {confirmingId === therapist.usuarioId && (
                <div
                  role="group"
                  aria-label={`Confirmar que se quita la asignación de ${therapist.nombre}`}
                  className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-background p-3 text-sm"
                >
                  <p className="font-medium">{`¿Quitar a ${therapist.nombre} del equipo de este paciente?`}</p>
                  <p>Seguirá siendo miembro del espacio, pero dejará de atender a este paciente.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="lg"
                      className={BRAND_ACTION_CLASS}
                      disabled={isPending}
                      aria-busy={unassign.isPending || undefined}
                      onClick={() => void handleUnassign(therapist.usuarioId)}
                    >
                      {unassign.isPending ? 'Quitando…' : 'Sí, quitar asignación'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className={BRAND_ACTION_CLASS}
                      disabled={isPending}
                      onClick={() => setConfirmingId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              <FormAlert message={rowError?.userId === therapist.usuarioId ? rowError.message : null} />
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <section aria-labelledby="assign-therapist-title" className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-3 p-5')}>
          <div className="flex flex-col gap-1">
            <h3 id="assign-therapist-title" className="font-semibold text-foreground">
              Terapeutas del espacio
            </h3>
            <p className="text-sm text-muted-foreground">Solo aparecen quienes todavía no atienden a este paciente.</p>
          </div>
          {members.isError ? (
            <p role="alert" className="text-sm text-muted-foreground">
              No se pudieron cargar los terapeutas del espacio.
            </p>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {members.isPending
                ? 'Cargando terapeutas del espacio…'
                : 'No hay más terapeutas del espacio para asignar. Habilitá a un miembro como terapeuta desde Miembros del espacio.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Label htmlFor="assign-therapist">Asignar terapeuta</Label>
                <select
                  id="assign-therapist"
                  value={selected}
                  disabled={isPending}
                  onChange={(event) => setSelected(event.target.value)}
                  className={NATIVE_SELECT_CLASS}
                >
                  <option value="">Elegí un terapeuta del espacio</option>
                  {candidates.map((member) => (
                    <option key={member.usuarioId} value={member.usuarioId}>
                      {`${member.nombre} (${member.email})`}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                size="lg"
                className="h-11"
                disabled={!selected || isPending}
                aria-busy={assign.isPending || undefined}
                onClick={() => void handleAssign()}
              >
                {assign.isPending ? 'Asignando…' : 'Asignar'}
              </Button>
            </div>
          )}
          <FormAlert message={assignError} />
        </section>
      )}
    </div>
  )
}
