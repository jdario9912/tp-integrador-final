import { isApiError } from '../../../lib/api'
import { OutlineButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { RotateCw } from '../../../ui/icons'

type MyRoutineErrorProps = {
  error: Error
  isRetrying: boolean
  onRetry: () => void
}

// CE-4: corte de red o error del servidor, que pueden cambiar al reintentar
export function MyRoutineError({
  error,
  isRetrying,
  onRetry,
}: MyRoutineErrorProps) {
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
