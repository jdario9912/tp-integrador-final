import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { InfoTile } from '../info-tile'
import { ListItem } from '.'

describe('ListItem', () => {
  it('renderiza título, meta y trailing dentro de una lista', () => {
    render(
      <ul>
        <ListItem title="Potencia Tren Superior" meta="65 min" trailing="Hoy" />
      </ul>,
    )
    const item = screen.getByRole('listitem')
    expect(item).toHaveTextContent('Potencia Tren Superior')
    expect(item).toHaveTextContent('65 min')
    expect(item).toHaveTextContent('Hoy')
  })
})

describe('InfoTile', () => {
  it('muestra label y valor', () => {
    render(<InfoTile label="Peso" value="82.5 kg" />)
    expect(screen.getByText('Peso')).toBeInTheDocument()
    expect(screen.getByText('82.5 kg')).toBeInTheDocument()
  })
})
