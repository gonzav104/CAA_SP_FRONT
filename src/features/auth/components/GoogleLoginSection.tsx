import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { routes } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { getGoogleLoginErrorMessage } from '../errors'
import { getGoogleClientId } from '../google/googleIdentity'
import { GoogleSignInButton } from '../google/GoogleSignInButton'
import { useCompleteGoogleRegistration, useGoogleLogin } from '../hooks'
import { authLinkClassName } from './AuthLayout'

interface PendingRegistration {
  /** Kept only in memory, for the explicit confirmation; dropped on cancel or success. */
  idToken: string
  email: string | null
  nombre: string | null
}

interface GoogleLoginSectionProps {
  /** Called once the session cookie is set and /me confirmed it. */
  onAuthenticated: () => void
}

/**
 * "Continuar con Google" for the login screen. A linked account logs in; a new verified Google identity
 * must be confirmed before the account is created (identity only: no role, no organization). Linking an
 * existing e-mail is never attempted here: the backend refuses it and the user is offered the recovery.
 */
export function GoogleLoginSection({ onAuthenticated }: GoogleLoginSectionProps) {
  const googleLogin = useGoogleLogin()
  const completeRegistration = useCompleteGoogleRegistration()
  const [pending, setPending] = useState<PendingRegistration | null>(null)
  // Single flight across renders: a second credential or click before React re-renders is ignored, so
  // a later call can never replace the callbacks (and the navigation) of the one in progress.
  const inFlight = useRef(false)

  if (!getGoogleClientId()) return null

  const handleCredential = (idToken: string) => {
    if (inFlight.current) return
    inFlight.current = true
    setPending(null)
    completeRegistration.reset()
    googleLogin.mutate(idToken, {
      onSuccess: (outcome) => {
        if (outcome.kind === 'authenticated') onAuthenticated()
        else setPending({ idToken, email: outcome.email, nombre: outcome.nombre })
      },
      onSettled: () => {
        inFlight.current = false
      },
    })
  }

  const handleConfirmRegistration = () => {
    if (!pending || inFlight.current) return
    inFlight.current = true
    completeRegistration.mutate(pending.idToken, {
      onSuccess: () => {
        setPending(null)
        onAuthenticated()
      },
      onSettled: () => {
        inFlight.current = false
      },
    })
  }

  const failure = googleLogin.error ?? completeRegistration.error

  return (
    <div className="mt-8 flex flex-col gap-3">
      {pending ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4 text-sm">
          <p className="font-medium">Crear cuenta con Google</p>
          <p className="text-muted-foreground">
            {`No hay una cuenta para ${pending.email ?? 'esta cuenta de Google'}. ¿Quieres crearla${pending.nombre ? ` a nombre de ${pending.nombre}` : ''}?`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={completeRegistration.isPending}
              aria-busy={completeRegistration.isPending || undefined}
              onClick={handleConfirmRegistration}
            >
              {completeRegistration.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={completeRegistration.isPending}
              onClick={() => {
                setPending(null)
                completeRegistration.reset()
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <GoogleSignInButton onCredential={handleCredential} text="continue_with" />
      )}

      {googleLogin.isPending && (
        <p role="status" className="text-sm text-muted-foreground">
          Verificando con Google…
        </p>
      )}

      {failure && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>{getGoogleLoginErrorMessage(failure)}</p>
          <Link to={routes.recoverGoogle} className={authLinkClassName}>
            Recuperar el acceso con Google
          </Link>
        </div>
      )}

      <div aria-hidden="true" className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />o con tu email<span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
