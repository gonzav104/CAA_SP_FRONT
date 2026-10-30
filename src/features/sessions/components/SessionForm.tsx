import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FieldError } from '@/components/FieldError'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BRAND_ACTION_CLASS, BRAND_FORM_ACTIONS_CLASS, BRAND_PANEL_CLASS, BRAND_SECTION_TITLE_CLASS } from '@/layouts/brand'
import { cn } from '@/lib/utils'
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
    // Errors appear when leaving a field, never while writing it for the first time.
    mode: 'onTouched',
    defaultValues,
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      aria-labelledby="session-form-title"
      className={cn(BRAND_PANEL_CLASS, 'flex max-w-3xl flex-col gap-5 p-5 sm:p-6')}
    >
      <div className="flex flex-col gap-1">
        <h2 id="session-form-title" className={BRAND_SECTION_TITLE_CLASS}>
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">Solo la fecha y los objetivos son obligatorios.</p>
      </div>
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
            className="h-11"
            {...register('fechaHora')}
          />
          <FieldError id="session-fecha-hora-error" message={errors.fechaHora?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="session-disposicion">Disposición del paciente</Label>
          <Input id="session-disposicion" autoComplete="off" disabled={isPending} className="h-11" {...register('disposicion')} />
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
        <FieldError id="session-objetivos-error" message={errors.objetivosTrabajados?.message} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-observaciones">Observaciones</Label>
        <Textarea id="session-observaciones" rows={3} disabled={isPending} {...register('observaciones')} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="session-estrategias">Estrategias y próximos pasos</Label>
        <Textarea id="session-estrategias" rows={3} disabled={isPending} {...register('estrategiasYProximosPasos')} />
      </div>

      <FormAlert message={error} />

      <div className={BRAND_FORM_ACTIONS_CLASS}>
        <Button type="button" variant="outline" size="lg" className={BRAND_ACTION_CLASS} disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" size="lg" className={BRAND_ACTION_CLASS} disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
