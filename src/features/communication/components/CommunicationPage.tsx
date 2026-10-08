import { useState } from 'react'
import { VolumeOff } from 'lucide-react'
import { useSpeech } from '../speech/useSpeech'
import type { CommunicationCategory } from '../types'
import { CategoryNav } from './CategoryNav'
import { CommunicationGrid } from './CommunicationGrid'
import { ExitButton } from './ExitButton'

interface CommunicationPageProps {
  userName: string
  categories: CommunicationCategory[]
  onExit: () => void
}

export function CommunicationPage({ userName, categories, onExit }: CommunicationPageProps) {
  const { say, speakingId, isSupported } = useSpeech()
  // Lazy initializer only: the active category is never recomputed from a later `categories` prop
  // change on this same mount (a new cartilla gets a fresh mount via `key`, see BoardUseRoute).
  const [activeCategoryId, setActiveCategoryId] = useState(() => categories[0]?.id ?? null)

  const activeCategory = categories.find((category) => category.id === activeCategoryId) ?? categories[0]
  const handleSelectItem = (item: CommunicationCategory['items'][number]) => say(item.id, item.spokenText)

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

      <main className="flex min-h-0 flex-1 flex-col gap-[clamp(0.75rem,2vmin,1.25rem)] px-[clamp(1rem,3vmin,2rem)] pt-[clamp(0.75rem,2vmin,1.25rem)] pb-[clamp(1rem,3vmin,2rem)] landscape:flex-row">
        <h1 className="sr-only">Comunicación de {userName}</h1>
        {categories.length === 0 ? (
          <p className="flex size-full items-center justify-center text-center text-2xl text-caa-muted">
            No hay tarjetas visibles en esta cartilla.
          </p>
        ) : (
          <>
            <CategoryNav categories={categories} activeCategoryId={activeCategory?.id ?? null} onSelect={setActiveCategoryId} />
            <div className="min-h-0 min-w-0 flex-1">
              {activeCategory && (
                <CommunicationGrid items={activeCategory.items} speakingId={speakingId} onSelect={handleSelectItem} />
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
