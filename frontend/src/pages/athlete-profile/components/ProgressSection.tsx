import { todayInAppTimeZone } from '../../../lib/iso-date'
import { ProgressPhotosCard } from '../../progress/components/ProgressPhotosCard'
import { WeightEvolutionCard } from '../../progress/components/WeightEvolutionCard'

type ProgressSectionProps = { athleteId: string }

// US-30: el progreso del atleta visto por su entrenador. Son las mismas tarjetas que ve el atleta
// en Progreso (US-29), en solo lectura: cargar el peso y subir o borrar fotos son del atleta
export function ProgressSection({ athleteId }: ProgressSectionProps) {
  // "hoy" en la zona de la app, no en la del navegador: base de los atajos del rango
  const today = todayInAppTimeZone()

  return (
    <section aria-label="Progreso" className="flex flex-col gap-6">
      <WeightEvolutionCard athleteId={athleteId} today={today} readOnly />
      <ProgressPhotosCard athleteId={athleteId} today={today} readOnly />
    </section>
  )
}
