import {
  useCoachDashboard,
  type CoachDashboard as CoachDashboardData,
  type CoachDashboardMetricKey,
} from '../../../lib/coach-dashboard'
import { paths } from '../../../router/paths'
import { Card } from '../../../ui/card'
import { EmptyState } from '../../../ui/empty-state'
import {
  CalendarCheck,
  ClipboardCheck,
  Scale,
  UserPlus,
  Users,
} from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import { lastWeightLabel, pendingSessionsLabel } from '../dashboard-format'
import { CardError } from './CardError'
import { CoachMetricCard } from './CoachMetricCard'

// panel del entrenador (US-11): el estado de su cartera en cuatro métricas, para priorizar a quién
// atender. Llegan en una sola respuesta; si el servidor no pudo calcular una, esa tarjeta avisa y
// el resto se muestra igual. El saludo y "Agregar atleta" los pone DashboardPage
export function CoachDashboard() {
  const dashboard = useCoachDashboard()
  const { data, isFetching } = dashboard
  const retry = () => void dashboard.refetch()

  // undefined mientras carga; null si el servidor avisó que no pudo calcularla
  const metricOf = <K extends CoachDashboardMetricKey>(
    key: K,
  ): CoachDashboardData[K] | undefined => {
    if (!data) return undefined
    return data.warnings.includes(key) ? null : data[key]
  }

  // falló el pedido entero (red, 5xx): no hay ninguna métrica para mostrar
  if (dashboard.error && !data) {
    return (
      <Card aria-label="Estado de tu cartera">
        <CardError
          error={dashboard.error}
          isRetrying={isFetching}
          onRetry={retry}
        />
      </Card>
    )
  }

  // sin atletas activos el resto de las métricas también da 0: se invita a registrar uno.
  // Si justo esa métrica falló no se sabe, y se muestran las tarjetas
  if (metricOf('activeAthletes')?.count === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Users />}
          title="Todavía no tenés atletas activos"
          description="Registrá a tu primer atleta y acá vas a ver quién necesita tu atención."
          action={
            <TextLink to={paths.newAthlete}>
              <UserPlus aria-hidden="true" /> Registrar atleta
            </TextLink>
          }
        />
      </Card>
    )
  }

  const retryProps = { isRetrying: isFetching, onRetry: retry }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <CoachMetricCard
        id="coach-dashboard-active"
        title="Atletas activos"
        icon={<Users />}
        description="Con la cuenta activa en tu cartera."
        metric={metricOf('activeAthletes')}
        emptyMessage="No tenés atletas activos."
        {...retryProps}
      />
      <CoachMetricCard
        id="coach-dashboard-without-routine"
        title="Sin rutina vigente"
        icon={<CalendarCheck />}
        description="Sin rutina asignada o con la rutina vencida."
        metric={metricOf('withoutRoutine')}
        emptyMessage="Todos tus atletas activos tienen una rutina vigente."
        {...retryProps}
      />
      <CoachMetricCard
        id="coach-dashboard-pending-review"
        title="Sesiones por revisar"
        icon={<ClipboardCheck />}
        description="Entrenamientos terminados que todavía no revisaste."
        metric={metricOf('pendingReviewSessions')}
        emptyMessage="No hay entrenamientos pendientes de revisión."
        metaOf={(athlete) => pendingSessionsLabel(athlete.pendingCount)}
        highlightWhenPositive
        {...retryProps}
      />
      <CoachMetricCard
        id="coach-dashboard-without-weight"
        title="Sin peso reciente"
        icon={<Scale />}
        description="Sin registro de peso en los últimos 7 días."
        metric={metricOf('withoutRecentWeight')}
        emptyMessage="Todos registraron su peso en los últimos 7 días."
        metaOf={(athlete) => lastWeightLabel(athlete.lastRecordedOn)}
        {...retryProps}
      />
    </div>
  )
}
