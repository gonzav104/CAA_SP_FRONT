import { VolumeOff } from 'lucide-react'
import { useSpeech } from '../speech/useSpeech'
import type { CommunicationItem } from '../types'
import { CommunicationGrid } from './CommunicationGrid'
import { ExitButton } from './ExitButton'

interface CommunicationPageProps {
  userName: string
  items: CommunicationItem[]
  onExit: () => void
}

export function CommunicationPage({ userName, items, onExit }: CommunicationPageProps) {
  const { say, speakingId, isSupported } = useSpeech()

  const handleSelect = (item: CommunicationItem) => say(item.id, item.spokenText)

  return (
    <div className="flex h-dvh flex-col bg-caa-surface font-caa text-caa-ink">
      <header className="flex shrink-0 items-center justify-between gap-4 px-[clamp(1rem,3vmin,2rem)] pt-[clamp(0.75rem,2vmin,1.25rem)]">
        <div className="flex items-center gap-4">
          {/* The person's own name: orientation that this board is theirs. */}
          <span className="text-xl font-semibold">{userName}</span>
          {!isSupported && (
            <span className="flex items-center gap-1.5 text-sm text-caa-muted">
              <VolumeOff aria-hidden="true" className="size-4" />
              Voz no disponible
            </span>
          )}
        </div>
        <ExitButton onExit={onExit} />
      </header>

      <main className="min-h-0 flex-1 px-[clamp(1rem,3vmin,2rem)] pt-[clamp(0.75rem,2vmin,1.25rem)] pb-[clamp(1rem,3vmin,2rem)]">
        <h1 className="sr-only">Comunicación de {userName}</h1>
        {items.length > 0 ? (
          <CommunicationGrid items={items} speakingId={speakingId} onSelect={handleSelect} />
        ) : (
          <p className="flex size-full items-center justify-center text-center text-2xl text-caa-muted">
            No hay tarjetas visibles en esta cartilla.
          </p>
        )}
      </main>
    </div>
  )
}
