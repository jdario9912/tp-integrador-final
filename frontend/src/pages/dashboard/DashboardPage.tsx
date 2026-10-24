import { useAuth } from '../../lib/auth'
import { AthleteDashboard } from './components/AthleteDashboard'
import { CoachDashboard } from './components/CoachDashboard'
import { UserCard } from './components/UserCard'

// una sola ruta para los dos roles: el panel se elige según el rol de la sesión
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 p-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <UserCard />
      </header>
      {user?.role === 'COACH' ? <CoachDashboard /> : <AthleteDashboard />}
    </main>
  )
}
