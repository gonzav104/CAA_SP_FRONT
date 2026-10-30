import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { z } from 'zod'
import { routes } from '@/app/paths'
import { FullScreenStatus } from '@/components/FullScreenStatus'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getPasswordResetErrorMessage, INVALID_RESET_LINK_MESSAGE } from '../errors'
import { useResetPassword } from '../hooks'
import { strongPassword } from '../password'
import { useTokenFromUrl } from '../useTokenFromUrl'
import { AuthLayout, authLinkClassName } from './AuthLayout'

const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmacion: z.string().min(1, 'Repite la nueva contraseña.'),
  })
  .refine((values) => values.password === values.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

/** Landing of the reset e-mail link. The backend alone decides whether the token is valid. */
export function ResetPasswordPage() {
  const { token, isMovingFromUrl } = useTokenFromUrl(routes.resetPassword, 'resetToken')
  const reset = useResetPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmacion: '' },
  })

  if (isMovingFromUrl) return <FullScreenStatus message="Cargando…" />

  const requestNewLink = (
    <Link to={routes.forgotPassword} className={authLinkClassName}>
      Solicitar un nuevo enlace
    </Link>
  )

  if (reset.isSuccess) {
    return (
      <AuthLayout title="Contraseña restablecida">
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Tu contraseña fue restablecida correctamente.
        </p>
        <Link to={routes.login} replace className={`${buttonVariants({ size: 'lg' })} mt-6 w-full`}>
          Ir a iniciar sesión
        </Link>
      </AuthLayout>
    )
  }

  if (!token) {
    return (
      <AuthLayout title="Restablecer contraseña">
        <p role="alert" className="mt-4 text-sm text-muted-foreground">
          {`${INVALID_RESET_LINK_MESSAGE} Abre nuevamente el enlace que recibiste por correo o solicita uno nuevo.`}
        </p>
        <p className="mt-6 text-sm">{requestNewLink}</p>
      </AuthLayout>
    )
  }

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (reset.isPending) return
    reset.mutate({ token, password: values.password })
  }

  return (
    <AuthLayout title="Restablecer contraseña" description="Elige una nueva contraseña para tu cuenta.">
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-password">Nueva contraseña</Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby="reset-password-hint"
            {...register('password')}
          />
          <p id="reset-password-hint" className={errors.password ? 'text-sm text-destructive' : 'text-xs text-muted-foreground'}>
            {errors.password?.message ??
              'Al menos 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo.'}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reset-confirmacion">Repite la nueva contraseña</Label>
          <Input
            id="reset-confirmacion"
            type="password"
            autoComplete="new-password"
            className="h-11"
            aria-invalid={errors.confirmacion ? true : undefined}
            aria-describedby={errors.confirmacion ? 'reset-confirmacion-error' : undefined}
            {...register('confirmacion')}
          />
          {errors.confirmacion && (
            <p id="reset-confirmacion-error" className="text-sm text-destructive">
              {errors.confirmacion.message}
            </p>
          )}
        </div>

        {reset.isError && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {getPasswordResetErrorMessage(reset.error)}
          </p>
        )}

        <Button type="submit" size="lg" className="h-11" disabled={reset.isPending}>
          {reset.isPending ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
      <p className="mt-6 text-sm">{requestNewLink}</p>
    </AuthLayout>
  )
}
