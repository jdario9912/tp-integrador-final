import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { trainingSession } from '../../test/training-session-fixtures'
import { putPerformedSet } from './put-performed-set'
import {
  inProgressSessionKey,
  trainingSessionKey,
} from './training-session-keys'
import type { PerformedSetInput } from './types'
import {
  usePutPerformedSet,
  type SavePerformedSetVariables,
} from './use-put-performed-set'

vi.mock('./put-performed-set', () => ({
  putPerformedSet: vi.fn(),
}))

const ATHLETE_ID = session('ATHLETE').user.id
const USER_ID = session('ATHLETE').user.id
const EXERCISE_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b'
const body: PerformedSetInput = { status: 'DONE', weight: 62.5, reps: 8 }
const variables: SavePerformedSetVariables = {
  routineExerciseId: EXERCISE_ID,
  setNumber: 1,
  body,
}

const setup = (sessionId: string) => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const { result } = renderHook(
    () => usePutPerformedSet(ATHLETE_ID, sessionId),
    { wrapper },
  )
  return { client, result, invalidate }
}

beforeEach(() => {
  vi.mocked(putPerformedSet).mockReset()
  saveSession(session('ATHLETE'))
})

describe('usePutPerformedSet', () => {
  it('reemplaza el detalle y la sesión en progreso con la respuesta, sin invalidar', async () => {
    const current = trainingSession()
    const saved = trainingSession({
      performedSets: [
        {
          id: 'serie-1',
          routineExerciseId: EXERCISE_ID,
          setNumber: 1,
          status: 'DONE',
          weight: 62.5,
          reps: 8,
          rpe: null,
          skipReason: null,
        },
      ],
    })
    vi.mocked(putPerformedSet).mockResolvedValue(saved)
    const { client, result, invalidate } = setup(current.id)
    client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), current)

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).resolves.toBe(saved)
    })

    expect(putPerformedSet).toHaveBeenCalledWith(
      {
        athleteId: ATHLETE_ID,
        sessionId: current.id,
        routineExerciseId: EXERCISE_ID,
        setNumber: 1,
      },
      body,
    )
    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, current.id)),
    ).toBe(saved)
    // con datos previos, TanStack comparte la estructura: se compara por valor, no por referencia
    expect(
      client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID)),
    ).toEqual(saved)
    expect(invalidate).not.toHaveBeenCalled()
  })

  it('no toca la sesión en progreso si es otra sesión', async () => {
    const saved = trainingSession()
    vi.mocked(putPerformedSet).mockResolvedValue(saved)
    const other = trainingSession({ id: 'otra-sesion' })
    const { client, result } = setup(saved.id)
    client.setQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID), other)

    await act(async () => {
      await result.current.mutateAsync(variables)
    })

    expect(client.getQueryData(inProgressSessionKey(USER_ID, ATHLETE_ID))).toBe(
      other,
    )
  })

  it('reintentar con el mismo cuerpo y la misma URL no cambia lo que se envía', async () => {
    const saved = trainingSession()
    vi.mocked(putPerformedSet)
      .mockRejectedValueOnce(
        new ApiError('No se pudo conectar con el servidor', 0),
      )
      .mockResolvedValueOnce(saved)
    const { result } = setup(saved.id)

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toThrow()
    })
    await act(async () => {
      await result.current.mutateAsync(variables)
    })

    expect(putPerformedSet).toHaveBeenCalledTimes(2)
    const [first, second] = vi.mocked(putPerformedSet).mock.calls
    expect(second).toEqual(first)
  })

  it('ante un 409 vuelve a pedir el detalle y la sesión en progreso y propaga el error', async () => {
    const error = new ApiError(
      'Ya no podés cargar ni corregir series: el entrenamiento no está en curso',
      409,
    )
    vi.mocked(putPerformedSet).mockRejectedValue(error)
    const { client, result, invalidate } = setup('sesion-1')

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toBe(error)
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: trainingSessionKey(USER_ID, ATHLETE_ID, 'sesion-1'),
    })
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: inProgressSessionKey(USER_ID, ATHLETE_ID),
    })
    expect(
      client.getQueryData(trainingSessionKey(USER_ID, ATHLETE_ID, 'sesion-1')),
    ).toBeUndefined()
  })

  it('ante un 422 no invalida nada: el mensaje lo muestra la fila', async () => {
    const error = new ApiError(
      'El ejercicio no es de este día de entrenamiento',
      422,
    )
    vi.mocked(putPerformedSet).mockRejectedValue(error)
    const { result, invalidate } = setup('sesion-1')

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toBe(error)
    })

    expect(invalidate).not.toHaveBeenCalled()
  })
})
