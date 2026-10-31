import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FieldError } from '@/components/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import type { OrganizacionResponse } from '@/features/organizations/apiTypes'
import { keepFieldFocus } from '@/lib/utils'

/** The user's local date: `toISOString()` alone is UTC, which is already tomorrow in the evening here. */
function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
}

// Mirrors PacienteRegistroDTO: nombre/apellido @NotBlank, fechaNacimiento @NotNull @Past.
const newPatientSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es obligatoria.')
    .refine((value) => value < todayIso(), { message: 'La fecha de nacimiento debe ser en el pasado.' }),
  // The organization the patient belongs to (part of the POST path, not of the body).
  organizacionId: z.string().min(1, 'Seleccioná el espacio.'),
})

export type NewPatientFormValues = z.infer<typeof newPatientSchema>

interface NewPatientFormProps {
  /** Organizations where the user may register patients (at least one). With one, it is preselected. */
  organizations: readonly OrganizacionResponse[]
  /** Preselected organization (the active space), when it is one of `organizations`. */
  defaultOrganizationId?: string
  isPending: boolean
  /** Message of the last failed submit (server/network); field errors are shown separately. */
  error: string | null
  onSubmit: (values: NewPatientFormValues) => void
  onCancel: () => void
}

const LEGEND_CLASS = 'text-sm font-semibold text-foreground'

/** Focused panel to register a patient: where it belongs first, then its own data. */
export function NewPatientForm({
  organizations,
  defaultOrganizationId,
  isPending,
  error,
  onSubmit,
  onCancel,
}: NewPatientFormProps) {
  const preselected =
    organizations.length === 1
      ? organizations[0].id
      : (organizations.find((organization) => organization.id === defaultOrganizationId)?.id ?? '')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientSchema),
    // Errors appear when leaving a field, never while typing it for the first time.
    mode: 'onTouched',
    defaultValues: {
      nombre: '',
      apellido: '',
      fechaNacimiento: '',
      organizacionId: preselected,
    },
  })

  const describedBy = (field: keyof NewPatientFormValues, id: string) => (errors[field] ? id : undefined)

  return (
    <form
      noValidate
      aria-labelledby="new-patient-title"
      onSubmit={handleSubmit(onSubmit)}
      className="flex max-w-2xl flex-col gap-6 rounded-xl border border-border bg-background p-5 sm:p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="new-patient-title" className="font-display text-lg font-bold tracking-[-0.01em] text-foreground">
          Nuevo paciente
        </h2>
        <p className="text-sm text-muted-foreground">Después podrás preparar su cartilla y sumar a su equipo y su familia.</p>
      </div>

      {organizations.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-patient-organizacion">Espacio</Label>
          <select
            id="new-patient-organizacion"
            disabled={isPending}
            aria-invalid={errors.organizacionId ? true : undefined}
            aria-describedby={describedBy('organizacionId', 'new-patient-organizacion-error')}
            className={NATIVE_SELECT_CLASS}
            {...register('organizacionId')}
          >
            <option value="">Seleccioná un espacio</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.nombre}
              </option>
            ))}
          </select>
          <FieldError id="new-patient-organizacion-error" message={errors.organizacionId?.message} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Se registrará en <span className="font-semibold text-foreground">{organizations[0].nombre}</span>.
        </p>
      )}

      <fieldset className="flex flex-col gap-4" disabled={isPending}>
        <legend className={`${LEGEND_CLASS} mb-3`}>Datos del paciente</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-patient-nombre">Nombre</Label>
            <Input
              id="new-patient-nombre"
              autoFocus
              autoComplete="off"
              aria-invalid={errors.nombre ? true : undefined}
              aria-describedby={describedBy('nombre', 'new-patient-nombre-error')}
              className="h-11"
              {...register('nombre')}
            />
            <FieldError id="new-patient-nombre-error" message={errors.nombre?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-patient-apellido">Apellido</Label>
            <Input
              id="new-patient-apellido"
              autoComplete="off"
              aria-invalid={errors.apellido ? true : undefined}
              aria-describedby={describedBy('apellido', 'new-patient-apellido-error')}
              className="h-11"
              {...register('apellido')}
            />
            <FieldError id="new-patient-apellido-error" message={errors.apellido?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-patient-fecha">Fecha de nacimiento</Label>
            <Input
              id="new-patient-fecha"
              type="date"
              max={todayIso()}
              aria-invalid={errors.fechaNacimiento ? true : undefined}
              aria-describedby={describedBy('fechaNacimiento', 'new-patient-fecha-error')}
              className="h-11"
              {...register('fechaNacimiento')}
            />
            <FieldError id="new-patient-fecha-error" message={errors.fechaNacimiento?.message} />
          </div>
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" size="lg" className="h-11" disabled={isPending} onMouseDown={keepFieldFocus} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" className="h-11" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Creando…' : 'Crear paciente'}
        </Button>
      </div>
    </form>
  )
}
