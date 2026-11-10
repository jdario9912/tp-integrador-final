import { usePrefetchQuery } from '@tanstack/react-query'
import {
  assignmentsQueryOptions,
  useAssignments,
  type AssignmentsQuery,
} from '../../../lib/assignments'
import { useAuth } from '../../../lib/auth'

// el historial se pagina de a 10
export const ASSIGNMENTS_PAGE_SIZE = 10

// primera página del historial: la comparten la rutina activa y el historial (un solo pedido)
export const FIRST_ASSIGNMENTS_PAGE = {
  page: 0,
  size: ASSIGNMENTS_PAGE_SIZE,
} satisfies AssignmentsQuery

// la activa, si existe, es el primer ítem: el historial viene ordenado por active desc
export const useActiveAssignment = (athleteId: string) => {
  const query = useAssignments(athleteId, FIRST_ASSIGNMENTS_PAGE)
  const first = query.data?.content[0]
  return { ...query, activeAssignment: first?.active ? first : null }
}

// la ficha pide el atleta y su historial en paralelo: las secciones lo encuentran en caché
export const usePrefetchAssignments = (athleteId: string) => {
  const { user } = useAuth()
  usePrefetchQuery(
    assignmentsQueryOptions(user?.id, athleteId, FIRST_ASSIGNMENTS_PAGE),
  )
}
