import { PageHeader } from '../../layout'
import { useAuth } from '../../lib/auth'
import { TrainingHistory } from '../../components/training-history'
import { AthleteReviewNote } from './components/AthleteReviewNote'

// historial del atleta (US-21): sus entrenamientos cerrados, con el detalle de series y la
// observación de su entrenador. Solo lectura
export function TrainingHistoryPage() {
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''

  return (
    <div className="flex flex-col gap-6 [&_*]:scroll-mt-24">
      <PageHeader
        title="Entrenamientos"
        description="Revisá lo que hiciste en cada entrenamiento y la observación de tu entrenador."
      />
      <TrainingHistory
        athleteId={athleteId}
        emptyDescription="Cuando finalices o canceles un entrenamiento, lo vas a ver acá."
        renderReview={(session) => <AthleteReviewNote session={session} />}
      />
    </div>
  )
}
