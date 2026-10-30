import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ACCEPT_ATTRIBUTE, validateImageFile } from '../fileValidation'

interface UploadPictogramFormProps {
  isPending: boolean
  error: string | null
  onSubmit: (values: { etiqueta: string; archivo: File }) => void
  onCancel: () => void
}

/** Inline upload form: etiqueta + archivo, validated client-side against the real backend limits. */
export function UploadPictogramForm({ isPending, error, onSubmit, onCancel }: UploadPictogramFormProps) {
  const [etiqueta, setEtiqueta] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = etiqueta.trim()
    if (trimmed === '') {
      setFieldError('La etiqueta es obligatoria.')
      return
    }
    if (!file) {
      setFieldError('Elegí una imagen.')
      return
    }
    const fileError = validateImageFile(file)
    if (fileError) {
      setFieldError(fileError)
      return
    }
    setFieldError(null)
    onSubmit({ etiqueta: trimmed, archivo: file })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5"
    >
      <h3 className="font-semibold text-foreground">Subir pictograma</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pictogram-etiqueta">Etiqueta</Label>
          <Input
            id="pictogram-etiqueta"
            autoFocus
            disabled={isPending}
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
            className="h-11"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pictogram-archivo">Imagen (JPEG, PNG o WEBP, máx. 5MB)</Label>
          <Input
            id="pictogram-archivo"
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            disabled={isPending}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="h-11 cursor-pointer py-2.5"
          />
        </div>
      </div>

      {(fieldError ?? error) && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {fieldError ?? error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-11 sm:h-10" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="h-11 sm:h-10" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Subiendo…' : 'Subir pictograma'}
        </Button>
      </div>
    </form>
  )
}
