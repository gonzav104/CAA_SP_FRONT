import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    defaultValues: { email: '', rolGestion: roles[0] ?? 'MIEMBRO', esTerapeuta: true },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit({ ...values, email: values.email.trim() }))}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">Invitar al espacio</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-invite-email">Email</Label>
          <Input
            id="member-invite-email"
            type="email"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'member-invite-email-error' : undefined}
            className="h-10"
            {...register('email')}
          />
          {errors.email ? (
            <p id="member-invite-email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Le enviaremos una invitación por correo. No necesita tener una cuenta todavía.</p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="member-invite-rol">Rol de gestión</Label>
          <select
            id="member-invite-rol"
            disabled={isPending || roles.length < 2}
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" disabled={isPending} className="size-4 accent-caa-accent" {...register('esTerapeuta')} />
        Atiende pacientes (terapeuta)
      </label>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? 'Enviando…' : 'Enviar invitación'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
