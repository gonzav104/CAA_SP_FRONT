import { useId, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CATEGORY_NAME_MAX, validateCategoryName } from '../categoryPlan'

interface CategoryNameFormProps {
  /** Accessible name of the input. */
  label: string
  value: string
  submitLabel: string
  pendingLabel: string
  isPending: boolean
  /** True when submitting would change nothing (e.g. the name was not edited). */
  isUnchanged?: boolean
  /** Message of the last failed submit; the typed text stays. */
  error: string | null
  onChange: (value: string) => void
  onSubmit: () => void
  onCancel: () => void
}

/** Inline name editor shared by "Nueva categoría" and the rename of a category header. Enter submits, Escape cancels. */
export function CategoryNameForm({
  label,
  value,
  submitLabel,
  pendingLabel,
  isPending,
  isUnchanged = false,
  error,
  onChange,
  onSubmit,
  onCancel,
}: CategoryNameFormProps) {
  const messageId = useId()
  // The field only complains once the user touched it (blur or first change).
  const [touched, setTouched] = useState(false)
  const problem = validateCategoryName(value)
  const showProblem = touched && problem !== null

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (problem !== null || isPending || isUnchanged) return
    onSubmit()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || isPending) return
    event.preventDefault()
    onCancel()
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
      <Input
        aria-label={label}
        value={value}
        maxLength={CATEGORY_NAME_MAX}
        autoFocus
        disabled={isPending}
        onChange={(event) => {
          setTouched(true)
          onChange(event.target.value)
        }}
        onBlur={() => setTouched(true)}
        onKeyDown={handleKeyDown}
        aria-invalid={showProblem || undefined}
        aria-describedby={showProblem ? messageId : undefined}
        className="h-9"
      />
      {showProblem && (
        <p id={messageId} className="text-xs text-destructive">
          {problem === 'blank' ? 'El nombre es obligatorio.' : `Máximo ${CATEGORY_NAME_MAX} caracteres.`}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={isPending || problem !== null || isUnchanged} aria-busy={isPending || undefined}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={onCancel}>
          Cancelar
        </Button>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
    </form>
  )
}
