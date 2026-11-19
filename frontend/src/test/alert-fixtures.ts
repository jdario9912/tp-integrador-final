import type { Alert } from '../lib/alerts'

// alerta pendiente con la forma de AlertResponse (US-47)
export const alert = (overrides: Partial<Alert> = {}): Alert => ({
  id: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
  athleteId: '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c',
  athleteName: 'Leo Gil',
  type: 'INACTIVITY',
  severity: 'CRITICAL',
  message: 'No registra entrenamientos hace 10 días.',
  generatedAt: '2026-11-14T09:00:00Z',
  handledAt: null,
  ...overrides,
})
