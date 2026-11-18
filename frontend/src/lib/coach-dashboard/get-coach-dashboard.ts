import { get } from '../api'
import type { CoachDashboard } from './types'

// GET /coaches/me/dashboard (US-11): solo para entrenadores, un atleta recibe 403
export const getCoachDashboard = () =>
  get<CoachDashboard>('/coaches/me/dashboard')
