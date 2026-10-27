import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FilterSelect, Select } from '.'

describe('Select', () => {
  it('permite elegir una opción y mergea className', async () => {
    render(
      <Select aria-label="Objetivo" className="h-13">
        <option value="hypertrophy">Hipertrofia</option>
        <option value="fat-loss">Pérdida de grasa</option>
      </Select>,
    )
    const select = screen.getByLabelText('Objetivo')
    expect(select).toHaveClass('h-13', 'border-border')
    await userEvent.selectOptions(select, 'fat-loss')
    expect(select).toHaveValue('fat-loss')
  })
})

describe('FilterSelect', () => {
  it('queda nombrado por su label', () => {
    render(
      <FilterSelect label="Estado">
        <option>Todos</option>
      </FilterSelect>,
    )
    expect(screen.getByRole('combobox', { name: /Estado/ })).toHaveValue(
      'Todos',
    )
  })
})
