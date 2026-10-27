import type { Athlete } from '../pages/register-athlete/types'

// atleta con la forma que devuelve POST /athletes
export const createdAthlete = (overrides: Partial<Athlete> = {}): Athlete => ({
  id: '7d1f3c2a-5b6e-4f80-9a1b-2c3d4e5f6a7b',
  coachId: 'f14b8801-422f-4411-bdf4-e7a4f3ac3c4c',
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  phone: null,
  status: 'ACTIVE',
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
