import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { BRAND_ACTION_CLASS } from '@/layouts/brand'

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
      className="flex w-full flex-col gap-2 rounded-lg border border-destructive/40 bg-background p-3 text-sm"
    >
      <p className="font-medium">{`¿Eliminar la sesión del ${dateTimeLabel}?`}</p>
      <p>No se puede deshacer.</p>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="lg"
          className={BRAND_ACTION_CLASS}
          disabled={isPending}
          aria-busy={isPending || undefined}
          onClick={onConfirm}
        >
          {isPending ? 'Eliminando…' : 'Sí, eliminar'}
        </Button>
        <Button type="button" variant="outline" size="lg" className={BRAND_ACTION_CLASS} disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      <FormAlert message={error} />
    </div>
  )
}
