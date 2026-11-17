import { useCallback } from 'react'
import { useSearchParams } from '../../../lib/navigation'
import { rangeFromSearchParams, type WeightRange } from '../weight-range'

// el rango vive en la URL (?from&to): se puede volver atrás y compartir el enlace (US-29)
export const useWeightRange = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const range = rangeFromSearchParams(searchParams)

  const setRange = useCallback(
    (next: WeightRange) => {
      setSearchParams((current) => {
        const params = new URLSearchParams(current)
        params.delete('from')
        params.delete('to')
        if (next.from) params.set('from', next.from)
        if (next.to) params.set('to', next.to)
        return params
      })
    },
    [setSearchParams],
  )

  return { range, setRange }
}
