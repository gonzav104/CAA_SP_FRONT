import { cn } from '@/lib/utils'
import type { CommunicationCategory } from '../types'

interface CategoryNavProps {
  categories: CommunicationCategory[]
  activeCategoryId: string | null
  onSelect: (categoryId: string) => void
}

/**
 * Navigation level, not a communication level: selecting a category changes the grid below it but
 * never speaks and never changes any data. Landscape (tablet priority): fixed left column, one
 * button per row. Portrait/mobile: the same buttons become a horizontal scrolling strip on top —
 * no second navigation system, only the direction changes.
 */
export function CategoryNav({ categories, activeCategoryId, onSelect }: CategoryNavProps) {
  return (
    <nav
      aria-label="Categorías"
      className={cn(
        'flex shrink-0 gap-2 overflow-x-auto overscroll-x-contain',
        'landscape:w-[clamp(8.5rem,21vmin,15rem)] landscape:flex-col landscape:overflow-x-visible landscape:overflow-y-auto',
      )}
    >
      {categories.map((category) => {
        const isActive = category.id === activeCategoryId
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            aria-current={isActive || undefined}
            className={cn(
              'shrink-0 touch-manipulation rounded-2xl border-2 px-[clamp(0.9rem,2.2vmin,1.5rem)] py-[clamp(0.75rem,2vmin,1.25rem)]',
              'text-left text-[clamp(0.95rem,2.2vmin,1.25rem)] leading-snug text-balance outline-none transition-colors',
              'focus-visible:ring-4 focus-visible:ring-caa-ink/35 focus-visible:ring-offset-2 focus-visible:ring-offset-caa-surface',
              isActive
                ? 'border-caa-accent bg-caa-accent font-bold text-caa-on-accent'
                : 'border-caa-line bg-caa-card font-medium text-caa-ink hover:border-caa-accent/60',
            )}
          >
            {category.name}
          </button>
        )
      })}
    </nav>
  )
}
