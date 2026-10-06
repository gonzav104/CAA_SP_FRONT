import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-background px-6 py-10 text-center">
      <p role="alert" className="text-destructive">
        {message}
      </p>
      <Button type="button" variant="outline" size="lg" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  )
}
