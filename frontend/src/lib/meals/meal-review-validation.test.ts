import { describe, expect, it } from 'vitest'
import {
  toMealReviewInput,
  validateMealReviewObservation,
} from './meal-review-validation'

describe('comentario de la revisión de una comida (US-25)', () => {
  it('admite hasta 1000 caracteres después de recortar', () => {
    expect(validateMealReviewObservation('a'.repeat(1000))).toBeUndefined()
    expect(
      validateMealReviewObservation(`  ${'a'.repeat(1000)}  `),
    ).toBeUndefined()
    expect(validateMealReviewObservation('a'.repeat(1001))).toBe(
      'El comentario no puede superar los 1000 caracteres',
    )
  })

  it('envía el comentario recortado y no lo manda si queda vacío', () => {
    expect(toMealReviewInput('  Bien  ')).toEqual({ observation: 'Bien' })
    expect(toMealReviewInput('   ')).toEqual({ observation: undefined })
  })
})
