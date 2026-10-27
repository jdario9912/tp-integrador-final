import type { ReactNode } from 'react'
import { APP_NAME, Brand } from './Brand'

type AuthLayoutProps = {
  title: string
  description?: ReactNode
  children: ReactNode
}

// pantallas sin sesión: panel de marca a la izquierda (solo escritorio) y formulario a la derecha
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="bg-surface grid min-h-screen lg:grid-cols-2">
      <aside className="from-primary-soft-strong via-background to-primary-soft relative hidden overflow-hidden bg-linear-150 px-18 py-20 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center">
        <div
          aria-hidden="true"
          className="bg-primary/20 absolute -top-30 -left-25 size-105 rounded-full blur-3xl"
        />
        <div className="relative flex max-w-115 flex-col gap-6">
          <img src="/favicon.svg" alt="" className="size-12" />
          <p className="text-5xl leading-tight font-extrabold tracking-tight">
            {APP_NAME}
          </p>
          <p className="text-xl leading-relaxed text-pretty">
            Eleva tu entrenamiento. Empodera a tus atletas.
          </p>
          <p className="text-muted-foreground text-lg leading-relaxed text-pretty">
            La plataforma para la gestión profesional del rendimiento basada en
            datos.
          </p>
        </div>
      </aside>

      <main className="flex justify-center px-4 py-10 sm:px-8 lg:items-center lg:px-18 lg:py-16">
        <div className="flex w-full max-w-110 flex-col gap-6">
          <Brand className="lg:hidden" />
          <header className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-muted-foreground text-base">{description}</p>
            )}
          </header>
          {children}
        </div>
      </main>
    </div>
  )
}
