// US-47: catálogo alert_types
export type AlertType =
  | 'INACTIVITY'
  | 'NO_ROUTINE'
  | 'LOW_COMPLIANCE'
  | 'NO_WEIGHT_LOG'
  | 'PENDING_REVIEW'

// catálogo severities
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

// AlertResponse (solo entrenadores)
export type Alert = {
  id: string
  athleteId: string
  athleteName: string
  type: AlertType
  severity: AlertSeverity
  // texto en castellano listo para mostrar
  message: string
  // instantes ISO; handledAt es null mientras está pendiente
  generatedAt: string
  handledAt: string | null
}
