import { Button } from '@/components/ui/button'

interface DeletePatientConfirmationProps {
  name: string
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Inline confirmation for a destructive, irreversible action. The impact described here mirrors
 * the real `ON DELETE CASCADE` foreign keys on `pacientes` (cartillas → categorías → ítems,
 * sesiones, pictogramas_custom, paciente_familiar) — not a guess.
 */
export function DeletePatientConfirmation({ name, isPending, error, onConfirm, onCancel }: DeletePatientConfirmationProps) {
  return (
    <div
      role="group"
      aria-label="Confirmar eliminación de paciente"
      className="flex w-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm"
    >
      <p className="font-medium">{`¿Eliminar a ${name}?`}</p>
      <p>
        Se eliminarán también sus cartillas, categorías y tarjetas, sus sesiones registradas, sus pictogramas propios
        y los vínculos con familiares.
      </p>
      <p>No se puede deshacer.</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          aria-busy={isPending || undefined}
          onClick={onConfirm}
        >
          {isPending ? 'Eliminando…' : 'Sí, eliminar definitivamente'}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
    </div>
  )
}
