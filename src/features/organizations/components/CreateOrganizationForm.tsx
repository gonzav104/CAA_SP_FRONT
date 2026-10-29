import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { paths } from '@/app/paths'
import { getOrganizationCreateErrorMessage } from '@/api/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateOrganization } from '../hooks'

// Mirrors OrganizacionRegistroDTO: nombre @NotBlank. Roles are decided by the backend, never here.
const schema = z.object({ nombre: z.string().trim().min(1, 'Ingresá el nombre del espacio.').max(120, 'Usá un nombre más corto.') })

type Values = z.infer<typeof schema>

interface CreateOrganizationFormProps {
  /** Present when the form can be dismissed (it is the only content of the empty onboarding). */
  onCancel?: () => void
}

/** Creates a workspace (the backend makes the user its OWNER) and enters it. */
export function CreateOrganizationForm({ onCancel }: CreateOrganizationFormProps) {
  const navigate = useNavigate()
  const create = useCreateOrganization()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { nombre: '' } })

  const onSubmit = ({ nombre }: Values) => {
    if (create.isPending) return
    create.mutate(nombre.trim(), { onSuccess: (organization) => navigate(paths.patientsInSpace(organization.id)) })
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <div className="flex flex-col gap-1.5 sm:max-w-sm">
        <Label htmlFor="new-organization-nombre">Nombre del espacio</Label>
        <Input
          id="new-organization-nombre"
          placeholder="Por ejemplo, Consultorio Sol"
          disabled={create.isPending}
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={errors.nombre ? 'new-organization-nombre-error' : 'new-organization-nombre-hint'}
          className="h-10"
          {...register('nombre')}
        />
        {errors.nombre ? (
          <p id="new-organization-nombre-error" className="text-xs text-destructive">
            {errors.nombre.message}
          </p>
        ) : (
          <p id="new-organization-nombre-hint" className="text-xs text-muted-foreground">
            Serás su propietario y podrás registrar pacientes en él.
          </p>
        )}
      </div>

      {create.isError && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {getOrganizationCreateErrorMessage(create.error)}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={create.isPending} aria-busy={create.isPending || undefined}>
          {create.isPending ? 'Creando…' : 'Crear espacio'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" disabled={create.isPending} onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  )
}
