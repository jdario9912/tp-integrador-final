import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FileInput } from '.'

describe('FileInput', () => {
  it('entrega el archivo elegido', async () => {
    const onChange = vi.fn()
    render(<FileInput onChange={onChange}>Subir foto</FileInput>)
    const input = screen.getByLabelText('Subir foto')
    expect(input).toHaveAttribute('accept', 'image/*')
    const file = new File(['x'], 'frente.png', { type: 'image/png' })
    await userEvent.upload(input, file)
    expect(onChange).toHaveBeenCalledOnce()
    expect((input as HTMLInputElement).files?.[0]).toBe(file)
  })
})
