import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { deleteProgressPhoto } from '../../../lib/progress-photos/delete-progress-photo'
import { getProgressPhotos } from '../../../lib/progress-photos/get-progress-photos'
import { uploadProgressPhoto } from '../../../lib/progress-photos/upload-progress-photo'
import {
  PHOTO_FORMAT_MESSAGE,
  PHOTO_TOO_LARGE_MESSAGE,
} from '../../../lib/progress-photos/validate-photo-file'
import { session } from '../../../test/auth-fixtures'
import {
  progressPhoto,
  progressPhotosPage,
} from '../../../test/progress-photo-fixtures'
import { ProgressPhotosCard } from './ProgressPhotosCard'

vi.mock('../../../lib/progress-photos/get-progress-photos', () => ({
  getProgressPhotos: vi.fn(),
  getProgressPhoto: vi.fn(),
}))
vi.mock('../../../lib/progress-photos/upload-progress-photo', () => ({
  uploadProgressPhoto: vi.fn(),
}))
vi.mock('../../../lib/progress-photos/delete-progress-photo', () => ({
  deleteProgressPhoto: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const TODAY = '2026-11-06'
const MB = 1024 * 1024

const front = progressPhoto({
  id: '00000000-0000-4000-8000-000000000001',
  type: 'FRONT',
  takenOn: '2026-10-01',
})
const side = progressPhoto({
  id: '00000000-0000-4000-8000-000000000002',
  type: 'SIDE',
  takenOn: '2026-10-15',
})

// readOnly: la vista del entrenador en la ficha del atleta (US-30)
const renderCard = ({ readOnly = false } = {}) =>
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
      <ProgressPhotosCard
        athleteId={ATHLETE_ID}
        today={TODAY}
        readOnly={readOnly}
      />
    </QueryClientProvider>,
  )

const jpg = (size = 1000) =>
  new File([new Uint8Array(size)], 'frente.jpg', { type: 'image/jpeg' })

// "Foto *": el campo obligatorio, no la sección "Fotos de progreso"
const photoInput = () => screen.getByLabelText(/^Foto \*$/)
const submit = () => screen.getByRole('button', { name: 'Subir foto' })
const thumbnail = (name: string) => screen.findByRole('button', { name })
const photoList = () => screen.findByRole('list', { name: 'Fotos de progreso' })
// listado vacío: se espera el estado vacío para que la carga inicial ya haya terminado
const emptyState = () =>
  screen.findByRole('heading', {
    name: 'Todavía no subiste fotos de progreso',
  })

beforeEach(() => {
  vi.mocked(getProgressPhotos).mockReset()
  vi.mocked(uploadProgressPhoto).mockReset()
  vi.mocked(deleteProgressPhoto).mockReset()
  saveSession(session('ATHLETE'))
  vi.mocked(getProgressPhotos).mockResolvedValue(progressPhotosPage([]))
})

describe('ProgressPhotosCard · listado', () => {
  it('muestra las fotos en orden cronológico, con su tipo y su fecha', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(
      progressPhotosPage([front, side]),
    )

    renderCard()

    const items = (await photoList()).querySelectorAll('li')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Frontal')
    expect(items[0]).toHaveTextContent('1 de octubre de 2026')
    expect(items[1]).toHaveTextContent('Lateral')
    expect(items[1]).toHaveTextContent('15 de octubre de 2026')
    expect(getProgressPhotos).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: 20,
    })
  })

  it('sin fotos muestra el estado vacío', async () => {
    renderCard()

    expect(
      await screen.findByRole('heading', {
        name: 'Todavía no subiste fotos de progreso',
      }),
    ).toBeInTheDocument()
  })

  it('sin fotos ofrece subir la primera y enfoca el selector de archivo (CE-1)', async () => {
    const user = userEvent.setup()
    vi.mocked(getProgressPhotos).mockResolvedValue(progressPhotosPage([]))
    renderCard()

    await user.click(
      await screen.findByRole('button', { name: 'Subir mi primera foto' }),
    )

    expect(photoInput()).toHaveFocus()
  })

  it('si el servicio de almacenamiento no responde, lo dice y permite reintentar', async () => {
    vi.mocked(getProgressPhotos)
      .mockRejectedValueOnce(
        new ApiError('El servicio de almacenamiento no está disponible', 503),
      )
      .mockResolvedValue(progressPhotosPage([front]))
    const user = userEvent.setup()

    renderCard()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus fotos. Intentá nuevamente más tarde.',
    )
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect((await photoList()).querySelectorAll('li')).toHaveLength(1)
  })
})

