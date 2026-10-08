import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PERMISSION_LABELS } from '@/features/patients/format'
import { initialOf } from '@/lib/utils'
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
    <li className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-sm font-semibold text-caa-accent"
          >
            {initialOf(collaborator.name)}
          </span>
          <div className="flex flex-col gap-0.5">
            <span className="font-medium text-foreground">{collaborator.name}</span>
            <span className="text-sm text-muted-foreground">{collaborator.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`permission-${collaborator.userId}`}>
            Permiso de {collaborator.name}
          </label>
          <select
            id={`permission-${collaborator.userId}`}
            value={collaborator.permission}
            disabled={isPermissionPending}
            onChange={(event) => onChangePermission(event.target.value as PermisoColaborador)}
            className="h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {Object.entries(PERMISSION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirmingRevoke(true)}>
            Quitar acceso
          </Button>
        </div>
      </div>

      {permissionError && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {permissionError}
        </p>
      )}

      {isConfirmingRevoke && (
        <div
          role="group"
          aria-label={`Confirmar que se quita el acceso de ${collaborator.name}`}
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
        >
          <p className="font-medium">{`¿Quitar el acceso de ${collaborator.name}?`}</p>
          <p>Dejará de ver y usar las cartillas y pictogramas de este paciente.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isRevokePending}
              aria-busy={isRevokePending || undefined}
              onClick={onConfirmRevoke}
            >
              {isRevokePending ? 'Quitando…' : 'Sí, quitar acceso'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isRevokePending}
              onClick={() => setIsConfirmingRevoke(false)}
            >
              Cancelar
            </Button>
          </div>
          {revokeError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
              {revokeError}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
