import { useCallback } from 'react'
import { useSearchParams } from '../../../lib/navigation'
import { WEIGHT_METRIC_KEY } from '../body-measurement-evolution'

// US-45 (F3): la métrica de la evolución vive en la URL (?metric=ARM-LEFT), igual que el rango:
// se puede volver atrás y compartir el enlace. Sin parámetro, es el peso
export const useEvolutionMetric = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const metric = searchParams.get('metric') || WEIGHT_METRIC_KEY

  const setMetric = useCallback(
    (next: string) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current)
        if (next === WEIGHT_METRIC_KEY) params.delete('metric')
        else params.set('metric', next)
        return params
      })
    },
    [setSearchParams],
  )

  return { metric, setMetric }
}
