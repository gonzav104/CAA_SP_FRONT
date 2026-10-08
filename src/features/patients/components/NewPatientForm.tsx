import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Mirrors PacienteRegistroDTO: nombre/apellido @NotBlank, fechaNacimiento @NotNull @Past.
const newPatientSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es obligatoria.')
    .refine((value) => value < todayIso(), { message: 'La fecha de nacimiento debe ser en el pasado.' }),
})

export type NewPatientFormValues = z.infer<typeof newPatientSchema>

interface NewPatientFormProps {
  isPending: boolean
  /** Message of the last failed submit (server/network); field errors are shown separately. */
  error: string | null
  onSubmit: (values: NewPatientFormValues) => void
  onCancel: () => void
}

/** Inline card to register a new patient, in the same visual language as the rest of the shell. */
export function NewPatientForm({ isPending, error, onSubmit, onCancel }: NewPatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPatientFormValues>({
    resolver: zodResolver(newPatientSchema),
    defaultValues: { nombre: '', apellido: '', fechaNacimiento: '' },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">Nuevo paciente</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-patient-nombre">Nombre</Label>
          <Input
            id="new-patient-nombre"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.nombre ? true : undefined}
            aria-describedby={errors.nombre ? 'new-patient-nombre-error' : undefined}
            className="h-10"
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="new-patient-nombre-error" className="text-xs text-destructive">
              {errors.nombre.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-patient-apellido">Apellido</Label>
          <Input
            id="new-patient-apellido"
            disabled={isPending}
            aria-invalid={errors.apellido ? true : undefined}
            aria-describedby={errors.apellido ? 'new-patient-apellido-error' : undefined}
            className="h-10"
            {...register('apellido')}
          />
          {errors.apellido && (
            <p id="new-patient-apellido-error" className="text-xs text-destructive">
              {errors.apellido.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="new-patient-fecha">Fecha de nacimiento</Label>
          <Input
            id="new-patient-fecha"
            type="date"
            max={todayIso()}
            disabled={isPending}
            aria-invalid={errors.fechaNacimiento ? true : undefined}
            aria-describedby={errors.fechaNacimiento ? 'new-patient-fecha-error' : undefined}
            className="h-10"
            {...register('fechaNacimiento')}
          />
          {errors.fechaNacimiento && (
            <p id="new-patient-fecha-error" className="text-xs text-destructive">
              {errors.fechaNacimiento.message}
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Creando…' : 'Crear paciente'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
