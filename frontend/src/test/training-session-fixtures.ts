import type {
  TrainingHistoryItem,
  TrainingSession,
} from '../lib/training-sessions'
import { torsoDay } from './athlete-routine-fixtures'

export const SESSION_ID = '4f5a6b7c-8d9e-4f0a-8b1c-2d3e4f5a6b7c'

// respuesta de POST /athletes/{athleteId}/sessions (y de in-progress y el detalle): el día 1 de
// la rutina de prueba, iniciado el 11/11 a las 19:15 de Argentina, como el ejemplo del contrato (10.3)
export const trainingSession = (
  overrides: Partial<TrainingSession> = {},
): TrainingSession => ({
  id: SESSION_ID,
  status: 'IN_PROGRESS',
  sessionDate: '2026-11-11',
  startedAt: '2026-11-11T22:15:03.512345Z',
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  routineId: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  routineName: 'Fuerza 2 días',
  day: torsoDay(),
  performedSets: [],
  // en curso: sin hora de fin. El día tiene 4 + 3 series prescritas y ninguna registrada (US-20)
  endedAt: null,
  summary: {
    prescribedSets: 7,
    doneSets: 0,
    skippedSets: 0,
    pendingSets: 7,
    volumeKg: 0,
  },
  // sin revisar (US-21): el entrenador revisa solo las sesiones finalizadas
  review: null,
  ...overrides,
})

// ítem del historial (US-21, contrato 25): una sesión finalizada de la rutina de prueba, con
// 6 de 7 series hechas y 1 omitida. Sin revisar por defecto
export const trainingHistoryItem = (
  overrides: Partial<TrainingHistoryItem> = {},
): TrainingHistoryItem => ({
  id: SESSION_ID,
  sessionDate: '2026-11-11',
  status: 'FINISHED',
  startedAt: '2026-11-11T22:15:03.512345Z',
  routineName: 'Fuerza 2 días',
  dayNumber: 1,
  dayName: 'Torso',
  endedAt: '2026-11-11T23:02:47.104812Z',
  summary: {
    prescribedSets: 7,
    doneSets: 6,
    skippedSets: 1,
    pendingSets: 0,
    volumeKg: 1000,
  },
  review: null,
  ...overrides,
})
