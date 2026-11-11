import { useId } from 'react'
import { formatGrams, formatKcal, type Food } from '../../../lib/foods'
import { foodEditPath } from '../../../router/paths'
import { Badge } from '../../../ui/badge'
import { Card } from '../../../ui/card'
import { IconChip } from '../../../ui/icon-chip'
import { Apple, Droplet, Egg, Flame, Pencil, Wheat } from '../../../ui/icons'
import { InfoTile } from '../../../ui/info-tile'
import { TextLink } from '../../../ui/text-link'

type FoodCardProps = {
  food: Food
  // solo el entrenador edita el catálogo
  canEdit: boolean
}

export function FoodCard({ food, canEdit }: FoodCardProps) {
  const titleId = useId()
  const { name, referencePortionG, caloriesKcal, proteinG, carbsG, fatG } = food

  return (
    <Card
      aria-labelledby={titleId}
      padding="sm"
      className="flex h-full flex-col gap-4 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="flex items-start gap-3">
        <IconChip shape="square">
          <Apple />
        </IconChip>
        <div className="flex min-w-0 flex-col gap-2">
          <h3 id={titleId} className="text-lg font-semibold break-words">
            {name}
          </h3>
          {/* los valores de abajo corresponden a esta porción */}
          <Badge tone="primary" variant="outline" shape="pill">
            Porción: {formatGrams(referencePortionG)}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <InfoTile
          label="Calorías"
          value={formatKcal(caloriesKcal)}
          icon={<Flame />}
        />
        <InfoTile
          label="Proteínas"
          value={formatGrams(proteinG)}
          icon={<Egg />}
        />
        <InfoTile
          label="Carbohidratos"
          value={formatGrams(carbsG)}
          icon={<Wheat />}
        />
        <InfoTile label="Grasas" value={formatGrams(fatG)} icon={<Droplet />} />
      </div>
      {canEdit && (
        // mt-auto: en una fila de cards de distinto alto los links quedan alineados abajo
        <div className="mt-auto flex justify-end">
          <TextLink
            to={foodEditPath(food.id)}
            aria-label={`Editar ${name}`}
            className="text-muted-foreground hover:text-primary min-h-6"
          >
            <Pencil aria-hidden="true" /> Editar
          </TextLink>
        </div>
      )}
    </Card>
  )
}
