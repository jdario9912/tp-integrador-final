import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { BaseTab, CardTab, TabList, TabPanel, Tabs } from '.'

const days = [
  { value: 'd1', label: 'Día 1' },
  { value: 'd2', label: 'Día 2' },
  { value: 'd3', label: 'Día 3' },
]

type DaysTabsProps = {
  initial?: string
  onValueChange?: (value: string) => void
  disabled?: string
}

// controlado como lo usa una página: el estado vive afuera de <Tabs>
function DaysTabs({
  initial = 'd1',
  onValueChange = () => {},
  disabled,
}: DaysTabsProps) {
  const [value, setValue] = useState(initial)
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        onValueChange(next)
        setValue(next)
      }}
    >
      <TabList aria-label="Días de la rutina">
        {days.map((day) => (
          <CardTab
            key={day.value}
            value={day.value}
            disabled={day.value === disabled}
          >
            {day.label}
          </CardTab>
        ))}
      </TabList>
      {days.map((day) => (
        <TabPanel key={day.value} value={day.value}>
          Ejercicios del {day.label}
        </TabPanel>
      ))}
    </Tabs>
  )
}

const tab = (name: string) => screen.getByRole('tab', { name })

describe('Tabs', () => {
  it('une cada pestaña con su panel y muestra solo el seleccionado', () => {
    render(<DaysTabs initial="d2" />)

    expect(
      screen.getByRole('tablist', { name: 'Días de la rutina' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
    expect(tab('Día 2')).toHaveAttribute('aria-selected', 'true')
    expect(tab('Día 1')).toHaveAttribute('aria-selected', 'false')

    const panel = screen.getByRole('tabpanel')
    expect(panel).toHaveAccessibleName('Día 2')
    expect(panel).toHaveTextContent('Ejercicios del Día 2')
    expect(tab('Día 2')).toHaveAttribute('aria-controls', panel.id)
    // los demás paneles existen (aria-controls válido) pero ocultos y vacíos
    const hidden = screen.getAllByRole('tabpanel', { hidden: true })
    expect(hidden).toHaveLength(3)
    const other = document.getElementById(
      tab('Día 1').getAttribute('aria-controls') ?? '',
    )
    expect(other).not.toBeVisible()
    expect(other).toBeEmptyDOMElement()
  })

  it('solo la pestaña seleccionada entra en el orden de Tab', () => {
    render(<DaysTabs initial="d2" />)

    expect(tab('Día 2')).toHaveAttribute('tabindex', '0')
    expect(tab('Día 1')).toHaveAttribute('tabindex', '-1')
    expect(tab('Día 3')).toHaveAttribute('tabindex', '-1')
  })

  it('al hacer clic selecciona la pestaña y muestra su panel', async () => {
    const onValueChange = vi.fn()
    render(<DaysTabs onValueChange={onValueChange} />)

    await userEvent.click(tab('Día 3'))

    expect(onValueChange).toHaveBeenCalledWith('d3')
    expect(tab('Día 3')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Ejercicios del Día 3',
    )
  })

  it('con las flechas mueve el foco y selecciona, y da la vuelta en los extremos', async () => {
    const user = userEvent.setup()
    render(<DaysTabs />)

    await user.tab()
    expect(tab('Día 1')).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(tab('Día 2')).toHaveFocus()
    expect(tab('Día 2')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Ejercicios del Día 2',
    )

    await user.keyboard('{ArrowRight}{ArrowRight}')
    expect(tab('Día 1')).toHaveFocus()
    expect(tab('Día 1')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(tab('Día 3')).toHaveFocus()
    expect(tab('Día 3')).toHaveAttribute('aria-selected', 'true')
  })

  it('Inicio y Fin van a la primera y a la última pestaña', async () => {
    const user = userEvent.setup()
    render(<DaysTabs initial="d2" />)

    await user.tab()
    await user.keyboard('{End}')
    expect(tab('Día 3')).toHaveFocus()
    expect(tab('Día 3')).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{Home}')
    expect(tab('Día 1')).toHaveFocus()
    expect(tab('Día 1')).toHaveAttribute('aria-selected', 'true')
  })

  it('las flechas saltean las pestañas deshabilitadas', async () => {
    const user = userEvent.setup()
    render(<DaysTabs disabled="d2" />)

    await user.tab()
    await user.keyboard('{ArrowRight}')

    expect(tab('Día 3')).toHaveFocus()
    expect(tab('Día 3')).toHaveAttribute('aria-selected', 'true')
  })

  it('con Tab sale de la lista hacia el panel', async () => {
    const user = userEvent.setup()
    render(<DaysTabs />)

    await user.tab()
    await user.tab()

    expect(screen.getByRole('tabpanel')).toHaveFocus()
  })

  it('si el onClick de quien la usa cancela el evento, no cambia la selección', async () => {
    const onValueChange = vi.fn()
    render(
      <Tabs value="a" onValueChange={onValueChange}>
        <TabList aria-label="Opciones">
          <BaseTab value="a">A</BaseTab>
          <BaseTab value="b" onClick={(event) => event.preventDefault()}>
            B
          </BaseTab>
        </TabList>
      </Tabs>,
    )

    await userEvent.click(tab('B'))

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it('una pestaña fuera de <Tabs> es un error de programación', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<BaseTab value="a">A</BaseTab>)).toThrow(
      'Las pestañas y sus paneles van dentro de <Tabs>',
    )

    vi.mocked(console.error).mockRestore()
  })
})
