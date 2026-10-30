import { z } from 'zod'

// Mirrors the @Pattern of UsuarioRegistroDTO, RestablecerPasswordDTO and GoogleRecuperacionCompletarDTO:
// 8+ characters with an upper case letter, a lower case letter, a digit and a symbol (any character that
// is neither a letter nor a digit in any language, so "ñ" is a letter, not a symbol).
const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\p{L}\p{N}]).{8,}$/u

export const PASSWORD_RULE_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.'

export const strongPassword = z
  .string()
  .min(1, 'Ingresa una contraseña.')
  .regex(STRONG_PASSWORD, PASSWORD_RULE_MESSAGE)

export interface PasswordRequirement {
  id: 'length' | 'case' | 'digit' | 'symbol'
  label: string
  isMet: (password: string) => boolean
}

/**
 * The same rule split into the parts shown while typing. Each part is one lookahead of STRONG_PASSWORD,
 * so meeting all of them is exactly matching it (pinned by password.test.ts). Checked locally only.
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { id: 'length', label: 'Al menos 8 caracteres', isMet: (password) => /^.{8,}$/u.test(password) },
  {
    id: 'case',
    label: 'Una mayúscula y una minúscula',
    isMet: (password) => /[A-Z]/.test(password) && /[a-z]/.test(password),
  },
  { id: 'digit', label: 'Un número', isMet: (password) => /\d/.test(password) },
  { id: 'symbol', label: 'Un símbolo, como # o !', isMet: (password) => /[^\p{L}\p{N}]/u.test(password) },
]
