import { render as baseRender, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from '../../../lib/navigation'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { HealthTrainingSection } from './HealthTrainingSection'

// el estado vacío tiene un link: necesita un router
const render = (ui: ReactNode) => baseRender(<MemoryRouter>{ui}</MemoryRouter>)

const section = () =>
  screen.getByRole('region', { name: 'Salud y entrenamiento' })

describe('HealthTrainingSection', () => {
  it('con un solo dato muestra la lista y el resto como "Sin cargar"', () => {
    render(
      <HealthTrainingSection
        athlete={createdAthlete({ experienceLevel: 'ADVANCED' })}
      />,
    )

    expect(within(section()).getByText('Avanzado')).toBeInTheDocument()
    expect(within(section()).getAllByText('Sin cargar')).toHaveLength(5)
    expect(
      within(section()).queryByRole('heading', { level: 3 }),
    ).not.toBeInTheDocument()
  })

  it('una altura de 0 no se toma como faltante', () => {
    render(<HealthTrainingSection athlete={createdAthlete({ heightCm: 0 })} />)

    expect(within(section()).getByText('0 cm')).toBeInTheDocument()
  })

  it('conserva los saltos de línea de lesiones y limitaciones', () => {
    render(
      <HealthTrainingSection
        athlete={createdAthlete({ injuries: '  Rodilla\nHombro  ' })}
      />,
    )

    const injuries = within(section()).getByText(/Rodilla/)
    expect(injuries).toHaveClass('whitespace-pre-line')
    expect(injuries.textContent).toBe('Rodilla\nHombro')
  })
})
