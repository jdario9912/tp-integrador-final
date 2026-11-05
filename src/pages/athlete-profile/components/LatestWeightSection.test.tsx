import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from '../../../lib/navigation'
import { LatestWeightSection } from './LatestWeightSection'

const section = () => screen.getByRole('region', { name: 'Último peso' })

describe('LatestWeightSection', () => {
  it('rotula el peso como inicial', () => {
    render(<LatestWeightSection athleteId="abc" initialWeightKg={62} />)

    const term = within(section()).getByRole('term')
    expect(term).toHaveTextContent('Peso inicial')
    expect(term.nextElementSibling).toHaveTextContent('62 kg')
  })

  it('un peso de 0 no se toma como faltante', () => {
    render(<LatestWeightSection athleteId="abc" initialWeightKg={0} />)

    expect(within(section()).getByText('0 kg')).toBeInTheDocument()
  })

  it('sin peso inicial invita a cargarlo desde la edición', () => {
    render(
      <MemoryRouter>
        <LatestWeightSection athleteId="abc" initialWeightKg={null} />
      </MemoryRouter>,
    )

    expect(
      within(section()).getByRole('heading', { name: 'Sin registros de peso' }),
    ).toBeInTheDocument()
    expect(
      within(section()).getByRole('link', { name: 'Cargar peso inicial' }),
    ).toHaveAttribute('href', '/athletes/abc/edit')
  })
})
