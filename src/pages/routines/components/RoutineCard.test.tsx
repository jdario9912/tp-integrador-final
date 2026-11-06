import { render as baseRender, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from '../../../lib/navigation'
import { createdRoutine } from '../../../test/routine-fixtures'
import { RoutineCard } from './RoutineCard'

// la card tiene un link: necesita un router
const render = (ui: ReactNode) => baseRender(<MemoryRouter>{ui}</MemoryRouter>)

const card = () => screen.getByRole('region', { name: 'Fase de volumen' })

describe('RoutineCard', () => {
  it('muestra nombre, objetivo, frecuencia, duración y descripción', () => {
    render(
      <RoutineCard
        routine={createdRoutine({
          goal: 'Hipertrofia',
          daysPerWeek: 4,
          durationWeeks: 8,
          description: 'Bloque de acumulación',
        })}
      />,
    )

    expect(
      within(card()).getByRole('heading', { name: 'Fase de volumen' }),
    ).toBeInTheDocument()
    expect(within(card()).getByText('Hipertrofia')).toBeInTheDocument()
    expect(within(card()).getByText('4 días por semana')).toBeInTheDocument()
    expect(within(card()).getByText('8 semanas')).toBeInTheDocument()
    expect(
      within(card()).getByText('Bloque de acumulación'),
    ).toBeInTheDocument()
    expect(within(card()).queryByText('Plantilla')).not.toBeInTheDocument()
  })

  it('sin los opcionales muestra textos de reemplazo', () => {
    render(<RoutineCard routine={createdRoutine()} />)

    expect(within(card()).getAllByText('Sin definir')).toHaveLength(2)
    expect(within(card()).getByText('Sin descripción')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent(/null|undefined/)
  })

  it('marca las plantillas', () => {
    render(<RoutineCard routine={createdRoutine({ isTemplate: true })} />)

    expect(within(card()).getByText('Plantilla')).toBeInTheDocument()
  })

  it('linkea al detalle de la rutina', () => {
    render(<RoutineCard routine={createdRoutine({ id: 'abc' })} />)

    expect(
      within(card()).getByRole('link', { name: 'Ver rutina Fase de volumen' }),
    ).toHaveAttribute('href', '/routines/abc')
  })
})
