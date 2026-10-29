import { useState } from 'react'
import { Building2, ChevronRight, HeartHandshake, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { usePatients } from '@/features/patients/hooks'
import { useOrganizations } from '../hooks'
import { membershipLabel, SHARED_SPACE_ID, sharedPatients } from '../spaces'
import { CreateOrganizationForm } from './CreateOrganizationForm'

const CARD_CLASS =
  'group flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-5 outline-none transition-colors hover:border-caa-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50'

function SpaceLink({ to, icon: Icon, title, description }: { to: string; icon: typeof Building2; title: string; description: string }) {
  return (
    <Link to={to} className={CARD_CLASS}>
      <span className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-caa-accent/10 text-caa-accent"
        >
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate font-medium text-foreground">{title}</span>
          <span className="text-sm text-muted-foreground">{description}</span>
        </span>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  )
}

/**
 * "Tus espacios" on the dashboard: every organization the user belongs to and, apart, the patients
 * shared with them as family. Nobody is redirected anywhere: with one space it is a single entry.
 * Without any space it offers creating one (never automatically).
 */
export function SpacesSection() {
  const organizations = useOrganizations()
  const patients = usePatients()
  const [isCreating, setIsCreating] = useState(false)

  if (organizations.isPending || patients.isPending) return null
  if (organizations.isError) {
    return (
      <section aria-label="Tus espacios" className="flex flex-col gap-3">
        <h2 className="font-semibold text-foreground">Tus espacios</h2>
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background p-5 text-sm text-muted-foreground">
          No se pudieron cargar tus espacios.
          <Button type="button" variant="outline" size="sm" onClick={() => void organizations.refetch()}>
            Reintentar
          </Button>
        </div>
      </section>
    )
  }

  const memberships = organizations.data
  const shared = patients.data ? sharedPatients(patients.data) : []

  if (memberships.length === 0 && shared.length === 0 && !patients.isError) {
    return (
      <section aria-labelledby="spaces-onboarding-title" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="spaces-onboarding-title" className="font-semibold text-foreground">
            Creá tu espacio de trabajo
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">
            Un espacio reúne a tus pacientes y a tu equipo. Si te invitaron a uno, abrí el enlace de la invitación
            que recibiste por correo.
          </p>
        </div>
        <CreateOrganizationForm />
      </section>
    )
  }

  return (
    <section aria-labelledby="spaces-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="spaces-title" className="font-semibold text-foreground">
          Tus espacios
        </h2>
        {!isCreating && (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsCreating(true)}>
            <Plus aria-hidden="true" />
            Nuevo espacio
          </Button>
        )}
      </div>
      {isCreating && <CreateOrganizationForm onCancel={() => setIsCreating(false)} />}
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {memberships.map((organization) => (
          <li key={organization.id} className="flex flex-col gap-1">
            <SpaceLink
              to={paths.patientsInSpace(organization.id)}
              icon={Building2}
              title={organization.nombre}
              description={membershipLabel(organization)}
            />
            <Link
              to={paths.organizationMembers(organization.id)}
              aria-label={`Miembros de ${organization.nombre}`}
              className="self-start rounded-sm px-1 text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Miembros
            </Link>
          </li>
        ))}
        {shared.length > 0 && (
          <li>
            <SpaceLink
              to={paths.patientsInSpace(SHARED_SPACE_ID)}
              icon={HeartHandshake}
              title="Pacientes compartidos"
              description={shared.length === 1 ? '1 paciente como familiar' : `${shared.length} pacientes como familiar`}
            />
          </li>
        )}
      </ul>
    </section>
  )
}
