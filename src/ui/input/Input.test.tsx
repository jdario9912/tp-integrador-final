import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { DateInput, NumberInput, SearchInput, TextInput } from '.'

describe('TextInput', () => {
  it('usa type="text" por defecto y permite sobrescribirlo', () => {
    const { rerender } = render(<TextInput aria-label="nombre" />)
    expect(screen.getByLabelText('nombre')).toHaveAttribute('type', 'text')
    rerender(<TextInput aria-label="nombre" type="email" />)
    expect(screen.getByLabelText('nombre')).toHaveAttribute('type', 'email')
  })

  it('propaga props y mergea className', async () => {
    render(<TextInput aria-label="email" name="email" className="px-5" />)
    const input = screen.getByLabelText('email')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveClass('px-5', 'border-border')
    expect(input).not.toHaveClass('px-3')
    await userEvent.type(input, 'hola')
    expect(input).toHaveValue('hola')
  })
})

describe('TextInput con adornos', () => {
  it('renderiza icono y sufijo sin perder el acceso al input', async () => {
    render(<TextInput aria-label="peso" leadingIcon={<svg />} suffix="kg" />)
    const input = screen.getByLabelText('peso')
    expect(screen.getByText('kg')).toBeInTheDocument()
    await userEvent.type(input, '72')
    expect(input).toHaveValue('72')
  })
})

describe('SearchInput, NumberInput y DateInput', () => {
  it('fijan el type correspondiente', () => {
    render(
      <>
        <SearchInput aria-label="buscar" />
        <NumberInput aria-label="edad" suffix="años" />
        <DateInput aria-label="inicio" />
      </>,
    )
    expect(screen.getByLabelText('buscar')).toHaveAttribute('type', 'search')
    expect(screen.getByLabelText('edad')).toHaveAttribute('type', 'number')
    expect(screen.getByLabelText('edad')).toHaveAttribute(
      'inputmode',
      'decimal',
    )
    expect(screen.getByLabelText('inicio')).toHaveAttribute('type', 'date')
  })
})