describe('ProgressPhotosCard · subir', () => {
  it('valida el formato antes de subir y no envía nada', async () => {
    // sin applyAccept: el selector no debe filtrar el archivo, así se prueba la validación
    const user = userEvent.setup({ applyAccept: false })
    renderCard()
    await emptyState()

    await user.upload(
      photoInput(),
      new File(['x'], 'foto.gif', { type: 'image/gif' }),
    )

    expect(await screen.findByText(PHOTO_FORMAT_MESSAGE)).toBeInTheDocument()
    await user.click(submit())
    expect(uploadProgressPhoto).not.toHaveBeenCalled()
  })

  it('rechaza una foto de más de 5 MB antes de subirla', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderCard()
    await emptyState()

    await user.upload(
      photoInput(),
      new File([new Uint8Array(5 * MB + 1)], 'grande.jpg', {
        type: 'image/jpeg',
      }),
    )

    expect(await screen.findByText(PHOTO_TOO_LARGE_MESSAGE)).toBeInTheDocument()
    expect(uploadProgressPhoto).not.toHaveBeenCalled()
  })

  it('sube la foto con el tipo y la fecha elegidos y avisa', async () => {
    vi.mocked(uploadProgressPhoto).mockResolvedValue(
      progressPhoto({ type: 'SIDE', takenOn: TODAY }),
    )
    const user = userEvent.setup()
    renderCard()
    await emptyState()

    await user.click(screen.getByRole('radio', { name: 'Lateral' }))
    await user.upload(photoInput(), jpg())
    await user.click(submit())

    expect(await screen.findByRole('status', {})).toHaveTextContent(
      'Subiste la foto Lateral del 6 de noviembre de 2026.',
    )
    expect(uploadProgressPhoto).toHaveBeenCalledWith(
      ATHLETE_ID,
      expect.objectContaining({ type: 'SIDE', takenOn: TODAY }),
    )
  })

  it('muestra el error del backend (413) en el formulario', async () => {
    vi.mocked(uploadProgressPhoto).mockRejectedValue(
      new ApiError('La foto supera el tamaño máximo permitido de 5 MB', 413),
    )
    const user = userEvent.setup()
    renderCard()
    await emptyState()

    await user.upload(photoInput(), jpg())
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La foto supera el tamaño máximo permitido de 5 MB',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('si Supabase no está disponible, el aviso dice qué hacer', async () => {
    vi.mocked(uploadProgressPhoto).mockRejectedValue(
      new ApiError('El servicio de almacenamiento no está disponible', 503),
    )
    const user = userEvent.setup()
    renderCard()
    await emptyState()

    await user.upload(photoInput(), jpg())
    await user.click(submit())

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos guardar la foto. Intentá nuevamente más tarde.',
    )
  })
})

describe('ProgressPhotosCard · visor y borrado', () => {
  it('abre la foto en grande, navega entre las fotos y la borra con confirmación', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(
      progressPhotosPage([front, side]),
    )
    vi.mocked(deleteProgressPhoto).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderCard()

    await user.click(
      await thumbnail('Ver la foto Frontal del 1 de octubre de 2026'),
    )
    const viewer = await screen.findByRole('dialog', {
      name: 'Frontal, 1 de octubre de 2026',
    })
    expect(within(viewer).getByText('Foto 1 de 2')).toBeInTheDocument()
    expect(
      within(viewer).getByRole('button', { name: 'Anterior' }),
    ).toBeDisabled()

    await user.click(within(viewer).getByRole('button', { name: 'Siguiente' }))
    expect(within(viewer).getByText('Foto 2 de 2')).toBeInTheDocument()

    await user.click(
      within(viewer).getByRole('button', { name: 'Borrar foto' }),
    )
    const confirm = await screen.findByRole('dialog', {
      name: '¿Borrar esta foto?',
    })
    await user.click(
      within(confirm).getByRole('button', { name: 'Borrar foto' }),
    )

    expect(deleteProgressPhoto).toHaveBeenCalledWith(ATHLETE_ID, side.id)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Borraste la foto Lateral del 15 de octubre de 2026.',
    )
    // sale de la lista sin volver a pedirla
    expect((await photoList()).querySelectorAll('li')).toHaveLength(1)
    expect(getProgressPhotos).toHaveBeenCalledTimes(1)
  })

  it('si se cancela la confirmación, no borra nada', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(progressPhotosPage([front]))
    const user = userEvent.setup()
    renderCard()

    await user.click(
      await thumbnail('Ver la foto Frontal del 1 de octubre de 2026'),
    )
    const viewer = await screen.findByRole('dialog', {
      name: 'Frontal, 1 de octubre de 2026',
    })
    await user.click(
      within(viewer).getByRole('button', { name: 'Borrar foto' }),
    )
    const confirm = await screen.findByRole('dialog', {
      name: '¿Borrar esta foto?',
    })
    await user.click(within(confirm).getByRole('button', { name: 'Cancelar' }))

    expect(deleteProgressPhoto).not.toHaveBeenCalled()
  })
})

describe('ProgressPhotosCard · solo lectura (US-30)', () => {
  beforeEach(() => {
    saveSession(session('COACH'))
  })

  it('muestra la galería sin el formulario de subida', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(
      progressPhotosPage([front, side]),
    )
    renderCard({ readOnly: true })

    expect((await photoList()).querySelectorAll('li')).toHaveLength(2)
    expect(
      screen.queryByRole('heading', { name: 'Subir una foto' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Subir foto' }),
    ).not.toBeInTheDocument()
    expect(getProgressPhotos).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: 20,
    })
  })

  it('el visor permite navegar entre las fotos pero no borrarlas', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(
      progressPhotosPage([front, side]),
    )
    const user = userEvent.setup()
    renderCard({ readOnly: true })

    await user.click(
      await thumbnail('Ver la foto Frontal del 1 de octubre de 2026'),
    )
    const viewer = await screen.findByRole('dialog', {
      name: 'Frontal, 1 de octubre de 2026',
    })
    await user.click(within(viewer).getByRole('button', { name: 'Siguiente' }))

    expect(within(viewer).getByText('Foto 2 de 2')).toBeInTheDocument()
    expect(
      within(viewer).queryByRole('button', { name: 'Borrar foto' }),
    ).not.toBeInTheDocument()
  })

  it('sin fotos muestra el estado vacío sin ofrecer subir', async () => {
    renderCard({ readOnly: true })

    expect(
      await screen.findByRole('heading', {
        name: 'El atleta todavía no subió fotos de progreso',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Subir mi primera foto' }),
    ).not.toBeInTheDocument()
  })

  it('si el almacenamiento no responde, el aviso habla de las fotos del atleta', async () => {
    vi.mocked(getProgressPhotos).mockRejectedValue(
      new ApiError('El servicio de almacenamiento no está disponible', 503),
    )
    renderCard({ readOnly: true })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar las fotos del atleta. Intentá nuevamente más tarde.',
    )
  })
})
