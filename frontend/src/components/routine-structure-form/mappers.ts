import type {
  RoutineDetail,
  RoutineExercise,
  RoutineStructureInput,
} from '../../lib/routines'
import type {
  PickedExercise,
  RoutineDayFormValues,
  RoutineExerciseFormValues,
  RoutineStructureFormValues,
  StructureFieldName,
} from './types'
import { parseRirRpe } from './validation'

let lastKey = 0

// clave local de los ítems nuevos: no choca con los ids (UUID) de los guardados
const newKey = () => `new-${++lastKey}`

const optionalNumberText = (value: number | null) =>
  value === null ? '' : String(value)

const toExerciseFormValues = (
  exercise: RoutineExercise,
): RoutineExerciseFormValues => ({
  key: exercise.id,
  id: exercise.id,
  exerciseId: exercise.exerciseId,
  exerciseName: exercise.exerciseName,
  muscleGroup: exercise.muscleGroup,
  sets: String(exercise.sets),
  reps: String(exercise.reps),
  recommendedWeight: optionalNumberText(exercise.recommendedWeight),
  rest: optionalNumberText(exercise.rest),
  rirRpe: exercise.rirRpe ?? '',
  techniqueNote: exercise.techniqueNote ?? '',
})

// precarga la estructura guardada; el backend ya la devuelve ordenada
export const toStructureFormValues = (
  routine: RoutineDetail,
): RoutineStructureFormValues => ({
  days: routine.days.map((day) => ({
    key: day.id,
    id: day.id,
    name: day.name,
    exercises: day.exercises.map(toExerciseFormValues),
  })),
})

// nombre por defecto para cargar rápido; se puede cambiar en el momento
export const newDayFormValues = (dayNumber: number): RoutineDayFormValues => ({
  key: newKey(),
  id: null,
  name: `Día ${dayNumber}`,
  exercises: [],
})

export const newExerciseFormValues = (
  exercise: PickedExercise,
): RoutineExerciseFormValues => ({
  key: newKey(),
  id: null,
  exerciseId: exercise.id,
  exerciseName: exercise.name,
  muscleGroup: exercise.muscleGroup,
  sets: '',
  reps: '',
  recommendedWeight: '',
  rest: '',
  rirRpe: '',
  techniqueNote: '',
})

const optionalText = (value: string) => value.trim() || null

const optionalNumber = (value: string) =>
  value.trim() ? Number(value.trim().replace(',', '.')) : null

// "rpe8,5" -> "RPE 8.5": el formato en que lo guarda y lo muestra el resto de la app
export const normalizeRirRpe = (value: string) => {
  const parsed = parseRirRpe(value)
  return parsed ? `${parsed.scale} ${parsed.number}` : null
}

// se llama después de validar. El orden de los arrays define dayNumber y sortOrder; los ítems
// nuevos van sin id
export const toRoutineStructureInput = (
  values: RoutineStructureFormValues,
): RoutineStructureInput => ({
  days: values.days.map((day) => ({
    ...(day.id !== null && { id: day.id }),
    name: day.name.trim(),
    exercises: day.exercises.map((exercise) => ({
      ...(exercise.id !== null && { id: exercise.id }),
      exerciseId: exercise.exerciseId,
      sets: Number(exercise.sets.trim()),
      reps: Number(exercise.reps.trim()),
      recommendedWeight: optionalNumber(exercise.recommendedWeight),
      rest: optionalNumber(exercise.rest),
      rirRpe: normalizeRirRpe(exercise.rirRpe),
      techniqueNote: optionalText(exercise.techniqueNote),
    })),
  })),
})

const EXERCISE_FIELDS = [
  'sets',
  'reps',
  'recommendedWeight',
  'rest',
  'rirRpe',
  'techniqueNote',
]

const FIELD_PATH_PATTERN = /^days\[(\d+)\]\.(?:exercises\[(\d+)\]\.)?(\w+)$/

// un error del backend se muestra en el campo solo si apunta a uno que el usuario puede editar
// (ej. days[0].exercises[1].sets); el resto (days, exerciseId...) va al aviso general
export const isStructureFieldPath = (
  values: RoutineStructureFormValues,
  path: string,
): path is StructureFieldName => {
  const match = FIELD_PATH_PATTERN.exec(path)
  if (!match) return false
  const [, dayIndex, exerciseIndex, field] = match
  const day = values.days[Number(dayIndex)]
  if (!day) return false
  if (exerciseIndex === undefined) return field === 'name'
  return (
    day.exercises[Number(exerciseIndex)] !== undefined &&
    EXERCISE_FIELDS.includes(field)
  )
}
