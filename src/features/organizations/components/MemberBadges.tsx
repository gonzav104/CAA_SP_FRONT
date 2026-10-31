import type { LucideIcon } from 'lucide-react'
import { Crown, ShieldCheck, Stethoscope, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RolGestion } from '../apiTypes'
import { ROL_GESTION_LABELS } from '../spaces'

const ROLE_STYLES: Record<RolGestion, { icon: LucideIcon; className: string }> = {
  OWNER: { icon: Crown, className: 'bg-caa-azul-suave text-caa-azul-hover' },
  ADMIN: { icon: ShieldCheck, className: 'bg-caa-niebla text-foreground' },
  MIEMBRO: { icon: UserRound, className: 'bg-caa-niebla text-muted-foreground' },
}

const BADGE_CLASS = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium'

/** Management role and clinical capacity: told apart by icon and text too, never by color alone. */
export function MemberBadges({ role, isTherapist }: { role: RolGestion; isTherapist: boolean }) {
  const { icon: Icon, className } = ROLE_STYLES[role]
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn(BADGE_CLASS, className)}>
        <Icon aria-hidden="true" className="size-3.5" />
        {ROL_GESTION_LABELS[role]}
      </span>
      {isTherapist && (
        <>
          <span className="sr-only"> · </span>
          <span className={cn(BADGE_CLASS, 'bg-caa-cian-suave text-caa-cian-texto')}>
            <Stethoscope aria-hidden="true" className="size-3.5" />
            Terapeuta
          </span>
        </>
      )}
    </span>
  )
}
