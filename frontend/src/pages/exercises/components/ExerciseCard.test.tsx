import { render as baseRender, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from '../../../lib/navigation'
import { createdExercise } from '../../../test/exercise-fixtures'
import { ExerciseCard } from './ExerciseCard'

// la card tiene un link: necesita un router
const render = (ui: ReactNode) => baseRender(<MemoryRouter>{ui}</MemoryRouter>)

const card = () => screen.getByRole('region', { name: 'Press de banca' })

describe('ExerciseCard', () => {
  it('muestra nombre, grupo muscular, descripción y que es propio', () => {
    render(
      <ExerciseCard
        exercise={createdExercise({ description: 'Agarre medio' })}
        muscleGroupName="Pecho"
      />,
    )

    expect(
      within(card()).getByRole('heading', { name: 'Press de banca' }),
    ).toBeInTheDocument()
    expect(within(card()).getByText('Pecho')).toBeInTheDocument()
    expect(within(card()).getByText('Mío')).toBeInTheDocument()
    expect(within(card()).getByText('Agarre medio')).toBeInTheDocument()
  })

  it('sin descripción ni video muestra un texto de reemplazo', () => {
    render(
      <ExerciseCard exercise={createdExercise()} muscleGroupName="Pecho" />,
    )

    expect(within(card()).getByText('Sin descripción')).toBeInTheDocument()
    expect(
      within(card()).queryByRole('link', { name: /Ver video/ }),
    ).not.toBeInTheDocument()
    expect(card()).not.toHaveTextContent(/null|undefined/)
  })

  it('un ejercicio propio linkea a su edición', () => {
    render(
      <ExerciseCard
        exercise={createdExercise({ id: 'abc' })}
        muscleGroupName="Pecho"
      />,
    )

    expect(
      within(card()).getByRole('link', { name: 'Editar Press de banca' }),
    ).toHaveAttribute('href', '/exercises/abc/edit')
  })

  it('un ejercicio global es de solo lectura', () => {
    render(
      <ExerciseCard
        exercise={createdExercise({ global: true })}
        muscleGroupName="Pecho"
      />,
    )

    expect(within(card()).getByText('Global')).toBeInTheDocument()
    expect(
      within(card()).queryByRole('link', { name: /Editar/ }),
    ).not.toBeInTheDocument()
  })

  it('el video se abre en otra pestaña sin darle acceso a la app', () => {
    render(
      <ExerciseCard
        exercise={createdExercise({ videoUrl: 'https://youtu.be/abc' })}
        muscleGroupName="Pecho"
      />,
    )

    const link = within(card()).getByRole('link', {
      name: /Ver video de Press de banca/,
    })
    expect(link).toHaveAttribute('href', 'https://youtu.be/abc')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })
})
