import type { PageResponse } from '../lib/api'
import type { Routine } from '../lib/routines'

// rutina del entrenador con la forma que devuelve /routines; por defecto solo con el nombre
export const createdRoutine = (overrides: Partial<Routine> = {}): Routine => ({
  id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  name: 'Fase de volumen',
  description: null,
  goal: null,
  daysPerWeek: null,
  durationWeeks: null,
  isTemplate: false,
  createdAt: '2026-11-05T12:00:00Z',
  ...overrides,
})

// página de GET /routines; por defecto una sola rutina y una sola página
export const routinesPage = (
  content: Routine[] = [createdRoutine()],
  overrides: Partial<PageResponse<Routine>> = {},
): PageResponse<Routine> => ({
  content,
  page: 0,
  size: 20,
  totalElements: content.length,
  totalPages: content.length > 0 ? 1 : 0,
  ...overrides,
})
