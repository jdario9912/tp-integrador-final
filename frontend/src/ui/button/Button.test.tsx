import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BaseButton, DangerButton, OutlineButton, PrimaryButton } from '.'

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

  it('usa el tamaño md por defecto y acepta otros tamaños', () => {
    const { rerender } = render(<BaseButton>Ok</BaseButton>)
    expect(screen.getByRole('button')).toHaveClass('h-11')
    rerender(<BaseButton size="lg">Ok</BaseButton>)
    expect(screen.getByRole('button')).toHaveClass('h-13', 'text-base')
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
      'rounded-control',
      'bg-primary',
      'text-primary-foreground',
    )
  })
})

describe('variantes', () => {
  it('OutlineButton usa borde y texto primary', () => {
    render(<OutlineButton>Asignar</OutlineButton>)
    expect(screen.getByRole('button')).toHaveClass(
      'border-primary',
      'text-primary',
    )
  })

  it('DangerButton usa los colores de peligro', () => {
    render(<DangerButton>Eliminar</DangerButton>)
    expect(screen.getByRole('button')).toHaveClass(
      'bg-danger',
      'text-danger-foreground',
    )
  })
})
