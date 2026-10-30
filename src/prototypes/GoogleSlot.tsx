import { cn } from '@/lib/utils'

/**
 * Where Google Identity Services draws its official button in the real app. The prototype keeps the slot
 * honest instead of imitating Google's branding.
 */
export function GoogleSlot({ className }: { className?: string }) {
  return (
    <div
      aria-label="Lugar del botón oficial de Google"
      className={cn(
        'flex items-center justify-center rounded-md border border-dashed border-[#C9D2E3] text-sm text-caa-gris',
        className,
      )}
    >
      Continuar con Google · botón oficial
    </div>
  )
}
