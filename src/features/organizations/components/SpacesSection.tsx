import { useState } from 'react'
import { ChevronRight, HeartHandshake, Plus, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import isotipo from '@/assets/brand/caa-sp-isotipo.svg'
import { Button } from '@/components/ui/button'
import { usePatients } from '@/features/patients/hooks'
import type { Patient } from '@/features/patients/types'
import { initialOf } from '@/lib/utils'
import type { OrganizacionResponse } from '../apiTypes'
import { useOrganizations } from '../hooks'
import { membershipLabel, patientsInSpace, SHARED_SPACE_ID, sharedPatients } from '../spaces'
import { CreateOrganizationForm } from './CreateOrganizationForm'

const SECTION_TITLE_CLASS = 'font-display text-lg font-bold tracking-[-0.01em] text-foreground'
const CARD_CLASS =
  'group relative flex rounded-xl border border-border bg-background transition-[border-color,box-shadow] hover:border-caa-azul/50 hover:shadow-[0_4px_16px_-8px_rgba(15,27,61,0.25)]'
// The whole card is the link (its ::after covers it); the focus ring follows that area.
const STRETCHED_LINK_CLASS =
  'rounded-lg outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50'

function patientCountLabel(count: number): string {
  return count === 1 ? '1 paciente' : `${count} pacientes`
}

function Retry({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <h2 className={SECTION_TITLE_CLASS}>{title}</h2>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background p-5">
        <p role="alert" className="flex items-center gap-2 text-sm text-foreground">
          <TriangleAlert aria-hidden="true" className="size-4 shrink-0 text-destructive" />
          {message}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </section>
  )
}

function SpacesSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <h2 className={SECTION_TITLE_CLASS}>Tus espacios</h2>
      <p role="status" className="sr-only">
        Cargando espacios…
      </p>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[0, 1].map((key) => (
          <div key={key} className="h-[8.5rem] animate-pulse rounded-xl border border-border bg-background" />
        ))}
      </div>
    </div>
  )
}

function OrganizationCard({ organization, patients }: { organization: OrganizacionResponse; patients: readonly Patient[] | undefined }) {
  const count = patients && patientsInSpace(patients, { kind: 'organization', organization }).length
  return (
    <li className={`${CARD_CLASS} flex-col gap-4 p-5`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-caa-azul-suave font-display font-bold text-caa-azul"
        >
          {initialOf(organization.nombre)}
        </span>
        <Link to={paths.patientsInSpace(organization.id)} className={`${STRETCHED_LINK_CLASS} flex min-w-0 flex-1 flex-col gap-0.5`}>
          <span className="truncate font-semibold text-foreground" title={organization.nombre}>
            {organization.nombre}
          </span>
          <span className="text-sm text-muted-foreground">{membershipLabel(organization)}</span>
        </Link>
        <ChevronRight
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </div>
      <div className="flex min-h-6 items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground tabular-nums">{count !== undefined && patientCountLabel(count)}</span>
        <Link
          to={paths.organizationMembers(organization.id)}
          aria-label={`Miembros de ${organization.nombre}`}
          className="relative z-10 -my-2 flex min-h-10 items-center rounded-md px-2 font-semibold text-caa-azul underline-offset-4 outline-none hover:text-caa-azul-hover hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Miembros
        </Link>
      </div>
    </li>
  )
}

function SharedCard({ count }: { count: number }) {
  return (
    <div className={`${CARD_CLASS} items-center gap-3 p-5`}>
      <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-caa-cian-suave text-caa-cian-texto">
        <HeartHandshake className="size-5" />
      </span>
      <Link to={paths.patientsInSpace(SHARED_SPACE_ID)} className={`${STRETCHED_LINK_CLASS} flex min-w-0 flex-1 flex-col gap-0.5`}>
        <span className="font-semibold text-foreground">Pacientes compartidos</span>
        <span className="text-sm text-muted-foreground">{`${patientCountLabel(count)} como familiar`}</span>
      </Link>
      <ChevronRight
        aria-hidden="true"
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </div>
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

  if (organizations.isPending || patients.isPending) return <SpacesSkeleton />
  if (organizations.isError) {
    return (
      <Retry
        title="Tus espacios"
        message="No se pudieron cargar tus espacios."
        onRetry={() => void organizations.refetch()}
      />
    )
  }

  const memberships = organizations.data
  const shared = patients.data ? sharedPatients(patients.data) : []

  if (memberships.length === 0 && shared.length === 0) {
    // Without the patients it is unknown whether something is shared: never offer onboarding on a guess.
    if (patients.isError) {
      return (
        <Retry
          title="Tus espacios"
          message="No se pudieron cargar tus pacientes."
          onRetry={() => void patients.refetch()}
        />
      )
    }
    return (
      <section aria-labelledby="spaces-onboarding-title" className="grid items-start gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-3">
          <img src={isotipo} alt="" className="size-12" />
          <h2 id="spaces-onboarding-title" className="font-display text-2xl font-bold tracking-[-0.02em] text-foreground">
            Creá tu espacio de trabajo
          </h2>
          <p className="max-w-prose text-muted-foreground">
            Un espacio reúne a tus pacientes y a tu equipo. Si te invitaron a uno, abrí el enlace de la invitación
            que recibiste por correo.
          </p>
        </div>
        <CreateOrganizationForm />
      </section>
    )
  }

  return (
    <section aria-labelledby="spaces-title" className="flex flex-col gap-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="spaces-title" className={SECTION_TITLE_CLASS}>
          Tus espacios
        </h2>
        {!isCreating && (
          <Button type="button" variant="outline" size="sm" className="bg-background" onClick={() => setIsCreating(true)}>
            <Plus aria-hidden="true" />
            Nuevo espacio
          </Button>
        )}
      </div>
      {isCreating && <CreateOrganizationForm onCancel={() => setIsCreating(false)} />}
      {memberships.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {memberships.map((organization) => (
            <OrganizationCard key={organization.id} organization={organization} patients={patients.data} />
          ))}
        </ul>
      )}
      {shared.length > 0 && <SharedCard count={shared.length} />}
    </section>
  )
}
