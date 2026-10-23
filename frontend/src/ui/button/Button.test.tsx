import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BaseButton, PrimaryButton } from '.'

describe('BaseButton', () => {
  it('renderiza children y usa type="button" por defecto', () => {
    render(<BaseButton>Guardar</BaseButton>)
    const button = screen.getByRole('button', { name: 'Guardar' })
    expect(button).toHaveAttribute('type', 'button')
  })

  it('mergea className y propaga el resto de las props', async () => {
    const onClick = vi.fn()
    render(
      <BaseButton className="px-8" type="submit" onClick={onClick}>
        Enviar
      </BaseButton>,
    )
    const button = screen.getByRole('button')
    expect(button).toHaveClass('px-8')
    expect(button).not.toHaveClass('px-4')
    expect(button).toHaveAttribute('type', 'submit')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('no dispara onClick si está deshabilitado', async () => {
    const onClick = vi.fn()
    render(
      <BaseButton disabled onClick={onClick}>
        Enviar
      </BaseButton>,
    )
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('PrimaryButton', () => {
  it('aplica los colores primarios sobre las clases base', () => {
    render(<PrimaryButton>Ok</PrimaryButton>)
    expect(screen.getByRole('button')).toHaveClass(
      'rounded-md',
      'bg-primary',
      'text-primary-foreground',
    )
  })
})
