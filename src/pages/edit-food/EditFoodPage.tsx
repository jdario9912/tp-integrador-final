import {
  FoodForm,
  toFoodFormValues,
  toFoodInput,
  type FoodFormValues,
} from '../../components/food-form'
import { PageHeader } from '../../layout'
import { isApiError } from '../../lib/api'
import { useNavigate, useParams } from '../../lib/navigation'
import { paths } from '../../router/paths'
import { OutlineButton } from '../../ui/button'
import { Callout } from '../../ui/callout'
import { EmptyState } from '../../ui/empty-state'
import { ArrowLeft, RotateCw, SearchX } from '../../ui/icons'
import { Skeleton } from '../../ui/skeleton'
import { TextLink } from '../../ui/text-link'
import { useFood } from './hooks/use-food'
import { useUpdateFood } from './hooks/use-update-food'

// 404: el alimento no existe, no hay nada que reintentar
const isNotFound = (error: Error) => isApiError(error) && error.status === 404

export function EditFoodPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: food, error, refetch } = useFood(id)
  const updateFood = useUpdateFood(id)

  const backLink = (
    <TextLink
      to={paths.foods}
      className="text-muted-foreground hover:text-primary self-start"
    >
      <ArrowLeft aria-hidden="true" /> Volver a alimentos
    </TextLink>
  )

  if (error) {
    return (
      <div className="flex max-w-265 flex-col gap-6">
        {backLink}
        {isNotFound(error) ? (
          <EmptyState
            icon={<SearchX />}
            title="No encontramos este alimento"
            description={error.message}
          />
        ) : (
          <div className="flex flex-col items-start gap-3">
            <Callout tone="danger" className="self-stretch">
              {isApiError(error)
                ? error.message
                : 'Ocurrió un error inesperado. Intentá nuevamente.'}
            </Callout>
            <OutlineButton size="sm" onClick={() => void refetch()}>
              <RotateCw aria-hidden="true" /> Reintentar
            </OutlineButton>
          </div>
        )}
      </div>
    )
  }

  if (!food) {
    return (
      <div
        role="status"
        aria-label="Cargando alimento"
        className="flex max-w-265 flex-col gap-6"
      >
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-96" />
      </div>
    )
  }

  // vuelve al catálogo con el aviso; el nombre es el guardado, por si se editó
  const handleSave = async (values: FoodFormValues) => {
    const saved = await updateFood.mutateAsync(toFoodInput(values))
    navigate(paths.foods, {
      state: { notice: `Guardaste los cambios de ${saved.name}.` },
    })
  }

  return (
    <div className="flex max-w-265 flex-col gap-6">
      {backLink}
      <PageHeader
        title={`Editar ${food.name}`}
        description="Actualizá los valores del alimento: el cambio se ve en todo el catálogo."
      />
      <FoodForm
        // al cambiar de alimento el formulario se vuelve a montar con sus datos
        key={food.id}
        idPrefix="edit-food"
        defaultValues={toFoodFormValues(food)}
        onSubmit={handleSave}
        onCancel={() => navigate(paths.foods)}
        submitLabel="Guardar cambios"
      />
    </div>
  )
}
