import { Button } from '@/components/ui/button'
import { useLogout } from '../hooks'

export function LogoutButton() {
  const logout = useLogout()

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="lg" disabled={logout.isPending} onClick={() => logout.mutate()}>
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
