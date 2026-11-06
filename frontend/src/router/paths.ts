// rutas de la app: usarlas en el router, en navigate() y en los E2E en lugar de strings.
// importar desde 'router/paths' y no desde 'router': el index carga AppRouter, que
// importa las páginas, y desde una página eso genera una dependencia circular.
// La extensión .ts es explícita porque los E2E (module nodenext) también lo importan
import { generatePath } from '../lib/navigation/index.ts'

export const paths = {
  home: '/',
  registerCoach: '/register-coach',
  login: '/login',
  dashboard: '/dashboard',
  athletes: '/athletes',
  newAthlete: '/athletes/new',
  // convive con /athletes/new: React Router prioriza el segmento estático
  athleteProfile: '/athletes/:id',
  editAthlete: '/athletes/:id/edit',
  exercises: '/exercises',
  newExercise: '/exercises/new',
  editExercise: '/exercises/:id/edit',
  routines: '/routines',
  newRoutine: '/routines/new',
  // convive con /routines/new: React Router prioriza el segmento estático
  routineDetail: '/routines/:id',
} as const

// las rutas con parámetros se arman con estos helpers para no concatenar a mano
export const athleteProfilePath = (id: string) =>
  generatePath(paths.athleteProfile, { id })

export const athleteEditPath = (id: string) =>
  generatePath(paths.editAthlete, { id })

export const exerciseEditPath = (id: string) =>
  generatePath(paths.editExercise, { id })

export const routineDetailPath = (id: string) =>
  generatePath(paths.routineDetail, { id })
