import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { paths } from '../../../router/paths'
import { createdAthlete } from '../../../test/athlete-fixtures'
import { createAthlete } from '../actions/create-athlete'
import { RegisterAthleteForm } from './RegisterAthleteForm'

vi.mock('../actions/create-athlete', () => ({ createAthlete: vi.fn() }))

// muestra el state recibido para verificar el aviso que se envía al dashboard
function DashboardStub() {
  const { state } = useLocation()
  return <p>pantalla dashboard {JSON.stringify(state)}</p>
}

const renderForm = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[paths.newAthlete]}>
        <Routes>
          <Route path={paths.newAthlete} element={<RegisterAthleteForm />} />
          <Route path={paths.dashboard} element={<DashboardStub />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const fillRequiredFields = async () => {
  await userEvent.type(screen.getByLabelText(/Nombre/), ' Juana ')
  await userEvent.type(screen.getByLabelText(/Apellido/), 'Pérez')
  await userEvent.type(screen.getByLabelText(/Email/), 'juana@example.com')
  await userEvent.type(screen.getByLabelText(/Contraseña/), '12345678')
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar atleta' }))

const requiredInput = {
  firstName: 'Juana',
  lastName: 'Pérez',
  email: 'juana@example.com',
  password: '12345678',
}

beforeEach(() => {
  vi.mocked(createAthlete).mockReset()
})

describe('RegisterAthleteForm', () => {
  it('no envía el formulario si faltan campos obligatorios', async () => {
    renderForm()

    await submit()

    expect(
      await screen.findByText('El nombre es obligatorio'),
    ).toBeInTheDocument()
    expect(screen.getByText('El apellido es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument()
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nombre/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(createAthlete).not.toHaveBeenCalled()
  })

  it('valida los datos opcionales al salir del campo', async () => {
    renderForm()

    await userEvent.type(screen.getByLabelText('Altura'), '0')
    await userEvent.type(screen.getByLabelText('Días disponibles'), '9')
    await userEvent.tab()

    expect(
      await screen.findByText('La altura debe ser mayor a 0'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Los días disponibles deben estar entre 1 y 7'),
    ).toBeInTheDocument()
  })

  it('asocia el texto de ayuda al campo', () => {
    renderForm()

    expect(screen.getByLabelText(/Email/)).toHaveAccessibleDescription(
      'Lo usa para ingresar a la aplicación.',
    )
  })

  it('envía solo los obligatorios cuando el resto queda vacío', async () => {
    vi.mocked(createAthlete).mockResolvedValue(createdAthlete())
    renderForm()

    await fillRequiredFields()
    await submit()

    await waitFor(() => expect(createAthlete).toHaveBeenCalledTimes(1))
    expect(vi.mocked(createAthlete).mock.calls[0][0]).toEqual(requiredInput)
  })

  it('envía los datos opcionales convertidos', async () => {
    vi.mocked(createAthlete).mockResolvedValue(createdAthlete())
    renderForm()

    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Teléfono'), '1155550000')
    fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), {
      target: { value: '1995-04-12' },
    })
    await userEvent.selectOptions(screen.getByLabelText('Sexo'), 'FEMALE')
    await userEvent.type(screen.getByLabelText('Altura'), '165.5')
    await userEvent.type(screen.getByLabelText('Peso inicial'), '62')
    await userEvent.type(screen.getByLabelText('Objetivo'), 'Hipertrofia')
    await userEvent.click(screen.getByRole('radio', { name: 'Intermedio' }))
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), {
      target: { value: '2026-11-02' },
    })
    await userEvent.type(screen.getByLabelText('Días disponibles'), '4')
    await userEvent.type(screen.getByLabelText('Lesiones'), 'Rodilla')
    await submit()

    await waitFor(() => expect(createAthlete).toHaveBeenCalledTimes(1))
    expect(vi.mocked(createAthlete).mock.calls[0][0]).toEqual({
      ...requiredInput,
      phone: '1155550000',
      sex: 'FEMALE',
      experienceLevel: 'INTERMEDIATE',
      birthDate: '1995-04-12',
      heightCm: 165.5,
      initialWeightKg: 62,
      goal: 'Hipertrofia',
      injuries: 'Rodilla',
      availableDays: 4,
      startDate: '2026-11-02',
    })
  })

  it('al crear el atleta vuelve al dashboard con su nombre', async () => {
    vi.mocked(createAthlete).mockResolvedValue(createdAthlete())
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(
      await screen.findByText(
        'pantalla dashboard {"createdAthlete":"Juana Pérez"}',
      ),
    ).toBeInTheDocument()
  })

  it('muestra los errores por campo del backend y los limpia al editar', async () => {
    vi.mocked(createAthlete).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          {
            field: 'heightCm',
            message: 'La altura admite hasta 3 enteros y 2 decimales',
          },
        ],
      }),
    )
    renderForm()

    await fillRequiredFields()
    await userEvent.type(screen.getByLabelText('Altura'), '165')
    await submit()

    expect(
      await screen.findByText('La altura admite hasta 3 enteros y 2 decimales'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Altura')).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    // con el error asociado a un campo no hace falta el aviso general
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('Altura'), '1')
    expect(
      screen.queryByText('La altura admite hasta 3 enteros y 2 decimales'),
    ).not.toBeInTheDocument()
  })

  it('muestra el mensaje del backend cuando el email ya existe', async () => {
    vi.mocked(createAthlete).mockRejectedValue(
      new ApiError(
        'Ya existe un usuario registrado con el email juana@example.com',
        409,
      ),
    )
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ya existe un usuario registrado con el email juana@example.com',
    )
  })

  it('muestra un mensaje genérico ante un error inesperado', async () => {
    vi.mocked(createAthlete).mockRejectedValue(new Error('network'))
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ocurrió un error inesperado. Intentá nuevamente.',
    )
  })

  it('deshabilita el botón mientras guarda', async () => {
    vi.mocked(createAthlete).mockReturnValue(new Promise(() => {}))
    renderForm()

    await fillRequiredFields()
    await submit()

    expect(
      await screen.findByRole('button', { name: 'Guardando...' }),
    ).toBeDisabled()
  })

  it('cancelar vuelve al dashboard sin enviar', async () => {
    renderForm()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.getByText(/pantalla dashboard/)).toBeInTheDocument()
    expect(createAthlete).not.toHaveBeenCalled()
  })
})
