import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../lib/auth'
import { searchFoods } from '../actions/search-foods'

// catálogo global (sin usuario en la clave). keepPreviousData: mientras se escribe, la lista anterior
// sigue visible
export const useFoodSearch = (name: string) => {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['foods', 'search', name.trim()],
    queryFn: () => searchFoods(name),
    enabled: user !== null,
    placeholderData: keepPreviousData,
  })
}
