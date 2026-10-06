import { Navigate, Outlet, useLocation } from 'react-router'
import { routes } from '@/app/paths'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '../hooks'

export function ProtectedRoute() {
  const { data, isError, refetch } = useCurrentUser()
  const location = useLocation()

  if (data === undefined) {
    if (isError) {
      return (
        <FullScreenStatus
          message="No se pudo verificar la sesión."
          action={
            <Button size="lg" variant="outline" onClick={() => void refetch()}>
              Reintentar
            </Button>
          }
        />
      )
    }
    return <FullScreenStatus message="Cargando…" />
  }

  if (data === null) {
    return <Navigate to={routes.login} replace state={{ from: location }} />
  }

  return <Outlet />
}
