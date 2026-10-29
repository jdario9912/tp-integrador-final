import { put } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'
import type { UpdateAthleteInput } from '../types'

export const updateAthlete = (id: string, input: UpdateAthleteInput) =>
  put<Athlete, UpdateAthleteInput>(`/athletes/${id}`, input)
