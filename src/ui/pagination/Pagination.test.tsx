import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from '.'

describe('Pagination', () => {
  it('muestra la página actual, el total y el resumen', () => {
    render(
      <Pagination
        page={2}
        totalPages={3}
        onPageChange={vi.fn()}
        summary="45 atletas"
      />,
    )

    expect(
      screen.getByRole('navigation', { name: 'Paginación' }),
    ).toHaveTextContent('Página 2 de 3 · 45 atletas')
  })

  it('cambia a la página anterior y a la siguiente', async () => {
    const onPageChange = vi.fn()
    const user = userEvent.setup()
    render(<Pagination page={2} totalPages={3} onPageChange={onPageChange} />)

    await user.click(screen.getByRole('button', { name: 'Anterior' }))
    await user.click(screen.getByRole('button', { name: 'Siguiente' }))

    expect(onPageChange.mock.calls).toEqual([[1], [3]])
  })

  it('deshabilita Anterior en la primera página', () => {
    render(<Pagination page={1} totalPages={3} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeEnabled()
  })

  it('deshabilita Siguiente en la última página', () => {
    render(<Pagination page={3} totalPages={3} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('deshabilita los dos botones mientras carga', () => {
    render(
      <Pagination page={2} totalPages={3} onPageChange={vi.fn()} disabled />,
    )

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it.each([0, 1])('no se muestra con %i páginas', (totalPages) => {
    render(
      <Pagination page={1} totalPages={totalPages} onPageChange={vi.fn()} />,
    )

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
