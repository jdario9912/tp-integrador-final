import type { PageResponse } from '../lib/api'
import type { WeightRecord } from '../lib/weights'

// registro con la forma que devuelve /athletes/{athleteId}/weights (ejemplo del contrato, 8.2)
export const weightRecord = (
  overrides: Partial<WeightRecord> = {},
): WeightRecord => ({
  id: '6d0f8e2a-1b3c-4d5e-8f9a-0b1c2d3e4f5a',
  date: '2026-11-06',
  weightKg: 72.5,
  comment: 'En ayunas',
  createdAt: '2026-11-06T11:20:31.123456Z',
  updatedAt: '2026-11-06T11:20:31.123456Z',
  ...overrides,
})

// página de GET /athletes/{athleteId}/weights; por defecto un solo registro
export const weightsPage = (
  content: WeightRecord[] = [weightRecord()],
  overrides: Partial<PageResponse<WeightRecord>> = {},
): PageResponse<WeightRecord> => ({
  content,
  page: 0,
  size: 10,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
