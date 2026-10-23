import { RegisterCoachForm } from './components/RegisterCoachForm'

export function RegisterCoachPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Registro de entrenador</h1>
        <p className="text-muted-foreground text-sm">
          Creá tu cuenta para gestionar a tus atletas.
        </p>
      </header>
      <RegisterCoachForm />
    </main>
  )
}
