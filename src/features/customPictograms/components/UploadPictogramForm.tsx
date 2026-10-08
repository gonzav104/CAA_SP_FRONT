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
      setFieldError('Elige una imagen.')
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
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">Subir pictograma</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pictogram-etiqueta">Etiqueta</Label>
          <Input
            id="pictogram-etiqueta"
            autoFocus
            disabled={isPending}
            value={etiqueta}
            onChange={(event) => setEtiqueta(event.target.value)}
            className="h-10"
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
            className="h-10 cursor-pointer"
          />
        </div>
      </div>

      {(fieldError ?? error) && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {fieldError ?? error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Subiendo…' : 'Subir pictograma'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
