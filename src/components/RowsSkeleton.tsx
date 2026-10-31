/** Loading state of a list of rows: the shape for sight, the message for assistive technology. */
export function RowsSkeleton({ message, rows = 2 }: { message: string; rows?: number }) {
  return (
    <>
      <p role="status" className="sr-only">
        {message}
      </p>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, key) => (
          <div key={key} className="h-[4.5rem] animate-pulse rounded-xl border border-border bg-background" />
        ))}
      </div>
    </>
  )
}
