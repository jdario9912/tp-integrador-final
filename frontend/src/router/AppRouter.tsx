import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../layout'
import { AthletesPage } from '../pages/athletes'
import { DashboardPage } from '../pages/dashboard'
import { EditAthletePage } from '../pages/edit-athlete'
import { HomePage } from '../pages/home'
import { LoginPage } from '../pages/login'
import { RegisterAthletePage } from '../pages/register-athlete'
import { RegisterCoachPage } from '../pages/register-coach'
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
                path: paths.editAthlete,
                element: <EditAthletePage />,
                handle: { title: 'Editar atleta' },
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
