import { Trash2, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { EditableItemFields } from '../boardReducer'
import type { BoardItem } from '../types'
import { PictogramPicker } from './PictogramPicker'

/** Validated guideline: spoken text of 3–4 words at most when possible. */
const RECOMMENDED_MAX_WORDS = 4
const LABEL_MAX_LENGTH = 20
const SPOKEN_TEXT_MAX_LENGTH = 80

interface ItemEditorPanelProps {
  item: BoardItem | undefined
  totalItems: number
  onChange: (itemId: string, changes: Partial<EditableItemFields>) => void
  onRemove: (itemId: string) => void
  onListen: (item: BoardItem) => void
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

export function ItemEditorPanel({ item, totalItems, onChange, onRemove, onListen }: ItemEditorPanelProps) {
  if (!item) {
    return (
      <section className="flex items-center justify-center rounded-xl border bg-background p-8 text-center text-sm text-muted-foreground">
        Elegir una tarjeta de la lista o de la vista previa para editarla.
      </section>
    )
  }

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
            aria-describedby="item-label-hint"
            className="h-10 text-base"
          />
          <p id="item-label-hint" className="text-xs text-muted-foreground">
            Se muestra en mayúsculas en la tarjeta. Breve: una o dos palabras.
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
        <Button variant="destructive" size="lg" className="w-full" onClick={() => onRemove(item.id)}>
          <Trash2 aria-hidden="true" />
          Eliminar tarjeta
        </Button>
      </footer>
    </section>
  )
}
