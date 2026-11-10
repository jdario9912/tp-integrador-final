import { get, type PageResponse } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'

// opciones del selector de atletas: una sola página grande de la cartera del entrenador
export const ATHLETE_OPTIONS_SIZE = 100

export const getAthleteOptions = () =>
  get<PageResponse<Athlete>>('/athletes', {
    params: { size: ATHLETE_OPTIONS_SIZE },
  })
