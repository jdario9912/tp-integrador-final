import { WelcomeMessage } from './WelcomeMessage'

// placeholder: el contenido del panel del entrenador es la US-11
export function CoachDashboard() {
  return (
    <section className="flex flex-col gap-2">
      <WelcomeMessage />
      <h2 className="text-muted-foreground text-sm">Panel del entrenador</h2>
    </section>
  )
}
