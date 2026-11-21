import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { getSession, saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import {
  FUTURE_PHOTO_EXPIRY,
  PAST_PHOTO_EXPIRY,
  ownProfile,
} from '../../test/own-profile-fixtures'
import { deleteOwnPhoto } from './delete-own-photo'
import { getOwnProfile } from './get-own-profile'
import { ownProfileKey } from './keys'
import { updateOwnProfile } from './update-own-profile'
import { uploadOwnPhoto } from './upload-own-photo'
import { useDeleteOwnPhoto } from './use-delete-own-photo'
import { useOwnProfile } from './use-own-profile'
import { useUpdateOwnProfile } from './use-update-own-profile'
import { useUploadOwnPhoto } from './use-upload-own-photo'

vi.mock('./get-own-profile', () => ({ getOwnProfile: vi.fn() }))
vi.mock('./update-own-profile', () => ({ updateOwnProfile: vi.fn() }))
vi.mock('./upload-own-photo', () => ({ uploadOwnPhoto: vi.fn() }))
vi.mock('./delete-own-photo', () => ({ deleteOwnPhoto: vi.fn() }))

const USER_ID = session('ATHLETE').user.id

const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

const wrapperWith =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

const input = {
  firstName: 'Leonel',
  lastName: 'Gil',
  email: 'nuevo@example.com',
  phone: null,
}

beforeEach(() => {
  vi.mocked(getOwnProfile).mockReset()
  vi.mocked(updateOwnProfile).mockReset()
  vi.mocked(uploadOwnPhoto).mockReset()
  vi.mocked(deleteOwnPhoto).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useOwnProfile (US-48)', () => {
  it('carga el perfil del usuario de la sesión', async () => {
    vi.mocked(getOwnProfile).mockResolvedValue(ownProfile())

    const { result } = renderHook(() => useOwnProfile(), {
      wrapper: wrapperWith(newClient()),
    })

    await waitFor(() => expect(result.current.data).toEqual(ownProfile()))
    expect(getOwnProfile).toHaveBeenCalledTimes(1)
  })

  it('con la URL de la foto vigente no vuelve a pedir el perfil', async () => {
    vi.mocked(getOwnProfile).mockResolvedValue(
      ownProfile({
        photoUrl: 'https://storage.example.test/p.png?token=1',
        photoUrlExpiresAt: FUTURE_PHOTO_EXPIRY,
      }),
    )

    const { result } = renderHook(() => useOwnProfile(), {
      wrapper: wrapperWith(newClient()),
    })

    await waitFor(() => expect(result.current.data).toBeDefined())
    expect(getOwnProfile).toHaveBeenCalledTimes(1)
  })

  it('con la URL ya vencida la renueva una sola vez (sin bucle si la nueva también venció)', async () => {
    vi.mocked(getOwnProfile).mockResolvedValue(
      ownProfile({
        photoUrl: 'https://storage.example.test/p.png?token=viejo',
        photoUrlExpiresAt: PAST_PHOTO_EXPIRY,
      }),
    )

    const { result } = renderHook(() => useOwnProfile(), {
      wrapper: wrapperWith(newClient()),
    })

    await waitFor(() => expect(getOwnProfile).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.data).toBeDefined())
    // la respuesta sigue vencida: no se pide otra vez
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(getOwnProfile).toHaveBeenCalledTimes(2)
  })
})

describe('useUpdateOwnProfile (US-48)', () => {
  it('guardar deja el perfil en caché y la sesión con el nombre y el email nuevos', async () => {
    vi.mocked(updateOwnProfile).mockResolvedValue(
      ownProfile({ firstName: 'Leonel', email: 'nuevo@example.com' }),
    )
    const client = newClient()
    client.setQueryData(ownProfileKey(USER_ID), ownProfile())
    const { result } = renderHook(() => useUpdateOwnProfile(), {
      wrapper: wrapperWith(client),
    })

    await act(async () => {
      await result.current.mutateAsync(input)
    })

    expect(client.getQueryData(ownProfileKey(USER_ID))).toMatchObject({
      firstName: 'Leonel',
    })
    expect(getSession()).toMatchObject({
      accessToken: 'access-1',
      user: { firstName: 'Leonel', email: 'nuevo@example.com' },
    })
  })

  it('un 409 llega al componente con su estado para marcar el email', async () => {
    vi.mocked(updateOwnProfile).mockRejectedValue(
      new ApiError('Ese email ya está en uso', 409),
    )
    const { result } = renderHook(() => useUpdateOwnProfile(), {
      wrapper: wrapperWith(newClient()),
    })

    await expect(result.current.mutateAsync(input)).rejects.toMatchObject({
      status: 409,
    })
    // la sesión no cambia si el servidor no aceptó los datos
    expect(getSession()?.user.email).toBe('leo@example.com')
  })
})

describe('useUploadOwnPhoto y useDeleteOwnPhoto (US-48)', () => {
  it('subir la foto pone en caché el perfil que devuelve el servidor', async () => {
    const withPhoto = ownProfile({
      photoUrl: 'https://storage.example.test/nueva.png?token=1',
      photoUrlExpiresAt: FUTURE_PHOTO_EXPIRY,
    })
    vi.mocked(uploadOwnPhoto).mockResolvedValue(withPhoto)
    const client = newClient()
    client.setQueryData(ownProfileKey(USER_ID), ownProfile())
    const { result } = renderHook(() => useUploadOwnPhoto(), {
      wrapper: wrapperWith(client),
    })
    const file = new File(['x'], 'perfil.png', { type: 'image/png' })

    await act(async () => {
      await result.current.mutateAsync(file)
    })

    expect(client.getQueryData(ownProfileKey(USER_ID))).toEqual(withPhoto)
  })

  it('quitar la foto deja el perfil en caché sin URL', async () => {
    vi.mocked(deleteOwnPhoto).mockResolvedValue(undefined)
    const client = newClient()
    client.setQueryData(
      ownProfileKey(USER_ID),
      ownProfile({
        photoUrl: 'https://storage.example.test/p.png?token=1',
        photoUrlExpiresAt: FUTURE_PHOTO_EXPIRY,
      }),
    )
    const { result } = renderHook(() => useDeleteOwnPhoto(), {
      wrapper: wrapperWith(client),
    })

    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(client.getQueryData(ownProfileKey(USER_ID))).toMatchObject({
      photoUrl: null,
      photoUrlExpiresAt: null,
    })
  })
})
