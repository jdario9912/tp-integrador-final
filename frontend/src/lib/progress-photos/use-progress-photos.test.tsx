import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import {
  progressPhoto,
  progressPhotosPage,
} from '../../test/progress-photo-fixtures'
import { deleteProgressPhoto } from './delete-progress-photo'
import { progressPhotoListKey } from './keys'
import { getProgressPhotos } from './get-progress-photos'
import { useDeleteProgressPhoto } from './use-delete-progress-photo'
import { useProgressPhotos } from './use-progress-photos'
import type { ProgressPhoto } from './types'

vi.mock('./get-progress-photos', () => ({
  getProgressPhotos: vi.fn(),
  getProgressPhoto: vi.fn(),
}))
vi.mock('./delete-progress-photo', () => ({ deleteProgressPhoto: vi.fn() }))

const ATHLETE_ID = session('ATHLETE').user.id
const USER_ID = session('ATHLETE').user.id
const PAGE_SIZE = 20

const first = progressPhoto({
  id: '00000000-0000-4000-8000-000000000001',
  takenOn: '2026-10-01',
})
const second = progressPhoto({
  id: '00000000-0000-4000-8000-000000000002',
  takenOn: '2026-10-15',
})
const third = progressPhoto({
  id: '00000000-0000-4000-8000-000000000003',
  takenOn: '2026-11-01',
})

const newClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

const wrapperWith =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getProgressPhotos).mockReset()
  vi.mocked(deleteProgressPhoto).mockReset()
  saveSession(session('ATHLETE'))
})

describe('useProgressPhotos', () => {
  it('carga la primera página y pide la siguiente con "Cargar más"', async () => {
    vi.mocked(getProgressPhotos).mockImplementation(async (_id, query = {}) =>
      query.page === 1
        ? progressPhotosPage([third], {
            page: 1,
            totalPages: 2,
            totalElements: 3,
          })
        : progressPhotosPage([first, second], {
            totalPages: 2,
            totalElements: 3,
          }),
    )

    const { result } = renderHook(() => useProgressPhotos(ATHLETE_ID), {
      wrapper: wrapperWith(newClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(true)
    expect(getProgressPhotos).toHaveBeenCalledWith(ATHLETE_ID, {
      page: 0,
      size: PAGE_SIZE,
    })

    await act(async () => {
      await result.current.fetchNextPage()
    })
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))

    const ids = result.current.data?.pages
      .flatMap((page) => page.content)
      .map(({ id }) => id)
    expect(ids).toEqual([first.id, second.id, third.id])
    expect(result.current.hasNextPage).toBe(false)
  })

  it('sin fotos no tiene página siguiente', async () => {
    vi.mocked(getProgressPhotos).mockResolvedValue(progressPhotosPage([]))

    const { result } = renderHook(() => useProgressPhotos(ATHLETE_ID), {
      wrapper: wrapperWith(newClient()),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.hasNextPage).toBe(false)
  })
})

describe('useDeleteProgressPhoto', () => {
  const seedList = (client: QueryClient, photos: ProgressPhoto[]) =>
    client.setQueryData(progressPhotoListKey(USER_ID, ATHLETE_ID, PAGE_SIZE), {
      pages: [progressPhotosPage(photos, { totalElements: photos.length + 4 })],
      pageParams: [0],
    })

  const listOf = (client: QueryClient) =>
    client.getQueryData<{
      pages: { content: ProgressPhoto[]; totalElements: number }[]
    }>(progressPhotoListKey(USER_ID, ATHLETE_ID, PAGE_SIZE))

  it('al borrar (204) la foto sale de la lista en caché sin volver a pedirla', async () => {
    vi.mocked(deleteProgressPhoto).mockResolvedValue(undefined)
    const client = newClient()
    seedList(client, [first, second])

    const { result } = renderHook(() => useDeleteProgressPhoto(ATHLETE_ID), {
      wrapper: wrapperWith(client),
    })
    await act(() => result.current.mutateAsync(first.id))

    expect(deleteProgressPhoto).toHaveBeenCalledWith(ATHLETE_ID, first.id)
    expect(listOf(client)?.pages[0]?.content.map(({ id }) => id)).toEqual([
      second.id,
    ])
    // el total baja con la foto que se quitó
    expect(listOf(client)?.pages[0]?.totalElements).toBe(5)
    expect(getProgressPhotos).not.toHaveBeenCalled()
  })

  it('si ya no existe (404) también la quita de la lista', async () => {
    vi.mocked(deleteProgressPhoto).mockRejectedValue(
      new ApiError('No existe la foto de progreso', 404),
    )
    const client = newClient()
    seedList(client, [first, second])

    const { result } = renderHook(() => useDeleteProgressPhoto(ATHLETE_ID), {
      wrapper: wrapperWith(client),
    })
    await act(() => result.current.mutateAsync(first.id).catch(() => {}))

    expect(listOf(client)?.pages[0]?.content.map(({ id }) => id)).toEqual([
      second.id,
    ])
  })

  it('si el borrado falla por otra causa, la foto se queda en la lista', async () => {
    vi.mocked(deleteProgressPhoto).mockRejectedValue(
      new ApiError('El servicio de almacenamiento no está disponible', 503),
    )
    const client = newClient()
    seedList(client, [first, second])

    const { result } = renderHook(() => useDeleteProgressPhoto(ATHLETE_ID), {
      wrapper: wrapperWith(client),
    })
    await act(() => result.current.mutateAsync(first.id).catch(() => {}))

    expect(listOf(client)?.pages[0]?.content).toHaveLength(2)
  })
})
