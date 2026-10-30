import { z } from 'zod'

// Mirrors the @Pattern of UsuarioRegistroDTO and RestablecerPasswordDTO: 8+ characters with an upper
// case letter, a lower case letter, a digit and a symbol (any character that is neither a letter nor a
// digit in any language, so "ñ" is a letter, not a symbol).
const STRONG_PASSWORD = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^\p{L}\p{N}]).{8,}$/u

export const PASSWORD_RULE_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.'

export const strongPassword = z
  .string()
  .min(1, 'Ingresa una contraseña.')
  .regex(STRONG_PASSWORD, PASSWORD_RULE_MESSAGE)
