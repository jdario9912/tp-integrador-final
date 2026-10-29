// rutas de la app: usarlas en el router, en navigate() y en los E2E en lugar de strings.
// importar desde 'router/paths' y no desde 'router': el index carga AppRouter, que
// importa las páginas, y desde una página eso genera una dependencia circular
import { generatePath } from 'react-router-dom'

export const paths = {
  home: '/',
  registerCoach: '/register-coach',
  login: '/login',
  dashboard: '/dashboard',
  athletes: '/athletes',
  newAthlete: '/athletes/new',
  editAthlete: '/athletes/:id/edit',
} as const

// las rutas con parámetros se arman con estos helpers para no concatenar a mano
export const athleteEditPath = (id: string) =>
  generatePath(paths.editAthlete, { id })
