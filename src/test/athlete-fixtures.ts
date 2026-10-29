import type { PageResponse } from '../lib/api'
import type { Athlete } from '../lib/athletes'

// atleta con la forma que devuelve /athletes
export const createdAthlete = (overrides: Partial<Athlete> = {}): Athlete => ({
  id: '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b',
  coachId: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  phone: null,
  status: 'ACTIVE',
  active: true,
  sex: null,
  experienceLevel: null,
  birthDate: null,
  heightCm: null,
  initialWeightKg: null,
  goal: null,
  injuries: null,
  limitations: null,
  availableDays: null,
  startDate: null,
  createdAt: '2026-10-27T15:00:00Z',
  ...overrides,
})

// página de GET /athletes; por defecto un solo atleta y una sola página
export const athletesPage = (
  content: Athlete[] = [createdAthlete()],
  overrides: Partial<PageResponse<Athlete>> = {},
): PageResponse<Athlete> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
