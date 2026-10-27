import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedControl } from '.'

const options = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
]

describe('SegmentedControl', () => {
  it('expone un grupo de radios con la opción actual marcada', () => {
    render(
      <SegmentedControl
        legend="Nivel de experiencia"
        name="level"
        options={options}
        value="intermediate"
        onValueChange={() => {}}
      />,
    )
    expect(
      screen.getByRole('group', { name: 'Nivel de experiencia' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Intermedio' })).toBeChecked()
  })

  it('avisa el valor elegido', async () => {
    const onValueChange = vi.fn()
    render(
      <SegmentedControl
        legend="Nivel"
        name="level"
        options={options}
        value="intermediate"
        onValueChange={onValueChange}
        variant="chips"
      />,
    )
    await userEvent.click(screen.getByText('Principiante'))
    expect(onValueChange).toHaveBeenCalledWith('beginner')
  })
})
