import type {
  BodyMeasurementSide,
  BodyMeasurementType,
} from '../../lib/body-measurements'

// US-45: un campo del formulario es una medida, o un lado de una medida bilateral (ARM-LEFT, ARM-RIGHT).
// Las reglas salen del catálogo que devuelve la API: nombre, unidad y rango
export type MeasurementField = {
  // nombre del campo en el formulario y clave de la métrica en la URL: WAIST, ARM-LEFT
  key: string
  type: string
  side: BodyMeasurementSide | undefined
  // nombre para mostrar: "Cintura", "Brazo, lado izquierdo"
  label: string
  unit: string
  min: number
  max: number
}

const SIDES: readonly BodyMeasurementSide[] = ['LEFT', 'RIGHT']

const SIDE_NAMES: Record<BodyMeasurementSide, string> = {
  LEFT: 'izquierdo',
  RIGHT: 'derecho',
}

// la clave de un campo o de un valor de registro: "WAIST" o "ARM-LEFT"
export const fieldKey = (type: string, side?: BodyMeasurementSide) =>
  side ? `${type}-${side}` : type

// un campo por medida; en las bilaterales, uno por lado (izquierdo antes que derecho).
// Respeta el orden del catálogo, que es el orden en que se listan las medidas
export const measurementFields = (
  types: BodyMeasurementType[],
): MeasurementField[] =>
  types.flatMap((type): MeasurementField[] => {
    const base = {
      type: type.code,
      unit: type.unit,
      min: type.min,
      max: type.max,
    }
    if (!type.bilateral) {
      return [
        {
          ...base,
          key: fieldKey(type.code),
          side: undefined,
          label: type.name,
        },
      ]
    }
    return SIDES.map((side) => ({
      ...base,
      key: fieldKey(type.code, side),
      side,
      label: `${type.name}, lado ${SIDE_NAMES[side]}`,
    }))
  })
