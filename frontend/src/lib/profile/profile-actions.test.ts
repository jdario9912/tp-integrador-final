import { beforeEach, describe, expect, it, vi } from 'vitest'
import { del, get, put, putForm } from '../api'
import { changeOwnPassword } from './change-own-password'
import { deleteOwnPhoto } from './delete-own-photo'
import { getOwnProfile } from './get-own-profile'
import { updateOwnProfile } from './update-own-profile'
import { uploadOwnPhoto } from './upload-own-photo'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  put: vi.fn(),
  putForm: vi.fn(),
  del: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(put).mockReset()
  vi.mocked(putForm).mockReset()
  vi.mocked(del).mockReset()
})

describe('acciones del perfil propio (US-48)', () => {
  it('el perfil se pide sobre el usuario del token, sin id en la ruta', async () => {
    vi.mocked(get).mockResolvedValue({ id: 'u1' })

    await getOwnProfile()

    expect(get).toHaveBeenCalledWith('/users/me/profile')
  })

  it('guardar datos manda nombre, apellido, email y teléfono con PUT', async () => {
    vi.mocked(put).mockResolvedValue({ id: 'u1' })
    const input = {
      firstName: 'Leo',
      lastName: 'Gil',
      email: 'leo@example.com',
      phone: null,
    }

    await updateOwnProfile(input)

    expect(put).toHaveBeenCalledWith('/users/me/profile', input)
  })

  it('cambiar la contraseña manda la actual y la nueva con PUT', async () => {
    vi.mocked(put).mockResolvedValue('')
    const input = { currentPassword: 'vieja-123', newPassword: 'nueva-4567' }

    await changeOwnPassword(input)

    expect(put).toHaveBeenCalledWith('/users/me/password', input)
  })

  it('la foto viaja en la parte file de un PUT multipart', async () => {
    vi.mocked(putForm).mockResolvedValue({ id: 'u1' })
    const file = new File(['x'], 'perfil.png', { type: 'image/png' })

    await uploadOwnPhoto(file)

    const [url, form] = vi.mocked(putForm).mock.calls[0]!
    expect(url).toBe('/users/me/photo')
    expect(form).toBeInstanceOf(FormData)
    expect(form.get('file')).toBeInstanceOf(File)
  })

  it('quitar la foto es un DELETE a la misma ruta', async () => {
    vi.mocked(del).mockResolvedValue(undefined)

    await deleteOwnPhoto()

    expect(del).toHaveBeenCalledWith('/users/me/photo')
  })
})
