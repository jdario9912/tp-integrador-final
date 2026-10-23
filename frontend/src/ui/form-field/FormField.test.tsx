import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField, getFieldErrorId } from '.'
import { TextInput } from '../input'

describe('FormField', () => {
  it('asocia el label al control y marca los campos obligatorios', () => {
    render(
      <FormField label="Email" htmlFor="email" required>
        <TextInput id="email" />
      </FormField>,
    )
    expect(screen.getByLabelText(/Email/)).toHaveAttribute('id', 'email')
    expect(screen.getByText('*')).toBeInTheDocument()
  })

  it('muestra el error con el id que referencia el control', () => {
    render(
      <FormField label="Email" htmlFor="email" error="Email inválido">
        <TextInput
          id="email"
          aria-invalid
          aria-describedby={getFieldErrorId('email')}
        />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Email inválido',
    )
  })
})
