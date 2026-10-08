import { ChevronRight, UserPlus, Users } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { PictogramGridMark } from '@/components/PictogramGridMark'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatients } from '@/features/patients/hooks'
import { canCreatePatient } from '@/features/patients/permissions'
import { PageLayout } from '@/layouts/PageLayout'
import { greetingFor } from '../greeting'

function patientCountCopy(
  count: number | undefined,
  isPending: boolean,
  isError: boolean,
  isFamily: boolean,
): { value: string; description: string } {
  if (isPending) return { value: '—', description: 'Cargando pacientes…' }
  if (isError || count === undefined) return { value: '—', description: 'No se pudo cargar el total.' }
  const isSingular = count === 1
  const noun = isSingular ? 'Paciente' : 'Pacientes'
  const qualifier = isFamily ? (isSingular ? 'vinculado' : 'vinculados') : 'a tu cargo'
  return { value: String(count), description: `${noun} ${qualifier}` }
}

const TILE_CLASS = 'flex flex-col justify-between gap-4 rounded-2xl border border-border/60 bg-background p-5'

/** Real data, not an action: the one count available without an extra request. */
function StatTile({ icon: Icon, value, description }: { icon: typeof Users; value: string; description: string }) {
  return (
    <div className={TILE_CLASS}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-caa-accent/10 text-caa-accent"
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-3xl leading-none font-semibold text-foreground">{value}</span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </div>
    </div>
  )
}

/** A real shortcut. Room to add more tiles later (agenda, sesiones, estadísticas) without reshaping this grid. */
function ActionTile({
  icon: Icon,
  title,
  description,
  to,
}: {
  icon: typeof Users
  title: string
  description: string
  to: string
}) {
  return (
    <Link
      to={to}
      className={`group ${TILE_CLASS} outline-none transition-colors hover:border-caa-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50`}
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-caa-accent/10 text-caa-accent"
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{title}</span>
          <span className="text-sm text-muted-foreground">{description}</span>
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const { data: patients, isPending, isError } = usePatients()
  const isFamily = user?.rol === 'FAMILIAR'

  const greeting = user ? `${greetingFor(new Date())}, ${user.nombre}` : 'Bienvenido'
  const count = patientCountCopy(patients?.length, isPending, isError, isFamily)

  return (
    <PageLayout tone="warm">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background px-6 py-8 sm:px-9 sm:py-10">
        <PictogramGridMark variant="field" className="pointer-events-none absolute -top-10 -right-12 w-56 rotate-[8deg]" />
        <div className="relative flex flex-col gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-semibold text-foreground sm:text-3xl">{greeting}</h1>
          <p className="max-w-md text-muted-foreground">Gestioná los espacios de comunicación de tus pacientes.</p>
        </div>
      </section>

      <section aria-label="Resumen" className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Resumen</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatTile icon={Users} value={count.value} description={count.description} />
          {canCreatePatient(user) && (
            <ActionTile
              icon={UserPlus}
              title="Nuevo paciente"
              description="Registrar un paciente"
              to={`${paths.patients()}?crear=1`}
            />
          )}
          <ActionTile icon={Users} title="Gestionar pacientes" description="Ver el directorio completo" to={paths.patients()} />
        </div>
      </section>
    </PageLayout>
  )
}
