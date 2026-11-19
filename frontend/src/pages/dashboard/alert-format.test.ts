import { describe, expect, it } from 'vitest'
import {
  alertSeverityLabel,
  alertSeverityTone,
  pendingAlertsLabel,
} from './alert-format'

describe('formato de alertas (US-47)', () => {
  it('cada severidad tiene su texto y su tono', () => {
    expect(alertSeverityLabel).toEqual({
      INFO: 'Info',
      WARNING: 'Advertencia',
      CRITICAL: 'Crítica',
    })
    expect(alertSeverityTone).toEqual({
      INFO: 'info',
      WARNING: 'warning',
      CRITICAL: 'danger',
    })
  })

  it('cuenta las pendientes en singular y plural', () => {
    expect(pendingAlertsLabel(1)).toBe('1 pendiente')
    expect(pendingAlertsLabel(3)).toBe('3 pendientes')
  })
})
