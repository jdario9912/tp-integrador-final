import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../lib/api'
import { saveSession } from '../../../lib/auth'
import { deleteOwnPhoto } from '../../../lib/profile/delete-own-photo'
import { uploadOwnPhoto } from '../../../lib/profile/upload-own-photo'
import { PROGRESS_PHOTO_MAX_BYTES } from '../../../lib/progress-photos'
import { session } from '../../../test/auth-fixtures'
import {
  FUTURE_PHOTO_EXPIRY,
  ownProfile,
} from '../../../test/own-profile-fixtures'
import { ProfilePhotoSection } from './ProfilePhotoSection'

vi.mock('../../../lib/profile/upload-own-photo', () => ({
  uploadOwnPhoto: vi.fn(),
}))
vi.mock('../../../lib/profile/delete-own-photo', () => ({
  deleteOwnPhoto: vi.fn(),
}))

const PHOTO_URL = 'https://storage.example.test/actual.png?token=1'
const PREVIEW_URL = 'blob:vista-previa'

const withPhoto = () =>
  ownProfile({ photoUrl: PHOTO_URL, photoUrlExpiresAt: FUTURE_PHOTO_EXPIRY })

const renderSection = (profile = ownProfile()) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { mutations: { retry: false } } })
      }
    >
      <ProfilePhotoSection profile={profile} />
    </QueryClientProvider>,
  )

const fileInput = () => screen.getByLabelText(/Nueva foto/)

const png = (size = 1024) =>
  new File([new Uint8Array(size)], 'perfil.png', { type: 'image/png' })

beforeEach(() => {
  vi.mocked(uploadOwnPhoto).mockReset()
  vi.mocked(deleteOwnPhoto).mockReset()
  // jsdom no implementa las URLs de vista previa
  URL.createObjectURL = vi.fn(() => PREVIEW_URL)
  URL.revokeObjectURL = vi.fn()
  saveSession(session('ATHLETE'))
})

describe('ProfilePhotoSection · validación local (US-48)', () => {
  it('rechaza un formato que no es JPG, PNG ni WebP sin llamar a la API', async () => {
    // sin applyAccept: el selector no filtra el archivo, así se prueba la validación
    const user = userEvent.setup({ applyAccept: false })
    renderSection()

    await user.upload(
      fileInput(),
      new File(['x'], 'animada.gif', { type: 'image/gif' }),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(
      await screen.findByText(
        'Formato no permitido. Subí una foto en JPG, PNG o WebP',
      ),
    ).toBeInTheDocument()
    expect(uploadOwnPhoto).not.toHaveBeenCalled()
  })

  it('rechaza una foto de más de 5 MB sin llamar a la API', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderSection()

    await user.upload(fileInput(), png(PROGRESS_PHOTO_MAX_BYTES + 1))
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(
      await screen.findByText('La foto supera el tamaño máximo de 5 MB'),
    ).toBeInTheDocument()
    expect(uploadOwnPhoto).not.toHaveBeenCalled()
  })

  it('sin foto elegida, guardar avisa que hay que elegir una', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(
      await screen.findByText('Elegí una foto para subir'),
    ).toBeInTheDocument()
    expect(uploadOwnPhoto).not.toHaveBeenCalled()
  })
})

describe('ProfilePhotoSection · subir y cambiar (US-48)', () => {
  it('muestra la vista previa de la foto elegida y la guarda al confirmar', async () => {
    vi.mocked(uploadOwnPhoto).mockResolvedValue(withPhoto())
    const user = userEvent.setup()
    renderSection(withPhoto())
    const file = png()

    await user.upload(fileInput(), file)

    expect(await screen.findByRole('img', { name: 'Leo Gil' })).toHaveAttribute(
      'src',
      PREVIEW_URL,
    )
    expect(screen.getByText('Así va a verse')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(uploadOwnPhoto).toHaveBeenCalledWith(file)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Actualizamos tu foto de perfil.',
    )
  })

  it('descartar la foto elegida no sube nada', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.upload(fileInput(), png())
    await user.click(await screen.findByRole('button', { name: 'Descartar' }))

    expect(
      screen.getByText('Sin foto: se ven tus iniciales'),
    ).toBeInTheDocument()
    expect(uploadOwnPhoto).not.toHaveBeenCalled()
  })

  it('un 400 del archivo va al campo de la foto', async () => {
    vi.mocked(uploadOwnPhoto).mockRejectedValue(
      new ApiError('Datos inválidos', 400, {
        fieldErrors: [{ field: 'file', message: 'La imagen está dañada' }],
      }),
    )
    const user = userEvent.setup()
    renderSection()

    await user.upload(fileInput(), png())
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(await screen.findByText('La imagen está dañada')).toBeInTheDocument()
    expect(fileInput()).toHaveAttribute('aria-invalid', 'true')
  })

  it('un 503 muestra el aviso general del formulario', async () => {
    vi.mocked(uploadOwnPhoto).mockRejectedValue(
      new ApiError('El almacenamiento no está disponible', 503),
    )
    const user = userEvent.setup()
    renderSection()

    await user.upload(fileInput(), png())
    await user.click(screen.getByRole('button', { name: 'Guardar foto' }))

    expect(
      await screen.findByText('El almacenamiento no está disponible'),
    ).toBeInTheDocument()
  })
})

describe('ProfilePhotoSection · quitar (US-48)', () => {
  it('sin foto, quitar está deshabilitado y el avatar muestra las iniciales', () => {
    renderSection()

    expect(screen.getByRole('button', { name: 'Quitar foto' })).toBeDisabled()
    expect(
      screen.getByText('Sin foto: se ven tus iniciales'),
    ).toBeInTheDocument()
  })

  it('con foto, muestra la actual y quitarla pide confirmación antes de borrar', async () => {
    vi.mocked(deleteOwnPhoto).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderSection(withPhoto())

    expect(screen.getByRole('img', { name: 'Leo Gil' })).toHaveAttribute(
      'src',
      PHOTO_URL,
    )

    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))
    const dialog = await screen.findByRole('dialog')
    expect(deleteOwnPhoto).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole('button', { name: 'Quitar foto' }),
    )

    expect(deleteOwnPhoto).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Quitamos tu foto de perfil.',
    )
  })

  it('si el borrado falla, avisa y la foto sigue en pantalla', async () => {
    vi.mocked(deleteOwnPhoto).mockRejectedValue(new ApiError('Caído', 503))
    const user = userEvent.setup()
    renderSection(withPhoto())

    await user.click(screen.getByRole('button', { name: 'Quitar foto' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Quitar foto' }),
    )

    expect(
      await screen.findByText(
        'No pudimos quitar la foto. Intentá nuevamente más tarde.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Leo Gil' })).toHaveAttribute(
      'src',
      PHOTO_URL,
    )
  })
})
