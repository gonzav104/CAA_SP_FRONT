import { useMemo, useState } from 'react'
import { ChevronRight, Search, Users, X } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { getReadErrorMessage } from '@/api/errors'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { PictogramGridMark } from '@/components/PictogramGridMark'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@/features/auth/hooks'
import { usePatients } from '@/features/patients/hooks'
import type { Patient } from '@/features/patients/types'
import { PageLayout } from '@/layouts/PageLayout'
import { initialOf } from '@/lib/utils'
import { ageFrom } from '../age'
import { greetingFor } from '../greeting'
import { filterPatients } from '../search'

const PERMISSION_LABELS = {
  LECTURA: 'Solo lectura',
  EDICION_LIMITADA: 'Edición limitada',
} as const

/** How many patients the quick-access grid shows outside of a search; the rest live in /pacientes. */
const QUICK_ACCESS_LIMIT = 6

function PatientQuickCard({ patient }: { patient: Patient }) {
  const age = ageFrom(patient.birthDate, new Date())

  return (
    <Link
      to={paths.boards(patient.id)}
      aria-label={`Abrir espacio de comunicación de ${patient.fullName}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5 outline-none transition-colors hover:border-caa-accent/50 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          aria-hidden="true"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-caa-accent/10 text-sm font-semibold text-caa-accent"
        >
          {initialOf(patient.firstName)}
        </span>
        {patient.collaboratorPermission && (
          <span className="shrink-0 rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {PERMISSION_LABELS[patient.collaboratorPermission]}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-medium text-foreground">{patient.fullName}</span>
          {age !== null && (
            <span className="text-sm text-muted-foreground">
              {age} {age === 1 ? 'año' : 'años'}
            </span>
          )}
        </div>
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-[transform,color] group-hover:translate-x-0.5 group-hover:text-caa-accent"
        />
      </div>
    </Link>
  )
}

export function DashboardPage() {
  const { data: user } = useCurrentUser()
  const { data: patients, isPending, isError, error, refetch } = usePatients()
  const [query, setQuery] = useState('')

  const greeting = user ? `${greetingFor(new Date())}, ${user.nombre}` : 'Bienvenido'
  const filtered = useMemo(() => (patients ? filterPatients(patients, query) : []), [patients, query])
  const isSearching = query.trim() !== ''
  const visiblePatients = isSearching ? filtered : filtered.slice(0, QUICK_ACCESS_LIMIT)
  const emptyMessage =
    user?.rol === 'FAMILIAR' ? 'Todavía no tenés pacientes vinculados.' : 'Todavía no tenés pacientes disponibles.'

  return (
    <PageLayout tone="warm">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-background px-6 py-8 sm:px-9 sm:py-10">
        <PictogramGridMark variant="field" className="pointer-events-none absolute -top-10 -right-12 w-56 rotate-[8deg]" />
        <div className="relative flex flex-col gap-7">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[1.75rem] leading-tight font-semibold text-foreground sm:text-3xl">{greeting}</h1>
            <p className="max-w-md text-muted-foreground">Gestioná los espacios de comunicación de tus pacientes.</p>
          </div>

          {!isError && (
            <div className="relative max-w-xl">
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
                className="h-12 rounded-full border-border/70 pr-11 pl-11 text-base shadow-none"
              />
              {query !== '' && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Limpiar búsqueda"
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <section aria-label="Pacientes" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-semibold text-foreground">{isSearching ? 'Resultados' : 'Pacientes'}</h2>
          {!isSearching && patients && patients.length > 0 && (
            <Link
              to={paths.patients()}
              className="rounded-md text-sm font-medium text-caa-accent outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              Ver todos los pacientes
            </Link>
          )}
        </div>

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

        {!isPending && !isError && patients && patients.length > 0 && isSearching && visiblePatients.length === 0 && (
          <p className="rounded-2xl border border-border/60 bg-background px-6 py-10 text-center text-muted-foreground">
            Ningún paciente coincide con «{query.trim()}».
          </p>
        )}

        {!isPending && !isError && visiblePatients.length > 0 && (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visiblePatients.map((patient) => (
              <li key={patient.id}>
                <PatientQuickCard patient={patient} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageLayout>
  )
}
