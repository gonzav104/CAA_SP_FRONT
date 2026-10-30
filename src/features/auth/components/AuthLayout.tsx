import type { ReactNode } from 'react'
import isotipoOscuro from '@/assets/brand/caa-sp-isotipo-fondo-oscuro.svg'
import logotipoOscuro from '@/assets/brand/caa-sp-logotipo-fondo-oscuro.svg'

interface AuthLayoutProps {
  title: string
  description?: string
  children: ReactNode
}

/**
 * Shell shared by the public auth screens (login, registro, contraseña, recuperación Google): a brand
 * panel in tinta beside the form. On mobile the panel collapses into a header with the logo.
 */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="caa-brand grid min-h-dvh grid-rows-[auto_1fr] bg-background lg:grid-rows-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="flex flex-col justify-between bg-caa-tinta px-6 py-5 text-white lg:px-14 lg:py-12">
        <img src={logotipoOscuro} alt="CAA_SP" className="h-7 w-auto self-start lg:h-8" />
        <div className="hidden max-w-md lg:block">
          <img src={isotipoOscuro} alt="" className="mb-10 size-40" />
          <p className="font-display text-4xl leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            Pictogramas y voz para que cada persona diga lo que necesita.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-caa-tinta-suave">
            Cartillas, sesiones y familia en un mismo espacio de trabajo.
          </p>
        </div>
        <p className="hidden text-xs text-caa-tinta-suave lg:block">CAA_SP · Comunicación Aumentativa y Alternativa</p>
      </aside>
      <main className="flex justify-center px-6 py-10 sm:px-12 lg:items-center lg:py-12">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-[2rem] leading-tight font-bold tracking-[-0.03em] text-foreground">{title}</h1>
          {description && <p className="mt-2 text-[0.9375rem] text-muted-foreground">{description}</p>}
          {children}
        </div>
      </main>
    </div>
  )
}

/** Inline link styled like the rest of the auth screens. */
export const authLinkClassName =
  'rounded-sm font-semibold text-caa-azul underline-offset-4 outline-none hover:text-caa-azul-hover hover:underline focus-visible:ring-3 focus-visible:ring-ring/50'
