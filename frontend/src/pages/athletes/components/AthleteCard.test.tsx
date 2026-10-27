import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { AthleteCard } from './AthleteCard'

const card = () => screen.getByRole('region', { name: 'Juana Pérez' })

describe('AthleteCard', () => {
  it('muestra nombre, iniciales, estado, objetivo y peso', () => {
    render(
      <AthleteCard
        athlete={createdAthlete({ goal: 'Hipertrofia', initialWeightKg: 82.5 })}
      />,
    )

    expect(
      within(card()).getByRole('heading', { name: 'Juana Pérez' }),
    ).toBeInTheDocument()
    expect(within(card()).getByText('JP')).toBeInTheDocument()
    expect(within(card()).getByText('Activo')).toBeInTheDocument()
    expect(within(card()).getByText('Hipertrofia')).toBeInTheDocument()
    expect(within(card()).getByText('82,5 kg')).toBeInTheDocument()
  })

  it('muestra textos de reemplazo si faltan objetivo y peso', () => {
    render(<AthleteCard athlete={createdAthlete()} />)

    expect(within(card()).getByText('Sin objetivo')).toBeInTheDocument()
    expect(within(card()).getByText('—')).toBeInTheDocument()
    expect(card()).not.toHaveTextContent(/null|undefined|NaN/)
  })

  it('un peso de 0 no se toma como faltante', () => {
    render(<AthleteCard athlete={createdAthlete({ initialWeightKg: 0 })} />)

    expect(within(card()).getByText('0 kg')).toBeInTheDocument()
  })

  it('marca con borde de alerta a quien requiere revisión', () => {
    render(<AthleteCard athlete={createdAthlete({ status: 'NEEDS_REVIEW' })} />)

    expect(card()).toHaveClass('border-danger/25')
    expect(within(card()).getByText('Requiere revisión')).toBeInTheDocument()
    expect(
      within(card()).getByRole('img', { name: 'Requiere atención' }),
    ).toBeInTheDocument()
  })

  it('un atleta inactivo no tiene borde de alerta', () => {
    render(<AthleteCard athlete={createdAthlete({ status: 'INACTIVE' })} />)

    expect(card()).not.toHaveClass('border-danger/25')
    expect(within(card()).getByText('Inactivo')).toBeInTheDocument()
    expect(
      within(card()).getByRole('img', { name: 'Inactivo' }),
    ).toBeInTheDocument()
  })
})
