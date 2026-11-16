import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { trainingSession } from '../../../test/training-session-fixtures'
import { AthleteReviewNote } from './AthleteReviewNote'

describe('AthleteReviewNote (US-21)', () => {
  it('sin revisión dice que el entrenador todavía no la revisó', () => {
    render(
      <AthleteReviewNote session={trainingSession({ status: 'FINISHED' })} />,
    )

    expect(
      screen.getByRole('region', { name: 'Observación de tu entrenador' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Tu entrenador todavía no revisó este entrenamiento.'),
    ).toBeInTheDocument()
  })

  it('revisada con observación muestra la fecha de la revisión y el texto', () => {
    render(
      <AthleteReviewNote
        session={trainingSession({
          status: 'FINISHED',
          review: {
            reviewedAt: '2026-11-14T20:00:00Z',
            observation: 'Buen ritmo.\nLa próxima, más descanso.',
          },
        })}
      />,
    )

    expect(screen.getByText('14 de noviembre de 2026')).toBeInTheDocument()
    expect(
      screen.getByText(/Buen ritmo\.\s+La próxima, más descanso\./),
    ).toBeInTheDocument()
  })

  it('revisada sin observación dice que no tiene observaciones', () => {
    render(
      <AthleteReviewNote
        session={trainingSession({
          status: 'FINISHED',
          review: { reviewedAt: '2026-11-14T20:00:00Z', observation: null },
        })}
      />,
    )

    expect(screen.getByText('Sin observaciones.')).toBeInTheDocument()
  })

  it('un entrenamiento cancelado no muestra nada', () => {
    const { container } = render(
      <AthleteReviewNote session={trainingSession({ status: 'CANCELLED' })} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
