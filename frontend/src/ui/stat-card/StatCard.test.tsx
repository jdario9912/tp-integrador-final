import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { StatCard } from '.'

describe('StatCard', () => {
  it('muestra label y valor', () => {
    render(<StatCard label="Atletas Totales" value={24} icon={<Users />} />)
    expect(screen.getByText('Atletas Totales')).toBeInTheDocument()
    expect(screen.getByText('24')).toBeInTheDocument()
  })

  it('con tono danger tiñe el valor', () => {
    render(
      <StatCard
        label="Requieren Revisión"
        value={5}
        icon={<Users />}
        tone="danger"
      />,
    )
    expect(screen.getByText('5')).toHaveClass('text-danger')
  })
})
