import { describe, expect, it } from 'vitest'
import { trainingHistoryItem } from '../../test/training-session-fixtures'
import {
  formatCompletion,
  formatDayLabel,
  formatReviewedDate,
  historyStatusLabels,
} from './training-history-format'
import {
  REVIEW_OBSERVATION_MAX_LENGTH,
  toObservationInput,
  validateHistoryRange,
  validateReviewObservation,
} from './training-history-validation'

describe('validateHistoryRange', () => {
  it('sin fechas o con un rango válido no hay error', () => {
    expect(validateHistoryRange('', '')).toBeUndefined()
    expect(validateHistoryRange('2026-11-01', '')).toBeUndefined()
    expect(validateHistoryRange('', '2026-11-30')).toBeUndefined()
    expect(validateHistoryRange('2026-11-01', '2026-11-01')).toBeUndefined()
  })

  it('desde posterior a hasta es un error', () => {
    expect(validateHistoryRange('2026-11-05', '2026-11-01')).toBe(
      'La fecha «Desde» no puede ser posterior a «Hasta»',
    )
  })

  it('una fecha mal formada es un error', () => {
    expect(validateHistoryRange('2026-1-5', '')).toBe('La fecha no es válida')
    expect(validateHistoryRange('', '01/11/2026')).toBe('La fecha no es válida')
  })
})

describe('validateReviewObservation', () => {
  it('acepta hasta 1000 caracteres después de recortar', () => {
    const max = 'a'.repeat(REVIEW_OBSERVATION_MAX_LENGTH)
    expect(validateReviewObservation(max)).toBeUndefined()
    expect(validateReviewObservation(`  ${max}  `)).toBeUndefined()
  })

  it('más de 1000 caracteres es un error', () => {
    expect(
      validateReviewObservation('a'.repeat(REVIEW_OBSERVATION_MAX_LENGTH + 1)),
    ).toBe('La observación no puede superar los 1000 caracteres')
  })

  it('la observación vacía o de espacios no se envía', () => {
    expect(toObservationInput('   ')).toBeUndefined()
    expect(toObservationInput('  Buen ritmo  ')).toBe('Buen ritmo')
  })
})

describe('formato del historial', () => {
  it('cumplimiento en hechas de prescritas, con singular y plural', () => {
    expect(formatCompletion({ doneSets: 6, prescribedSets: 7 })).toBe(
      '6 de 7 series',
    )
    expect(formatCompletion({ doneSets: 1, prescribedSets: 1 })).toBe(
      '1 de 1 serie',
    )
  })

  it('rótulos de los estados cerrados', () => {
    expect(historyStatusLabels.FINISHED).toBe('Finalizada')
    expect(historyStatusLabels.CANCELLED).toBe('Cancelada')
  })

  it('la fecha de la revisión sale en la zona de la app', () => {
    // 01:30 UTC del 12 es el 11 a la noche en Buenos Aires
    expect(formatReviewedDate('2026-11-12T01:30:00Z')).toBe(
      '11 de noviembre de 2026',
    )
  })

  it('día con su número', () => {
    expect(
      formatDayLabel(trainingHistoryItem({ dayNumber: 2, dayName: 'Piernas' })),
    ).toBe('Día 2 · Piernas')
  })
})
