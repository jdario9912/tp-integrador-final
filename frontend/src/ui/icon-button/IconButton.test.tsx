import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Bell } from 'lucide-react'
import { describe, expect, it, vi } from 'vitest'
import { IconButton } from '.'

describe('IconButton', () => {
  it('se anuncia por su aria-label y dispara onClick', async () => {
    const onClick = vi.fn()
    render(
      <IconButton aria-label="Notificaciones" onClick={onClick}>
        <Bell />
      </IconButton>,
    )
    const button = screen.getByRole('button', { name: 'Notificaciones' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('muestra el indicador solo cuando se pide', () => {
    const { container, rerender } = render(
      <IconButton aria-label="Notificaciones">
        <Bell />
      </IconButton>,
    )
    expect(container.querySelector('.bg-danger')).toBeNull()
    rerender(
      <IconButton aria-label="Notificaciones" indicator>
        <Bell />
      </IconButton>,
    )
    expect(container.querySelector('.bg-danger')).not.toBeNull()
  })
})
