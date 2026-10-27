import { get, type PageResponse } from '../../../lib/api'
import type { Athlete } from '../../../lib/athletes'
import type { AthleteFilters } from '../types'

export const ATHLETES_PAGE_SIZE = 20

// texto vacío o en blanco no se envía: el backend lo ignoraría igual, pero ensucia la URL
const optionalText = (value?: string) => value?.trim() || undefined

export const getAthletes = ({ page, name, goal }: AthleteFilters) =>
  get<PageResponse<Athlete>>('/athletes', {
    params: {
      // el backend pagina desde 0
      page: page - 1,
      size: ATHLETES_PAGE_SIZE,
      name: optionalText(name),
      goal: optionalText(goal),
    },
  })
