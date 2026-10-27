import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar, initialsOf } from '.'

describe('Avatar', () => {
  it('muestra iniciales sin foto y anuncia el estado', () => {
    render(<Avatar firstName="juan" lastName="pérez" status="alert" />)
    expect(screen.getByText('JP')).toBeInTheDocument()
    expect(
      screen.getByRole('img', { name: 'Requiere atención' }),
    ).toBeInTheDocument()
  })

  it('usa la foto cuando existe', () => {
    render(<Avatar firstName="Juan" lastName="Pérez" src="/juan.png" />)
    expect(screen.getByRole('img', { name: 'Juan Pérez' })).toHaveAttribute(
      'src',
      '/juan.png',
    )
    expect(screen.queryByText('JP')).toBeNull()
  })

  it('initialsOf toma la primera letra de nombre y apellido', () => {
    expect(initialsOf('sofía', 'ramírez')).toBe('SR')
  })
})
