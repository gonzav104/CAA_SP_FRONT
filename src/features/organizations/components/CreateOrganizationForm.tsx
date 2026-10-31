import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { paths } from '@/app/paths'
import { getOrganizationCreateErrorMessage } from '@/api/errors'
import { FieldError } from '@/components/FieldError'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BRAND_FORM_ACTION_CLASS, BRAND_FORM_ACTIONS_CLASS, BRAND_PANEL_CLASS } from '@/layouts/brand'
import { cn } from '@/lib/utils'
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
      className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-4 p-5')}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-organization-nombre">Nombre del espacio</Label>
        <Input
          id="new-organization-nombre"
          placeholder="Por ejemplo, Consultorio Sol"
          disabled={create.isPending}
          aria-invalid={errors.nombre ? true : undefined}
          aria-describedby={errors.nombre ? 'new-organization-nombre-error' : 'new-organization-nombre-hint'}
          className="h-11"
          {...register('nombre')}
        />
        {errors.nombre ? (
          <FieldError id="new-organization-nombre-error" message={errors.nombre.message} />
        ) : (
          <p id="new-organization-nombre-hint" className="text-sm text-muted-foreground">
            Serás su propietario y podrás registrar pacientes en él.
          </p>
        )}
      </div>

      <FormAlert message={create.isError ? getOrganizationCreateErrorMessage(create.error) : null} />

      <div className={BRAND_FORM_ACTIONS_CLASS}>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" className={BRAND_FORM_ACTION_CLASS} disabled={create.isPending} onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" size="lg" className={BRAND_FORM_ACTION_CLASS} disabled={create.isPending} aria-busy={create.isPending || undefined}>
          {create.isPending ? 'Creando…' : 'Crear espacio'}
        </Button>
      </div>
    </form>
  )
}
