import { Button } from '@/components/ui/button'
import { useLogout } from '../hooks'

interface LogoutButtonProps {
  /** When set, the user must confirm (native dialog) before the logout request is sent. */
  confirmMessage?: string
}

export function LogoutButton({ confirmMessage }: LogoutButtonProps) {
  const logout = useLogout()

  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    logout.mutate()
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="lg" disabled={logout.isPending} onClick={handleClick}>
        {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
      </Button>
      {logout.isError && (
        <p role="alert" className="text-sm text-destructive">
          No se pudo cerrar la sesión. Intenta nuevamente.
        </p>
      )}
    </div>
  )
}
