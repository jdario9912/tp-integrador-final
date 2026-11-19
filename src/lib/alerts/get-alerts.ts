import { get } from '../api'
import type { Alert } from './types'

// US-47: las alertas pendientes de la cartera del entrenador de la sesión, ya ordenadas por
// severidad (las críticas primero) y después por fecha. Un atleta recibe 403
export const getAlerts = () => get<Alert[]>('/alerts')
