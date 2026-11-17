import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DayNavigator } from './DayNavigator'

const TODAY = '2026-11-13'

describe('DayNavigator', () => {
  it('en hoy no deja ir al día siguiente y no ofrece volver a hoy', () => {
    render(<DayNavigator day={TODAY} today={TODAY} onChangeDay={vi.fn()} />)

    expect(
      screen.getByRole('heading', { name: 'Comidas de hoy', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Volver a hoy' }),
    ).not.toBeInTheDocument()
  })

  it('pide el día anterior al tocar "Día anterior"', async () => {
    const user = userEvent.setup()
    const onChangeDay = vi.fn()
    render(<DayNavigator day={TODAY} today={TODAY} onChangeDay={onChangeDay} />)

    await user.click(screen.getByRole('button', { name: 'Día anterior' }))

    expect(onChangeDay).toHaveBeenCalledWith('2026-11-12')
  })

  it('en un día anterior avanza, vuelve a hoy y muestra la fecha', async () => {
    const user = userEvent.setup()
    const onChangeDay = vi.fn()
    render(
      <DayNavigator day="2026-11-12" today={TODAY} onChangeDay={onChangeDay} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Comidas del día', level: 2 }),
    ).toBeInTheDocument()
    expect(screen.getByText('12 de noviembre de 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Día siguiente' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Día siguiente' }))
    expect(onChangeDay).toHaveBeenLastCalledWith(TODAY)

    await user.click(screen.getByRole('button', { name: 'Volver a hoy' }))
    expect(onChangeDay).toHaveBeenLastCalledWith(TODAY)
  })

  it('después de navegar lleva el foco al título del día', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <DayNavigator day={TODAY} today={TODAY} onChangeDay={vi.fn()} />,
    )

    await user.click(screen.getByRole('button', { name: 'Día anterior' }))
    // la página cambia el día: el navegador recibe el nuevo y el foco ya está en el título
    rerender(
      <DayNavigator day="2026-11-12" today={TODAY} onChangeDay={vi.fn()} />,
    )

    expect(
      screen.getByRole('heading', { name: 'Comidas del día' }),
    ).toHaveFocus()
  })
})
