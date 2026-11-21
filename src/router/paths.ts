// rutas de la app: usarlas en el router, en navigate() y en los E2E en lugar de strings.
// importar desde 'router/paths' y no desde 'router': el index carga AppRouter, que
// importa las páginas, y desde una página eso genera una dependencia circular.
// La extensión .ts es explícita porque los E2E (module nodenext) también lo importan
import { generatePath } from '../lib/navigation/index.ts'

export const paths = {
  home: '/',
  registerCoach: '/register-coach',
  login: '/login',
  // US-44: recuperación de contraseña, públicas. reset-password es el link del mail
  // (${FRONTEND_URL}/reset-password?token=...): si cambia, hay que cambiarlo en el backend
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
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
  editRoutine: '/routines/:id/edit',
  routineStructure: '/routines/:id/structure',
  // catálogo global de alimentos (US-39): lo consultan los dos roles, editan solo los entrenadores
  foods: '/foods',
  newFood: '/foods/new',
  editFood: '/foods/:id/edit',
  // solo atleta: registro de peso corporal (US-26)
  progress: '/progress',
  // solo atleta: la rutina que le asignó su entrenador (US-17)
  myRoutine: '/my-routine',
  // solo atleta: el entrenamiento que inició o retomó desde Mi rutina (US-18), sin entrada en el menú
  training: '/training/:sessionId',
  // US-23: solo atleta, registro de comidas del día
  meals: '/meals',
  // US-21: solo atleta, historial de entrenamientos cerrados y la observación del entrenador
  trainingHistory: '/training-history',
  // US-48: perfil propio (datos, foto y contraseña), los dos roles; se llega desde el menú de usuario
  profile: '/profile',
} as const

// las rutas con parámetros se arman con estos helpers para no concatenar a mano
export const athleteProfilePath = (id: string) =>
  generatePath(paths.athleteProfile, { id })

export const athleteEditPath = (id: string) =>
  generatePath(paths.editAthlete, { id })

export const exerciseEditPath = (id: string) =>
  generatePath(paths.editExercise, { id })

export const foodEditPath = (id: string) => generatePath(paths.editFood, { id })

export const routineDetailPath = (id: string) =>
  generatePath(paths.routineDetail, { id })

export const routineEditPath = (id: string) =>
  generatePath(paths.editRoutine, { id })

export const routineStructurePath = (id: string) =>
  generatePath(paths.routineStructure, { id })

export const trainingPath = (sessionId: string) =>
  generatePath(paths.training, { sessionId })
