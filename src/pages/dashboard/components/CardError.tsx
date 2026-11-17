import { isApiError } from '../../../lib/api'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { RotateCw } from '../../../ui/icons'

type CardErrorProps = {
  error: unknown
  isRetrying: boolean
  onRetry: () => void
}

// error de una sola tarjeta: el resto del panel sigue mostrándose. El texto es el del backend
// cuando lo hay, y si no, uno genérico
export function CardError({ error, isRetrying, onRetry }: CardErrorProps) {
  return (
    <div className="flex flex-col items-start gap-3">
      <Callout tone="danger" className="self-stretch">
        {isApiError(error)
          ? error.message
          : 'Ocurrió un error inesperado. Intentá nuevamente.'}
      </Callout>
      <OutlineButton size="sm" disabled={isRetrying} onClick={onRetry}>
        <RotateCw aria-hidden="true" />
        {isRetrying ? 'Reintentando…' : 'Reintentar'}
      </OutlineButton>
    </div>
  )
}
