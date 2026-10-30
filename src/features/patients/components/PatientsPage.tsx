import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Plus, Search, Users, X } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import { getPatientCreateErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import { useOrganizations } from '@/features/organizations/hooks'
import { canCreatePatientIn, patientCreationOrganizations } from '@/features/organizations/permissions'
import { membershipLabel, patientsInSpace, resolveSpace, SHARED_SPACE_ID, sharedPatients } from '@/features/organizations/spaces'
import { BRAND_TITLE_CLASS } from '@/layouts/brand'
import { PageLayout } from '@/layouts/PageLayout'
import { useCreatePatient, usePatients } from '../hooks'
import { filterPatients } from '../search'
import { NewPatientForm } from './NewPatientForm'
import type { NewPatientFormValues } from './NewPatientForm'
import { PatientRow } from './PatientRow'

const PANEL_CLASS = 'rounded-xl border border-border bg-background'

function EmptyPanel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`${PANEL_CLASS} flex flex-col items-center gap-3 px-6 py-10 text-center`}>
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-caa-azul-suave text-caa-azul">
        <Users className="size-5" />
      </span>
      <p className="max-w-md text-muted-foreground">{children}</p>
      {action}
    </div>
  )
}

function ListSkeleton() {
  return (
    <>
      <p role="status" className="sr-only">
        Cargando pacientes…
      </p>
      <div aria-hidden="true" className={`${PANEL_CLASS} divide-y divide-border`}>
        {[0, 1, 2].map((key) => (
          <div key={key} className="flex h-16 items-center gap-3 px-4 sm:px-5">
            <span className="size-10 animate-pulse rounded-full bg-caa-niebla" />
            <span className="h-4 w-40 animate-pulse rounded bg-caa-niebla" />
          </div>
        ))}
      </div>
    </>
  )
}

