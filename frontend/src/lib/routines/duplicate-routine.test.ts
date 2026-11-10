import { beforeEach, describe, expect, it, vi } from 'vitest'
import { post } from '../api'
import { routineDetail } from '../../test/routine-fixtures'
import { duplicateRoutine } from './duplicate-routine'

vi.mock('../api', () => ({ post: vi.fn() }))

beforeEach(() => {
  vi.mocked(post).mockReset()
})

describe('duplicateRoutine', () => {
  it('pide POST /routines/{id}/duplicate sin body y devuelve la copia', async () => {
    const copy = routineDetail({
      id: 'copia',
      name: 'Copia de Fase de volumen',
    })
    vi.mocked(post).mockResolvedValue(copy)

    await expect(duplicateRoutine('abc')).resolves.toBe(copy)
    expect(post).toHaveBeenCalledWith('/routines/abc/duplicate', undefined)
  })
})
