interface LoadingStateProps {
  message: string
}

export function LoadingState({ message }: LoadingStateProps) {
  return (
    <p role="status" className="py-10 text-center text-muted-foreground">
      {message}
    </p>
  )
}
