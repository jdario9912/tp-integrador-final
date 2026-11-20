import { queryOptions, useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth'
import { getBodyMeasurementTypes } from './get-body-measurement-types'
import { getBodyMeasurements } from './get-body-measurements'
import type { BodyMeasurementsQuery } from './types'

// todos los registros de medidas de un atleta cuelgan de esta clave: las mutaciones la invalidan.
// El id del usuario va en la clave, como en los pesos: si cambia la sesión no se mezclan datos
export const athleteBodyMeasurementsKey = (
  userId: string | undefined,
  athleteId: string,
) => ['body-measurements', userId, athleteId]

export const bodyMeasurementsQueryOptions = (
  userId: string | undefined,
  athleteId: string,
  query: BodyMeasurementsQuery = {},
) =>
  queryOptions({
    queryKey: [...athleteBodyMeasurementsKey(userId, athleteId), query],
    queryFn: () => getBodyMeasurements(athleteId, query),
  })

export const useBodyMeasurements = (
  athleteId: string,
  query: BodyMeasurementsQuery = {},
) => {
  const { user } = useAuth()
  return useQuery({
    ...bodyMeasurementsQueryOptions(user?.id, athleteId, query),
    enabled: user !== null && athleteId !== '',
  })
}

// el catálogo no cambia durante la sesión: se pide una vez
export const BODY_MEASUREMENT_TYPES_KEY = ['body-measurement-types'] as const

export const useBodyMeasurementTypes = () => {
  const { user } = useAuth()
  return useQuery({
    queryKey: BODY_MEASUREMENT_TYPES_KEY,
    queryFn: getBodyMeasurementTypes,
    staleTime: Infinity,
    enabled: user !== null,
  })
}
