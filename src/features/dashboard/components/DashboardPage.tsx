import { Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatients } from '@/features/patients/hooks'
import { SpacesSection } from '@/features/organizations/components/SpacesSection'
import { useOrganizations } from '@/features/organizations/hooks'
import { canCreatePatient } from '@/features/organizations/permissions'
import { BRAND_TITLE_CLASS } from '@/layouts/brand'
import { PageLayout } from '@/layouts/PageLayout'
import { cn } from '@/lib/utils'
import { greetingFor } from '../greeting'

function PatientSummary({ count, isPending, isFamily }: { count: number | undefined; isPending: boolean; isFamily: boolean }) {
  if (isPending) return <p className="text-muted-foreground">Cargando pacientes…</p>
  if (count === undefined) return <p className="text-muted-foreground">No se pudo cargar el total.</p>
  if (count === 0 && isFamily) return <p className="text-muted-foreground">Todavía no tenés pacientes.</p>
  const isSingular = count === 1
  const noun = isSingular ? 'paciente' : 'pacientes'
  const qualifier = isFamily ? (isSingular ? 'vinculado' : 'vinculados') : 'a tu cargo'
  return (
    <p className="flex items-baseline gap-1.5 text-muted-foreground">
      <span className="font-semibold text-foreground tabular-nums">{count}</span>
      <span>{`${noun} ${qualifier}`}</span>
    </p>
  )
}

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const { data: patients, isPending, isError } = usePatients()
  const { data: organizations } = useOrganizations()
  const canCreate = canCreatePatient(organizations)
  // Without anything to manage, the patients are the ones linked to the user as family.
  const isFamily = !!organizations && !canCreate

  const greeting = user ? `${greetingFor(new Date())}, ${user.nombre}` : 'Bienvenido'
  // Nothing to manage yet: the onboarding below is the only next step.
  const isEmpty = patients?.length === 0 && organizations?.length === 0
  const actionClass = 'h-10 flex-1 sm:flex-none'

  return (
    <PageLayout>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={BRAND_TITLE_CLASS}>{greeting}</h1>
          <PatientSummary count={isError ? undefined : patients?.length} isPending={isPending} isFamily={isFamily} />
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {!isEmpty && (
            <Link
              to={paths.patients()}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), actionClass, 'bg-background')}
            >
              Gestionar pacientes
            </Link>
          )}
          {canCreate && (
            <Link to={`${paths.patients()}?crear=1`} className={cn(buttonVariants({ size: 'lg' }), actionClass)}>
              <Plus aria-hidden="true" />
              Nuevo paciente
            </Link>
          )}
        </div>
      </header>

      <SpacesSection />
    </PageLayout>
  )
}
