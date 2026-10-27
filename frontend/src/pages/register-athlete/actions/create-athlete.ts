import { post } from '../../../lib/api'
import type { Athlete, CreateAthleteInput } from '../types'

export const createAthlete = (input: CreateAthleteInput) =>
  post<Athlete, CreateAthleteInput>('/athletes', input)
