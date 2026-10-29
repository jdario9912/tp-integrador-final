import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../lib/api'
import { createdAthlete } from '../../test/athlete-fixtures'
import { AthleteForm } from './AthleteForm'
import { coachEditFields } from './fields'
import { toAthleteFormValues } from './to-athlete-form-values'

// el alta y sus validaciones se prueban en RegisterAthleteForm; acá lo propio de la edición
const renderEditForm = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <AthleteForm
      idPrefix="edit-athlete"
      defaultValues={toAthleteFormValues(
        createdAthlete({ heightCm: 165.5, sex: 'FEMALE' }),
      )}
      fields={coachEditFields}
      onSubmit={onSubmit}
      onCancel={vi.fn()}
      submitLabel="Guardar cambios"
    />,
  )
  return onSubmit
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))

describe('AthleteForm', () => {
  it('precarga los datos y no muestra los campos ocultos', () => {
    renderEditForm()

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Juana')
    expect(screen.getByLabelText('Altura')).toHaveValue(165.5)
    expect(screen.getByLabelText('Sexo')).toHaveValue('FEMALE')
    expect(screen.queryByLabelText(/Contraseña/)).not.toBeInTheDocument()
  })

  it('envía sin validar los campos ocultos', async () => {
    const onSubmit = renderEditForm()

    await userEvent.clear(screen.getByLabelText(/Apellido/))
    await userEvent.type(screen.getByLabelText(/Apellido/), 'Gómez')
    await submit()

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      lastName: 'Gómez',
      password: '',
    })
  })

  it('un error del backend en un campo oculto va al aviso general', async () => {
    renderEditForm(
      vi.fn().mockRejectedValue(
        new ApiError('La solicitud tiene campos inválidos', 400, {
          fieldErrors: [{ field: 'password', message: 'Muy corta' }],
        }),
      ),
    )

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La solicitud tiene campos inválidos',
    )
  })
})