export function PatientsPage() {
  const { data: organizations } = useOrganizations()
  const creationOrganizations = patientCreationOrganizations(organizations)
  const canCreate = creationOrganizations.length > 0
  const navigate = useNavigate()
  const { data: patients, isPending, isError, error, refetch } = usePatients()
  const createPatient = useCreatePatient()
  const [searchParams, setSearchParams] = useSearchParams()
  const { space, stale } = resolveSpace(searchParams.get('espacio'), organizations)
  const [query, setQuery] = useState('')
  // A Dashboard shortcut ("Nuevo paciente") can land here with the form already open.
  const [isCreating, setIsCreating] = useState(() => searchParams.get('crear') === '1')
  const [createError, setCreateError] = useState<string | null>(null)
  // A double click can land twice before React re-renders the disabled button.
  const submitting = useRef(false)

  const inSpace = useMemo(() => (patients ? patientsInSpace(patients, space) : []), [patients, space])
  const filtered = useMemo(() => filterPatients(inSpace, query), [inSpace, query])
  const hasShared = patients ? sharedPatients(patients).length > 0 : false
  const showSpaceSelector = (organizations?.length ?? 0) + (hasShared ? 1 : 0) > 1 || space.kind !== 'all'
  const spaceTitle =
    space.kind === 'organization'
      ? `${space.organization.nombre} · ${membershipLabel(space.organization)}`
      : space.kind === 'shared'
        ? 'Pacientes compartidos con vos como familiar.'
        : 'Directorio completo de pacientes.'
  const defaultOrganizationId = space.kind === 'organization' ? space.organization.id : undefined
  // Only the mixed view needs to say where each patient belongs.
  const spaceNames =
    space.kind === 'all' && (organizations?.length ?? 0) > 1
      ? new Map(organizations?.map((organization) => [organization.id, organization.nombre]))
      : null
  const canCreateHere = space.kind === 'organization' ? canCreatePatientIn(space.organization) : canCreate

  const changeSpace = (spaceId: string) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (spaceId) next.set('espacio', spaceId)
        else next.delete('espacio')
        next.delete('crear')
        return next
      },
      { replace: true },
    )
  }
  const isSearching = query.trim() !== ''
  const emptyMessage =
    organizations && !canCreate ? 'Todavía no tenés pacientes vinculados.' : 'Todavía no tenés pacientes registrados.'

  const startCreating = () => {
    setCreateError(null)
    setIsCreating(true)
  }

  // Leaves `?crear=1` too, so a reload does not reopen what the user just closed.
  const stopCreating = () => {
    setIsCreating(false)
    setCreateError(null)
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('crear')
        return next
      },
      { replace: true },
    )
  }

  const handleCreate = async ({ organizacionId, ...request }: NewPatientFormValues) => {
    if (submitting.current) return
    submitting.current = true
    setCreateError(null)
    try {
      const created = await createPatient.mutateAsync({ organizationId: organizacionId, request })
      navigate(paths.boards(created.id), { state: { patientCreated: true } })
    } catch (err) {
      setCreateError(getPatientCreateErrorMessage(err))
    } finally {
      submitting.current = false
    }
  }

  const showForm = isCreating && canCreate
  const firstPatientAction = canCreate ? (
    <Button type="button" size="lg" className="h-10" onClick={startCreating}>
      <Plus aria-hidden="true" />
      Registrar el primer paciente
    </Button>
  ) : organizations?.length === 0 ? (
    <Link to={paths.dashboard()} className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10' })}>
      Crear un espacio desde el inicio
    </Link>
  ) : undefined

  return (
    <PageLayout tone="brand">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className={BRAND_TITLE_CLASS}>Pacientes</h1>
          <p className="text-muted-foreground">{spaceTitle}</p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {space.kind === 'organization' && (
            <Link
              to={paths.organizationMembers(space.organization.id)}
              className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-10 flex-1 bg-background sm:flex-none' })}
            >
              Miembros del espacio
            </Link>
          )}
          {canCreate && !isCreating && (
            <Button type="button" size="lg" className="h-10 flex-1 sm:flex-none" onClick={startCreating}>
              <Plus aria-hidden="true" />
              Nuevo paciente
            </Button>
          )}
        </div>
      </header>

      {stale && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ya no tenés acceso a ese espacio. Mostramos todos tus pacientes.
        </p>
      )}

      {isCreating && organizations && !canCreate && (
        <div role="status" className={`${PANEL_CLASS} flex flex-col items-start gap-3 p-5`}>
          <p className="text-muted-foreground">
            No perteneces a ninguna organización donde puedas registrar pacientes. Pide a quien administra tu
            organización que te habilite como terapeuta.
          </p>
          <Button type="button" variant="outline" onClick={stopCreating}>
            Cerrar
          </Button>
        </div>
      )}

      {showForm && (
        <NewPatientForm
          organizations={creationOrganizations}
          defaultOrganizationId={defaultOrganizationId}
          isPending={createPatient.isPending}
          error={createError}
          onSubmit={(values) => void handleCreate(values)}
          onCancel={stopCreating}
        />
      )}

      {!showForm && (
        <>
          {(showSpaceSelector || (patients?.length ?? 0) > 0) && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  role="searchbox"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar paciente por nombre o apellido"
                  aria-label="Buscar paciente por nombre o apellido"
                  className="h-11 bg-background pr-10 pl-9"
                />
                {query !== '' && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                )}
              </div>
              {showSpaceSelector && organizations && (
                <div className="sm:w-64">
                  <Label htmlFor="patients-space" className="sr-only">
                    Espacio
                  </Label>
                  <select
                    id="patients-space"
                    value={space.kind === 'organization' ? space.organization.id : space.kind === 'shared' ? SHARED_SPACE_ID : ''}
                    onChange={(event) => changeSpace(event.target.value)}
                    className={NATIVE_SELECT_CLASS}
                  >
                    <option value="">Todos los espacios</option>
                    {organizations.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.nombre}
                      </option>
                    ))}
                    {(hasShared || space.kind === 'shared') && <option value={SHARED_SPACE_ID}>Pacientes compartidos</option>}
                  </select>
                </div>
              )}
            </div>
          )}

          {isPending && <ListSkeleton />}

          {isError && (
            <ErrorState
              message={getReadErrorMessage(error, 'No se encontraron pacientes.')}
              onRetry={() => void refetch()}
            />
          )}

          {!isPending && !isError && patients && patients.length > 0 && inSpace.length === 0 && !isSearching && (
            <EmptyPanel
              action={
                canCreateHere && space.kind !== 'shared' ? (
                  <Button type="button" variant="outline" size="lg" className="h-10" onClick={startCreating}>
                    <Plus aria-hidden="true" />
                    Registrar paciente
                  </Button>
                ) : undefined
              }
            >
              Este espacio todavía no tiene pacientes.
            </EmptyPanel>
          )}

          {!isPending && !isError && patients && patients.length === 0 && (
            <EmptyPanel action={firstPatientAction}>{emptyMessage}</EmptyPanel>
          )}

          {!isPending && !isError && inSpace.length > 0 && isSearching && filtered.length === 0 && (
            <EmptyPanel
              action={
                <Button type="button" variant="outline" size="lg" className="h-10" onClick={() => setQuery('')}>
                  Ver todos
                </Button>
              }
            >
              Ningún paciente coincide con «{query.trim()}».
            </EmptyPanel>
          )}

          {!isPending && !isError && filtered.length > 0 && (
            <section aria-label="Listado de pacientes" className="flex flex-col gap-2">
              <p aria-live="polite" className="text-sm text-muted-foreground">
                {filtered.length === 1 ? '1 paciente' : `${filtered.length} pacientes`}
              </p>
              <ul className={`${PANEL_CLASS} divide-y divide-border overflow-hidden`}>
                {filtered.map((patient) => (
                  <li key={patient.id}>
                    <PatientRow
                      patient={patient}
                      spaceName={patient.collaboratorPermission ? undefined : spaceNames?.get(patient.organizationId)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </PageLayout>
  )
}
