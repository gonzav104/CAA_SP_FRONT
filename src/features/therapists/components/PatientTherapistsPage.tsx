import { useState } from 'react'
import { Stethoscope } from 'lucide-react'
import { Navigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage, getTherapistAssignmentErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useMembers } from '@/features/organizations/hooks'
import { usePatient } from '@/features/patients/hooks'
import { canManageTherapists, canViewTherapists } from '@/features/patients/permissions'
import type { Patient } from '@/features/patients/types'
import { initialOf } from '@/lib/utils'
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
  if (!patient.data) return <LoadingState message="Cargando equipo…" />
  if (!canViewTherapists(patient.data)) {
    return (
      <p className="rounded-2xl border border-border/60 bg-background px-6 py-10 text-center text-muted-foreground">
        Solo el equipo clínico del paciente puede ver a sus terapeutas.
      </p>
    )
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

  if (assigned.isPending) return <LoadingState message="Cargando equipo…" />
  if (assigned.isError) {
    return (
      <ErrorState
        message={getReadErrorMessage(assigned.error, 'No encontramos el equipo de este paciente o no tienes acceso.')}
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
    <div className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold text-foreground">Equipo</h2>

      {canManage && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5">
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
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex min-w-60 flex-col gap-1.5">
                <Label htmlFor="assign-therapist">Asignar terapeuta</Label>
                <select
                  id="assign-therapist"
                  value={selected}
                  disabled={isPending}
                  onChange={(event) => setSelected(event.target.value)}
                  className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
                disabled={!selected || isPending}
                aria-busy={assign.isPending || undefined}
                onClick={() => void handleAssign()}
              >
                {assign.isPending ? 'Asignando…' : 'Asignar'}
              </Button>
            </div>
          )}
          {assignError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {assignError}
            </p>
          )}
        </div>
      )}

      {assigned.data.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <Stethoscope aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">Este paciente todavía no tiene terapeutas asignados.</p>
        </div>
      ) : (
        <ul aria-label="Terapeutas asignados" className="flex flex-col gap-3">
          {assigned.data.map((therapist) => (
            <li key={therapist.usuarioId} className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-sm font-semibold text-caa-accent"
                  >
                    {initialOf(therapist.nombre)}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-foreground">{therapist.nombre}</span>
                    <span className="text-sm text-muted-foreground">{therapist.email}</span>
                  </div>
                </div>
                {canManage && confirmingId !== therapist.usuarioId && (
                  <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirmingId(therapist.usuarioId)}>
                    Quitar asignación
                  </Button>
                )}
              </div>
              {confirmingId === therapist.usuarioId && (
                <div
                  role="group"
                  aria-label={`Confirmar que se quita la asignación de ${therapist.nombre}`}
                  className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
                >
                  <p className="font-medium">{`¿Quitar a ${therapist.nombre} del equipo de este paciente?`}</p>
                  <p>Seguirá siendo miembro del espacio, pero dejará de atender a este paciente.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={isPending}
                      aria-busy={unassign.isPending || undefined}
                      onClick={() => void handleUnassign(therapist.usuarioId)}
                    >
                      {unassign.isPending ? 'Quitando…' : 'Sí, quitar asignación'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirmingId(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
              {rowError?.userId === therapist.usuarioId && (
                <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
                  {rowError.message}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
