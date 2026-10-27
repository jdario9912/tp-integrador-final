// rutas de la app: usarlas en el router, en navigate() y en los E2E en lugar de strings.
// importar desde 'router/paths' y no desde 'router': el index carga AppRouter, que
// importa las páginas, y desde una página eso genera una dependencia circular
export const paths = {
  home: '/',
  registerCoach: '/register-coach',
  login: '/login',
  dashboard: '/dashboard',
  athletes: '/athletes',
  newAthlete: '/athletes/new',
} as const
