import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

/** Inline form to link a family collaborator by the real ColaboradorRegistroDTO contract. */
export function LinkCollaboratorForm({ isPending, error, onSubmit, onCancel }: LinkCollaboratorFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LinkCollaboratorFormValues>({
    resolver: zodResolver(linkCollaboratorSchema),
    defaultValues: { email: '', permiso: 'LECTURA' },
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">Vincular familiar</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collaborator-email">Email del familiar</Label>
          <Input
            id="collaborator-email"
            type="email"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'collaborator-email-error' : undefined}
            className="h-10"
            {...register('email')}
          />
          {errors.email && (
            <p id="collaborator-email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="collaborator-permiso">Permiso</Label>
          <select
            id="collaborator-permiso"
            disabled={isPending}
            className="h-10 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            {...register('permiso')}
          >
            <option value="LECTURA">Solo lectura</option>
            <option value="EDICION_LIMITADA">Edición limitada</option>
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
          {isPending ? 'Vinculando…' : 'Vincular familiar'}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
