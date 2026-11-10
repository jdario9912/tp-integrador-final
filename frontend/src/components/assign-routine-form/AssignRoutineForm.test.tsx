import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { AssignRoutineForm } from './AssignRoutineForm'
import { ROUTINE_REQUIRED_MESSAGE } from './validation'

const options = [
  { value: 'r1', label: 'Fase de volumen (activa)', disabled: true },
  { value: 'r2', label: 'Fuerza' },
]

const renderForm = (
  props: Partial<ComponentProps<typeof AssignRoutineForm>> = {},
) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined)
  const onCancel = vi.fn()
  render(
    <AssignRoutineForm
      label="Rutina"
      placeholder="Seleccioná una rutina"
      requiredMessage={ROUTINE_REQUIRED_MESSAGE}
      options={options}
      emptyMessage="Todavía no creaste rutinas."
      onSubmit={onSubmit}
      onCancel={onCancel}
      idPrefix="test"
      {...props}
    />,
  )
  return { onSubmit, onCancel }
}

const select = () => screen.getByRole('combobox', { name: /Rutina/ })

describe('AssignRoutineForm', () => {
  it('sin opción elegida muestra el error y no envía', async () => {
    const { onSubmit } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(await screen.findByText('Elegí una rutina')).toBeInTheDocument()
    expect(select()).toHaveAttribute('aria-invalid', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('envía el id de la opción elegida', async () => {
    const { onSubmit } = renderForm()

    await userEvent.selectOptions(select(), 'r2')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(onSubmit).toHaveBeenCalledWith('r2')
    expect(screen.queryByText('Elegí una rutina')).not.toBeInTheDocument()
  })

  it('las opciones deshabilitadas se ven pero no se pueden elegir', () => {
    renderForm()

    expect(
      screen.getByRole('option', { name: 'Fase de volumen (activa)' }),
    ).toBeDisabled()
    expect(screen.getByRole('option', { name: 'Fuerza' })).toBeEnabled()
  })

  it('mientras envía deshabilita Asignar', async () => {
    const { onSubmit } = renderForm()
    onSubmit.mockReturnValue(new Promise(() => {}))

    await userEvent.selectOptions(select(), 'r2')
    await userEvent.click(screen.getByRole('button', { name: 'Asignar' }))

    expect(
      await screen.findByRole('button', { name: 'Asignando...' }),
    ).toBeDisabled()
  })

  it('con una confirmación en curso deshabilita Asignar', () => {
    renderForm({ isPending: true })

    expect(screen.getByRole('button', { name: 'Asignando...' })).toBeDisabled()
  })

  it('Cancelar avisa sin enviar', async () => {
    const { onSubmit, onCancel } = renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('muestra la ayuda bajo el selector', () => {
    renderForm({ hint: 'Se muestran las primeras 100 de 120.' })

    expect(select()).toHaveAccessibleDescription(
      'Se muestran las primeras 100 de 120.',
    )
  })

  it('mientras cargan las opciones muestra un skeleton y se puede cancelar', async () => {
    const { onCancel } = renderForm({ isLoadingOptions: true })

    expect(
      screen.getByRole('status', { name: 'Cargando opciones de rutina' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('si fallan las opciones muestra el error y permite reintentar', async () => {
    const onRetryOptions = vi.fn()
    renderForm({ optionsError: 'No se pudo conectar', onRetryOptions })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo conectar')
    await userEvent.click(screen.getByRole('button', { name: /Reintentar/ }))

    expect(onRetryOptions).toHaveBeenCalledOnce()
  })

  it('sin opciones muestra el mensaje y solo Cancelar', () => {
    renderForm({ options: [] })

    expect(screen.getByText('Todavía no creaste rutinas.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })
})
