import type { PageResponse } from '../lib/api'
import type { Exercise, MuscleGroup } from '../lib/exercises'

// catálogo de GET /muscle-groups, en el orden del backend
export const muscleGroups: MuscleGroup[] = [
  { code: 'CHEST', name: 'Pecho', region: 'UPPER' },
  { code: 'BACK', name: 'Espalda', region: 'UPPER' },
  { code: 'SHOULDERS', name: 'Hombros', region: 'UPPER' },
  { code: 'BICEPS', name: 'Bíceps', region: 'UPPER' },
  { code: 'TRICEPS', name: 'Tríceps', region: 'UPPER' },
  { code: 'FOREARMS', name: 'Antebrazos', region: 'UPPER' },
  { code: 'ABS', name: 'Abdominales', region: 'CORE' },
  { code: 'QUADRICEPS', name: 'Cuádriceps', region: 'LOWER' },
  { code: 'HAMSTRINGS', name: 'Isquiotibiales', region: 'LOWER' },
  { code: 'GLUTES', name: 'Glúteos', region: 'LOWER' },
  { code: 'CALVES', name: 'Pantorrillas', region: 'LOWER' },
  { code: 'FULL_BODY', name: 'Cuerpo completo', region: 'FULL' },
]

// ejercicio propio del entrenador con la forma que devuelve /exercises
export const createdExercise = (
  overrides: Partial<Exercise> = {},
): Exercise => ({
  id: '3b2a1c0d-4e5f-4a6b-8c7d-9e0f1a2b3c4d',
  name: 'Press de banca',
  description: null,
  muscleGroup: 'CHEST',
  videoUrl: null,
  global: false,
  ...overrides,
})

// página de GET /exercises; por defecto un solo ejercicio y una sola página
export const exercisesPage = (
  content: Exercise[] = [createdExercise()],
  overrides: Partial<PageResponse<Exercise>> = {},
): PageResponse<Exercise> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
