// textos de finalizar y cancelar (US-20). Los verbos son los mismos que los botones: «Finalizar»
// y «Cancelar» en la pantalla, y las confirmaciones dicen qué pasa con lo registrado
import type { TrainingSessionSummary } from '../../lib/training-sessions'

// "1 serie" o "3 series"
export const formatSeries = (count: number) =>
  count === 1 ? '1 serie' : `${count} series`

// lo que el atleta lleva hecho, debajo del título de las acciones
export const progressText = ({
  doneSets,
  prescribedSets,
}: TrainingSessionSummary) =>
  doneSets === 0
    ? 'Todavía no registraste ninguna serie.'
    : `Llevás ${doneSets} de ${prescribedSets} series hechas.`

export type FinishPrompt = {
  title: string
  description: string
  // sin series hechas: la confirmación sugiere cancelar en lugar de finalizar (CE-2)
  withoutDoneSets: boolean
}

// la confirmación de finalizar depende de lo registrado: si no hay ninguna serie hecha, avisa y
// sugiere cancelar; si quedan series sin registrar, dice que no cuentan como hechas
export const finishPrompt = (summary: TrainingSessionSummary): FinishPrompt => {
  const { doneSets, pendingSets } = summary
  if (doneSets === 0) {
    return {
      title: 'Todavía no hiciste ninguna serie',
      description:
        'Si lo finalizás así, queda como entrenamiento sin series hechas. Te conviene cancelarlo.',
      withoutDoneSets: true,
    }
  }

  const done =
    doneSets === 1
      ? 'Se guarda 1 serie hecha'
      : `Se guardan ${doneSets} series hechas`
  const pending =
    pendingSets === 0
      ? ''
      : pendingSets === 1
        ? ' Queda 1 serie sin registrar: no cuenta como hecha.'
        : ` Quedan ${pendingSets} series sin registrar: no cuentan como hechas.`

  return {
    title: '¿Finalizar el entrenamiento?',
    description: `${done} y el entrenamiento queda cerrado. Ya no vas a poder cargar ni corregir series.${pending}`,
    withoutDoneSets: false,
  }
}

export const cancelPrompt = {
  title: '¿Cancelar el entrenamiento?',
  description:
    'Queda como cancelado: no cuenta como entrenamiento hecho y no vas a poder cargar ni corregir series. Lo que ya registraste se guarda.',
}
