import type { ReactNode } from 'react'

interface FullScreenStatusProps {
  message: string
  // Present only for errors: an action (e.g. a retry button) shown under the message.
  action?: ReactNode
}

export function FullScreenStatus({ message, action }: FullScreenStatusProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-muted/40 p-6 text-center">
      <p role={action ? 'alert' : 'status'} className="text-muted-foreground">
        {message}
      </p>
      {action}
    </div>
  )
}
