import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { FieldError } from '@/components/FieldError'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NATIVE_SELECT_CLASS } from '@/components/ui/nativeSelect'
import { BRAND_FORM_ACTION_CLASS, BRAND_FORM_ACTIONS_CLASS, BRAND_PANEL_CLASS } from '@/layouts/brand'
import { cn } from '@/lib/utils'
import type { ColaboradorRegistroRequest } from '../apiTypes'

// Mirrors ColaboradorRegistroDTO: email @NotBlank @Email, permiso @NotNull.
const linkCollaboratorSchema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es válido.'),
  permiso: z.enum(['LECTURA', 'EDICION_LIMITADA']),
})

export type LinkCollaboratorFormValues = z.infer<typeof linkCollaboratorSchema>

interface LinkCollaboratorFormProps {
  isPending: boolean
  error: string | null
  onSubmit: (values: ColaboradorRegistroRequest) => void
  onCancel: () => void
}

/**
 * Inline form to invite a family member by the real ColaboradorRegistroDTO contract. The backend
 * answers with an invitation: nobody is linked until the invited person accepts it.
 */
export function LinkCollaboratorForm({ isPending, error, onSubmit, onCancel }: LinkCollaboratorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkCollaboratorFormValues>({
    resolver: zodResolver(linkCollaboratorSchema),
    mode: 'onTouched',
    defaultValues: { email: '', permiso: 'LECTURA' },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-labelledby="invite-family-title"
      className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-4 p-5')}
    >
      <h3 id="invite-family-title" className="font-semibold text-foreground">
        Invitar familiar
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collaborator-email">Email del familiar</Label>
          <Input
            id="collaborator-email"
            type="email"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'collaborator-email-error' : 'collaborator-email-hint'}
            className="h-11"
            {...register('email')}
          />
          {errors.email ? (
            <FieldError id="collaborator-email-error" message={errors.email.message} />
          ) : (
            <p id="collaborator-email-hint" className="text-sm text-muted-foreground">
              Le enviaremos una invitación por correo. No necesita tener una cuenta todavía.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collaborator-permiso">Permiso</Label>
          <select
            id="collaborator-permiso"
            disabled={isPending}
            aria-describedby="collaborator-permiso-hint"
            className={NATIVE_SELECT_CLASS}
            {...register('permiso')}
          >
            <option value="LECTURA">Solo lectura</option>
            <option value="EDICION_LIMITADA">Edición limitada</option>
          </select>
          <p id="collaborator-permiso-hint" className="text-sm text-muted-foreground">
            Edición limitada también permite modificar cartillas y datos del paciente.
          </p>
        </div>
      </div>

      <FormAlert message={error} />

      <div className={BRAND_FORM_ACTIONS_CLASS}>
        <Button type="button" variant="outline" size="lg" className={BRAND_FORM_ACTION_CLASS} disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" className={BRAND_FORM_ACTION_CLASS} disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Enviando…' : 'Enviar invitación'}
        </Button>
      </div>
    </form>
  )
}
