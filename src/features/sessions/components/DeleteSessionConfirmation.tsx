import { Button } from '@/components/ui/button'

interface DeleteSessionConfirmationProps {
  dateTimeLabel: string
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

/** Inline confirmation under a session row, same convention as DeleteBoardConfirmation/DeletePatientConfirmation. */
export function DeleteSessionConfirmation({
  dateTimeLabel,
  isPending,
  error,
  onConfirm,
  onCancel,
}: DeleteSessionConfirmationProps) {
  return (
    <div
      role="group"
      aria-label="Confirmar eliminación de sesión"
      className="flex w-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-medium">{`¿Eliminar la sesión del ${dateTimeLabel}?`}</p>
      <p>No se puede deshacer.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          aria-busy={isPending || undefined}
          onClick={onConfirm}
        >
          {isPending ? 'Eliminando…' : 'Sí, eliminar'}
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
