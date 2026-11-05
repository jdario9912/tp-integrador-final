import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TextLink } from '.'
import { MemoryRouter } from '../../lib/navigation'

describe('TextLink', () => {
  it('renderiza un link a la ruta indicada', () => {
    render(
      <MemoryRouter>
        <TextLink to="/athletes">Ver todo</TextLink>
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Ver todo' })).toHaveAttribute(
      'href',
      '/athletes',
    )
  })
})
