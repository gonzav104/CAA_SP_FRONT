import { useState } from 'react'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import { PERMISSION_LABELS } from '@/features/patients/format'
import { BRAND_ACTION_CLASS } from '@/layouts/brand'
import { cn, initialOf } from '@/lib/utils'
import type { PermisoColaborador } from '../apiTypes'
import type { Collaborator } from '../types'

interface CollaboratorRowProps {
  collaborator: Collaborator
  isPermissionPending: boolean
  permissionError: string | null
  isRevokePending: boolean
  revokeError: string | null
  onChangePermission: (permiso: PermisoColaborador) => void
  onConfirmRevoke: () => void
}

/** One linked family collaborator: identity, real permission control, and revoke with confirmation. */
export function CollaboratorRow({
  collaborator,
  isPermissionPending,
  permissionError,
  isRevokePending,
  revokeError,
  onChangePermission,
  onConfirmRevoke,
}: CollaboratorRowProps) {
  const [isConfirmingRevoke, setIsConfirmingRevoke] = useState(false)

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-azul-suave font-display font-bold text-caa-azul"
          >
            {initialOf(collaborator.name)}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-semibold wrap-anywhere text-foreground">{collaborator.name}</span>
            <span className="text-sm wrap-anywhere text-muted-foreground">{collaborator.email}</span>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label className="sr-only" htmlFor={`permission-${collaborator.userId}`}>
            Permiso de {collaborator.name}
          </label>
          <select
            id={`permission-${collaborator.userId}`}
            value={collaborator.permission}
            disabled={isPermissionPending}
            onChange={(event) => onChangePermission(event.target.value as PermisoColaborador)}
            className={cn(NATIVE_SELECT_CLASS, 'min-w-0 flex-1 sm:h-10 sm:w-44 sm:flex-none')}
          >
            {Object.entries(PERMISSION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="lg" className="h-11 shrink-0 sm:h-10" onClick={() => setIsConfirmingRevoke(true)}>
            Quitar acceso
          </Button>
        </div>
      </div>

      <FormAlert message={permissionError} />

      {isConfirmingRevoke && (
        <div
          role="group"
          aria-label={`Confirmar que se quita el acceso de ${collaborator.name}`}
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-background p-3 text-sm"
        >
          <p className="font-medium">{`¿Quitar el acceso de ${collaborator.name}?`}</p>
          <p>Dejará de ver y usar las cartillas y pictogramas de este paciente.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className={BRAND_ACTION_CLASS}
              disabled={isRevokePending}
              aria-busy={isRevokePending || undefined}
              onClick={onConfirmRevoke}
            >
              {isRevokePending ? 'Quitando…' : 'Sí, quitar acceso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className={BRAND_ACTION_CLASS}
              disabled={isRevokePending}
              onClick={() => setIsConfirmingRevoke(false)}
            >
              Cancelar
            </Button>
          </div>
          <FormAlert message={revokeError} />
        </div>
      )}
    </li>
  )
}
