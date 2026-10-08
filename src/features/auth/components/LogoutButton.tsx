import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLogout } from '../hooks'

interface LogoutButtonProps {
  /** When set, the user must confirm (native dialog) before the logout request is sent. */
  confirmMessage?: string
  /** Shows only the icon below `lg:` and the label from `lg:` up — for the collapsed sidebar rail. Default: the label at every width, unchanged from before. */
  responsive?: boolean
}

export function LogoutButton({ confirmMessage, responsive = false }: LogoutButtonProps) {
  const logout = useLogout()

  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    logout.mutate()
  }

  const label = logout.isPending ? 'Cerrando…' : 'Cerrar sesión'

  return (
    <div className="flex items-center gap-2">
      {responsive ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={logout.isPending}
          aria-busy={logout.isPending || undefined}
          aria-label={label}
          onClick={handleClick}
          className="w-9 px-0 lg:w-auto lg:px-2.5"
        >
          <LogOut aria-hidden="true" className="lg:hidden" />
          <span className="hidden lg:inline">{label}</span>
        </Button>
      ) : (
        <Button type="button" variant="outline" size="lg" disabled={logout.isPending} onClick={handleClick}>
          {label}
        </Button>
      )}
      {logout.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo cerrar la sesión. Intenta nuevamente.
        </p>
      )}
    </div>
  )
}
