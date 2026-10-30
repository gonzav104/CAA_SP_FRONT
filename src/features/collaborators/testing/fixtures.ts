import type { ColaboradorResponse, InvitacionResponse } from '../apiTypes'

export const PATIENT_ID = 'p-3'

export const collaboratorsListResponse: ColaboradorResponse[] = [
  {
    usuarioId: 'u-rosa',
    nombre: 'Rosa Gómez',
    email: 'rosa@example.com',
    permiso: 'LECTURA',
    vinculadoEn: '2026-01-05T09:00:00',
  },
  {
    usuarioId: 'u-leo',
    nombre: 'Leo Gómez',
    email: 'leo@example.com',
    permiso: 'EDICION_LIMITADA',
    vinculadoEn: '2026-01-06T09:00:00',
  },
]

export const pendingInvitationsResponse: InvitacionResponse[] = [
  {
    id: 'inv-ana',
    tipo: 'PACIENTE_FAMILIAR',
    email: 'ana.nueva@example.com',
    rolGestionPropuesto: null,
    esTerapeutaPropuesto: null,
    permisoPropuesto: 'EDICION_LIMITADA',
    estado: 'PENDIENTE',
    expiraEn: '2999-01-08T09:00:00',
  },
  {
    id: 'inv-old',
    tipo: 'PACIENTE_FAMILIAR',
    email: 'vencida@example.com',
    rolGestionPropuesto: null,
    esTerapeutaPropuesto: null,
    permisoPropuesto: 'LECTURA',
    estado: 'PENDIENTE',
    expiraEn: '2020-01-01T09:00:00',
  },
]
