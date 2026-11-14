import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { PAST_EXPIRY, progressPhoto } from '../../test/progress-photo-fixtures'
import { getProgressPhoto } from './get-progress-photos'
import { useProgressPhotoUrl } from './use-progress-photo-url'

vi.mock('./get-progress-photos', () => ({
  getProgressPhoto: vi.fn(),
  getProgressPhotos: vi.fn(),
}))

const ATHLETE_ID = '0a6d2b9e-7c51-4c1e-9d3f-2b8e5f6a7c10'
const FRESH_URL = 'https://storage.example.com/fotos/frente-1.jpg?token=nuevo'

beforeEach(() => {
  vi.mocked(getProgressPhoto).mockReset()
})

describe('useProgressPhotoUrl · renovación de la URL', () => {
  it('con una URL vigente muestra la de la foto y no pide nada', () => {
    const photo = progressPhoto()

    const { result } = renderHook(() => useProgressPhotoUrl(ATHLETE_ID, photo))

    expect(result.current.state).toEqual({ status: 'ready', url: photo.url })
    expect(getProgressPhoto).not.toHaveBeenCalled()
  })

  it('si la URL ya venció pide la foto una vez y muestra la URL nueva', async () => {
    vi.mocked(getProgressPhoto).mockResolvedValue(
      progressPhoto({ url: FRESH_URL }),
    )
    const photo = progressPhoto({ urlExpiresAt: PAST_EXPIRY })

    const { result } = renderHook(() => useProgressPhotoUrl(ATHLETE_ID, photo))

    expect(result.current.state).toEqual({ status: 'renewing' })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', url: FRESH_URL }),
    )
    expect(getProgressPhoto).toHaveBeenCalledTimes(1)
    expect(getProgressPhoto).toHaveBeenCalledWith(ATHLETE_ID, photo.id)
  })

  it('si la imagen falla pide la foto una vez y muestra la URL nueva', async () => {
    vi.mocked(getProgressPhoto).mockResolvedValue(
      progressPhoto({ url: FRESH_URL }),
    )
    const photo = progressPhoto()
    const { result } = renderHook(() => useProgressPhotoUrl(ATHLETE_ID, photo))

    act(() => result.current.onImageError())

    expect(result.current.state).toEqual({ status: 'renewing' })
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', url: FRESH_URL }),
    )
    expect(getProgressPhoto).toHaveBeenCalledTimes(1)
  })

  it('si la URL nueva también falla, muestra el error y no vuelve a pedir', async () => {
    vi.mocked(getProgressPhoto).mockResolvedValue(
      progressPhoto({ url: FRESH_URL }),
    )
    const photo = progressPhoto()
    const { result } = renderHook(() => useProgressPhotoUrl(ATHLETE_ID, photo))

    act(() => result.current.onImageError())
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'ready', url: FRESH_URL }),
    )
    act(() => result.current.onImageError())

    expect(result.current.state).toEqual({ status: 'failed' })
    expect(getProgressPhoto).toHaveBeenCalledTimes(1)
  })

  it('si la renovación falla queda en error y no reintenta en bucle', async () => {
    vi.mocked(getProgressPhoto).mockRejectedValue(
      new ApiError('El servicio de almacenamiento no está disponible', 503),
    )
    const photo = progressPhoto({ urlExpiresAt: PAST_EXPIRY })

    const { result, rerender } = renderHook(() =>
      useProgressPhotoUrl(ATHLETE_ID, photo),
    )

    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'failed' }),
    )
    rerender()
    expect(result.current.state).toEqual({ status: 'failed' })
    expect(getProgressPhoto).toHaveBeenCalledTimes(1)
  })
})
