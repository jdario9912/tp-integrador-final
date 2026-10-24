import { useAuth } from '../../lib/auth'
import { AthleteDashboard } from './components/AthleteDashboard'
import { CoachDashboard } from './components/CoachDashboard'

// una sola ruta para los dos roles: el panel se elige según el rol de la sesión
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {user?.role === 'COACH' ? <CoachDashboard /> : <AthleteDashboard />}
    </main>
  )
}
