import { describe, expect, it } from 'vitest'
import type { PerformedSet } from '../../lib/training-sessions'
import {
  draftFromSet,
  isCorrection,
  validateDraft,
  type SetDraft,
} from './set-draft'

const planned = { reps: 8, recommendedWeight: 62.5 }
const EXERCISE_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'

const done = (overrides: Partial<PerformedSet> = {}): PerformedSet => ({
  id: 'serie-1',
  routineExerciseId: EXERCISE_ID,
  setNumber: 1,
  status: 'DONE',
  weight: 62.5,
  reps: 8,
  rpe: null,
  skipReason: null,
  ...overrides,
})

const draft = (overrides: Partial<SetDraft> = {}): SetDraft => ({
  weight: '62,5',
  reps: '8',
  rpe: '',
  skipReason: '',
  ...overrides,
})

describe('draftFromSet', () => {
  it('precarga con lo planificado si la serie está pendiente', () => {
    expect(draftFromSet(planned)).toEqual({
      weight: '62,5',
      reps: '8',
      rpe: '',
      skipReason: '',
    })
  })

  it('sin peso recomendado el peso arranca vacío', () => {
    expect(draftFromSet({ reps: 10, recommendedWeight: null }).weight).toBe('')
  })

  it('con la serie registrada muestra lo registrado', () => {
    expect(
      draftFromSet(planned, done({ weight: 60, reps: 6, rpe: 9 })),
    ).toEqual({ weight: '60', reps: '6', rpe: '9', skipReason: '' })
  })

  it('una serie omitida conserva lo planificado para completarla con un toque', () => {
    const skipped = done({
      status: 'SKIPPED',
      weight: null,
      reps: null,
      skipReason: 'Dolor',
    })
    expect(draftFromSet(planned, skipped)).toEqual({
      weight: '62,5',
      reps: '8',
      rpe: '',
      skipReason: 'Dolor',
    })
  })
})

describe('validateDraft', () => {
  it('DONE arma el cuerpo con números y omite el RPE vacío', () => {
    expect(validateDraft('DONE', draft())).toEqual({
      input: { status: 'DONE', weight: 62.5, reps: 8 },
    })
  })

  it('DONE incluye el RPE cuando se cargó y descarta el motivo', () => {
    expect(
      validateDraft('DONE', draft({ rpe: '8', skipReason: 'no aplica' })),
    ).toEqual({
      input: { status: 'DONE', weight: 62.5, reps: 8, rpe: 8 },
    })
  })

  it('DONE sin peso devuelve el error del peso y no arma cuerpo', () => {
    expect(validateDraft('DONE', draft({ weight: '' }))).toEqual({
      errors: { weight: 'Ingresá el peso de una serie realizada' },
    })
  })

  it('SKIPPED arma el cuerpo con el motivo sin espacios y descarta peso y reps', () => {
    expect(
      validateDraft(
        'SKIPPED',
        draft({ weight: '', reps: '', skipReason: '  Dolor  ' }),
      ),
    ).toEqual({ input: { status: 'SKIPPED', skipReason: 'Dolor' } })
  })

  it('SKIPPED sin motivo devuelve el error del motivo', () => {
    expect(validateDraft('SKIPPED', draft({ skipReason: ' ' }))).toEqual({
      errors: { skipReason: 'Ingresá el motivo de una serie omitida' },
    })
  })
})

describe('isCorrection', () => {
  it('una serie pendiente o omitida no es una corrección', () => {
    expect(isCorrection(draft(), undefined)).toBe(false)
    expect(
      isCorrection(
        draft(),
        done({ status: 'SKIPPED', weight: null, reps: null, skipReason: 'x' }),
      ),
    ).toBe(false)
  })

  it('una serie hecha sin cambios no es una corrección', () => {
    expect(isCorrection(draft(), done())).toBe(false)
    expect(isCorrection(draft({ weight: '62.50' }), done())).toBe(false)
  })

  it('cambiar peso, repeticiones o RPE de una serie hecha es una corrección', () => {
    expect(isCorrection(draft({ weight: '65' }), done())).toBe(true)
    expect(isCorrection(draft({ reps: '7' }), done())).toBe(true)
    expect(isCorrection(draft({ rpe: '8' }), done())).toBe(true)
  })

  it('un valor inválido en una serie hecha cuenta como cambio, para que se muestre el error', () => {
    expect(isCorrection(draft({ reps: '' }), done())).toBe(true)
  })
})
