import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DescriptionItem, DescriptionList } from '.'

describe('DescriptionList', () => {
  it('asocia cada valor a su etiqueta con dt y dd', () => {
    render(
      <DescriptionList aria-label="Datos" className="sm:grid-cols-3">
        <DescriptionItem label="Email">juana@example.com</DescriptionItem>
        <DescriptionItem label="Teléfono" className="sm:col-span-2">
          1155667788
        </DescriptionItem>
      </DescriptionList>,
    )

    const list = screen.getByLabelText('Datos')
    expect(list.tagName).toBe('DL')
    expect(list).toHaveClass('sm:grid-cols-3')
    expect(list).not.toHaveClass('sm:grid-cols-2')

    const terms = within(list).getAllByRole('term')
    const definitions = within(list).getAllByRole('definition')
    expect(terms.map((term) => term.textContent)).toEqual(['Email', 'Teléfono'])
    expect(definitions.map((definition) => definition.textContent)).toEqual([
      'juana@example.com',
      '1155667788',
    ])
    expect(terms[1].parentElement).toHaveClass('sm:col-span-2')
  })
})
