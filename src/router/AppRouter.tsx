import { AppShell } from '../layout'
import { createBrowserRouter, RouterProvider } from '../lib/navigation'
import { AthleteProfilePage } from '../pages/athlete-profile'
import { AthletesPage } from '../pages/athletes'
import { DashboardPage } from '../pages/dashboard'
import { EditAthletePage } from '../pages/edit-athlete'
import { EditExercisePage } from '../pages/edit-exercise'
import { ExercisesPage } from '../pages/exercises'
import { HomePage } from '../pages/home'
import { LoginPage } from '../pages/login'
import { NewExercisePage } from '../pages/new-exercise'
import { NewRoutinePage } from '../pages/new-routine'
import { ProgressPage } from '../pages/progress'
import { RegisterAthletePage } from '../pages/register-athlete'
import { RegisterCoachPage } from '../pages/register-coach'
import { RoutineDetailPage } from '../pages/routine-detail'
import { RoutinesPage } from '../pages/routines'
import { paths } from './paths'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'

const router = createBrowserRouter([
  { path: paths.home, element: <HomePage /> },
  { path: paths.registerCoach, element: <RegisterCoachPage /> },
  { path: paths.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        // sidebar y barra superior; `handle.title` arma la ubicación de la barra
        element: <AppShell />,
        children: [
          {
            path: paths.dashboard,
            element: <DashboardPage />,
            handle: { title: 'Panel' },
          },
          // páginas de un solo rol (US-04): van dentro de RequireRole
          {
            element: <RequireRole roles={['COACH']} />,
            children: [
              {
                path: paths.athletes,
                element: <AthletesPage />,
                handle: { title: 'Atletas' },
              },
              {
                path: paths.newAthlete,
                element: <RegisterAthletePage />,
                handle: { title: 'Agregar atleta' },
              },
              {
                path: paths.athleteProfile,
                element: <AthleteProfilePage />,
                handle: { title: 'Perfil del atleta' },
              },
              {
                path: paths.editAthlete,
                element: <EditAthletePage />,
                handle: { title: 'Editar atleta' },
              },
              {
                path: paths.exercises,
                element: <ExercisesPage />,
                handle: { title: 'Ejercicios' },
              },
              {
                path: paths.newExercise,
                element: <NewExercisePage />,
                handle: { title: 'Nuevo ejercicio' },
              },
              {
                path: paths.editExercise,
                element: <EditExercisePage />,
                handle: { title: 'Editar ejercicio' },
              },
              {
                path: paths.routines,
                element: <RoutinesPage />,
                handle: { title: 'Rutinas' },
              },
              {
                path: paths.newRoutine,
                element: <NewRoutinePage />,
                handle: { title: 'Nueva rutina' },
              },
              {
                path: paths.routineDetail,
                element: <RoutineDetailPage />,
                handle: { title: 'Detalle de la rutina' },
              },
            ],
          },
          {
            element: <RequireRole roles={['ATHLETE']} />,
            children: [
              {
                path: paths.progress,
                element: <ProgressPage />,
                handle: { title: 'Progreso' },
              },
            ],
          },
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
