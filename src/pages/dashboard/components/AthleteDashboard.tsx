import { useAuth } from '../../../lib/auth'
import { AthleteNotesCard } from './AthleteNotesCard' // US-46
import { LatestWeightCard } from './LatestWeightCard'
import { TodayMealsCard } from './TodayMealsCard'
import { TodayTrainingCard } from './TodayTrainingCard'
import { TrainerNotesCard } from './TrainerNotesCard'

// panel del atleta (US-12): tarjetas independientes, cada una con su carga, error y vacío.
// Móvil: una columna, con lo de hoy arriba. Desde md: la rutina, las observaciones y las notas
// ocupan todo el ancho y comidas y peso van lado a lado
export function AthleteDashboard() {
  const { user } = useAuth()
  // el atleta es el usuario de la sesión: el mismo id que devuelve GET /auth/me
  const athleteId = user?.id ?? ''

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
      <TodayTrainingCard athleteId={athleteId} className="md:col-span-2" />
      <TodayMealsCard athleteId={athleteId} />
      <LatestWeightCard athleteId={athleteId} />
      <TrainerNotesCard athleteId={athleteId} className="md:col-span-2" />
      {/* US-46: las notas visibles del entrenador, junto a sus observaciones */}
      <AthleteNotesCard athleteId={athleteId} className="md:col-span-2" />
    </div>
  )
}
