import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { isNewCardValid, withPictogram } from '../newCardForm'
import type { NewCardForm } from '../newCardForm'
import { TEXTO_HABLADO_MAX, TEXTO_VISIBLE_MAX } from '../savePlan'
import type { BoardCategory, Pictogram } from '../types'
import { PictogramPicker } from './PictogramPicker'
import type { PictogramLibraryStatus } from './PictogramPicker'

interface NewItemPanelProps {
  form: NewCardForm
  categories: BoardCategory[]
  boardPictograms: Pictogram[]
  libraryStatus: PictogramLibraryStatus
  globalLibrary: Pictogram[]
  isCreating: boolean
  /** Message of the last failed creation; the form keeps everything the user typed. */
  error: string | null
  /** True once the card exists on the server but the reload failed: creating again would duplicate it. */
  blockSubmit: boolean
  onChange: (form: NewCardForm) => void
  onSubmit: () => void
  onCancel: () => void
}

/** Form to create a card at the end of a category. Controlled: the page owns the state and the request. */
export function NewItemPanel({
  form,
  categories,
  boardPictograms,
  libraryStatus,
  globalLibrary,
  isCreating,
  error,
  blockSubmit,
  onChange,
  onSubmit,
  onCancel,
}: NewItemPanelProps) {
  // A field only complains once the user touched it (blur or first change).
  const [touched, setTouched] = useState({ label: false, spokenText: false })
  const touch = (field: 'label' | 'spokenText') => setTouched((current) => ({ ...current, [field]: true }))
  const isLabelMissing = form.label.trim() === ''
  const isSpokenTextMissing = form.spokenText.trim() === ''
  const showLabelError = touched.label && isLabelMissing
  const showSpokenTextError = touched.spokenText && isSpokenTextMissing
  const isValid = isNewCardValid(form, categories)
  const category = categories.find((candidate) => candidate.id === form.categoryId)

  return (
    <section aria-labelledby="new-item-title" className="flex flex-col rounded-xl border bg-background">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 id="new-item-title" className="font-semibold">Nueva tarjeta</h2>
      </header>

      <div className="flex flex-col gap-6 p-4">
        {categories.length === 1 ? (
          <p className="text-sm">
            <span className="font-medium">Categoría:</span> {category?.name ?? categories[0].name}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="new-item-category">Categoría</Label>
            <select
              id="new-item-category"
              value={form.categoryId}
              onChange={(event) => onChange({ ...form, categoryId: event.target.value })}
              aria-describedby="new-item-category-hint"
              className="h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
            >
              {categories.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
            <p id="new-item-category-hint" className="text-xs text-muted-foreground">
              La tarjeta se agrega al final de la categoría.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <span id="new-pictogram-picker-label" className="text-sm font-medium">Pictograma</span>
          <PictogramPicker
            selected={form.pictogram}
            boardPictograms={boardPictograms}
            libraryStatus={libraryStatus}
            globalLibrary={globalLibrary}
            onChange={(pictogram) => onChange(withPictogram(form, pictogram))}
            labelledBy="new-pictogram-picker-label"
          />
          {form.pictogram === null && (
            <p className="text-xs text-muted-foreground">Elige un pictograma para la tarjeta.</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-item-label">Texto visible</Label>
          <Input
            id="new-item-label"
            value={form.label}
            maxLength={TEXTO_VISIBLE_MAX}
            onChange={(event) => {
              touch('label')
              onChange({ ...form, label: event.target.value })
            }}
            onBlur={() => touch('label')}
            aria-invalid={showLabelError || undefined}
            aria-describedby="new-item-label-hint"
            className="h-10 text-base"
          />
          <p
            id="new-item-label-hint"
            className={cn('text-xs', showLabelError ? 'text-destructive' : 'text-muted-foreground')}
          >
            {showLabelError
              ? 'El texto visible es obligatorio.'
              : 'Se muestra en mayúsculas en la tarjeta. Breve: una o dos palabras.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-item-spoken-text">Texto hablado</Label>
          <Textarea
            id="new-item-spoken-text"
            value={form.spokenText}
            maxLength={TEXTO_HABLADO_MAX}
            rows={2}
            onChange={(event) => {
              touch('spokenText')
              onChange({ ...form, spokenText: event.target.value })
            }}
            onBlur={() => touch('spokenText')}
            aria-invalid={showSpokenTextError || undefined}
            aria-describedby="new-item-spoken-text-hint"
            className="text-base"
          />
          <p
            id="new-item-spoken-text-hint"
            className={cn('text-xs', showSpokenTextError ? 'text-destructive' : 'text-muted-foreground')}
          >
            {showSpokenTextError ? 'El texto hablado es obligatorio.' : 'Lo que se dice en voz alta al tocar la tarjeta.'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="new-item-active">Mostrar en el Modo Uso</Label>
            <span className="text-xs text-muted-foreground">
              Una tarjeta oculta conserva su posición y su configuración.
            </span>
          </div>
          <Switch
            id="new-item-active"
            checked={form.isActive}
            onCheckedChange={(checked) => onChange({ ...form, isActive: checked })}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            {error}
          </p>
        )}
      </div>

      <footer className="mt-auto flex flex-col gap-2 border-t p-3">
        <Button
          size="lg"
          className="w-full"
          disabled={isCreating || blockSubmit || !isValid}
          aria-busy={isCreating || undefined}
          onClick={onSubmit}
        >
          {isCreating ? 'Creando…' : 'Crear tarjeta'}
        </Button>
        <Button variant="outline" size="lg" className="w-full" disabled={isCreating} onClick={onCancel}>
          Cancelar
        </Button>
      </footer>
    </section>
  )
}
