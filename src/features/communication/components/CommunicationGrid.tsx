import type { CSSProperties } from 'react'
import type { CommunicationItem } from '../types'
import { CommunicationCard } from './CommunicationCard'

interface CommunicationGridProps {
  items: CommunicationItem[]
  speakingId: string | null
  onSelect: (item: CommunicationItem) => void
}

/** Columns for the available shape; 6 items → 3×2 landscape, 2×3 portrait. */
function columnsFor(count: number, orientation: 'landscape' | 'portrait'): number {
  if (orientation === 'landscape') {
    if (count <= 2) return Math.max(count, 1)
    if (count <= 4) return 2
    if (count <= 9) return 3
    return 4
  }
  if (count <= 2) return 1
  if (count <= 8) return 2
  return 3
}

function trackVariables(count: number): CSSProperties {
  const repeat = (n: number) => `repeat(${n}, minmax(0, 1fr))`
  const landscapeCols = columnsFor(count, 'landscape')
  const portraitCols = columnsFor(count, 'portrait')
  return {
    '--cols-l': repeat(landscapeCols),
    '--rows-l': repeat(Math.max(Math.ceil(count / landscapeCols), 1)),
    '--cols-p': repeat(portraitCols),
    '--rows-p': repeat(Math.max(Math.ceil(count / portraitCols), 1)),
  } as CSSProperties
}

/**
 * Lays out the board based on the space it is given (container query), not the viewport,
 * so the same grid renders full screen in Use Mode and inside the editor preview.
 */
export function CommunicationGrid({ items, speakingId, onSelect }: CommunicationGridProps) {
  // Positions follow the configured order only; never reorder by usage.
  const orderedItems = [...items].sort((a, b) => a.order - b.order)

  return (
    <div className="size-full [container-name:board] [container-type:size]">
      <div
        style={trackVariables(orderedItems.length)}
        className="grid size-full grid-cols-(--cols-p) grid-rows-(--rows-p) gap-[clamp(0.5rem,3cqmin,2rem)] board-landscape:grid-cols-(--cols-l) board-landscape:grid-rows-(--rows-l)"
      >
        {orderedItems.map((item) => (
          <CommunicationCard
            key={item.id}
            item={item}
            isSpeaking={item.id === speakingId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}
