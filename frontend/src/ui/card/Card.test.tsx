import { render, screen } from '@testing-library/react'
import { User } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Card, CardHeader, SectionCard } from '.'

describe('Card', () => {
  it('aplica el tono y mergea className', () => {
    render(
      <Card tone="danger" className="p-2" aria-label="alerta">
        contenido
      </Card>,
    )
    const card = screen.getByRole('region', { name: 'alerta' })
    expect(card).toHaveClass('border-danger/25', 'p-2')
    expect(card).not.toHaveClass('p-5')
  })

  it('CardHeader renderiza título y acción', () => {
    render(
      <CardHeader
        title="Actividad Reciente"
        action={<a href="/">Ver todo</a>}
      />,
    )
    expect(
      screen.getByRole('heading', { name: 'Actividad Reciente' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver todo' })).toBeInTheDocument()
  })

  it('SectionCard muestra el encabezado y el contenido', () => {
    render(
      <SectionCard title="Información Personal" icon={<User />}>
        <p>campos</p>
      </SectionCard>,
    )
    expect(
      screen.getByRole('heading', { name: 'Información Personal' }),
    ).toBeInTheDocument()
    expect(screen.getByText('campos')).toBeInTheDocument()
  })
})
