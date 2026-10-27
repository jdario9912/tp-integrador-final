import { useFirstName } from '../hooks/use-first-name'

export function WelcomeMessage() {
  const firstName = useFirstName()

  return <p>Hola, {firstName}</p>
}
