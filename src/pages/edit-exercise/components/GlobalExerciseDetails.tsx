import type { Exercise } from '../../../lib/exercises'
import { SectionCard } from '../../../ui/card'
import { DescriptionItem, DescriptionList } from '../../../ui/description-list'
import { Dumbbell } from '../../../ui/icons'

type GlobalExerciseDetailsProps = {
  exercise: Exercise
  muscleGroupName: string
}

// un ejercicio del sistema no se edita: se muestran sus datos en modo lectura
export function GlobalExerciseDetails({
  exercise,
  muscleGroupName,
}: GlobalExerciseDetailsProps) {
  return (
    <SectionCard title="Datos del ejercicio" icon={<Dumbbell />}>
      <DescriptionList>
        <DescriptionItem label="Grupo muscular">
          {muscleGroupName}
        </DescriptionItem>
        <DescriptionItem label="Video">
          {exercise.videoUrl ? (
            <a
              href={exercise.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary-hover break-all underline"
            >
              {exercise.videoUrl}
            </a>
          ) : (
            'Sin video'
          )}
        </DescriptionItem>
        <DescriptionItem label="Descripción" className="sm:col-span-2">
          {exercise.description ?? 'Sin descripción'}
        </DescriptionItem>
      </DescriptionList>
    </SectionCard>
  )
}
