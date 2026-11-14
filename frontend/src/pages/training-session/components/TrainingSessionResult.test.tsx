import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { trainingSession } from '../../../test/training-session-fixtures'
import { TrainingSessionResult } from './TrainingSessionResult'

// un entrenamiento de 1 h 5 min: de 22:15 UTC a 23:20 UTC
const finished = trainingSession({
  status: 'FINISHED',
  endedAt: '2026-11-11T23:20:00Z',
  summary: {
    prescribedSets: 7,
    doneSets: 5,
    skippedSets: 1,
    pendingSets: 1,
    volumeKg: 1250.5,
  },
})

// valor de un dato del resumen por su etiqueta (<dt>/<dd>)
const valueOf = (label: string) =>
  within(screen.getByRole('region', { name: 'Resumen' })).getByText(label)
    .nextElementSibling?.textContent

describe('TrainingSessionResult (US-20)', () => {
  it('muestra las series hechas, omitidas, sin registrar, el volumen y la duración', () => {
    render(<TrainingSessionResult session={finished} />)

    expect(valueOf('Series hechas')).toBe('5 de 7')
    expect(valueOf('Omitidas')).toBe('1')
    expect(valueOf('Sin registrar')).toBe('1')
    expect(valueOf('Volumen')).toBe('1.250,5 kg')
    expect(valueOf('Duración')).toBe('1 h 5 min')
  })

  it('el resumen tiene nombre accesible y no tiene botones', () => {
    render(<TrainingSessionResult session={finished} />)

    expect(screen.getByRole('region', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('sin hora de fin no muestra la duración', () => {
    render(
      <TrainingSessionResult
        session={trainingSession({ status: 'CANCELLED', endedAt: null })}
      />,
    )

    expect(screen.queryByText('Duración')).not.toBeInTheDocument()
  })
})
