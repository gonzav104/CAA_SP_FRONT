import { useMemo, useState } from 'react'
import { Plus, Search, Users, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { paths } from '@/app/paths'
import { getPatientCreateErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOrganizations } from '@/features/organizations/hooks'
import { patientCreationOrganizations } from '@/features/organizations/permissions'
import { patientsInSpace, resolveSpace, SHARED_SPACE_ID, sharedPatients } from '@/features/organizations/spaces'
import { Label } from '@/components/ui/label'
import { PageLayout } from '@/layouts/PageLayout'
import { useCreatePatient, usePatients } from '../hooks'
import { filterPatients } from '../search'
import { NewPatientForm } from './NewPatientForm'
import type { NewPatientFormValues } from './NewPatientForm'
import { PatientCard } from './PatientCard'

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

  const inSpace = useMemo(() => (patients ? patientsInSpace(patients, space) : []), [patients, space])
  const filtered = useMemo(() => filterPatients(inSpace, query), [inSpace, query])
  const hasShared = patients ? sharedPatients(patients).length > 0 : false
  const showSpaceSelector = (organizations?.length ?? 0) + (hasShared ? 1 : 0) > 1 || space.kind !== 'all'
  const spaceTitle =
    space.kind === 'organization'
      ? space.organization.nombre
      : space.kind === 'shared'
        ? 'Pacientes compartidos con vos como familiar.'
        : 'Directorio completo de pacientes.'
  const defaultOrganizationId = space.kind === 'organization' ? space.organization.id : undefined

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

  const handleCreate = async ({ organizacionId, ...request }: NewPatientFormValues) => {
    setCreateError(null)
    try {
      const created = await createPatient.mutateAsync({ organizationId: organizacionId, request })
      navigate(paths.boards(created.id))
    } catch (err) {
      setCreateError(getPatientCreateErrorMessage(err))
    }
  }

  return (
    <PageLayout tone="warm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">{spaceTitle}</p>
        </div>
        {canCreate && !isCreating && (
          <Button
            type="button"
            size="lg"
            className="shrink-0 bg-caa-accent text-caa-on-accent hover:bg-caa-accent/90"
            onClick={() => {
              setCreateError(null)
              setIsCreating(true)
            }}
          >
            <Plus aria-hidden="true" />
            Nuevo paciente
          </Button>
        )}
      </div>

      {stale && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ya no tenés acceso a ese espacio. Mostramos todos tus pacientes.
        </p>
      )}

      {showSpaceSelector && organizations && (
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <Label htmlFor="patients-space">Espacio</Label>
          <select
            id="patients-space"
            value={space.kind === 'organization' ? space.organization.id : space.kind === 'shared' ? SHARED_SPACE_ID : ''}
            onChange={(event) => changeSpace(event.target.value)}
            className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
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

      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          role="searchbox"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar paciente por nombre o apellido"
          aria-label="Buscar paciente por nombre o apellido"
          className="h-11 rounded-full border-border/70 pr-10 pl-11 text-base shadow-none"
        />
        {query !== '' && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>

      {isCreating && organizations && !canCreate && (
        <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-background p-5">
          <p className="text-muted-foreground">
            No perteneces a ninguna organización donde puedas registrar pacientes. Pide a quien administra tu
            organización que te habilite como terapeuta.
          </p>
          <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
            Cerrar
          </Button>
        </div>
      )}

      {isCreating && canCreate && (
        <NewPatientForm
          organizations={creationOrganizations}
          defaultOrganizationId={defaultOrganizationId}
          isPending={createPatient.isPending}
          error={createError}
          onSubmit={(values) => void handleCreate(values)}
          onCancel={() => {
            setIsCreating(false)
            setCreateError(null)
          }}
        />
      )}

      {isPending && <LoadingState message="Cargando pacientes…" />}

      {isError && (
        <ErrorState
          message={getReadErrorMessage(error, 'No se encontraron pacientes.')}
          onRetry={() => void refetch()}
        />
      )}

      {!isPending && !isError && patients && patients.length > 0 && inSpace.length === 0 && !isSearching && (
        <p className="rounded-2xl border border-border/60 bg-background px-6 py-10 text-center text-muted-foreground">
          Este espacio todavía no tiene pacientes.
        </p>
      )}

      {!isPending && !isError && patients && patients.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <Users aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {!isPending && !isError && inSpace.length > 0 && isSearching && filtered.length === 0 && (
        <p className="rounded-2xl border border-border/60 bg-background px-6 py-10 text-center text-muted-foreground">
          Ningún paciente coincide con «{query.trim()}».
        </p>
      )}

      {!isPending && !isError && filtered.length > 0 && (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((patient) => (
            <li key={patient.id}>
              <PatientCard patient={patient} />
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  )
}
