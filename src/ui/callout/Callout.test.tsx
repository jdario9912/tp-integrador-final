import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Callout } from '.'

describe('Callout', () => {
  it('danger se anuncia como alerta con su título', () => {
    render(
      <Callout tone="danger" title="Alerta:">
        Faltó a 2 entrenamientos.
      </Callout>,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Alerta: Faltó a 2 entrenamientos.',
    )
  })

  it('el resto de los tonos es una nota', () => {
    render(<Callout title="Revisión:">Envió fotos.</Callout>)
    expect(screen.getByRole('note')).toHaveClass('bg-info-soft')
  })
})
