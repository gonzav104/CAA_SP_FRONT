import { useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { paths, routes } from '@/app/paths'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getGoogleRecoveryErrorMessage, getGoogleRecoveryRequestErrorMessage } from '../errors'
import { getGoogleClientId } from '../google/googleIdentity'
import { GoogleSignInButton } from '../google/GoogleSignInButton'
import { useCompleteGoogleRecovery, useRequestGoogleRecovery } from '../hooks'
import { strongPassword } from '../password'
import { useTokenFromUrl } from '../useTokenFromUrl'
import { AuthLayout, authLinkClassName } from './AuthLayout'

const backToLogin = (
  <Link to={routes.login} className={authLinkClassName}>
    Volver a iniciar sesión
  </Link>
)

/**
 * Linking Google to an account that was created with e-mail and password. It needs two independent
 * proofs, both checked by the backend: the link mailed to the account's e-mail, and an ID token of the
 * same Google identity that asked for it. An e-mail alone never links anything.
 */
export function RecoverGooglePage() {
  const { token, isMovingFromUrl } = useTokenFromUrl(routes.recoverGoogle, 'googleRecoveryToken')

  if (isMovingFromUrl) return <FullScreenStatus message="Cargando…" />

  if (!getGoogleClientId()) {
    return (
      <AuthLayout title="Recuperar el acceso con Google">
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          El acceso con Google no está disponible en este momento.
        </p>
        <p className="mt-6 text-sm">{backToLogin}</p>
      </AuthLayout>
    )
  }

  return token ? <CompleteRecovery token={token} /> : <RequestRecovery />
}

function RequestRecovery() {
  const requestRecovery = useRequestGoogleRecovery()
  const inFlight = useRef(false)

  if (requestRecovery.isSuccess) {
    return (
      <AuthLayout title="Revisa tu correo">
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Si la cuenta es elegible, recibirás un enlace para recuperar el acceso con Google.
        </p>
        <p className="mt-6 text-sm">{backToLogin}</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Recuperar el acceso con Google"
      description="Si tu cuenta se creó con email y contraseña, elige la cuenta de Google con ese mismo email. Te enviaremos un enlace para confirmar que es tuya."
    >
      <div className="mt-6 flex flex-col gap-3">
        <GoogleSignInButton
          text="continue_with"
          onCredential={(idToken) => {
            if (inFlight.current) return
            inFlight.current = true
            requestRecovery.mutate(idToken, {
              onSettled: () => {
                inFlight.current = false
              },
            })
          }}
        />
        {requestRecovery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Verificando con Google…
          </p>
        )}
        {requestRecovery.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getGoogleRecoveryRequestErrorMessage(requestRecovery.error)}
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          ¿Ya recibiste el correo? Vuelve a abrir el enlace que contiene.
        </p>
      </div>
      <p className="mt-6 text-sm">{backToLogin}</p>
    </AuthLayout>
  )
}

const completeSchema = z
  .object({
    password: strongPassword,
    confirmacion: z.string().min(1, 'Repite la nueva contraseña.'),
  })
  .refine((values) => values.password === values.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })

type CompleteFormValues = z.infer<typeof completeSchema>

function CompleteRecovery({ token }: { token: string }) {
  const navigate = useNavigate()
  const completeRecovery = useCompleteGoogleRecovery()
  // The e-mailed token is single use: a second submission must never race the first one.
  const inFlight = useRef(false)
  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<CompleteFormValues>({
    resolver: zodResolver(completeSchema),
    defaultValues: { password: '', confirmacion: '' },
  })

  // The Google confirmation is the submit: the password is validated first, then both proofs go together.
  const handleCredential = async (idToken: string) => {
    if (inFlight.current) return
    inFlight.current = true
    if (!(await trigger())) {
      inFlight.current = false
      return
    }
    completeRecovery.mutate(
      { idToken, token, password: getValues('password') },
      {
        onSuccess: () => navigate(paths.dashboard(), { replace: true }),
        onSettled: () => {
          inFlight.current = false
        },
      },
    )
  }

  return (
    <AuthLayout
      title="Recuperar el acceso con Google"
      description="Elige una nueva contraseña y confirma con la misma cuenta de Google con la que lo solicitaste."
    >
      <form noValidate onSubmit={(event) => event.preventDefault()} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="google-recovery-password">Nueva contraseña</Label>
          <Input
            id="google-recovery-password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby="google-recovery-password-hint"
            {...register('password')}
          />
          <p
            id="google-recovery-password-hint"
            className={errors.password ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}
          >
            {errors.password?.message ??
              'Al menos 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo. Tiene que ser distinta de tu contraseña actual.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="google-recovery-confirmacion">Repite la nueva contraseña</Label>
          <Input
            id="google-recovery-confirmacion"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={errors.confirmacion ? true : undefined}
            aria-describedby={errors.confirmacion ? 'google-recovery-confirmacion-error' : undefined}
            {...register('confirmacion')}
          />
          {errors.confirmacion && (
            <p id="google-recovery-confirmacion-error" className="text-sm text-destructive">
              {errors.confirmacion.message}
            </p>
          )}
        </div>

        <GoogleSignInButton text="continue_with" onCredential={(idToken) => void handleCredential(idToken)} />

        {completeRecovery.isPending && (
          <p role="status" className="text-sm text-muted-foreground">
            Recuperando el acceso…
          </p>
        )}
        {completeRecovery.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getGoogleRecoveryErrorMessage(completeRecovery.error)}
          </p>
        )}
      </form>
      <p className="mt-6 text-sm">
        <Link to={routes.recoverGoogle} replace state={null} className={authLinkClassName}>
          Solicitar un nuevo enlace
        </Link>
      </p>
    </AuthLayout>
  )
}
