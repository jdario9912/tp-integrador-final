import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../lib/auth'
import { session } from '../../../test/auth-fixtures'
import { foodsPage } from '../../../test/food-fixtures'
import { getFoods } from '../actions/get-foods'
import { useFoods } from './use-foods'

vi.mock('../actions/get-foods', () => ({ getFoods: vi.fn() }))

const queryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

const wrapperFor =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

beforeEach(() => {
  vi.mocked(getFoods).mockReset()
})

describe('useFoods', () => {
  it.each(['COACH', 'ATHLETE'] as const)(
    'con sesión de %s pide la página y la guarda bajo la clave del catálogo',
    async (role) => {
      saveSession(session(role))
      const page = foodsPage()
      vi.mocked(getFoods).mockResolvedValue(page)
      const client = queryClient()

      const { result } = renderHook(() => useFoods({ page: 2 }), {
        wrapper: wrapperFor(client),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(getFoods).toHaveBeenCalledWith({ page: 2 })
      expect(client.getQueryData(['foods', 'list', { page: 2 }])).toBe(page)
    },
  )

  it('no pide los alimentos sin sesión', () => {
    const { result } = renderHook(() => useFoods({ page: 1 }), {
      wrapper: wrapperFor(queryClient()),
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(getFoods).not.toHaveBeenCalled()
  })
})
