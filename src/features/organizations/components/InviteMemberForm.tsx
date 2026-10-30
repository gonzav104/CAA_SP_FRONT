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
import type { InvitacionOrganizacionRequest, RolGestionAsignable } from '../apiTypes'
import { ROL_GESTION_LABELS } from '../spaces'

const schema = z.object({
  email: z.string().trim().min(1, 'El email es obligatorio.').email('El email no es válido.'),
  rolGestion: z.enum(['MIEMBRO', 'ADMIN']),
  esTerapeuta: z.boolean(),
})

type Values = z.infer<typeof schema>

interface InviteMemberFormProps {
  /** The roles the caller may propose (see `invitableRoles`); the backend validates them again. */
  roles: RolGestionAsignable[]
  isPending: boolean
  error: string | null
  onSubmit: (request: InvitacionOrganizacionRequest) => void
  onCancel: () => void
}

/** Invites someone (with or without an account) to the workspace; nothing is granted until they accept. */
export function InviteMemberForm({ roles, isPending, error, onSubmit, onCancel }: InviteMemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', rolGestion: roles[0] ?? 'MIEMBRO', esTerapeuta: true },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit({ ...values, email: values.email.trim() }))}
      aria-labelledby="member-invite-title"
      className={cn(BRAND_PANEL_CLASS, 'flex flex-col gap-4 p-5')}
    >
      <h2 id="member-invite-title" className="font-semibold text-foreground">
        Invitar al espacio
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-invite-email">Email</Label>
          <Input
            id="member-invite-email"
            type="email"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'member-invite-email-error' : 'member-invite-email-hint'}
            className="h-11"
            {...register('email')}
          />
          {errors.email ? (
            <FieldError id="member-invite-email-error" message={errors.email.message} />
          ) : (
            <p id="member-invite-email-hint" className="text-sm text-muted-foreground">
              Le enviaremos una invitación por correo. No necesita tener una cuenta todavía.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-invite-rol">Rol de gestión</Label>
          <select
            id="member-invite-rol"
            disabled={isPending || roles.length < 2}
            className={NATIVE_SELECT_CLASS}
            {...register('rolGestion')}
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {ROL_GESTION_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="flex min-h-11 w-fit items-center gap-2.5 text-sm text-foreground">
        <input type="checkbox" disabled={isPending} className="size-5 accent-caa-azul" {...register('esTerapeuta')} />
        Atiende pacientes (terapeuta)
      </label>

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
