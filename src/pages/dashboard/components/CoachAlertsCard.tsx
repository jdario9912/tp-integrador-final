import { useState } from 'react'
import { useAlerts, useHandleAlert, type Alert } from '../../../lib/alerts'
import { isApiError } from '../../../lib/api'
import { cn } from '../../../lib/cn'
import { formatInstantDate } from '../../../lib/iso-date'
import { athleteProfilePath } from '../../../router/paths'
import { Badge } from '../../../ui/badge'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { Card } from '../../../ui/card'
import { Check, TriangleAlert } from '../../../ui/icons'
import { TextLink } from '../../../ui/text-link'
import {
  alertSeverityLabel,
  alertSeverityTone,
  pendingAlertsLabel,
} from '../alert-format'
import { CardError } from './CardError'
import { CardSkeleton } from './CardSkeleton'
import { DashboardCardHeader } from './DashboardCardHeader'

const TITLE_ID = 'coach-alerts-title'

type Notice = { tone: 'success' | 'info' | 'danger'; text: string }

// resultado de atender: la alerta deja de estar pendiente en todos los casos (la lista se refresca)
const noticeFor = (alert: Alert, error?: unknown): Notice => {
  if (error === undefined) {
    return {
      tone: 'success',
      text: `Atendiste la alerta de ${alert.athleteName}.`,
    }
  }
  if (isApiError(error) && error.status === 409) {
    return {
      tone: 'info',
      text: `La alerta de ${alert.athleteName} ya estaba atendida.`,
    }
  }
  return {
    tone: 'danger',
    text: isApiError(error)
      ? error.message
      : 'Ocurrió un error inesperado. Intentá nuevamente.',
  }
}

// alertas pendientes de la cartera (US-47), como "Requiere atención" de la plantilla. El orden es
// el del backend: severidad (las críticas primero) y fecha. Atender la saca de la lista y no
// vuelve por 7 días aunque la condición siga. Carga y error propios: no dependen de las métricas
export function CoachAlertsCard() {
  const alerts = useAlerts()
  const handle = useHandleAlert()
  const [notice, setNotice] = useState<Notice>()

  const handleAlert = async (alert: Alert) => {
    setNotice(undefined)
    try {
      await handle.mutateAsync(alert.id)
      setNotice(noticeFor(alert))
    } catch (error) {
      setNotice(noticeFor(alert, error))
    }
  }

  const content = () => {
    if (alerts.isPending) {
      return <CardSkeleton label="Cargando las alertas" rows={3} />
    }

    if (alerts.data === undefined) {
      return (
        <CardError
          error={alerts.error}
          isRetrying={alerts.isFetching}
          onRetry={() => void alerts.refetch()}
        />
      )
    }

    if (alerts.data.length === 0) {
      return (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Check aria-hidden="true" className="text-success size-5" />
          No tenés alertas pendientes.
        </p>
      )
    }

    return (
      // muchas alertas no estiran el panel: la lista se desplaza
      <ul
        aria-labelledby={TITLE_ID}
        className="flex max-h-120 flex-col gap-3 overflow-y-auto"
      >
        {alerts.data.map((alert) => {
          const isHandling = handle.isPending && handle.variables === alert.id
          return (
            <li
              key={alert.id}
              className={cn(
                'rounded-control border-border-subtle flex flex-col gap-3 border border-l-4 p-3 sm:flex-row sm:items-center sm:justify-between',
                alert.severity === 'CRITICAL' && 'border-l-danger',
                alert.severity === 'WARNING' && 'border-l-warning',
                alert.severity === 'INFO' && 'border-l-info',
              )}
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <TextLink
                    to={athleteProfilePath(alert.athleteId)}
                    className="font-semibold"
                  >
                    {alert.athleteName}
                  </TextLink>
                  <Badge tone={alertSeverityTone[alert.severity]} dot>
                    {alertSeverityLabel[alert.severity]}
                  </Badge>
                </div>
                <p className="text-sm break-words">{alert.message}</p>
                <p className="text-muted-foreground text-xs">
                  Generada el{' '}
                  <time dateTime={alert.generatedAt}>
                    {formatInstantDate(alert.generatedAt)}
                  </time>
                </p>
              </div>
              <OutlineButton
                size="sm"
                className="min-h-11 shrink-0"
                disabled={isHandling}
                aria-label={`Atender la alerta de ${alert.athleteName}: ${alert.message}`}
                onClick={() => void handleAlert(alert)}
              >
                <Check aria-hidden="true" />
                {isHandling ? 'Atendiendo…' : 'Atender'}
              </OutlineButton>
            </li>
          )
        })}
      </ul>
    )
  }

  const count = alerts.data?.length ?? 0

  return (
    <Card
      aria-labelledby={TITLE_ID}
      aria-busy={alerts.isPending}
      tone={count > 0 ? 'danger' : 'default'}
      className="flex flex-col gap-4"
    >
      <DashboardCardHeader
        id={TITLE_ID}
        title="Requiere atención"
        icon={<TriangleAlert />}
        action={
          count > 0 && (
            <span className="text-danger text-sm font-semibold">
              {pendingAlertsLabel(count)}
            </span>
          )
        }
      />
      {notice && (
        <Callout
          tone={notice.tone}
          role={notice.tone === 'danger' ? 'alert' : 'status'}
        >
          {notice.text}
        </Callout>
      )}
      {content()}
    </Card>
  )
}
