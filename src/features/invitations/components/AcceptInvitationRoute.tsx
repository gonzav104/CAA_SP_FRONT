import { useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { paths, routes } from '@/app/paths'
import { getInvitationAcceptErrorMessage } from '@/api/errors'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button, buttonVariants } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/hooks'
import { AuthLayout } from '@/features/auth/components/AuthLayout'
import { LogoutButton } from '@/features/auth/components/LogoutButton'
import { useTokenFromUrl } from '@/features/auth/useTokenFromUrl'
import type { AceptarInvitacionResponse } from '../apiTypes'
import { useAcceptInvitation } from '../hooks'

/** Key of the history state that carries the token once it is out of the URL. */
const TOKEN_STATE_KEY = 'invitationToken'

function destinationOf(result: AceptarInvitacionResponse): { to: string; label: string } {
  if (result.tipo === 'PACIENTE_FAMILIAR' && result.pacienteId) {
    return { to: paths.boards(result.pacienteId), label: 'Ir al paciente' }
  }
  return { to: paths.dashboard(), label: 'Ir al inicio' }
}

function InvitationCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AuthLayout title={title}>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </AuthLayout>
  )
}

/**
 * Landing of the invitation e-mail link. The token is moved from the URL into the history state right
 * away (never stored elsewhere nor logged), survives the login round trip, and is only sent to the
 * backend after an explicit confirmation. The backend alone decides whether the invitation is valid.
 */
export function AcceptInvitationRoute() {
  const navigate = useNavigate()
  const { token, isMovingFromUrl } = useTokenFromUrl(routes.acceptInvitation, TOKEN_STATE_KEY)
  const { data: user, isPending, isError, refetch } = useCurrentUser()
  const accept = useAcceptInvitation()
  // Guards against a double click landing twice before React re-renders the disabled button.
  const submitted = useRef(false)

  if (isMovingFromUrl) return <FullScreenStatus message="Cargando…" />

  if (isPending) return <FullScreenStatus message="Cargando…" />
  if (user === undefined && isError) {
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

  if (accept.isSuccess) {
    const destination = destinationOf(accept.data)
    return (
      <InvitationCard title="Invitación aceptada">
        <p role="status" className="text-sm text-muted-foreground">
          {accept.data.tipo === 'PACIENTE_FAMILIAR'
            ? 'Ya tienes acceso al paciente.'
            : 'Ya formas parte de la organización.'}
        </p>
        <Link to={destination.to} replace className={buttonVariants({ size: 'lg' })}>
          {destination.label}
        </Link>
      </InvitationCard>
    )
  }

  if (!token) {
    return (
      <InvitationCard title="Aceptar invitación">
        {/* Not a backend answer: the token never arrived or was lost (e.g. an interrupted navigation). */}
        <p role="alert" className="text-sm text-muted-foreground">
          No encontramos los datos de la invitación. Vuelve a abrir el enlace que recibiste por correo.
        </p>
        <Link to={paths.dashboard()} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Ir al inicio
        </Link>
      </InvitationCard>
    )
  }

  // No session (or it expired): log in and come back here with the token kept in the history state.
  if (!user) {
    return (
      <Navigate
        to={routes.login}
        replace
        state={{ from: { pathname: routes.acceptInvitation, state: { [TOKEN_STATE_KEY]: token } } }}
      />
    )
  }

  const handleAccept = () => {
    if (submitted.current) return
    submitted.current = true
    accept.mutate(token, {
      onSuccess: () => {
        // The token is spent: drop it from the history entry too.
        navigate(routes.acceptInvitation, { replace: true, state: null })
      },
      onError: () => {
        submitted.current = false
      },
    })
  }

  return (
    <InvitationCard title="Aceptar invitación">
      <p className="text-sm text-muted-foreground">
        {`Estás por aceptar una invitación con la cuenta ${user.email}. La invitación solo es válida para el email al que fue enviada.`}
      </p>
      {accept.isError && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {getInvitationAcceptErrorMessage(accept.error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="lg"
          disabled={accept.isPending}
          aria-busy={accept.isPending || undefined}
          onClick={handleAccept}
        >
          {accept.isPending ? 'Aceptando…' : 'Aceptar invitación'}
        </Button>
        <Link to={paths.dashboard()} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Ahora no
        </Link>
      </div>
      <div className="flex flex-col gap-2 border-t pt-4 text-sm text-muted-foreground">
        <p>¿La invitación es para otra cuenta? Cierra sesión e ingresa con ese email.</p>
        <LogoutButton />
      </div>
    </InvitationCard>
  )
}
