import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppShell } from '../layout'
import { DashboardPage } from '../pages/dashboard'
import { HomePage } from '../pages/home'
import { LoginPage } from '../pages/login'
import { RegisterCoachPage } from '../pages/register-coach'
import { paths } from './paths'
import { RequireAuth } from './RequireAuth'

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
          // páginas de un solo rol (US-04): van dentro de RequireRole, por ejemplo
          // { element: <RequireRole roles={['COACH']} />, children: [{ path: ..., element: ... }] }
        ],
      },
    ],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
