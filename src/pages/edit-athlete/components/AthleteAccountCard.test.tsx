import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AthleteAccountCard } from './AthleteAccountCard'

describe('AthleteAccountCard', () => {
  it('sin handlers las acciones quedan deshabilitadas', () => {
    render(<AthleteAccountCard athleteName="Juana Pérez" active />)

    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Desactivar cuenta' }),
    ).toBeDisabled()
    expect(screen.getByRole('button', { name: /Desvincular/ })).toBeDisabled()
  })

  it('desactivar pide confirmación', async () => {
    const onToggleActive = vi.fn().mockResolvedValue(undefined)
    render(
      <AthleteAccountCard
        athleteName="Juana Pérez"
        active
        onToggleActive={onToggleActive}
      />,
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Desactivar cuenta' }),
    )
    expect(onToggleActive).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', {
      name: '¿Desactivar la cuenta de Juana Pérez?',
    })
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Desactivar' }),
    )

    expect(onToggleActive).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(dialog).not.toBeVisible())
  })

  it('reactivar no pide confirmación', async () => {
    const onToggleActive = vi.fn().mockResolvedValue(undefined)
    render(
      <AthleteAccountCard
        athleteName="Juana Pérez"
        active={false}
        onToggleActive={onToggleActive}
      />,
    )

    expect(screen.getByText('Desactivada')).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Reactivar cuenta' }),
    )

    expect(onToggleActive).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('el diálogo sigue abierto mientras desvincula y se cierra si falla', async () => {
    let fail: (error: Error) => void = () => {}
    const onUnlink = vi.fn(() => new Promise((_, reject) => (fail = reject)))
    render(
      <AthleteAccountCard
        athleteName="Juana Pérez"
        active
        onUnlink={onUnlink}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Desvincular/ }))
    const dialog = screen.getByRole('dialog', {
      name: '¿Desvincular a Juana Pérez?',
    })
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Desvincular' }),
    )
    expect(onUnlink).toHaveBeenCalledTimes(1)
    expect(dialog).toBeVisible()

    fail(new Error('403'))
    await waitFor(() => expect(dialog).not.toBeVisible())
  })
})
