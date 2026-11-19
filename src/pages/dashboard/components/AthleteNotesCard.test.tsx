import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { getNotes } from '../../../lib/notes/get-notes'
import { markNoteRead } from '../../../lib/notes/mark-note-read'
import { session } from '../../../test/auth-fixtures'
import { note } from '../../../test/note-fixtures'
import { ATHLETE_ID, renderWithRouter } from '../dashboard-test-utils'
import { AthleteNotesCard } from './AthleteNotesCard'

vi.mock('../../../lib/notes/get-notes', () => ({ getNotes: vi.fn() }))
vi.mock('../../../lib/notes/mark-note-read', () => ({ markNoteRead: vi.fn() }))

const unread = note({ id: 'n1', title: 'Hidratación', readAt: null })
const read = note({
  id: 'n2',
  title: 'Descanso',
  content: 'Dormí 8 horas antes de piernas.',
  createdAt: '2026-11-10T15:00:00Z',
  readAt: '2026-11-11T02:00:00Z',
})

const card = () =>
  screen.getByRole('region', { name: 'Notas de tu entrenador' })
const markButton = (title: string) =>
  within(card()).getByRole('button', {
    name: `Marcar como leída: ${title}`,
  })

beforeEach(() => {
  saveSession(session('ATHLETE'))
  vi.mocked(getNotes).mockReset()
  vi.mocked(markNoteRead).mockReset()
})

describe('AthleteNotesCard (US-46)', () => {
  it('lista las notas visibles de su propio id: las sin leer con la acción y las leídas con la fecha', async () => {
    vi.mocked(getNotes).mockResolvedValue([unread, read])

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)

    const items = await within(card()).findAllByRole('listitem')
    expect(getNotes).toHaveBeenCalledWith(ATHLETE_ID)
    expect(within(card()).getByText('1 sin leer')).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Hidratación')
    expect(markButton('Hidratación')).toBeInTheDocument()
    expect(items[1]).toHaveTextContent('Dormí 8 horas antes de piernas.')
    // instante en la zona de la app: las 2 UTC del 11 son el 10 en Argentina
    expect(items[1]).toHaveTextContent('Leída el 10 de noviembre de 2026')
    expect(
      within(items[1]).queryByRole('button', { name: /Marcar como leída/ }),
    ).not.toBeInTheDocument()
  })

  it('sin notas muestra el estado vacío', async () => {
    vi.mocked(getNotes).mockResolvedValue([])

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)

    expect(
      await within(card()).findByText('Tu entrenador todavía no te dejó notas'),
    ).toBeInTheDocument()
  })

  it('si falla la carga muestra el error y reintenta', async () => {
    vi.mocked(getNotes)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValue([unread])

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)

    expect(await within(card()).findByRole('alert')).toHaveTextContent(
      'No se pudo conectar con el servidor',
    )
    await userEvent.click(
      within(card()).getByRole('button', { name: 'Reintentar' }),
    )

    expect(await within(card()).findByText('Hidratación')).toBeInTheDocument()
  })

  it('marca la nota como leída, deshabilitando el botón mientras tanto', async () => {
    let resolve: (value: typeof read) => void = () => {}
    vi.mocked(markNoteRead).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    vi.mocked(getNotes)
      .mockResolvedValueOnce([unread])
      .mockResolvedValue([{ ...unread, readAt: '2026-11-15T13:00:00Z' }])

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)
    await within(card()).findByText('Hidratación')
    await userEvent.click(markButton('Hidratación'))

    expect(markButton('Hidratación')).toBeDisabled()
    expect(markNoteRead).toHaveBeenCalledWith(ATHLETE_ID, 'n1')

    resolve({ ...unread, readAt: '2026-11-15T13:00:00Z' })

    expect(
      await within(card()).findByText('15 de noviembre de 2026'),
    ).toBeInTheDocument()
    expect(within(card()).getByRole('listitem')).toHaveTextContent(
      'Leída el 15 de noviembre de 2026',
    )
    expect(within(card()).queryByText('1 sin leer')).not.toBeInTheDocument()
  })

  it('un 404 (privada o borrada) muestra el mensaje y refresca la lista', async () => {
    vi.mocked(getNotes).mockResolvedValueOnce([unread]).mockResolvedValue([])
    vi.mocked(markNoteRead).mockRejectedValue(
      new ApiError('La nota no existe', 404),
    )

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)
    await within(card()).findByText('Hidratación')
    await userEvent.click(markButton('Hidratación'))

    await waitFor(() => expect(getNotes).toHaveBeenCalledTimes(2))
    expect(
      await within(card()).findByText('Tu entrenador todavía no te dejó notas'),
    ).toBeInTheDocument()
  })

  it('un error del servidor se muestra en la nota y se puede reintentar', async () => {
    vi.mocked(getNotes).mockResolvedValue([unread])
    vi.mocked(markNoteRead).mockRejectedValueOnce(
      new ApiError('Error interno del servidor', 500),
    )

    renderWithRouter(<AthleteNotesCard athleteId={ATHLETE_ID} />)
    await within(card()).findByText('Hidratación')
    await userEvent.click(markButton('Hidratación'))

    expect(await within(card()).findByRole('alert')).toHaveTextContent(
      'Error interno del servidor',
    )
    expect(markButton('Hidratación')).toBeEnabled()
  })
})
