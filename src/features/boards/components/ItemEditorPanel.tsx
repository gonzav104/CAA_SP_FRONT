import { useState } from 'react'
import { Trash2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { EditableItemFields } from '../boardReducer'
import { TEXTO_HABLADO_MAX, TEXTO_VISIBLE_MAX } from '../savePlan'
import type { BoardItem, Pictogram } from '../types'
import { PictogramPicker } from './PictogramPicker'
import type { PictogramLibraryStatus } from './PictogramPicker'

/** Validated guideline: spoken text of 3–4 words at most when possible. */
const RECOMMENDED_MAX_WORDS = 4
const LABEL_MAX_LENGTH = TEXTO_VISIBLE_MAX
const SPOKEN_TEXT_MAX_LENGTH = TEXTO_HABLADO_MAX

interface ItemEditorPanelProps {
  item: BoardItem | undefined
  totalItems: number
  boardPictograms: Pictogram[]
  libraryStatus: PictogramLibraryStatus
  globalLibrary: Pictogram[]
  /** False while another operation is pending or the new-card form is open. */
  canRemove: boolean
  isRemoving: boolean
  /** Message of the last failed deletion; shown inside the confirmation. */
  removeError: string | null
  onChange: (itemId: string, changes: Partial<EditableItemFields>) => void
  /** Called once the user confirmed the deletion. */
  onConfirmRemove: (item: BoardItem) => void
  onListen: (item: BoardItem) => void
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function ItemEditorPanel({
  item,
  totalItems,
  boardPictograms,
  libraryStatus,
  globalLibrary,
  canRemove,
  isRemoving,
  removeError,
  onChange,
  onConfirmRemove,
  onListen,
}: ItemEditorPanelProps) {
  // The page renders this panel with `key={item.id}`, so the confirmation resets when another card is selected.
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  if (!item) {
    return (
      <section className="flex items-center justify-center rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
        Elegir una tarjeta de la lista o de la vista previa para editarla.
      </section>
    )
  }

  const isLabelMissing = item.label.trim() === ''
  const words = countWords(item.spokenText)
  const isSpokenTextMissing = words === 0
  const isSpokenTextLong = words > RECOMMENDED_MAX_WORDS
  const update = (changes: Partial<EditableItemFields>) => onChange(item.id, changes)

  return (
    <section aria-labelledby="item-editor-title" className="flex flex-col rounded-xl border bg-background">
      <header className="flex items-baseline justify-between border-b px-4 py-3">
        <h2 id="item-editor-title" className="font-semibold">Editar tarjeta</h2>
        <span className="text-sm text-muted-foreground">
          Posición {item.visualOrder} de {totalItems}
        </span>
      </header>

      <div className="flex flex-col gap-6 p-4">
        <div className="flex flex-col gap-2">
          <span id="pictogram-picker-label" className="text-sm font-medium">Pictograma</span>
          <PictogramPicker
            selected={item.pictogram}
            boardPictograms={boardPictograms}
            libraryStatus={libraryStatus}
            globalLibrary={globalLibrary}
            onChange={(pictogram) => update({ pictogram })}
            labelledBy="pictogram-picker-label"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="item-label">Texto visible</Label>
          <Input
            id="item-label"
            value={item.label}
            maxLength={LABEL_MAX_LENGTH}
            onChange={(event) => update({ label: event.target.value })}
            aria-invalid={isLabelMissing || undefined}
            aria-describedby="item-label-hint"
            className="h-10 text-base"
          />
          <p
            id="item-label-hint"
            className={cn('text-xs', isLabelMissing ? 'text-destructive' : 'text-muted-foreground')}
          >
            {isLabelMissing
              ? 'El texto visible es obligatorio.'
              : 'Se muestra en mayúsculas en la tarjeta. Breve: una o dos palabras.'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="item-spoken-text">Texto hablado</Label>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSpokenTextMissing}
              onClick={() => onListen(item)}
            >
              <Volume2 aria-hidden="true" />
              Escuchar
            </Button>
          </div>
          <Textarea
            id="item-spoken-text"
            value={item.spokenText}
            maxLength={SPOKEN_TEXT_MAX_LENGTH}
            rows={2}
            onChange={(event) => update({ spokenText: event.target.value })}
            aria-invalid={isSpokenTextMissing || undefined}
            aria-describedby="item-spoken-text-hint"
            className="text-base"
          />
          <p
            id="item-spoken-text-hint"
            className={cn(
              'text-xs',
              isSpokenTextMissing ? 'text-destructive' : isSpokenTextLong ? 'text-amber-700' : 'text-muted-foreground',
            )}
          >
            {isSpokenTextMissing
              ? 'El texto hablado es obligatorio.'
              : `${words} ${words === 1 ? 'palabra' : 'palabras'} · se recomiendan ${RECOMMENDED_MAX_WORDS} como máximo.`}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="item-active">Mostrar en el Modo Uso</Label>
            <span className="text-xs text-muted-foreground">
              Una tarjeta oculta conserva su posición y su configuración.
            </span>
          </div>
          <Switch
            id="item-active"
            checked={item.isActive}
            onCheckedChange={(checked) => update({ isActive: checked })}
          />
        </div>
      </div>

      <footer className="mt-auto border-t p-3">
        {confirmingRemove ? (
          <div role="group" aria-label="Confirmar eliminación" className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{`¿Eliminar la tarjeta «${item.label}»?`}</p>
              <p className="text-xs text-muted-foreground">Se elimina de la cartilla y no se puede deshacer.</p>
            </div>
            {removeError && (
              <p role="alert" className="text-sm text-destructive">
                {removeError}
              </p>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                disabled={isRemoving}
                onClick={() => setConfirmingRemove(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="lg"
                className="flex-1"
                disabled={isRemoving}
                aria-busy={isRemoving || undefined}
                onClick={() => onConfirmRemove(item)}
              >
                {isRemoving ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="destructive"
            size="lg"
            className="w-full"
            disabled={!canRemove}
            onClick={() => setConfirmingRemove(true)}
          >
            <Trash2 aria-hidden="true" />
            Eliminar tarjeta
          </Button>
        )}
      </footer>
    </section>
  )
}
