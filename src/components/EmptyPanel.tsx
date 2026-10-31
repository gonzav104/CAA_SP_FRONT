import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyPanelProps {
  icon: LucideIcon
  children: ReactNode
  /** Second line: what this place is for, when the first one alone does not explain it. */
  hint?: string
  /** The next step, only when the user is allowed to take it. */
  action?: ReactNode
}

/** Empty state of the redesigned surfaces (inside `.caa-brand`). */
export function EmptyPanel({ icon: Icon, children, hint, action }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-background px-6 py-10 text-center">
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-caa-azul-suave text-caa-azul">
        <Icon className="size-5" />
      </span>
      <div className="flex max-w-md flex-col gap-1">
        <p className="text-muted-foreground">{children}</p>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  )
}
