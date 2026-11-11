import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { getFoods } from '../actions/get-foods'
import type { FoodFilters } from '../types'

// el catálogo es global: la key no lleva el usuario (el logout limpia la caché igual).
// keepPreviousData: al paginar o buscar la grilla sigue visible hasta que llega la nueva página
export const useFoods = (filters: FoodFilters) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['foods', 'list', filters],
    queryFn: () => getFoods(filters),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
