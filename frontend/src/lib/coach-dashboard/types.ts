// atleta tal como lo lista cada métrica de GET /coaches/me/dashboard (US-11)
export type DashboardAthlete = {
  id: string
  firstName: string
  lastName: string
}

// con al menos un entrenamiento terminado sin revisar
export type PendingReviewAthlete = DashboardAthlete & { pendingCount: number }

export type WithoutRecentWeightAthlete = DashboardAthlete & {
  // YYYY-MM-DD; null si nunca registró su peso
  lastRecordedOn: string | null
}

// count y la lista ordenada por apellido y nombre
export type DashboardMetric<TAthlete extends DashboardAthlete> = {
  count: number
  athletes: TAthlete[]
}

export type CoachDashboardMetricKey =
  | 'activeAthletes'
  | 'withoutRoutine'
  | 'pendingReviewSessions'
  | 'withoutRecentWeight'

// cada métrica se calcula por separado: si una falla en el servidor llega en null y su clave
// aparece en warnings, y el resto llega igual (la respuesta sigue siendo 200)
export type CoachDashboard = {
  activeAthletes: DashboardMetric<DashboardAthlete> | null
  // sin asignación activa o con la activa vencida
  withoutRoutine: DashboardMetric<DashboardAthlete> | null
  // count es el total de sesiones (la suma de pendingCount), no de atletas
  pendingReviewSessions: DashboardMetric<PendingReviewAthlete> | null
  // sin registro de peso en los últimos 7 días
  withoutRecentWeight: DashboardMetric<WithoutRecentWeightAthlete> | null
  warnings: CoachDashboardMetricKey[]
}
