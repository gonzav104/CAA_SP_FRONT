import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogout } from '../hooks'

interface LogoutButtonProps {
  /** When set, the user must confirm (native dialog) before the logout request is sent. */
  confirmMessage?: string
  /** Quiet full-width version for the dark app shell. Default: the outline button, unchanged from before. */
  inShell?: boolean
}

export function LogoutButton({ confirmMessage, inShell = false }: LogoutButtonProps) {
  const logout = useLogout()

  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    logout.mutate()
  }

  const label = logout.isPending ? 'Cerrando…' : 'Cerrar sesión'

  return (
    <div className={inShell ? 'flex flex-col gap-1' : 'flex items-center gap-2'}>
      {inShell ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          disabled={logout.isPending}
          aria-busy={logout.isPending || undefined}
          onClick={handleClick}
          className="h-11 w-full justify-start gap-3 px-3 text-muted-foreground hover:bg-white/10 hover:text-white focus-visible:ring-ring lg:h-10"
        >
          <LogOut aria-hidden="true" />
          {label}
        </Button>
      ) : (
        <Button type="button" variant="outline" size="lg" disabled={logout.isPending} onClick={handleClick}>
          {label}
        </Button>
      )}
      {logout.isError && (
        <p role="alert" className={inShell ? 'px-3 text-sm text-red-200' : 'text-sm text-destructive'}>
          No se pudo cerrar la sesión. Intentá nuevamente.
        </p>
      )}
    </div>
  )
}
