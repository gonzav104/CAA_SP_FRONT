import { useState } from 'react'
import { Home, LogOut, Menu, Plus, Settings, Users, X } from 'lucide-react'
import logotipo from '../brand/caa-sp-logotipo.svg'
import isotipo from '../brand/caa-sp-isotipo.svg'
import { espacios, pacientesACargo, pacientesCompartidos, plural, rolTexto, saludo, usuario } from '../data'
import { GoogleSlot } from '../GoogleSlot'
import { authLinks, authScreens, href, type AuthScreen, type Screen } from '../shared'

/**
 * A · Clinical, minimal. White ground, hairline rules, dense rows. The brand grid appears once per
 * screen at small scale; everything else is type and alignment.
 */
export function PrototypeA({ screen }: { screen: Screen }) {
  return screen === 'inicio' ? <Inicio /> : <Auth screen={screen} />
}

function Auth({ screen }: { screen: AuthScreen }) {
  const copy = authScreens[screen]
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main className="flex flex-col px-6 py-8 sm:px-12 lg:px-20">
        <img src={logotipo} alt="CAA_SP" className="h-8 w-auto self-start" />
        <div className="my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] text-caa-tinta">{copy.title}</h1>
          <p className="mt-2 text-[0.9375rem] text-caa-gris">{copy.description}</p>
          <form
            className="mt-8 flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault()
              window.location.hash = href('a', screen === 'recuperar' ? 'login' : 'inicio')
            }}
          >
            {copy.fields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label htmlFor={`a-${field.id}`} className="text-sm font-medium text-caa-tinta">
                  {field.label}
                </label>
                <input
                  id={`a-${field.id}`}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  className="h-10 rounded-md border border-[#C9D2E3] bg-white px-3 text-[0.9375rem] text-caa-tinta outline-none transition-colors hover:border-caa-gris focus-visible:border-caa-azul focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-caa-azul/30"
                />
                {field.hint && <p className="text-[0.8125rem] text-caa-gris">{field.hint}</p>}
              </div>
            ))}
            <button
              type="submit"
              className="mt-1 h-10 rounded-md bg-caa-azul text-[0.9375rem] font-semibold text-white transition-colors hover:bg-caa-azul-hover"
            >
              {copy.submit}
            </button>
          </form>
          {copy.google && (
            <>
              <div className="my-6 flex items-center gap-3 text-xs text-caa-gris">
                <span className="h-px flex-1 bg-caa-borde" />o<span className="h-px flex-1 bg-caa-borde" />
              </div>
              <GoogleSlot className="h-10" />
            </>
          )}
          <ul className="mt-8 flex flex-col gap-2 text-sm text-caa-gris">
            {authLinks(screen).map((link) => (
              <li key={link.to}>
                {link.text && `${link.text} `}
                <a href={href('a', link.to)} className="font-medium text-caa-cian-texto underline-offset-4 hover:underline">
                  {link.action}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <aside className="hidden flex-col justify-between border-l border-caa-borde bg-caa-niebla p-16 lg:flex">
        <img src={isotipo} alt="" className="size-14" />
        <div className="max-w-md">
          <p className="font-display text-[1.375rem] font-semibold leading-snug tracking-[-0.01em] text-caa-tinta">
            Comunicación Aumentativa y Alternativa con pictogramas y voz.
          </p>
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-caa-gris">
            El equipo terapéutico y la familia preparan las cartillas; la persona se comunica en Modo Uso.
          </p>
        </div>
      </aside>
    </div>
  )
}

const nav = [
  { label: 'Inicio', icon: Home, active: true },
  { label: 'Pacientes', icon: Users, active: false },
]

function NavList() {
  return (
    <ul className="flex flex-col gap-0.5">
      {nav.map(({ label, icon: Icon, active }) => (
        <li key={label}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            aria-current={active ? 'page' : undefined}
            className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm text-caa-gris hover:bg-caa-niebla hover:text-caa-tinta aria-[current=page]:bg-caa-niebla aria-[current=page]:font-semibold aria-[current=page]:text-caa-tinta"
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </a>
        </li>
      ))}
      <li>
        <span className="flex h-9 items-center gap-2.5 px-2.5 text-sm text-caa-gris/70">
          <Settings aria-hidden="true" className="size-4" />
          Configuración
          <span className="ml-auto text-[0.6875rem]">Próximamente</span>
        </span>
      </li>
    </ul>
  )
}

function Account() {
  return (
    <div className="flex flex-col gap-3 border-t border-caa-borde pt-4">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-caa-tinta">{`${usuario.nombre} ${usuario.apellido}`}</p>
        <p className="truncate text-xs text-caa-gris">{usuario.email}</p>
      </div>
      <a
        href={href('a', 'login')}
        className="flex h-8 items-center gap-2 self-start rounded-md px-2 text-sm text-caa-gris hover:bg-caa-niebla hover:text-caa-tinta"
      >
        <LogOut aria-hidden="true" className="size-4" />
        Cerrar sesión
      </a>
    </div>
  )
}

function Inicio() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden h-dvh flex-col gap-8 border-r border-caa-borde px-4 py-6 lg:sticky lg:top-0 lg:flex">
        <img src={logotipo} alt="CAA_SP" className="h-7 w-auto self-start px-2.5" />
        <nav aria-label="Principal" className="flex-1">
          <NavList />
        </nav>
        <Account />
      </aside>

      <header className="flex h-14 items-center justify-between border-b border-caa-borde px-4 lg:hidden">
        <img src={logotipo} alt="CAA_SP" className="h-6 w-auto" />
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-md text-caa-tinta hover:bg-caa-niebla"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {menuOpen && (
        <div className="flex flex-col gap-6 border-b border-caa-borde px-4 py-4 lg:hidden">
          <nav aria-label="Principal">
            <NavList />
          </nav>
          <Account />
        </div>
      )}

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.02em] text-caa-tinta">
          {`${saludo()}, ${usuario.nombre}`}
        </h1>
        <p className="mt-1 text-[0.9375rem] text-caa-gris">
          {`${plural(pacientesACargo, 'paciente', 'pacientes')} a tu cargo · ${plural(pacientesCompartidos, 'paciente compartido', 'pacientes compartidos')} con vos`}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-caa-azul px-3.5 text-sm font-semibold text-white hover:bg-caa-azul-hover"
          >
            <Plus aria-hidden="true" className="size-4" />
            Nuevo paciente
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            className="inline-flex h-9 items-center rounded-md border border-[#C9D2E3] px-3.5 text-sm font-medium text-caa-tinta hover:bg-caa-niebla"
          >
            Gestionar pacientes
          </a>
        </div>

        <section aria-labelledby="a-espacios" className="mt-12">
          <h2 id="a-espacios" className="text-sm font-semibold text-caa-tinta">
            Tus espacios
          </h2>
          <table className="mt-3 w-full text-left text-sm">
            <thead className="border-b border-caa-borde text-xs text-caa-gris">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Espacio</th>
                <th scope="col" className="hidden py-2 pr-4 font-medium sm:table-cell">Tu rol</th>
                <th scope="col" className="py-2 text-right font-medium">Pacientes</th>
              </tr>
            </thead>
            <tbody>
              {espacios.map((espacio) => (
                <tr key={espacio.id} className="border-b border-caa-borde hover:bg-caa-niebla/60">
                  <td className="py-3 pr-4">
                    <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-caa-tinta hover:underline">
                      {espacio.nombre}
                    </a>
                    <p className="text-xs text-caa-gris sm:hidden">{rolTexto(espacio)}</p>
                  </td>
                  <td className="hidden py-3 pr-4 text-caa-gris sm:table-cell">{rolTexto(espacio)}</td>
                  <td className="py-3 text-right tabular-nums text-caa-tinta">{espacio.pacientes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-labelledby="a-compartidos" className="mt-10">
          <h2 id="a-compartidos" className="text-sm font-semibold text-caa-tinta">
            Pacientes compartidos
          </h2>
          <p className="mt-2 text-sm text-caa-gris">
            {`${plural(pacientesCompartidos, 'paciente compartido', 'pacientes compartidos')} con vos como familiar. `}
            <a href="#" onClick={(e) => e.preventDefault()} className="font-medium text-caa-cian-texto hover:underline">
              Ver pacientes
            </a>
          </p>
        </section>
      </main>
    </div>
  )
}
