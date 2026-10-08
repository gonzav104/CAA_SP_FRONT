import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Patient } from '../types'

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Mirrors PacienteActualizacionDTO: nombre/apellido @NotBlank, fechaNacimiento @NotNull @Past, gridSize opcional.
const editPatientSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.'),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio.'),
  fechaNacimiento: z
    .string()
    .min(1, 'La fecha de nacimiento es obligatoria.')
    .refine((value) => value < todayIso(), { message: 'La fecha de nacimiento debe ser en el pasado.' }),
  gridSize: z.enum(['', '6', '9', '12']),
})

export type EditPatientFormValues = z.infer<typeof editPatientSchema>

export interface EditPatientSubmitValues {
  nombre: string
  apellido: string
  fechaNacimiento: string
  gridSize: number | null
}

interface EditPatientFormProps {
  patient: Patient
  gridSize: number | null
  isPending: boolean
  error: string | null
  onSubmit: (values: EditPatientSubmitValues) => void
  onCancel: () => void
}

/** Inline edit panel for a patient's own data, in the same visual language as NewPatientForm. */
export function EditPatientForm({ patient, gridSize, isPending, error, onSubmit, onCancel }: EditPatientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditPatientFormValues>({
    resolver: zodResolver(editPatientSchema),
    defaultValues: {
      nombre: patient.firstName,
      apellido: patient.lastName,
      fechaNacimiento: patient.birthDate,
      gridSize: gridSize ? (String(gridSize) as '6' | '9' | '12') : '',
    },
  })

  const submit = (values: EditPatientFormValues) => {
    onSubmit({
      nombre: values.nombre,
      apellido: values.apellido,
      fechaNacimiento: values.fechaNacimiento,
      gridSize: values.gridSize === '' ? null : Number(values.gridSize),
    })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(submit)}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">Editar datos del paciente</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-patient-nombre">Nombre</Label>
          <Input
            id="edit-patient-nombre"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.nombre ? true : undefined}
            aria-describedby={errors.nombre ? 'edit-patient-nombre-error' : undefined}
            className="h-10"
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="edit-patient-nombre-error" className="text-xs text-destructive">
              {errors.nombre.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-patient-apellido">Apellido</Label>
          <Input
            id="edit-patient-apellido"
            disabled={isPending}
            aria-invalid={errors.apellido ? true : undefined}
            aria-describedby={errors.apellido ? 'edit-patient-apellido-error' : undefined}
            className="h-10"
            {...register('apellido')}
          />
          {errors.apellido && (
            <p id="edit-patient-apellido-error" className="text-xs text-destructive">
              {errors.apellido.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-patient-fecha">Fecha de nacimiento</Label>
          <Input
            id="edit-patient-fecha"
            type="date"
            max={todayIso()}
            disabled={isPending}
            aria-invalid={errors.fechaNacimiento ? true : undefined}
            aria-describedby={errors.fechaNacimiento ? 'edit-patient-fecha-error' : undefined}
            className="h-10"
            {...register('fechaNacimiento')}
          />
          {errors.fechaNacimiento && (
            <p id="edit-patient-fecha-error" className="text-xs text-destructive">
              {errors.fechaNacimiento.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-patient-grid">Cantidad de opciones en Modo Uso</Label>
          <select
            id="edit-patient-grid"
            disabled={isPending}
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('gridSize')}
          >
            {/* El backend solo aplica gridSize cuando no es null: una vez definido, no hay forma real
                de volver a "sin preferencia" desde este endpoint, así que no se ofrece esa opción. */}
            {gridSize === null && <option value="">Sin preferencia</option>}
            <option value="6">6 opciones</option>
            <option value="9">9 opciones</option>
            <option value="12">12 opciones</option>
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
