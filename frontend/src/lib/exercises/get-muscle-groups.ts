import { get } from '../api'
import type { MuscleGroup } from './types'

export const getMuscleGroups = () => get<MuscleGroup[]>('/muscle-groups')
