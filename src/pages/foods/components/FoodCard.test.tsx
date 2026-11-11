import { render as baseRender, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from '../../../lib/navigation'
import { createdFood } from '../../../test/food-fixtures'
import { FoodCard } from './FoodCard'

// la card tiene un link: necesita un router
const render = (ui: ReactNode) => baseRender(<MemoryRouter>{ui}</MemoryRouter>)

const card = () => screen.getByRole('region', { name: 'Manzana' })

describe('FoodCard', () => {
  it('muestra el nombre, la porción y los macros formateados', () => {
    render(
      <FoodCard
        food={createdFood({ referencePortionG: 150.5, fatG: 0.25 })}
        canEdit={false}
      />,
    )

    expect(
      within(card()).getByRole('heading', { name: 'Manzana' }),
    ).toBeInTheDocument()
    expect(card()).toHaveTextContent('Porción: 150,5 g')
    expect(card()).toHaveTextContent('Calorías52 kcal')
    expect(card()).toHaveTextContent('Proteínas0,3 g')
    expect(card()).toHaveTextContent('Carbohidratos14 g')
    expect(card()).toHaveTextContent('Grasas0,25 g')
  })

  it('el entrenador ve el link a la edición', () => {
    render(<FoodCard food={createdFood({ id: 'abc' })} canEdit />)

    expect(
      within(card()).getByRole('link', { name: 'Editar Manzana' }),
    ).toHaveAttribute('href', '/foods/abc/edit')
  })

  it('sin permiso de edición no hay link', () => {
    render(<FoodCard food={createdFood()} canEdit={false} />)

    expect(within(card()).queryByRole('link')).not.toBeInTheDocument()
  })
})
