import type { UseFormRegisterReturn } from 'react-hook-form'
import { Check, Circle, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { PASSWORD_REQUIREMENTS } from '../password'
import { PasswordInput } from './PasswordInput'

interface NewPasswordFieldProps {
  id: string
  label: string
  /** Current value (from useWatch), only to check the requirements locally while typing. */
  value: string
  /** Zod error after a submit attempt; until then unmet requirements stay neutral, not red. */
  error?: string
  /** Extra rule of this flow, shown under the requirements. */
  note?: string
  registration: UseFormRegisterReturn
}

/** New-password field shared by registro, restablecer and recuperación Google. */
export function NewPasswordField({ id, label, value, error, note, registration }: NewPasswordFieldProps) {
  const requirementsId = `${id}-requisitos`
  const noteId = `${id}-nota`
  const errorId = `${id}-error`
  const describedBy = [requirementsId, note && noteId, error && errorId].filter(Boolean).join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        autoComplete="new-password"
        className="h-11"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...registration}
      />
      <ul id={requirementsId} aria-label="Requisitos de la contraseña" className="mt-1 flex flex-col gap-1 text-[0.8125rem]">
        {PASSWORD_REQUIREMENTS.map((requirement) => {
          const met = requirement.isMet(value)
          const missing = !met && !!error
          const Icon = met ? Check : missing ? X : Circle
          return (
            <li
              key={requirement.id}
              data-met={met}
              className={cn(
                'flex items-center gap-1.5',
                met ? 'text-foreground' : missing ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              <Icon
                aria-hidden="true"
                strokeWidth={met || missing ? 2.5 : 2}
                className={cn('size-3.5 shrink-0', met && 'text-caa-cian-texto', !met && !missing && 'size-3')}
              />
              <span className="sr-only">{met ? 'Cumplido: ' : 'Falta: '}</span>
              {requirement.label}
            </li>
          )
        })}
      </ul>
      {note && (
        <p id={noteId} className="text-[0.8125rem] text-muted-foreground">
          {note}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
