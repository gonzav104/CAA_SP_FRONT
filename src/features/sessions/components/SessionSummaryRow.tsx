import { CalendarDays, ChevronRight } from 'lucide-react'
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
        className="group flex items-center gap-3 rounded-xl border border-border bg-background p-4 outline-none transition-colors hover:border-caa-azul/50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-caa-azul-suave text-caa-azul">
          <CalendarDays className="size-5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-foreground tabular-nums">{dateTimeLabel}</span>
            {session.disposition && (
              <span className="rounded-full bg-caa-niebla px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {session.disposition}
              </span>
            )}
          </span>
          <span className="line-clamp-2 text-sm text-muted-foreground">{session.objectives}</span>
        </span>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    </li>
  )
}
