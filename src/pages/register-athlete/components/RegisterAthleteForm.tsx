import { useNavigate } from 'react-router-dom'
import {
  AthleteForm,
  coachCreateFields,
  emptyAthleteFormValues,
  type AthleteFormValues,
} from '../../../components/athlete-form'
import { paths } from '../../../router/paths'
import { useCreateAthlete } from '../hooks/use-create-athlete'
import { toCreateAthleteInput } from '../to-create-athlete-input'

// al crear el atleta vuelve al dashboard, que muestra el aviso con su nombre
export function RegisterAthleteForm() {
  const createAthlete = useCreateAthlete()
  const navigate = useNavigate()

  const handleSubmit = async (values: AthleteFormValues) => {
    const athlete = await createAthlete.mutateAsync(
      toCreateAthleteInput(values),
    )
    navigate(paths.dashboard, {
      state: { createdAthlete: `${athlete.firstName} ${athlete.lastName}` },
    })
  }

  return (
    <AthleteForm
      idPrefix="register-athlete"
      defaultValues={emptyAthleteFormValues}
      fields={coachCreateFields}
      onSubmit={handleSubmit}
      onCancel={() => navigate(paths.dashboard)}
      submitLabel="Guardar atleta"
    />
  )
}
