import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CommunicationItem } from '../types'
import { PictogramVisual } from './PictogramVisual'

interface CommunicationCardProps {
  item: CommunicationItem
  isSpeaking: boolean
  onSelect: (item: CommunicationItem) => void
}

/**
 * Sized with container units (cqmin) so it scales with its grid cell, not the viewport.
 * States: normal → pressed (key sinks) → speaking (outline, inverted label, speaker badge) → normal.
 * Speaking never relies on color alone: shape, fill inversion and an icon change too.
 */
export function CommunicationCard({ item, isSpeaking, onSelect }: CommunicationCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      aria-label={item.label}
      aria-description={item.spokenText}
      data-speaking={isSpeaking || undefined}
      className={cn(
        'group relative flex min-h-0 min-w-0 select-none flex-col [container-type:size] rounded-[1.75rem] bg-caa-card text-caa-ink',
        'border-2 border-b-[6px] border-caa-line touch-manipulation outline-none',
        'transition-[translate,border-color,border-width,outline-color] duration-100 motion-reduce:transition-none',
        // Pressed: the card sinks like a physical key.
        'active:translate-y-1 active:border-b-2 motion-reduce:active:translate-y-0',
        // Speaking: thick outline plus accent border.
        'outline-offset-4 data-speaking:border-caa-accent data-speaking:outline-solid data-speaking:outline-[5px] data-speaking:outline-caa-accent',
        'focus-visible:ring-4 focus-visible:ring-caa-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-caa-surface',
      )}
    >
      <span className="flex min-h-0 flex-1 items-center justify-center px-[8%] pt-[6%] pb-[3%]">
        <PictogramVisual key={item.imageUrl} src={item.imageUrl} />
      </span>

      <span
        className={cn(
          'mx-[4%] mb-[4%] shrink-0 rounded-2xl py-[0.35em] text-center',
          'text-[clamp(0.875rem,11cqmin,3.25rem)] font-bold uppercase leading-none tracking-[0.04em] text-balance [overflow-wrap:anywhere]',
          'group-data-speaking:bg-caa-accent group-data-speaking:text-caa-on-accent',
        )}
      >
        {item.label}
      </span>

      <span
        aria-hidden="true"
        className="absolute top-[4%] right-[4%] hidden size-[clamp(1.5rem,16cqmin,3.5rem)] items-center justify-center rounded-full bg-caa-accent text-caa-on-accent group-data-speaking:flex"
      >
        <Volume2 strokeWidth={2.25} className="size-[55%]" />
      </span>
    </button>
  )
}
