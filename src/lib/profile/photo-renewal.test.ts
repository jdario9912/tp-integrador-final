import { describe, expect, it } from 'vitest'
import {
  FUTURE_PHOTO_EXPIRY,
  PAST_PHOTO_EXPIRY,
  ownProfile,
} from '../../test/own-profile-fixtures'
import { currentPhotoUrl, renewalDelayMs } from './photo-renewal'

const NOW = Date.parse('2026-11-20T12:00:00Z')

describe('currentPhotoUrl (US-48)', () => {
  it('sin foto no hay URL', () => {
    expect(currentPhotoUrl(ownProfile())).toBeNull()
    expect(currentPhotoUrl(undefined)).toBeNull()
  })

  it('con foto vigente devuelve la URL firmada', () => {
    const profile = ownProfile({
      photoUrl: 'https://storage.example.test/p.png?token=1',
      photoUrlExpiresAt: FUTURE_PHOTO_EXPIRY,
    })

    expect(currentPhotoUrl(profile)).toBe(
      'https://storage.example.test/p.png?token=1',
    )
  })

  it('con la URL vencida no la muestra: el avatar usa las iniciales mientras se renueva', () => {
    const profile = ownProfile({
      photoUrl: 'https://storage.example.test/p.png?token=1',
      photoUrlExpiresAt: PAST_PHOTO_EXPIRY,
    })

    expect(currentPhotoUrl(profile)).toBeNull()
  })
})

describe('renewalDelayMs (US-48)', () => {
  it('pide la renovación 30 segundos antes del vencimiento', () => {
    const expiresAt = new Date(NOW + 5 * 60_000).toISOString()

    expect(renewalDelayMs(expiresAt, NOW)).toBe(5 * 60_000 - 30_000)
  })

  it('una URL ya vencida (o dentro del margen) da cero o menos: toca ahora', () => {
    expect(renewalDelayMs(PAST_PHOTO_EXPIRY, NOW)).toBeLessThanOrEqual(0)
    const inMargin = new Date(NOW + 10_000).toISOString()
    expect(renewalDelayMs(inMargin, NOW)).toBeLessThanOrEqual(0)
  })
})
