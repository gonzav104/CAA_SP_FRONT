import { useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BOARD_NAME_MAX, validateBoardName } from '../boardName'

interface BoardNameFormProps {
  /** Accessible name of the input. */
  label: string
  /** Text the input starts with. */
  initialValue?: string
  /** When set, submitting is disabled while the trimmed text equals it (nothing would change). */
  originalName?: string
  submitLabel: string
  pendingLabel: string
  isPending: boolean
  /** Message of the last failed submit; the typed text stays. */
  error: string | null
  onSubmit: (name: string) => void
  onCancel: () => void
}

/** Inline name editor shared by "Nueva cartilla" and the rename of a row. Enter submits, Escape cancels. */
export function BoardNameForm({
  label,
  initialValue = '',
  originalName,
  submitLabel,
  pendingLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: BoardNameFormProps) {
  const messageId = useId()
  const [value, setValue] = useState(initialValue)
  // The field only complains once the user touched it (blur or first change).
  const [touched, setTouched] = useState(false)
  const problem = validateBoardName(value)
  const showProblem = touched && problem !== null
  const isUnchanged = originalName !== undefined && value.trim() === originalName.trim()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (problem !== null || isPending || isUnchanged) return
    onSubmit(value.trim())
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || isPending) return
    event.preventDefault()
    onCancel()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex min-w-0 flex-1 basis-full flex-col gap-2 sm:basis-0">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={label}
          value={value}
          maxLength={BOARD_NAME_MAX}
          autoFocus
          disabled={isPending}
          onChange={(event) => {
            setTouched(true)
            setValue(event.target.value)
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={handleKeyDown}
          aria-invalid={showProblem || undefined}
          aria-describedby={showProblem ? messageId : undefined}
          className="h-11 min-w-48 flex-1 sm:h-10"
        />
        <Button type="submit" size="lg" className="h-11 flex-1 sm:h-10 sm:flex-none" disabled={isPending || problem !== null || isUnchanged} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-11 flex-1 sm:h-10 sm:flex-none" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {showProblem && (
        <p id={messageId} className="text-sm text-destructive">
          {problem === 'blank' ? 'El nombre es obligatorio.' : `Máximo ${BOARD_NAME_MAX} caracteres.`}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
