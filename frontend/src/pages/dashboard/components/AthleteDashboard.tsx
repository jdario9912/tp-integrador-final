import { WelcomeMessage } from './WelcomeMessage'

// placeholder: el contenido del panel del atleta es la US-12
export function AthleteDashboard() {
  return (
    <section className="flex flex-col gap-2">
      <WelcomeMessage />
      <h2 className="text-muted-foreground text-sm">Panel del atleta</h2>
    </section>
  )
}
