import { useAuth } from '../../lib/auth'
import { PageHeader } from '../../layout'
import { AthleteDashboard } from './components/AthleteDashboard'
import { CoachDashboard } from './components/CoachDashboard'
import { WelcomeMessage } from './components/WelcomeMessage'

// una sola ruta para los dos roles: el panel se elige según el rol de la sesión
export function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={<WelcomeMessage />} />
      {user?.role === 'COACH' ? <CoachDashboard /> : <AthleteDashboard />}
    </div>
  )
}
