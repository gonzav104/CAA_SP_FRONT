import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useLocation } from 'react-router'
import { z } from 'zod'
import { routes } from '@/app/paths'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordResetRequestErrorMessage } from '../errors'
import { useRequestPasswordReset } from '../hooks'
import { pendingFrom } from '../returnTo'
import { AuthLayout, authLinkClassName } from './AuthLayout'

const forgotPasswordSchema = z.object({ email: z.email('Ingresa un email válido.') })

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

/** Asks for a reset link. The answer is the same whether the e-mail has an account or not. */
export function ForgotPasswordPage() {
  const location = useLocation()
  const requestReset = useRequestPasswordReset()
  const loginState = { from: pendingFrom(location.state) }
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const backToLogin = (
    <Link to={routes.login} state={loginState} className={authLinkClassName}>
      Volver a iniciar sesión
    </Link>
  )

  if (requestReset.isSuccess) {
    return (
      <AuthLayout title="Revisa tu correo">
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Si el email está registrado, vas a recibir un enlace para restablecer tu contraseña.
        </p>
        <p className="mt-6 text-sm">{backToLogin}</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Olvidé mi contraseña" description="Te enviaremos un enlace para crear una nueva contraseña.">
      <form
        noValidate
        onSubmit={handleSubmit((values) => requestReset.mutate(values.email))}
        className="mt-6 flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-email">Email</Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            className="h-10"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'forgot-email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="forgot-email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        {requestReset.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getPasswordResetRequestErrorMessage(requestReset.error)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-10" disabled={requestReset.isPending}>
          {requestReset.isPending ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>
      <p className="mt-6 text-sm">{backToLogin}</p>
    </AuthLayout>
  )
}
