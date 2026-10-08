import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ACCEPT_ATTRIBUTE, validateImageFile } from '../fileValidation'
import type { CustomPictogram } from '../types'

type Mode = 'view' | 'edit' | 'delete'

interface CustomPictogramCardProps {
  pictogram: CustomPictogram
  canEdit: boolean
  canDelete: boolean
  mode: Mode
  isEditPending: boolean
  editError: string | null
  isDeletePending: boolean
  deleteError: string | null
  onStartEdit: () => void
  onStartDelete: () => void
  onCancel: () => void
  onSubmitEdit: (values: { etiqueta?: string; archivo?: File }) => void
  onConfirmDelete: () => void
}

/** One tile of the patient's own pictogram library: preview, label, and real-permission actions. */
export function CustomPictogramCard({
  pictogram,
  canEdit,
  canDelete,
  mode,
  isEditPending,
  editError,
  isDeletePending,
  deleteError,
  onStartEdit,
  onStartDelete,
  onCancel,
  onSubmitEdit,
  onConfirmDelete,
}: CustomPictogramCardProps) {
  const [etiqueta, setEtiqueta] = useState(pictogram.label)
  const [file, setFile] = useState<File | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmitEdit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = etiqueta.trim()
    if (trimmed === '') {
      setFieldError('La etiqueta es obligatoria.')
      return
    }
    if (file) {
      const fileError = validateImageFile(file)
      if (fileError) {
        setFieldError(fileError)
        return
      }
    }
    setFieldError(null)
    onSubmitEdit({
      etiqueta: trimmed !== pictogram.label ? trimmed : undefined,
      archivo: file ?? undefined,
    })
  }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-background p-4">
      <div className="aspect-square overflow-hidden rounded-xl bg-muted">
        <img src={pictogram.imageUrl} alt={pictogram.label} className="size-full object-contain" />
      </div>

      {mode === 'edit' ? (
        <form onSubmit={handleSubmitEdit} className="flex flex-col gap-2">
          <Label htmlFor={`edit-etiqueta-${pictogram.id}`} className="sr-only">
            Etiqueta
          </Label>
          <Input
            id={`edit-etiqueta-${pictogram.id}`}
            autoFocus
            disabled={isEditPending}
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
            className="h-9"
          />
          <Label htmlFor={`edit-archivo-${pictogram.id}`} className="text-xs text-muted-foreground">
            Reemplazar imagen (opcional)
          </Label>
          <Input
            id={`edit-archivo-${pictogram.id}`}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            disabled={isEditPending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="h-9 cursor-pointer text-xs"
          />
          {(fieldError ?? editError) && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900">
              {fieldError ?? editError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isEditPending} aria-busy={isEditPending || undefined}>
              {isEditPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isEditPending} onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <span className="truncate text-sm font-medium text-foreground" title={pictogram.label}>
          {pictogram.label}
        </span>
      )}

      {mode === 'view' && (canEdit || canDelete) && (
        <div className="flex gap-1.5">
          {canEdit && (
            <Button type="button" variant="outline" size="icon" aria-label="Editar pictograma" onClick={onStartEdit}>
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Eliminar pictograma"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onStartDelete}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </Button>
          )}
        </div>
      )}

      {mode === 'delete' && (
        <div
          role="group"
          aria-label={`Confirmar eliminación de ${pictogram.label}`}
          className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs"
        >
          <p className="font-medium">{`¿Eliminar «${pictogram.label}»?`}</p>
          <p>No se puede deshacer.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeletePending}
              aria-busy={isDeletePending || undefined}
              onClick={onConfirmDelete}
            >
              {isDeletePending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={isDeletePending} onClick={onCancel}>
              Cancelar
            </Button>
          </div>
          {deleteError && (
            <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
