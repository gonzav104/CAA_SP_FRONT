import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sessionSchema } from '../sessionForm'
import type { SessionFormValues } from '../sessionForm'

interface SessionFormProps {
  title: string
  submitLabel: string
  pendingLabel: string
  defaultValues: SessionFormValues
  isPending: boolean
  error: string | null
  onSubmit: (values: SessionFormValues) => void
  onCancel: () => void
}

/** Shared form for registering and editing a session, in the project's inline-panel convention. */
export function SessionForm({
  title,
  submitLabel,
  pendingLabel,
  defaultValues,
  isPending,
  error,
  onSubmit,
  onCancel,
}: SessionFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SessionFormValues>({
    resolver: zodResolver(sessionSchema),
    defaultValues,
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background p-5"
    >
      <h3 className="font-medium text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-fecha-hora">Fecha y hora</Label>
          <Input
            id="session-fecha-hora"
            type="datetime-local"
            autoFocus
            disabled={isPending}
            aria-invalid={errors.fechaHora ? true : undefined}
            aria-describedby={errors.fechaHora ? 'session-fecha-hora-error' : undefined}
            className="h-10"
            {...register('fechaHora')}
          />
          {errors.fechaHora && (
            <p id="session-fecha-hora-error" className="text-xs text-destructive">
              {errors.fechaHora.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-disposicion">Disposición del paciente</Label>
          <Input id="session-disposicion" disabled={isPending} className="h-10" {...register('disposicion')} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-objetivos">Objetivos trabajados</Label>
        <Textarea
          id="session-objetivos"
          rows={3}
          disabled={isPending}
          aria-invalid={errors.objetivosTrabajados ? true : undefined}
          aria-describedby={errors.objetivosTrabajados ? 'session-objetivos-error' : undefined}
          {...register('objetivosTrabajados')}
        />
        {errors.objetivosTrabajados && (
          <p id="session-objetivos-error" className="text-xs text-destructive">
            {errors.objetivosTrabajados.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-observaciones">Observaciones</Label>
        <Textarea id="session-observaciones" rows={3} disabled={isPending} {...register('observaciones')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-estrategias">Estrategias y próximos pasos</Label>
        <Textarea id="session-estrategias" rows={3} disabled={isPending} {...register('estrategiasYProximosPasos')} />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
