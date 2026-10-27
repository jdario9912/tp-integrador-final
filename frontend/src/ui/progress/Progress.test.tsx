import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { clampPercent, ProgressBar, ProgressRing } from '.'

describe('clampPercent', () => {
  it('limita el porcentaje entre 0 y 100', () => {
    expect(clampPercent(3, 4)).toBe(75)
    expect(clampPercent(3000, 2400)).toBe(100)
    expect(clampPercent(-1, 10)).toBe(0)
    expect(clampPercent(1, 0)).toBe(0)
  })
})

describe('ProgressBar y ProgressRing', () => {
  it('exponen el progreso con atributos aria', () => {
    render(
      <>
        <ProgressBar label="Calorías" value={1070} max={2400} />
        <ProgressRing label="Semana" value={3} max={4} />
      </>,
    )
    expect(
      screen.getByRole('progressbar', { name: 'Calorías' }),
    ).toHaveAttribute('aria-valuenow', '1070')
    expect(
      screen.getByRole('progressbar', { name: 'Semana' }),
    ).toHaveTextContent('3/4')
  })
})
