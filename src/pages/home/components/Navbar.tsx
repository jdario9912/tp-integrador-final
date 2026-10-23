import { PrimaryButton } from '../../../ui/button'

export function Navbar() {
  return (
    <header className="border-border border-b">
      <nav className="mx-auto flex max-w-5xl items-center justify-end px-4 py-3">
        {/* TODO: convertir en link al dashboard según el rol (entrenador / atleta) */}
        <PrimaryButton>Dashboard</PrimaryButton>
      </nav>
    </header>
  )
}
