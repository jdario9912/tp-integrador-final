import { post } from '../../../lib/api'
import type { Coach, CreateCoachInput } from '../types'

export const createCoach = (input: CreateCoachInput) =>
  post<Coach, CreateCoachInput>('/coaches', input)
