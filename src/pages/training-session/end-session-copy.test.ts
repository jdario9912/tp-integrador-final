import { describe, expect, it } from 'vitest'
import type { TrainingSessionSummary } from '../../lib/training-sessions'
import {
  cancelPrompt,
  finishPrompt,
  formatSeries,
  progressText,
} from './end-session-copy'

const summary = (
  overrides: Partial<TrainingSessionSummary> = {},
): TrainingSessionSummary => ({
  prescribedSets: 7,
  doneSets: 0,
  skippedSets: 0,
  pendingSets: 7,
  volumeKg: 0,
  ...overrides,
})

describe('formatSeries', () => {
  it('singulariza una sola serie', () => {
    expect(formatSeries(1)).toBe('1 serie')
    expect(formatSeries(3)).toBe('3 series')
  })
})

describe('progressText', () => {
  it('sin series hechas lo dice sin contar', () => {
    expect(progressText(summary())).toBe(
      'Todavía no registraste ninguna serie.',
    )
  })

  it('con series hechas muestra el avance sobre lo prescrito', () => {
    expect(progressText(summary({ doneSets: 3, pendingSets: 4 }))).toBe(
      'Llevás 3 de 7 series hechas.',
    )
  })
})

describe('finishPrompt (CE-2)', () => {
  it('sin ninguna serie hecha avisa y sugiere cancelar', () => {
    const prompt = finishPrompt(summary())

    expect(prompt.withoutDoneSets).toBe(true)
    expect(prompt.title).toBe('Todavía no hiciste ninguna serie')
    expect(prompt.description).toContain('Te conviene cancelarlo')
  })

  it('con series hechas pide confirmar sin sugerir cancelar', () => {
    const prompt = finishPrompt(summary({ doneSets: 5, pendingSets: 2 }))

    expect(prompt.withoutDoneSets).toBe(false)
    expect(prompt.title).toBe('¿Finalizar el entrenamiento?')
    expect(prompt.description).toBe(
      'Se guardan 5 series hechas y el entrenamiento queda cerrado. Ya no vas a poder cargar ni corregir series. Quedan 2 series sin registrar: no cuentan como hechas.',
    )
  })

  it('con una sola serie hecha y ninguna pendiente, no menciona las pendientes', () => {
    const prompt = finishPrompt(summary({ doneSets: 1, pendingSets: 0 }))

    expect(prompt.description).toBe(
      'Se guarda 1 serie hecha y el entrenamiento queda cerrado. Ya no vas a poder cargar ni corregir series.',
    )
  })

  it('una sola serie pendiente se dice en singular', () => {
    const prompt = finishPrompt(summary({ doneSets: 2, pendingSets: 1 }))

    expect(prompt.description).toContain(
      'Queda 1 serie sin registrar: no cuenta como hecha.',
    )
  })
})

describe('cancelPrompt', () => {
  it('aclara que no cuenta como hecho y que lo registrado se guarda', () => {
    expect(cancelPrompt.title).toBe('¿Cancelar el entrenamiento?')
    expect(cancelPrompt.description).toContain(
      'no cuenta como entrenamiento hecho',
    )
    expect(cancelPrompt.description).toContain(
      'Lo que ya registraste se guarda',
    )
  })
})
