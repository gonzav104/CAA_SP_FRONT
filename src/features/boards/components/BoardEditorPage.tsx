import { useReducer, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, Play, Plus, Star } from 'lucide-react'
import { paths } from '@/app/paths'
import { Button, buttonVariants } from '@/components/ui/button'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useSpeech } from '@/features/communication/speech/useSpeech'
import { cn } from '@/lib/utils'
import { boardReducer, isBoardDirty, sortByVisualOrder } from '../boardReducer'
import { mockPictograms } from '../data/mockPictograms'
import { toCommunicationItems } from '../toCommunicationItems'
import type { Patient } from '@/features/patients/types'
import type { Board, BoardItem } from '../types'
import { BoardItemList } from './BoardItemList'
import { BoardPreview } from './BoardPreview'
import { ItemEditorPanel } from './ItemEditorPanel'

interface BoardEditorPageProps {
  patient: Patient
  serverBoard: Board
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function BoardEditorPage({ patient, serverBoard }: BoardEditorPageProps) {
  // Local snapshot: edits only change React state; nothing is sent to the server.
  const [baseline] = useState(serverBoard)
  const [board, dispatch] = useReducer(boardReducer, baseline)
  const isDirty = isBoardDirty(board, baseline)
  const items = sortByVisualOrder(board.items)
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null)
  const { say } = useSpeech()

  const selectedItem = items.find((item) => item.id === selectedId)
  const previewItems = toCommunicationItems(board)

  const handleAdd = () => {
    // Suggest a pictogram that is not on the board yet.
    const usedIds = new Set(items.flatMap((item) => (item.pictogram ? [item.pictogram.id] : [])))
    const pictogram = mockPictograms.find((p) => !usedIds.has(p.id)) ?? mockPictograms[0]
    const text = capitalize(pictogram.label)
    const id = crypto.randomUUID()
    dispatch({
      type: 'addItem',
      item: {
        id,
        categoryId: items[items.length - 1]?.categoryId ?? null,
        pictogram,
        label: text,
        spokenText: text,
        isActive: true,
        isCore: false,
      },
    })
    setSelectedId(id)
  }

  const handleRemove = (itemId: string) => {
    const index = items.findIndex((item) => item.id === itemId)
    const remaining = items.filter((item) => item.id !== itemId)
    dispatch({ type: 'removeItem', itemId })
    setSelectedId(remaining[Math.min(index, remaining.length - 1)]?.id ?? null)
  }

  const handleListen = (item: BoardItem) => say(item.id, item.spokenText)

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-4 border-b bg-background px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to={paths.boards(patient.id)}
            aria-label={`Volver a las cartillas de ${patient.firstName}`}
            className={buttonVariants({ variant: 'ghost', size: 'icon-lg' })}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground">Editor de cartillas</span>
            <h1 className="text-lg font-semibold">{patient.fullName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link to={paths.boardUse(patient.id, board.id)} className={buttonVariants({ size: 'lg' })}>
            <Play aria-hidden="true" />
            Abrir Modo Uso
          </Link>
          <LogoutButton />
        </div>
      </header>

      {isDirty && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 bg-amber-50 px-6 py-2 text-sm text-amber-900"
        >
          <p>
            <span className="font-medium">Cambios sin guardar</span>
            {' · '}Todavía no se guardan en el servidor. El Modo Uso muestra la versión guardada.
          </p>
          <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: 'reset', board: baseline })}>
            Descartar cambios
          </Button>
        </div>
      )}

      <nav aria-label="Cartillas" className="flex items-end gap-2 border-b bg-background px-6">
        <span
          aria-current="page"
          className="flex items-center gap-2 border-b-2 border-primary px-3 py-2.5 text-sm font-medium"
        >
          {board.name}
          {board.isPrimary && (
            <span title="Cartilla principal" className="text-muted-foreground">
              <Star aria-hidden="true" className="size-3.5 fill-current" />
              <span className="sr-only">(cartilla principal)</span>
            </span>
          )}
        </span>
        <button
          type="button"
          disabled
          title="Próximamente"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'mb-1.5')}
        >
          <Plus aria-hidden="true" />
          Nueva cartilla
        </button>
      </nav>

      <main className="grid flex-1 grid-cols-1 items-start gap-6 p-6 md:grid-cols-2 lg:grid-cols-[19rem_minmax(0,1fr)_19rem]">
        <div className="order-first md:col-span-2 lg:sticky lg:top-6 lg:order-none lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <BoardPreview
            patientName={patient.firstName}
            items={previewItems}
            hiddenCount={items.length - previewItems.length}
            onSelect={setSelectedId}
          />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <BoardItemList
            items={items}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={(itemId, direction) => dispatch({ type: 'moveItem', itemId, direction })}
            onAdd={handleAdd}
          />
        </div>
        <div className="lg:col-start-3 lg:row-start-1">
          <ItemEditorPanel
            item={selectedItem}
            totalItems={items.length}
            onChange={(itemId, changes) => dispatch({ type: 'updateItem', itemId, changes })}
            onRemove={handleRemove}
            onListen={handleListen}
          />
        </div>
      </main>
    </div>
  )
}
