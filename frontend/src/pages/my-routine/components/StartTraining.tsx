import { isApiError } from '../../../lib/api'
import { PrimaryButton } from '../../../ui/button'
import { Callout } from '../../../ui/callout'
import { PlayCircle, RotateCw } from '../../../ui/icons'

type StartTrainingProps = {
  isStarting: boolean
  disabled: boolean
  // error del último intento con este día; el 409 no llega acá (lo resuelve el aviso de la página)
  error: Error | null
  onStart: () => void
}

// un corte de red o un error del servidor pueden cambiar al reintentar; un 422 (rutina vencida,
// día sin ejercicios...) no, y su mensaje ya explica qué pasa
const canRetry = (error: Error) =>
  !isApiError(error) || error.status === 0 || error.status >= 500

// botón principal del día elegido en Mi rutina. Los 422 traen textos para el atleta: se
// muestran tal cual (contrato de API, 10.8)
export function StartTraining({
  isStarting,
  disabled,
  error,
  onStart,
}: StartTrainingProps) {
  const retry = error !== null && canRetry(error)

  const label = () => {
    if (isStarting) return 'Iniciando…'
    return retry ? 'Reintentar' : 'Iniciar entrenamiento'
  }

  return (
    <div className="flex flex-col gap-3">
      <PrimaryButton
        size="lg"
        className="w-full sm:w-auto sm:self-start"
        disabled={disabled}
        onClick={onStart}
      >
        {retry ? (
          <RotateCw aria-hidden="true" />
        ) : (
          <PlayCircle aria-hidden="true" />
        )}
        {label()}
      </PrimaryButton>
      {error && (
        <Callout tone="danger">
          {isApiError(error)
            ? error.message
            : 'Ocurrió un error inesperado. Intentá nuevamente.'}
        </Callout>
      )}
    </div>
  )
}
