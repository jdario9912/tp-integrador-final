import type { CoachDashboard, DashboardAthlete } from '../lib/coach-dashboard'

export const ANA = {
  id: '1a2b3c4d-0000-4000-8000-000000000001',
  firstName: 'Ana',
  lastName: 'Gómez',
} satisfies DashboardAthlete

export const LEO = {
  id: '1a2b3c4d-0000-4000-8000-000000000002',
  firstName: 'Leo',
  lastName: 'Gil',
} satisfies DashboardAthlete

export const SOL = {
  id: '1a2b3c4d-0000-4000-8000-000000000003',
  firstName: 'Sol',
  lastName: 'Ruiz',
} satisfies DashboardAthlete

// respuesta de GET /coaches/me/dashboard con las cuatro métricas calculadas (contrato de US-11)
export const coachDashboard = (
  overrides: Partial<CoachDashboard> = {},
): CoachDashboard => ({
  activeAthletes: { count: 3, athletes: [LEO, ANA, SOL] },
  withoutRoutine: { count: 1, athletes: [SOL] },
  pendingReviewSessions: {
    count: 3,
    athletes: [
      { ...LEO, pendingCount: 2 },
      { ...ANA, pendingCount: 1 },
    ],
  },
  withoutRecentWeight: {
    count: 2,
    athletes: [
      { ...ANA, lastRecordedOn: '2026-11-01' },
      { ...SOL, lastRecordedOn: null },
    ],
  },
  warnings: [],
  ...overrides,
})

// cartera vacía: todo en 0 y sin avisos
export const emptyCoachDashboard = (): CoachDashboard => ({
  activeAthletes: { count: 0, athletes: [] },
  withoutRoutine: { count: 0, athletes: [] },
  pendingReviewSessions: { count: 0, athletes: [] },
  withoutRecentWeight: { count: 0, athletes: [] },
  warnings: [],
})
