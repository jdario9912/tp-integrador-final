import { patch } from '../api'
import type { Alert } from './types'

// US-47: 200 con la alerta atendida (handledAt con valor); 409 si ya estaba atendida, 403 si es
// de un atleta ajeno, 404 si no existe. Una atendida no se reabre por 7 días
export const handleAlert = (alertId: string) =>
  patch<Alert>(`/alerts/${alertId}/handle`, undefined)
