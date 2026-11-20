import type { PageResponse } from '../lib/api'
import type {
  BodyMeasurementRecord,
  BodyMeasurementType,
} from '../lib/body-measurements'

// catálogo de GET /api/body-measurement-types (contrato 17.2), en el mismo orden que la API
export const bodyMeasurementTypes: BodyMeasurementType[] = [
  {
    code: 'WAIST',
    name: 'Cintura',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  {
    code: 'CHEST',
    name: 'Pecho',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  {
    code: 'HIP',
    name: 'Cadera',
    unit: 'cm',
    bilateral: false,
    min: 20,
    max: 300,
  },
  { code: 'ARM', name: 'Brazo', unit: 'cm', bilateral: true, min: 5, max: 100 },
  {
    code: 'LEG',
    name: 'Pierna (muslo)',
    unit: 'cm',
    bilateral: true,
    min: 10,
    max: 150,
  },
  {
    code: 'BODY_FAT',
    name: '% de grasa',
    unit: '%',
    bilateral: false,
    min: 1,
    max: 75,
  },
]

// registro de GET/POST/PUT /athletes/{athleteId}/measurements (contrato 17.3)
export const bodyMeasurementRecord = (
  overrides: Partial<BodyMeasurementRecord> = {},
): BodyMeasurementRecord => ({
  id: '9b1e4c2d-7a3f-4e8b-8c5d-2f1a0b9c8d7e',
  date: '2026-11-06',
  comment: 'Después de entrenar',
  values: [
    { type: 'WAIST', side: null, value: 84.5 },
    { type: 'ARM', side: 'RIGHT', value: 35.25 },
  ],
  createdAt: '2026-11-06T23:10:02.118394Z',
  updatedAt: '2026-11-06T23:10:02.118394Z',
  ...overrides,
})

// página del listado de medidas (contrato 17.9)
export const bodyMeasurementsPage = (
  content: BodyMeasurementRecord[] = [bodyMeasurementRecord()],
  overrides: Partial<PageResponse<BodyMeasurementRecord>> = {},
): PageResponse<BodyMeasurementRecord> => ({
  content,
  page: 0,
  size: 10,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
