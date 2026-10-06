import type { CartillaDetalleResponse, CartillaResponse } from '../apiTypes'

export const PATIENT_ID = 'p-3'
export const BOARD_ID = 'c-1'
// Same id as the `therapist` fixture of the patients feature.
export const CREATOR_ID = '3f0c8a52-6a53-4b86-9f7e-0b5b3c3f2f10'
export const OTHER_CREATOR_ID = 'b7e0c9d4-5a21-4f3e-9c1a-0d8e6f4a2b11'

// Real-shaped detail: categories listed out of order (orden 1 before 0), duplicate and gapped
// ordenVisual, a hidden item, a CUSTOM pictogram, differing textoVisible/textoHablado and a null pictogram.
export const boardDetailResponse: CartillaDetalleResponse = {
  id: BOARD_ID,
  creadorId: CREATOR_ID,
  nombre: 'Principal',
  esPrincipal: true,
  paradigma: 'taxonomica',
  categorias: [
    {
      id: 'cat-b',
      nombre: 'Acciones',
      colorHex: '#22AA55',
      orden: 1,
      items: [
        {
          id: 'item-b2',
          textoHablado: 'Quiero jugar un rato',
          ordenVisual: 5,
          pictograma: { id: 'pic-custom', etiqueta: 'jugar', imagenUrl: 'https://cdn.example.com/jugar.png', tipo: 'CUSTOM' },
          esCore: false,
          textoVisible: 'Jugar',
          visibleEnModoUso: true,
        },
        {
          id: 'item-b1',
          textoHablado: 'Necesito ayuda',
          ordenVisual: 2,
          pictograma: null,
          esCore: true,
          textoVisible: 'Ayuda',
          visibleEnModoUso: true,
        },
      ],
    },
    {
      id: 'cat-a',
      nombre: 'Necesidades',
      colorHex: '#3366FF',
      orden: 0,
      items: [
        {
          id: 'item-a2',
          textoHablado: 'Tengo hambre',
          ordenVisual: 0,
          pictograma: { id: 'pic-hambre', etiqueta: 'hambre', imagenUrl: 'https://cdn.example.com/hambre.png', tipo: 'GLOBAL' },
          esCore: true,
          textoVisible: 'Hambre',
          visibleEnModoUso: true,
        },
        {
          id: 'item-a1',
          textoHablado: 'Quiero ir al baño',
          ordenVisual: 0,
          pictograma: { id: 'pic-bano', etiqueta: 'baño', imagenUrl: 'https://cdn.example.com/bano.png', tipo: 'GLOBAL' },
          esCore: true,
          textoVisible: 'Baño',
          visibleEnModoUso: true,
        },
        {
          id: 'item-a3',
          textoHablado: 'Tengo sed',
          ordenVisual: 3,
          pictograma: { id: 'pic-sed', etiqueta: 'sed', imagenUrl: 'https://cdn.example.com/sed.png', tipo: 'GLOBAL' },
          esCore: false,
          textoVisible: 'Sed',
          visibleEnModoUso: false,
        },
      ],
    },
  ],
}

// Expected flattened order: item-a2, item-a1 (tie keeps server order), item-a3, item-b1, item-b2.

// Two principals and unsorted creation dates.
export const boardsListResponse: CartillaResponse[] = [
  {
    id: 'c-3',
    pacienteId: PATIENT_ID,
    creadorId: OTHER_CREATOR_ID,
    nombre: 'Escuela',
    esPrincipal: false,
    creadoEn: '2026-03-01T09:00:00',
  },
  {
    id: 'c-2',
    pacienteId: PATIENT_ID,
    creadorId: CREATOR_ID,
    nombre: 'Casa',
    esPrincipal: true,
    creadoEn: '2026-02-15T09:00:00',
  },
  {
    id: BOARD_ID,
    pacienteId: PATIENT_ID,
    creadorId: CREATOR_ID,
    nombre: 'Principal',
    esPrincipal: true,
    creadoEn: '2026-02-01T09:00:00',
  },
  {
    id: 'c-4',
    pacienteId: PATIENT_ID,
    creadorId: CREATOR_ID,
    nombre: 'Paseo',
    esPrincipal: false,
    creadoEn: '2026-01-10T09:00:00',
  },
]
