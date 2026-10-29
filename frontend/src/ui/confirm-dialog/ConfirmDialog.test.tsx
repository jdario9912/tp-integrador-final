import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog'

const renderDialog = (props: Partial<ConfirmDialogProps> = {}) => {
  const handlers = { onConfirm: vi.fn(), onCancel: vi.fn() }
  const result = render(
    <ConfirmDialog
      open
      title="¿Desvincular a Juana Pérez?"
      description="Deja de aparecer en tu listado."
      confirmLabel="Desvincular"
      tone="danger"
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, ...result }
}

describe('ConfirmDialog', () => {
  it('se muestra con título y descripción accesibles', () => {
    renderDialog()

    const dialog = screen.getByRole('dialog', {
      name: '¿Desvincular a Juana Pérez?',
    })
    expect(dialog).toHaveAccessibleDescription(
      'Deja de aparecer en tu listado.',
    )
  })

  it('no se muestra cerrado', () => {
    renderDialog({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('confirma y cancela', async () => {
    const { onConfirm, onCancel } = renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Desvincular' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('Escape cancela salvo mientras confirma', () => {
    const { onCancel, rerender, ...props } = renderDialog()
    fireEvent(screen.getByRole('dialog'), new Event('cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)

    rerender(
      <ConfirmDialog
        open
        isPending
        title="¿Desvincular a Juana Pérez?"
        description="Deja de aparecer en tu listado."
        confirmLabel="Desvincular"
        onConfirm={props.onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent(screen.getByRole('dialog'), new Event('cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Procesando...' })).toBeDisabled()
  })
})
