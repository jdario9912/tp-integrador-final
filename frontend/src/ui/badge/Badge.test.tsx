import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Badge } from '.'

describe('Badge', () => {
  it('aplica tono suave por defecto y outline si se pide', () => {
    const { rerender } = render(<Badge tone="danger">Requiere revisión</Badge>)
    expect(screen.getByText('Requiere revisión')).toHaveClass(
      'bg-danger-soft',
      'text-danger',
    )
    rerender(
      <Badge tone="primary" variant="outline" shape="pill">
        Glúteos
      </Badge>,
    )
    expect(screen.getByText('Glúteos')).toHaveClass(
      'border',
      'rounded-full',
      'text-primary',
    )
  })
})
