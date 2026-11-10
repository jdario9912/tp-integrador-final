import type { PageResponse } from '../lib/api'
import type {
  Routine,
  RoutineDay,
  RoutineDetail,
  RoutineExercise,
} from '../lib/routines'

// rutina del entrenador con la forma que devuelve /routines; por defecto solo con el nombre
export const createdRoutine = (overrides: Partial<Routine> = {}): Routine => ({
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Fase de volumen',
  description: null,
  goal: null,
  daysPerWeek: null,
  durationWeeks: null,
  isTemplate: false,
  createdAt: '2026-11-05T12:00:00Z',
  ...overrides,
})

// ejercicio de un día con la forma de GET /routines/{id}; por defecto solo series y repeticiones
export const routineExercise = (
  overrides: Partial<RoutineExercise> = {},
): RoutineExercise => ({
  id: 'e1000000-0000-4000-8000-000000000001',
  exerciseId: '3b2a1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  exerciseName: 'Press de banca',
  muscleGroup: 'CHEST',
  sortOrder: 0,
  sets: 4,
  reps: 10,
  recommendedWeight: null,
  rest: null,
  rirRpe: null,
  techniqueNote: null,
  ...overrides,
})

export const routineDay = (
  overrides: Partial<RoutineDay> = {},
): RoutineDay => ({
  id: 'd1000000-0000-4000-8000-000000000001',
  dayNumber: 1,
  name: 'Empuje',
  exercises: [],
  ...overrides,
})

// detalle de GET /routines/{id}; por defecto sin días
export const routineDetail = (
  overrides: Partial<RoutineDetail> = {},
): RoutineDetail => ({
  ...createdRoutine(),
  days: [],
  ...overrides,
})

// página de GET /routines; por defecto una sola rutina y una sola página
export const routinesPage = (
  content: Routine[] = [createdRoutine()],
  overrides: Partial<PageResponse<Routine>> = {},
): PageResponse<Routine> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
