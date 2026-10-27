import { describe, expect, it } from 'vitest'
import { athleteStatusView } from './athlete-status'

describe('athleteStatusView', () => {
  it.each([
    ['ACTIVE', 'Activo', 'primary', 'active'],
    ['NEEDS_REVIEW', 'Requiere revisión', 'danger', 'alert'],
    ['NO_ROUTINE', 'Sin rutina', 'warning', 'alert'],
    ['NO_ACTIVITY', 'Sin actividad', 'warning', 'alert'],
    ['INACTIVE', 'Inactivo', 'neutral', 'inactive'],
  ] as const)('%s se muestra como "%s"', (status, label, tone, avatar) => {
    expect(athleteStatusView[status]).toEqual({ label, tone, avatar })
  })
})
