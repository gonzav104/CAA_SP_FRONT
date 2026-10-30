export type Screen = 'login' | 'registro' | 'recuperar' | 'inicio'
export type AuthScreen = Exclude<Screen, 'inicio'>
export type ProtoId = 'a' | 'b' | 'c'

export const screens: { id: Screen; label: string }[] = [
  { id: 'login', label: 'Ingresar' },
  { id: 'registro', label: 'Crear cuenta' },
  { id: 'recuperar', label: 'Olvidé mi contraseña' },
  { id: 'inicio', label: 'Inicio' },
]

export const href = (proto: ProtoId, screen: Screen) => `#/${proto}/${screen}`

export interface AuthField {
  id: string
  label: string
  type: 'text' | 'email' | 'password'
  autoComplete: string
  hint?: string
}

/** Copy and fields taken from the real auth screens; only the presentation changes per prototype. */
export const authScreens: Record<
  AuthScreen,
  { title: string; description: string; submit: string; fields: AuthField[]; google: boolean }
> = {
  login: {
    title: 'Iniciar sesión',
    description: 'Ingresa con tu email y contraseña.',
    submit: 'Ingresar',
    google: true,
    fields: [
      { id: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
      { id: 'password', label: 'Contraseña', type: 'password', autoComplete: 'current-password' },
    ],
  },
  registro: {
    title: 'Crear cuenta',
    description: 'Con tu cuenta podrás aceptar las invitaciones que recibas.',
    submit: 'Crear cuenta',
    google: true,
    fields: [
      { id: 'nombre', label: 'Nombre', type: 'text', autoComplete: 'given-name' },
      { id: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
      {
        id: 'password',
        label: 'Contraseña',
        type: 'password',
        autoComplete: 'new-password',
        hint: 'Al menos 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo.',
      },
    ],
  },
  recuperar: {
    title: 'Olvidé mi contraseña',
    description: 'Te enviaremos un enlace para crear una nueva contraseña.',
    submit: 'Enviar enlace',
    google: false,
    fields: [{ id: 'email', label: 'Email', type: 'email', autoComplete: 'email' }],
  },
}

/** Secondary links under each auth form, pointing to the sibling screens of the same prototype. */
export function authLinks(screen: AuthScreen): { to: Screen; text: string; action: string }[] {
  if (screen === 'login') {
    return [
      { to: 'recuperar', text: '', action: '¿Olvidaste tu contraseña?' },
      { to: 'registro', text: '¿No tienes cuenta?', action: 'Crear cuenta' },
    ]
  }
  if (screen === 'registro') return [{ to: 'login', text: '¿Ya tienes cuenta?', action: 'Iniciar sesión' }]
  return [{ to: 'login', text: '', action: 'Volver a iniciar sesión' }]
}

