import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { HomePage } from '../pages/home'
import { RegisterCoachPage } from '../pages/register-coach'
import { paths } from './paths'
import { DashboardPage } from '../pages/dashboard'

const router = createBrowserRouter([
  { path: paths.home, element: <HomePage /> },
  { path: paths.registerCoach, element: <RegisterCoachPage /> },
  { path: paths.dashboard, element: <DashboardPage /> },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
