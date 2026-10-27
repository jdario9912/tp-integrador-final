import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FormField, getFieldErrorId, getFieldHintId } from '.'
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

  it('muestra el hint asociado al control y lo oculta si hay error', () => {
    const { rerender } = render(
      <FormField label="Email" htmlFor="email" hint="Se usa para ingresar">
        <TextInput id="email" aria-describedby={getFieldHintId('email')} />
      </FormField>,
    )
    expect(screen.getByLabelText('Email')).toHaveAccessibleDescription(
      'Se usa para ingresar',
    )
    rerender(
      <FormField
        label="Email"
        htmlFor="email"
        hint="Se usa para ingresar"
        error="Email inválido"
      >
        <TextInput id="email" />
      </FormField>,
    )
    expect(screen.queryByText('Se usa para ingresar')).toBeNull()
  })
})
