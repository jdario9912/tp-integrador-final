import { describe, expect, it } from 'vitest'
import { ROUTINE_REQUIRED_MESSAGE, validateSelection } from './validation'

describe('validateSelection', () => {
  const validate = validateSelection(ROUTINE_REQUIRED_MESSAGE)

  it('sin opción elegida devuelve el mensaje', () => {
    expect(validate({ value: '' })).toBe('Elegí una rutina')
  })

  it('con una opción elegida es válido', () => {
    expect(validate({ value: '7c9e6679-7425-40de-944b-e07fc1f90ae7' })).toBe(
      undefined,
    )
  })
})
