import { Button } from '@/components/ui/button'
import { useBoardDetail } from '../hooks'

interface DeleteBoardConfirmationProps {
  patientId: string
  boardId: string
  name: string
  isPrimary: boolean
  /** True while the DELETE is pending. */
  isPending: boolean
  /** Message of the last failed delete. */
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

/** Inline confirmation under a row. The content line comes from one on-demand GET of the cartilla detail. */
export function DeleteBoardConfirmation({
  patientId,
  boardId,
  name,
  isPrimary,
  isPending,
  error,
  onConfirm,
  onCancel,
}: DeleteBoardConfirmationProps) {
  const detail = useBoardDetail(patientId, boardId, { enabled: true })
  const isLoading = detail.isPending && !detail.isError

  let content: string
  if (detail.data) {
    const categories = detail.data.categories.length
    const items = detail.data.items.length
    content =
      categories === 0 && items === 0
        ? 'La cartilla no tiene categorías ni tarjetas.'
        : `Se eliminarán de forma permanente sus ${plural(categories, 'categoría', 'categorías')} y sus ${plural(items, 'tarjeta', 'tarjetas')}.`
  } else if (detail.isError) {
    content = 'No se pudo consultar su contenido. Sus categorías y tarjetas se eliminarán igualmente.'
  } else {
    content = 'Consultando su contenido…'
  }

  return (
    <div
      role="group"
      aria-label="Confirmar eliminación de cartilla"
      className="flex w-full flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
    >
      <p className="font-medium">{`¿Eliminar la cartilla «${name}»?`}</p>
      <p>{content}</p>
      <p>No se puede deshacer.</p>
      {isPrimary && (
        <p>
          Es la cartilla principal: el paciente quedará sin cartilla principal. No se elegirá otra automáticamente.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending || isLoading}
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
