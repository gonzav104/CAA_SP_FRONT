import { useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
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
    <li
      className={cn(
        'flex flex-col gap-3 rounded-xl border bg-background p-3 transition-colors',
        mode === 'view' && 'border-border',
        mode === 'edit' && 'col-span-2 border-caa-azul',
        mode === 'delete' && 'col-span-2 border-destructive/60',
      )}
    >
      <div className={cn('aspect-square overflow-hidden rounded-lg bg-caa-niebla', mode !== 'view' && 'mx-auto w-full max-w-40')}>
        <img src={pictogram.imageUrl} alt={pictogram.label} loading="lazy" className="size-full object-contain" />
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
            className="h-11 sm:h-10"
          />
          <Label htmlFor={`edit-archivo-${pictogram.id}`} className="text-sm text-muted-foreground">
            Reemplazar imagen (opcional)
          </Label>
          <Input
            id={`edit-archivo-${pictogram.id}`}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            disabled={isEditPending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="h-11 cursor-pointer py-2.5 text-xs sm:h-10 sm:py-2"
          />
          {(fieldError ?? editError) && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-2 py-1 text-sm text-destructive">
              {fieldError ?? editError}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" size="lg" className="h-11 flex-1 sm:h-10" disabled={isEditPending} aria-busy={isEditPending || undefined}>
              {isEditPending ? 'Guardando…' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11 flex-1 sm:h-10" disabled={isEditPending} onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <span className="truncate text-sm font-semibold text-foreground" title={pictogram.label}>
          {pictogram.label}
        </span>
      )}

      {mode === 'view' && (canEdit || canDelete) && (
        <div className="mt-auto flex gap-1.5">
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Editar ${pictogram.label}`}
              className="size-11 flex-1 sm:size-10"
              onClick={onStartEdit}
            >
              <Pencil aria-hidden="true" className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={`Eliminar ${pictogram.label}`}
              className="size-11 flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive sm:size-10"
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
          className="flex flex-col gap-2 text-sm"
        >
          <p className="font-medium">{`¿Eliminar «${pictogram.label}»?`}</p>
          <p>No se puede deshacer.</p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="destructive"
              size="lg"
              className="h-11 flex-1 sm:h-10"
              disabled={isDeletePending}
              aria-busy={isDeletePending || undefined}
              onClick={onConfirmDelete}
            >
              {isDeletePending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
            <Button type="button" variant="outline" size="lg" className="h-11 flex-1 sm:h-10" disabled={isDeletePending} onClick={onCancel}>
              Cancelar
            </Button>
          </div>
          {deleteError && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-2 py-1 text-sm text-destructive">
              {deleteError}
            </p>
          )}
        </div>
      )}
    </li>
  )
}
