import type { AlertSeverity } from '../../lib/alerts'
import type { Tone } from '../../ui/tone'

// US-47: badge de severidad de cada alerta
export const alertSeverityLabel: Record<AlertSeverity, string> = {
  INFO: 'Info',
  WARNING: 'Advertencia',
  CRITICAL: 'Crítica',
}

export const alertSeverityTone: Record<AlertSeverity, Tone> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'danger',
}

export const pendingAlertsLabel = (count: number) =>
  count === 1 ? '1 pendiente' : `${count} pendientes`
