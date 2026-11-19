import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { createNote } from '../../../lib/notes/create-note'
import { getNotes } from '../../../lib/notes/get-notes'
import { session } from '../../../test/auth-fixtures'
import { note } from '../../../test/note-fixtures'
import { NotesSection } from './NotesSection'

vi.mock('../../../lib/notes/get-notes', () => ({ getNotes: vi.fn() }))
vi.mock('../../../lib/notes/create-note', () => ({ createNote: vi.fn() }))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const renderSection = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <NotesSection athleteId={ATHLETE_ID} />
    </QueryClientProvider>,
  )

const list = () => screen.getByRole('list', { name: 'Notas del atleta' })

const fillNote = async (title: string, content: string) => {
  await userEvent.type(screen.getByLabelText(/Título/), title)
  await userEvent.type(screen.getByLabelText(/Contenido/), content)
}

const submit = () =>
  userEvent.click(screen.getByRole('button', { name: 'Guardar nota' }))

beforeEach(() => {
  vi.mocked(getNotes).mockReset()
  vi.mocked(createNote).mockReset()
  saveSession(session('COACH'))
})

describe('NotesSection (US-46)', () => {
  it('lista todas las notas con su tipo y, en las visibles, si el atleta la leyó', async () => {
    vi.mocked(getNotes).mockResolvedValue([
      note({
        id: 'n1',
        title: 'Hidratación',
        type: 'VISIBLE_TO_ATHLETE',
        readAt: '2026-11-15T12:00:00Z',
      }),
      note({ id: 'n2', title: 'Técnica', type: 'VISIBLE_TO_ATHLETE' }),
      note({
        id: 'n3',
        title: 'Seguimiento',
        type: 'PRIVATE',
        createdAt: '2026-11-10T02:00:00Z',
      }),
    ])
    renderSection()

    const items = within(
      await screen.findByRole('list', { name: 'Notas del atleta' }),
    ).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('Hidratación')
    expect(items[0]).toHaveTextContent('Visible para el atleta')
    expect(items[0]).toHaveTextContent('Leída el 15 de noviembre de 2026')
    expect(items[1]).toHaveTextContent('Sin leer')
    expect(items[2]).toHaveTextContent('Privada')
    // la privada no lleva estado de lectura
    expect(items[2]).not.toHaveTextContent(/Sin leer|Leída/)
    // instante en la zona de la app: las 2 UTC del 10 son el 9 en Argentina
    expect(items[2]).toHaveTextContent('Escrita el 9 de noviembre de 2026')
  })

  it('sin notas muestra el estado vacío', async () => {
    vi.mocked(getNotes).mockResolvedValue([])
    renderSection()

    expect(
      await screen.findByText('Todavía no escribiste notas sobre este atleta'),
    ).toBeInTheDocument()
  })

  it('si falla la carga muestra el error y reintenta', async () => {
    vi.mocked(getNotes).mockRejectedValueOnce(
      new ApiError('Error interno', 500),
    )
    vi.mocked(getNotes).mockResolvedValueOnce([note()])
    renderSection()

    expect(
      await screen.findByText(/No se pudieron cargar las notas/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Hidratación')).toBeInTheDocument()
  })

  it('el tipo arranca en privada', async () => {
    vi.mocked(getNotes).mockResolvedValue([])
    renderSection()

    expect(screen.getByRole('radio', { name: 'Privada' })).toBeChecked()
    expect(screen.getByText('Solo la ves vos.')).toBeInTheDocument()
  })

  it('valida título y contenido sin llamar a la API', async () => {
    vi.mocked(getNotes).mockResolvedValue([])
    renderSection()

    await submit()

    expect(
      await screen.findByText('El título es obligatorio'),
    ).toBeInTheDocument()
    expect(screen.getByText('El contenido es obligatorio')).toBeInTheDocument()
    expect(createNote).not.toHaveBeenCalled()
  })

  it('guarda una nota visible con los textos recortados, limpia el formulario y refresca la lista', async () => {
    vi.mocked(getNotes).mockResolvedValueOnce([])
    vi.mocked(getNotes).mockResolvedValue([
      note({ title: 'Técnica', content: 'Bajá lento' }),
    ])
    vi.mocked(createNote).mockResolvedValue(note())
    renderSection()
    await screen.findByText('Todavía no escribiste notas sobre este atleta')

    await fillNote('  Técnica ', ' Bajá lento ')
    await userEvent.click(
      screen.getByRole('radio', { name: 'Visible para el atleta' }),
    )
    await submit()

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Guardaste la nota.',
    )
    expect(createNote).toHaveBeenCalledWith(ATHLETE_ID, {
      title: 'Técnica',
      content: 'Bajá lento',
      type: 'VISIBLE_TO_ATHLETE',
    })
    expect(screen.getByLabelText(/Título/)).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Privada' })).toBeChecked()
    await waitFor(() =>
      expect(within(list()).getAllByRole('listitem')).toHaveLength(1),
    )
  })

  it('muestra en su campo los errores del 400', async () => {
    vi.mocked(getNotes).mockResolvedValue([])
    vi.mocked(createNote).mockRejectedValue(
      new ApiError('La solicitud tiene campos inválidos', 400, {
        fieldErrors: [
          { field: 'content', message: 'El contenido es demasiado largo' },
        ],
      }),
    )
    renderSection()

    await fillNote('Técnica', 'Bajá lento')
    await submit()

    expect(
      await screen.findByText('El contenido es demasiado largo'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Contenido/)).toHaveAttribute(
      'aria-invalid',
      'true',
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('un 403 (atleta ajeno) va al aviso general', async () => {
    vi.mocked(getNotes).mockResolvedValue([])
    vi.mocked(createNote).mockRejectedValue(
      new ApiError('No tiene permisos para acceder a este atleta', 403),
    )
    renderSection()

    await fillNote('Técnica', 'Bajá lento')
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tiene permisos para acceder a este atleta',
    )
  })
})
