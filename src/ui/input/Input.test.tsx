import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { TextInput } from '.'

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
