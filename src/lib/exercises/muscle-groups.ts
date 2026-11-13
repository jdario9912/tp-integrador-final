import {
  MUSCLE_GROUP_CODES,
  type MuscleGroup,
  type MuscleGroupCode,
  type MuscleRegion,
} from './types'

export const isMuscleGroupCode = (value: string): value is MuscleGroupCode =>
  (MUSCLE_GROUP_CODES as readonly string[]).includes(value)

// orden de las regiones en los selects: de arriba hacia abajo y al final el cuerpo completo
export const muscleRegionLabels: Record<MuscleRegion, string> = {
  UPPER: 'Tren superior',
  CORE: 'Core',
  LOWER: 'Tren inferior',
  FULL: 'Cuerpo completo',
}

const REGION_ORDER = Object.keys(muscleRegionLabels) as MuscleRegion[]

export type MuscleRegionGroups = {
  region: MuscleRegion
  label: string
  groups: MuscleGroup[]
}

// arma los <optgroup> de los selects; se omiten las regiones sin grupos
export const groupByRegion = (groups: MuscleGroup[]): MuscleRegionGroups[] =>
  REGION_ORDER.map((region) => ({
    region,
    label: muscleRegionLabels[region],
    groups: groups.filter((group) => group.region === region),
  })).filter(({ groups }) => groups.length > 0)

// undefined mientras el catálogo no llegó (o si falló): quien lo muestra elige el reemplazo
export const findMuscleGroupName = (
  groups: MuscleGroup[] | undefined,
  code: MuscleGroupCode,
) => groups?.find((group) => group.code === code)?.name

// mientras los grupos no llegaron se muestra el código: es preferible a un hueco vacío
export const muscleGroupName = (
  groups: MuscleGroup[] | undefined,
  code: MuscleGroupCode,
) => findMuscleGroupName(groups, code) ?? code
