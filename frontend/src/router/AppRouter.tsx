import { createBrowserRouter, RouterProvider } from 'react-router-dom'
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
    children: [{ path: paths.dashboard, element: <DashboardPage /> }],
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
