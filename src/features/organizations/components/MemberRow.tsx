import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { initialOf } from '@/lib/utils'
import type { MiembroResponse, RolGestionAsignable } from '../apiTypes'
import { ROL_GESTION_LABELS } from '../spaces'

type PendingConfirmation = 'remove' | 'stop-therapist' | null

interface MemberRowProps {
  member: MiembroResponse
  isSelf: boolean
  canChangeRole: boolean
  canChangeTherapist: boolean
  canRemove: boolean
  isPending: boolean
  error: string | null
  onChangeRole: (rolGestion: RolGestionAsignable) => void
  onChangeTherapist: (esTerapeuta: boolean) => void
  onRemove: () => void
}

/** One active member: identity, management role and clinical capacity, with the actions allowed. */
export function MemberRow({
  member,
  isSelf,
  canChangeRole,
  canChangeTherapist,
  canRemove,
  isPending,
  error,
  onChangeRole,
  onChangeTherapist,
  onRemove,
}: MemberRowProps) {
  const [confirming, setConfirming] = useState<PendingConfirmation>(null)
  const name = isSelf ? `${member.nombre} (vos)` : member.nombre

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-sm font-semibold text-caa-accent"
          >
            {initialOf(member.nombre)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{name}</span>
            <span className="text-sm text-muted-foreground">{member.email}</span>
            <span className="text-sm text-muted-foreground">
              {member.esTerapeuta
                ? `${ROL_GESTION_LABELS[member.rolGestion]} · Terapeuta`
                : ROL_GESTION_LABELS[member.rolGestion]}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canChangeRole && (
            <>
              <label className="sr-only" htmlFor={`member-role-${member.usuarioId}`}>
                {`Rol de gestión de ${member.nombre}`}
              </label>
              <select
                id={`member-role-${member.usuarioId}`}
                value={member.rolGestion}
                disabled={isPending}
                onChange={(event) => onChangeRole(event.target.value as RolGestionAsignable)}
                className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value="MIEMBRO">{ROL_GESTION_LABELS.MIEMBRO}</option>
                <option value="ADMIN">{ROL_GESTION_LABELS.ADMIN}</option>
              </select>
            </>
          )}
          {canChangeTherapist &&
            (member.esTerapeuta ? (
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirming('stop-therapist')}>
                Quitar rol de terapeuta
              </Button>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => onChangeTherapist(true)}>
                Habilitar como terapeuta
              </Button>
            ))}
          {canRemove && (
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirming('remove')}>
              {isSelf ? 'Salir del espacio' : 'Quitar del espacio'}
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <div
          role="group"
          aria-label={confirming === 'remove' ? `Confirmar la salida de ${member.nombre}` : `Confirmar el cambio de ${member.nombre}`}
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
        >
          <p className="font-medium">
            {confirming === 'remove'
              ? isSelf
                ? '¿Salir de este espacio?'
                : `¿Quitar a ${member.nombre} del espacio?`
              : `¿Quitar el rol de terapeuta a ${member.nombre}?`}
          </p>
          <p>
            {confirming === 'remove'
              ? 'Perderá el acceso a los pacientes del espacio y sus asignaciones clínicas.'
              : 'Dejará de estar asignado a los pacientes de este espacio.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              aria-busy={isPending || undefined}
              onClick={() => {
                setConfirming(null)
                if (confirming === 'remove') onRemove()
                else onChangeTherapist(false)
              }}
            >
              Confirmar
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
    </li>
  )
}
