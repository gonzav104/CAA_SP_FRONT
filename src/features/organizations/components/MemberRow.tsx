import { useState } from 'react'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import { BRAND_ACTION_CLASS, BRAND_PANEL_CLASS } from '@/layouts/brand'
import { cn, initialOf } from '@/lib/utils'
import type { MiembroResponse, RolGestionAsignable } from '../apiTypes'
import { ROL_GESTION_LABELS } from '../spaces'
import { MemberBadges } from './MemberBadges'

const ROW_ACTION_CLASS = 'h-11 flex-1 lg:h-10 lg:flex-none'
// Same width for either label, so the role selectors of all the rows line up.
const THERAPIST_ACTION_CLASS = cn(ROW_ACTION_CLASS, 'lg:w-48')

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
    <li className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-3 p-4')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-azul-suave font-display font-bold text-caa-azul"
          >
            {initialOf(member.nombre)}
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex min-w-0 flex-col">
              <span className="font-semibold wrap-anywhere text-foreground">{name}</span>
              <span className="text-sm wrap-anywhere text-muted-foreground">{member.email}</span>
            </div>
            <MemberBadges role={member.rolGestion} isTherapist={member.esTerapeuta} />
            {isSelf && member.rolGestion === 'OWNER' && (
              <span className="text-sm text-muted-foreground">Como propietario, no podés salir del espacio.</span>
            )}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
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
                className={cn(NATIVE_SELECT_CLASS, 'basis-full lg:h-10 lg:w-44 lg:basis-auto')}
              >
                <option value="MIEMBRO">{ROL_GESTION_LABELS.MIEMBRO}</option>
                <option value="ADMIN">{ROL_GESTION_LABELS.ADMIN}</option>
              </select>
            </>
          )}
          {canChangeTherapist &&
            (member.esTerapeuta ? (
              <Button type="button" variant="outline" size="lg" className={THERAPIST_ACTION_CLASS} disabled={isPending} onClick={() => setConfirming('stop-therapist')}>
                Quitar rol de terapeuta
              </Button>
            ) : (
              <Button type="button" variant="outline" size="lg" className={THERAPIST_ACTION_CLASS} disabled={isPending} onClick={() => onChangeTherapist(true)}>
                Habilitar como terapeuta
              </Button>
            ))}
          {canRemove && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={cn(ROW_ACTION_CLASS, 'text-destructive hover:bg-destructive/10 hover:text-destructive')}
              disabled={isPending}
              onClick={() => setConfirming('remove')}
            >
              {isSelf ? 'Salir del espacio' : 'Quitar del espacio'}
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <div
          role="group"
          aria-label={confirming === 'remove' ? `Confirmar la salida de ${member.nombre}` : `Confirmar el cambio de ${member.nombre}`}
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-background p-3 text-sm"
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
              ? isSelf
                ? 'Vas a perder el acceso a los pacientes del espacio y tus asignaciones clínicas.'
                : 'Perderá el acceso a los pacientes del espacio y sus asignaciones clínicas.'
              : 'Dejará de estar asignado a los pacientes de este espacio.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className={BRAND_ACTION_CLASS}
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
            <Button type="button" variant="outline" size="lg" className={BRAND_ACTION_CLASS} disabled={isPending} onClick={() => setConfirming(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      <FormAlert message={error} />
    </li>
  )
}
