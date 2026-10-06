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
          className="h-9 min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={isPending || problem !== null || isUnchanged} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {showProblem && (
        <p id={messageId} className="text-xs text-destructive">
          {problem === 'blank' ? 'El nombre es obligatorio.' : `Máximo ${BOARD_NAME_MAX} caracteres.`}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
    </form>
  )
}
