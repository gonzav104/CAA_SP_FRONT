import { useMemo, useState } from 'react'
import { Plus, Search, Users, X } from 'lucide-react'
import { useSearchParams } from 'react-router'
import { getPatientCreateErrorMessage, getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@/features/auth/hooks'
import { PageLayout } from '@/layouts/PageLayout'
import { useCreatePatient, usePatients } from '../hooks'
import { canCreatePatient } from '../permissions'
import { filterPatients } from '../search'
import { NewPatientForm } from './NewPatientForm'
import type { NewPatientFormValues } from './NewPatientForm'
import { PatientCard } from './PatientCard'

export function PatientsPage() {
  const { data: user } = useCurrentUser()
  const { data: patients, isPending, isError, error, refetch } = usePatients()
  const createPatient = useCreatePatient()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  // A Dashboard shortcut ("Nuevo paciente") can land here with the form already open.
  const [isCreating, setIsCreating] = useState(() => searchParams.get('crear') === '1')
  const [createError, setCreateError] = useState<string | null>(null)

  const filtered = useMemo(() => (patients ? filterPatients(patients, query) : []), [patients, query])
  const isSearching = query.trim() !== ''
  const emptyMessage =
    user?.rol === 'FAMILIAR' ? 'Todavía no tenés pacientes vinculados.' : 'Todavía no tenés pacientes registrados.'

  const handleCreate = async (values: NewPatientFormValues) => {
    setCreateError(null)
    try {
      await createPatient.mutateAsync(values)
      setIsCreating(false)
    } catch (err) {
      setCreateError(getPatientCreateErrorMessage(err))
    }
  }

  return (
    <PageLayout tone="warm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-foreground">Pacientes</h1>
          <p className="text-muted-foreground">Directorio completo de pacientes.</p>
        </div>
        {canCreatePatient(user) && !isCreating && (
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

      {isCreating && (
        <NewPatientForm
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

      {!isPending && !isError && patients && patients.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-border/60 bg-background px-6 py-10 text-center">
          <Users aria-hidden="true" className="size-6 text-muted-foreground" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {!isPending && !isError && patients && patients.length > 0 && isSearching && filtered.length === 0 && (
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
