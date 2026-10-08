import { z } from 'zod'
import type { SesionWriteRequest } from './apiTypes'

// Mirrors SesionRegistroDTO/SesionActualizacionDTO: fechaHora @NotNull, objetivosTrabajados @NotBlank.
// disposicion/observaciones/estrategiasYProximosPasos have no backend constraint.
export const sessionSchema = z.object({
  fechaHora: z.string().min(1, 'La fecha y hora es obligatoria.'),
  disposicion: z.string(),
  objetivosTrabajados: z.string().trim().min(1, 'Los objetivos trabajados son obligatorios.'),
  observaciones: z.string(),
  estrategiasYProximosPasos: z.string(),
})

export type SessionFormValues = z.infer<typeof sessionSchema>

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function toWriteRequest(values: SessionFormValues): SesionWriteRequest {
  return {
    fechaHora: values.fechaHora,
    disposicion: blankToNull(values.disposicion),
    objetivosTrabajados: values.objetivosTrabajados.trim(),
    observaciones: blankToNull(values.observaciones),
    estrategiasYProximosPasos: blankToNull(values.estrategiasYProximosPasos),
  }
}
