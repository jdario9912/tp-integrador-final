import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get, patch, post } from '../api'
import { note } from '../../test/note-fixtures'
import { createNote } from './create-note'
import { getNotes } from './get-notes'
import { markNoteRead } from './mark-note-read'

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}))

const ATHLETE_ID = '3f1c2a9e-8b7d-4c1e-9a2b-5d6e7f8a9b0c'

beforeEach(() => {
  vi.mocked(get).mockReset()
  vi.mocked(post).mockReset()
  vi.mocked(patch).mockReset()
})

describe('acciones de notas (US-46)', () => {
  it('getNotes pide GET /athletes/{id}/notes', async () => {
    const notes = [note()]
    vi.mocked(get).mockResolvedValue(notes)

    await expect(getNotes(ATHLETE_ID)).resolves.toBe(notes)
    expect(get).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/notes`)
  })

  it('createNote envía título, contenido y tipo a POST /athletes/{id}/notes', async () => {
    const input = {
      title: 'Técnica',
      content: 'Bajá más lento',
      type: 'PRIVATE' as const,
    }
    const created = note({ ...input })
    vi.mocked(post).mockResolvedValue(created)

    await expect(createNote(ATHLETE_ID, input)).resolves.toBe(created)
    expect(post).toHaveBeenCalledWith(`/athletes/${ATHLETE_ID}/notes`, input)
  })

  it('markNoteRead pide PATCH /athletes/{id}/notes/{noteId}/read sin body', async () => {
    const read = note({ readAt: '2026-11-15T10:00:00Z' })
    vi.mocked(patch).mockResolvedValue(read)

    await expect(markNoteRead(ATHLETE_ID, read.id)).resolves.toBe(read)
    expect(patch).toHaveBeenCalledWith(
      `/athletes/${ATHLETE_ID}/notes/${read.id}/read`,
      undefined,
    )
  })
})
