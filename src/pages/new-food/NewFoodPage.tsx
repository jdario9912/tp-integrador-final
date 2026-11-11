import {
  FoodForm,
  toFoodInput,
  type FoodFormValues,
} from '../../components/food-form'
import { PageHeader } from '../../layout'
import { useNavigate } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { ArrowLeft } from '../../ui/icons'
import { TextLink } from '../../ui/text-link'
import { useCreateFood } from './hooks/use-create-food'

export function NewFoodPage() {
  const navigate = useNavigate()
  const createFood = useCreateFood()

  // vuelve al catálogo con el aviso; el nombre es el guardado
  const handleSubmit = async (values: FoodFormValues) => {
    const food = await createFood.mutateAsync(toFoodInput(values))
    navigate(paths.foods, {
      state: { notice: `Creaste el alimento ${food.name}.` },
    })
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      <TextLink
        to={paths.foods}
        className="text-muted-foreground hover:text-primary self-start"
      >
        <ArrowLeft aria-hidden="true" /> Volver a alimentos
      </TextLink>
      <PageHeader
        title="Nuevo alimento"
        description="Sumá un alimento al catálogo con sus valores nutricionales por porción."
      />
      <FoodForm
        idPrefix="new-food"
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.foods)}
        submitLabel="Crear alimento"
      />
    </div>
  )
}
