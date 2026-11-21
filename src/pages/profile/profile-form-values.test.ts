import { describe, expect, it } from 'vitest'
import { ownProfile } from '../../test/own-profile-fixtures'
import {
  toProfileFormValues,
  toUpdateProfileInput,
} from './profile-form-values'

describe('valores del formulario de datos (US-48)', () => {
  it('un teléfono null se muestra vacío', () => {
    expect(toProfileFormValues(ownProfile({ phone: null })).phone).toBe('')
  })

  it('al guardar quita los espacios y manda un teléfono vacío como null', () => {
    expect(
      toUpdateProfileInput({
        firstName: '  Leo ',
        lastName: ' Gil',
        email: ' leo@example.com ',
        phone: '   ',
      }),
    ).toEqual({
      firstName: 'Leo',
      lastName: 'Gil',
      email: 'leo@example.com',
      phone: null,
    })
  })

  it('un teléfono con datos viaja sin espacios sobrantes', () => {
    expect(
      toUpdateProfileInput({
        firstName: 'Leo',
        lastName: 'Gil',
        email: 'leo@example.com',
        phone: ' 11 5555 1234 ',
      }).phone,
    ).toBe('11 5555 1234')
  })
})
