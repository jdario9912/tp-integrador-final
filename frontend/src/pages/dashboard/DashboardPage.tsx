import { UserPlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { PageHeader } from '../../layout'
import { paths } from '../../router/paths'
import { PrimaryButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { AthleteDashboard } from './components/AthleteDashboard'
import { CoachDashboard } from './components/CoachDashboard'
import { WelcomeMessage } from './components/WelcomeMessage'
import { useFirstName } from './hooks/use-first-name'

// nombre del atleta recién creado, lo envía el alta de atleta al volver
type DashboardLocationState = { createdAthlete?: string }

// una sola ruta para los dos roles: el panel se elige según el rol de la sesión
export function DashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  // el aviso se lee una sola vez y después se limpia el state, como en el login:
  // si no, vuelve a aparecer al recargar
  const [createdAthlete] = useState(
    () => (location.state as DashboardLocationState | null)?.createdAthlete,
  )

  useEffect(() => {
    if (location.state) {
      navigate(location.pathname, { replace: true, state: null })
    }
  }, [location.pathname, location.state, navigate])

  const firstName = useFirstName()
  const isCoach = user?.role === 'COACH'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isCoach ? `¡Bienvenido de nuevo, ${firstName}!` : 'Dashboard'}
        description={
          isCoach ? (
            'Esto es lo que está pasando hoy con tus atletas.'
          ) : (
            <WelcomeMessage />
          )
        }
        actions={
          isCoach && (
            <PrimaryButton onClick={() => navigate(paths.newAthlete)}>
              <UserPlus aria-hidden="true" /> Agregar atleta
            </PrimaryButton>
          )
        }
      />
      {createdAthlete && (
        <Callout tone="success" role="status">
          Creaste a {createdAthlete}. Ya puede ingresar con su email y la
          contraseña que le asignaste.
        </Callout>
      )}
      {isCoach ? <CoachDashboard /> : <AthleteDashboard />}
    </div>
  )
}
