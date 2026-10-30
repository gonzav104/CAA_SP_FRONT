import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { routes } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getRegisterErrorMessage } from '../errors'
import { useRegister } from '../hooks'
import { strongPassword } from '../password'
import { pendingFrom } from '../returnTo'
import { AuthLayout, authLinkClassName } from './AuthLayout'

// Mirrors UsuarioRegistroDTO: nombre @NotBlank, email @NotBlank @Email, password with the strength @Pattern.
const registerSchema = z.object({
  nombre: z.string().trim().min(1, 'Ingresa tu nombre.'),
  email: z.email('Ingresa un email válido.'),
  password: strongPassword,
})

type RegisterFormValues = z.infer<typeof registerSchema>

/**
 * Public identity registration: no role and no organization. It does not log in — on success it goes to
 * the login screen keeping any pending destination (e.g. an invitation being accepted).
 */
export function RegisterPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const registerUser = useRegister()
  const from = pendingFrom(location.state)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nombre: '', email: '', password: '' },
  })

  const onSubmit = (values: RegisterFormValues) => {
    registerUser.mutate(
      { nombre: values.nombre.trim(), email: values.email, password: values.password },
      { onSuccess: () => navigate(routes.login, { replace: true, state: { from, registered: true } }) },
    )
  }

  return (
    <AuthLayout title="Crear cuenta" description="Con tu cuenta podrás aceptar las invitaciones que recibas.">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-nombre">Nombre</Label>
          <Input
            id="register-nombre"
            autoComplete="name"
            className="h-11"
            aria-invalid={errors.nombre ? true : undefined}
            aria-describedby={errors.nombre ? 'register-nombre-error' : undefined}
            {...register('nombre')}
          />
          {errors.nombre && (
            <p id="register-nombre-error" className="text-sm text-destructive">
              {errors.nombre.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            className="h-11"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'register-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="register-email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="register-password">Contraseña</Label>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby="register-password-hint"
            {...register('password')}
          />
          <p id="register-password-hint" className={errors.password ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.password?.message ??
              'Al menos 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo.'}
          </p>
        </div>

        {registerUser.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getRegisterErrorMessage(registerUser.error)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11" disabled={registerUser.isPending}>
          {registerUser.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link to={routes.login} state={{ from }} className={authLinkClassName}>
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  )
}
