import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api'
import { saveSession } from '../auth'
import { session } from '../../test/auth-fixtures'
import { note } from '../../test/note-fixtures'
import { createNote } from './create-note'
import { getNotes } from './get-notes'
import { markNoteRead } from './mark-note-read'
import { useCreateNote } from './use-create-note'
import { useMarkNoteRead } from './use-mark-note-read'
import { notesKey, useNotes } from './use-notes'

vi.mock('./get-notes', () => ({ getNotes: vi.fn() }))
vi.mock('./create-note', () => ({ createNote: vi.fn() }))
vi.mock('./mark-note-read', () => ({ markNoteRead: vi.fn() }))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

const setup = <T,>(useHook: () => T) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, invalidate, ...renderHook(useHook, { wrapper }) }
}

beforeEach(() => {
  vi.mocked(getNotes).mockReset()
  vi.mocked(createNote).mockReset()
  vi.mocked(markNoteRead).mockReset()
})

describe('useNotes (US-46)', () => {
  it('pide las notas y las guarda bajo la clave del usuario y el atleta', async () => {
    const coach = session('COACH')
    saveSession(coach)
    const notes = [note()]
    vi.mocked(getNotes).mockResolvedValue(notes)

    const { client, result } = setup(() => useNotes(ATHLETE_ID))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getNotes).toHaveBeenCalledWith(ATHLETE_ID)
    expect(client.getQueryData(notesKey(coach.user.id, ATHLETE_ID))).toBe(notes)
  })

  it('no pide nada sin sesión', () => {
    const { result } = setup(() => useNotes(ATHLETE_ID))

    expect(result.current.fetchStatus).toBe('idle')
    expect(getNotes).not.toHaveBeenCalled()
  })
})

describe('useCreateNote (US-46)', () => {
  it('crea la nota y refresca la lista del atleta', async () => {
    const coach = session('COACH')
    saveSession(coach)
    vi.mocked(createNote).mockResolvedValue(note())
    const input = { title: 'T', content: 'C', type: 'PRIVATE' as const }

    const { invalidate, result } = setup(() => useCreateNote(ATHLETE_ID))
    await act(() => result.current.mutateAsync(input))

    expect(createNote).toHaveBeenCalledWith(ATHLETE_ID, input)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: notesKey(coach.user.id, ATHLETE_ID),
    })
  })

  it('si falla no refresca la lista', async () => {
    saveSession(session('COACH'))
    vi.mocked(createNote).mockRejectedValue(new ApiError('Atleta ajeno', 403))

    const { invalidate, result } = setup(() => useCreateNote(ATHLETE_ID))
    await act(() =>
      result.current
        .mutateAsync({ title: 'T', content: 'C', type: 'PRIVATE' })
        .catch(() => undefined),
    )

    expect(invalidate).not.toHaveBeenCalled()
  })
})

describe('useMarkNoteRead (US-46)', () => {
  it('marca la nota y refresca la lista', async () => {
    const athlete = session('ATHLETE')
    saveSession(athlete)
    vi.mocked(markNoteRead).mockResolvedValue(
      note({ readAt: '2026-11-15T10:00:00Z' }),
    )

    const { invalidate, result } = setup(() => useMarkNoteRead(athlete.user.id))
    await act(() => result.current.mutateAsync('nota-1'))

    expect(markNoteRead).toHaveBeenCalledWith(athlete.user.id, 'nota-1')
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: notesKey(athlete.user.id, athlete.user.id),
    })
  })

  it('con un 404 también refresca: la nota ya no está entre las visibles', async () => {
    const athlete = session('ATHLETE')
    saveSession(athlete)
    vi.mocked(markNoteRead).mockRejectedValue(
      new ApiError('La nota no existe', 404),
    )

    const { invalidate, result } = setup(() => useMarkNoteRead(athlete.user.id))
    await act(() => result.current.mutateAsync('nota-1').catch(() => undefined))

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: notesKey(athlete.user.id, athlete.user.id),
    })
  })
})
