import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { formatSessionDateTime } from '../format'
import type { Session } from '../types'

interface SessionSummaryRowProps {
  patientId: string
  session: Session
}

/** One compact entry of the clinical history: date/time, disposición and a short excerpt. Opens the detail. */
export function SessionSummaryRow({ patientId, session }: SessionSummaryRowProps) {
  const dateTimeLabel = formatSessionDateTime(session.dateTime)

  return (
    <li>
      <Link
        to={paths.sessionDetail(patientId, session.id)}
        className="group flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-background p-5 outline-none transition-colors hover:border-caa-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium text-foreground">{dateTimeLabel}</span>
          {session.disposition && <span className="text-sm text-muted-foreground">{session.disposition}</span>}
          <p className="line-clamp-1 text-sm text-muted-foreground">{session.objectives}</p>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-caa-accent"
        />
      </Link>
    </li>
  )
}
