import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { paths, routes } from '@/app/paths'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getLoginErrorMessage } from '../errors'
import { useCurrentUser, useLogin } from '../hooks'

const DEFAULT_DESTINATION = paths.patients()

const loginSchema = z.object({
  email: z.email('Ingresa un email válido'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
})

type LoginFormValues = z.infer<typeof loginSchema>

// Only same-app paths are accepted, so the redirect can never leave the site or loop on /login.
function getDestination(state: unknown): string {
  if (typeof state !== 'object' || state === null || !('from' in state)) return DEFAULT_DESTINATION
  const from = state.from
  if (typeof from !== 'object' || from === null || !('pathname' in from)) return DEFAULT_DESTINATION
  const pathname = from.pathname
  if (
    typeof pathname !== 'string' ||
    !pathname.startsWith('/') ||
    pathname.startsWith('//') ||
    pathname === routes.login
  ) {
    return DEFAULT_DESTINATION
  }
  return pathname
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

  const destination = getDestination(location.state)

  if (isPending) return <FullScreenStatus message="Cargando…" />
  if (currentUser) return <Navigate to={destination} replace />

  const onSubmit = (values: LoginFormValues) => {
    login.mutate(values, {
      onSuccess: () => navigate(destination, { replace: true }),
    })
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-muted-foreground">Acceso para terapeutas y familiares</p>

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
      </div>
    </div>
  )
}
