import { get } from '../api'
import type { BodyMeasurementType } from './types'

// catálogo fijo de medidas: lo mismo para todos los usuarios
export const getBodyMeasurementTypes = () =>
  get<BodyMeasurementType[]>('/body-measurement-types')
