import type { AssignedRoutine, AthleteRoutine } from '../lib/athlete-routine'
import { routineDay, routineExercise } from './routine-fixtures'

// días de la rutina asignada por defecto: el 1 con dos ejercicios (uno completo y otro con lo
// mínimo) y el 2 con uno, como el ejemplo del contrato de API (9.3)
export const TORSO_DAY_ID = 'c3d4e5f6-0718-4293-a4b5-c6d7e8f90a1b'
export const LEGS_DAY_ID = 'd4e5f607-1829-43a4-b5c6-d7e8f90a1b2c'

export const torsoDay = () =>
  routineDay({
    id: TORSO_DAY_ID,
    dayNumber: 1,
    name: 'Torso',
    exercises: [
      routineExercise({
        id: 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b',
        exerciseName: 'Press de banca',
        muscleGroup: 'CHEST',
        sortOrder: 0,
        sets: 4,
        reps: 8,
        recommendedWeight: 62.5,
        rest: 120,
        rirRpe: 'RIR 2',
        techniqueNote: 'Bajar controlado hasta tocar el pecho',
      }),
      routineExercise({
        id: 'f2a3b4c5-d6e7-4f80-9b0c-1d2e3f4a5b6c',
        exerciseId: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
        exerciseName: 'Remo con barra',
        muscleGroup: 'BACK',
        sortOrder: 1,
        sets: 3,
        reps: 10,
        rest: 90,
      }),
    ],
  })

export const legsDay = () =>
  routineDay({
    id: LEGS_DAY_ID,
    dayNumber: 2,
    name: 'Pierna',
    exercises: [
      routineExercise({
        id: 'a3b4c5d6-e7f8-4091-8c1d-2e3f4a5b6c7d',
        exerciseId: '2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f6a',
        exerciseName: 'Sentadilla',
        muscleGroup: 'QUADRICEPS',
        sortOrder: 0,
        sets: 5,
        reps: 5,
        recommendedWeight: 80,
        rest: 180,
        rirRpe: 'RPE 8.5',
      }),
    ],
  })

export const assignedRoutine = (
  overrides: Partial<AssignedRoutine> = {},
): AssignedRoutine => ({
  id: '5a6b7c8d-9e0f-4a1b-8c2d-3e4f5a6b7c8d',
  name: 'Fuerza 2 días',
  description: 'Bloque de 8 semanas con progresión de cargas',
  goal: 'Fuerza',
  daysPerWeek: 2,
  durationWeeks: 8,
  days: [torsoDay(), legsDay()],
  ...overrides,
})

// respuesta de GET /athletes/{athleteId}/routine: vigente y con el día 1 como el que toca
export const athleteRoutine = (
  overrides: Partial<AthleteRoutine> = {},
): AthleteRoutine => ({
  assignmentId: '8b1e4c2d-5f6a-4b7c-9d8e-0f1a2b3c4d5e',
  assignmentDate: '2026-11-03',
  endDate: '2026-12-28',
  expired: false,
  nextDayId: TORSO_DAY_ID,
  routine: assignedRoutine(),
  ...overrides,
})
