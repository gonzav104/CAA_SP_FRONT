import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { routes } from '@/app/paths'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLoginErrorMessage } from '../errors'
import { useCurrentUser, useLogin } from '../hooks'
import { getReturnTo, pendingFrom } from '../returnTo'
import { AuthLayout, authLinkClassName } from './AuthLayout'
import { GoogleLoginSection } from './GoogleLoginSection'

const loginSchema = z.object({
  email: z.email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type LoginFormValues = z.infer<typeof loginSchema>

/** Set by the registration screen when it sends the new user here. */
function cameFromRegistration(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'registered' in state && state.registered === true
}

export function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: currentUser, isPending } = useCurrentUser()
  const login = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const destination = getReturnTo(location.state)
  // Handed to the registration / recovery screens so a pending destination survives the detour.
  const linkState = { from: pendingFrom(location.state) }

  if (isPending) return <FullScreenStatus message="Cargando…" />
  if (currentUser) return <Navigate to={destination.pathname} state={destination.state} replace />

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => navigate(destination.pathname, { replace: true, state: destination.state }),
    })
  }

  return (
    <AuthLayout title="Iniciar sesión" description="Ingresa con tu email y contraseña.">
      {cameFromRegistration(location.state) && (
        <p role="status" className="mt-4 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900">
          Tu cuenta fue creada. Ya puedes iniciar sesión.
        </p>
      )}

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="h-10"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Contraseña</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="h-10"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        {login.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getLoginErrorMessage(login.error)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-10" disabled={login.isPending}>
          {login.isPending ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>

      <GoogleLoginSection
        onAuthenticated={() => navigate(destination.pathname, { replace: true, state: destination.state })}
      />

      <div className="mt-6 flex flex-col gap-2 text-sm text-muted-foreground">
        <Link to={routes.forgotPassword} state={linkState} className={authLinkClassName}>
          Olvidé mi contraseña
        </Link>
        <p>
          ¿No tienes cuenta?{' '}
          <Link to={routes.register} state={linkState} className={authLinkClassName}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
