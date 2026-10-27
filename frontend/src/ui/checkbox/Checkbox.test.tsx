import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Checkbox } from '.'

describe('Checkbox', () => {
  it('se marca al hacer click en el texto', async () => {
    render(<Checkbox name="remember">Recordarme</Checkbox>)
    const checkbox = screen.getByRole('checkbox', { name: 'Recordarme' })
    await userEvent.click(screen.getByText('Recordarme'))
    expect(checkbox).toBeChecked()
  })
})
