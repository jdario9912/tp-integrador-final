// borrador de una serie en la pantalla: los valores tal como los escribe el atleta, y su paso al
// cuerpo del PUT (contrato 11.3). Lo que no aplica al estado se descarta, como hace el backend
import { normalizeDecimal } from '../../lib/decimal'
import type { RoutineExercise } from '../../lib/routines'
import type {
  PerformedSet,
  PerformedSetInput,
  SetStatus,
} from '../../lib/training-sessions'
import {
  validateReps,
  validateRpe,
  validateSkipReason,
  validateWeight,
} from './validation'

export type SetDraft = {
  weight: string
  reps: string
  rpe: string
  skipReason: string
}

export type SetDraftField = keyof SetDraft

export type SetDraftErrors = Partial<Record<SetDraftField, string>>

export type SetDraftResult =
  { input: PerformedSetInput } | { errors: SetDraftErrors }

// 62.5 se muestra como "62,5", como en el resto de la app
const toFieldText = (value: number) => String(value).replace('.', ',')

// precarga: lo registrado si existe; si no, lo planificado (reps y peso recomendado). Sin peso
// recomendado el campo arranca vacío y el atleta lo completa
export const draftFromSet = (
  exercise: Pick<RoutineExercise, 'reps' | 'recommendedWeight'>,
  record?: PerformedSet,
): SetDraft => {
  const weight = record?.weight ?? exercise.recommendedWeight
  return {
    weight: weight === null ? '' : toFieldText(weight),
    reps: String(record?.reps ?? exercise.reps),
    rpe: record?.rpe ? String(record.rpe) : '',
    skipReason: record?.skipReason ?? '',
  }
}

const hasErrors = (errors: SetDraftErrors) =>
  Object.values(errors).some((message) => message !== undefined)

// valida lo que aplica al estado y arma el cuerpo del PUT. Con DONE no se mira el motivo y con
// SKIPPED no se mira el peso ni las repeticiones
export const validateDraft = (
  status: SetStatus,
  draft: SetDraft,
): SetDraftResult => {
  if (status === 'SKIPPED') {
    const errors: SetDraftErrors = {
      skipReason: validateSkipReason(draft.skipReason),
    }
    if (hasErrors(errors)) return { errors }
    return {
      input: { status: 'SKIPPED', skipReason: draft.skipReason.trim() },
    }
  }

  const errors: SetDraftErrors = {
    weight: validateWeight(draft.weight),
    reps: validateReps(draft.reps),
    rpe: validateRpe(draft.rpe),
  }
  if (hasErrors(errors)) return { errors }

  const rpe = draft.rpe.trim()
  return {
    input: {
      status: 'DONE',
      weight: Number(normalizeDecimal(draft.weight)),
      reps: Number(draft.reps.trim()),
      // undefined: el campo no va en el cuerpo y el backend lo guarda en null
      ...(rpe !== '' && { rpe: Number(rpe) }),
    },
  }
}

// una serie hecha que el atleta cambió: el botón pasa a «Guardar corrección». Con datos inválidos
// también cuenta como cambio, para que el envío muestre el error
export const isCorrection = (draft: SetDraft, record?: PerformedSet) => {
  if (record?.status !== 'DONE') return false
  const result = validateDraft('DONE', draft)
  if (!('input' in result) || result.input.status !== 'DONE') return true
  const { input } = result
  return (
    input.weight !== record.weight ||
    input.reps !== record.reps ||
    (input.rpe ?? null) !== record.rpe
  )
}
