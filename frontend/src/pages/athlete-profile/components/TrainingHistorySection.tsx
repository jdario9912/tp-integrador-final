import { TrainingHistory } from '../../../components/training-history'
import { SectionCard } from '../../../ui/card'
import { ClipboardCheck } from '../../../ui/icons'
import { CoachReviewForm } from './CoachReviewForm'

const TITLE = 'Entrenamientos'

type TrainingHistorySectionProps = { athleteId: string }

// historial de entrenamientos cerrados del atleta (US-21), con el detalle de series y la revisión del
// entrenador. Es la misma vista que ve el atleta en su pantalla, más el formulario de revisión
export function TrainingHistorySection({
  athleteId,
}: TrainingHistorySectionProps) {
  return (
    <SectionCard title={TITLE} icon={<ClipboardCheck />} aria-label={TITLE}>
      <TrainingHistory
        athleteId={athleteId}
        emptyDescription="Cuando el atleta finalice o cancele un entrenamiento, lo vas a ver acá."
        renderReview={(session) => (
          <CoachReviewForm athleteId={athleteId} session={session} />
        )}
      />
    </SectionCard>
  )
}
