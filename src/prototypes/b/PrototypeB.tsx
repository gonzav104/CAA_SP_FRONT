import { useState } from 'react'
import { ArrowRight, ChevronsUpDown, Home, LogOut, Menu, Plus, Settings, Users, X } from 'lucide-react'
import logotipoOscuro from '../brand/caa-sp-logotipo-fondo-oscuro.svg'
import isotipoOscuro from '../brand/caa-sp-isotipo-fondo-oscuro.svg'
import { espacios, pacientesACargo, pacientesCompartidos, plural, rolTexto, saludo, usuario } from '../data'
import { GoogleSlot } from '../GoogleSlot'
import { authLinks, authScreens, href, type AuthScreen, type Screen } from '../shared'

/**
 * B · Modern SaaS. A committed tinta shell (auth panel, sidebar) against a white work area, Manrope
 * headings, a workspace switcher at the top of the navigation and spaces as overview panels.
 */
export function PrototypeB({ screen }: { screen: Screen }) {
  return screen === 'inicio' ? <Inicio /> : <Auth screen={screen} />
}

function Auth({ screen }: { screen: AuthScreen }) {
  const copy = authScreens[screen]
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="relative flex flex-col justify-between overflow-hidden bg-caa-tinta px-6 py-6 text-white lg:px-14 lg:py-12">
        <img src={logotipoOscuro} alt="CAA_SP" className="h-7 w-auto self-start lg:h-8" />
        <div className="hidden max-w-md lg:block">
          <img src={isotipoOscuro} alt="" className="mb-10 size-40" />
          <p className="font-display text-[2.25rem] font-bold leading-[1.1] tracking-[-0.03em]">
            Pictogramas y voz para que cada persona diga lo que necesita.
          </p>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-[#A9B4CC]">
            Cartillas, sesiones y familia en un mismo espacio de trabajo.
          </p>
        </div>
        <p className="hidden text-xs text-[#A9B4CC] lg:block">CAA_SP · Comunicación Aumentativa y Alternativa</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-[24rem]">
          <h1 className="font-display text-[2rem] font-bold tracking-[-0.03em] text-caa-tinta">{copy.title}</h1>
          <p className="mt-2 text-[0.9375rem] text-caa-gris">{copy.description}</p>
          {copy.google && (
            <>
              <GoogleSlot className="mt-8 h-11 rounded-lg" />
              <div className="my-6 flex items-center gap-3 text-xs text-caa-gris">
                <span className="h-px flex-1 bg-caa-borde" />o con tu email<span className="h-px flex-1 bg-caa-borde" />
              </div>
            </>
          )}
          <form
            className={copy.google ? 'flex flex-col gap-4' : 'mt-8 flex flex-col gap-4'}
            onSubmit={(e) => {
              e.preventDefault()
              window.location.hash = href('b', screen === 'recuperar' ? 'login' : 'inicio')
            }}
          >
            {copy.fields.map((field) => (
              <div key={field.id} className="flex flex-col gap-1.5">
                <label htmlFor={`b-${field.id}`} className="text-[0.8125rem] font-semibold text-caa-tinta">
                  {field.label}
                </label>
                <input
                  id={`b-${field.id}`}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  className="h-11 rounded-lg border border-[#C9D2E3] bg-white px-3.5 text-[0.9375rem] text-caa-tinta shadow-[0_1px_2px_rgba(15,27,61,0.06)] outline-none transition-[border-color,box-shadow] focus-visible:border-caa-azul focus-visible:shadow-[0_0_0_4px_rgba(47,91,234,0.15)] focus-visible:outline-none"
                />
                {field.hint && <p className="text-[0.8125rem] text-caa-gris">{field.hint}</p>}
              </div>
            ))}
            <button
              type="submit"
              className="group mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-caa-azul text-[0.9375rem] font-semibold text-white shadow-[0_1px_2px_rgba(15,27,61,0.2),0_4px_12px_-4px_rgba(47,91,234,0.5)] transition-colors hover:bg-caa-azul-hover"
            >
              {copy.submit}
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>
          <ul className="mt-8 flex flex-col gap-2 text-sm text-caa-gris">
            {authLinks(screen).map((link) => (
              <li key={link.to}>
                {link.text && `${link.text} `}
                <a href={href('b', link.to)} className="font-semibold text-caa-azul hover:text-caa-azul-hover">
                  {link.action}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </div>
  )
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const item =
    'flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm text-[#A9B4CC] hover:bg-white/5 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:font-semibold aria-[current=page]:text-white'
  return (
    <div className="flex h-full flex-col gap-6 bg-caa-tinta px-3 py-5 text-white">
      <img src={logotipoOscuro} alt="CAA_SP" className="h-7 w-auto self-start px-2.5" />
      <button
        type="button"
        className="flex items-center gap-3 rounded-lg border border-[#26365F] bg-[#16244D] px-3 py-2.5 text-left hover:border-[#3A4C7D]"
      >
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-caa-azul text-sm font-bold">
          C
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">Centro Sol</span>
          <span className="block truncate text-xs text-[#A9B4CC]">Propietario · Terapeuta</span>
        </span>
        <ChevronsUpDown aria-hidden="true" className="size-4 text-[#A9B4CC]" />
      </button>
      <nav aria-label="Principal" className="flex-1">
        <ul className="flex flex-col gap-0.5">
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.() }} aria-current="page" className={item}>
              <Home aria-hidden="true" className="size-4" />
              Inicio
            </a>
          </li>
          <li>
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate?.() }} className={item}>
              <Users aria-hidden="true" className="size-4" />
              Pacientes
            </a>
          </li>
          <li>
            <span className="flex h-9 items-center gap-2.5 px-2.5 text-sm text-[#A9B4CC]/60">
              <Settings aria-hidden="true" className="size-4" />
              Configuración
              <span className="ml-auto rounded bg-white/5 px-1.5 py-0.5 text-[0.6875rem]">Pronto</span>
            </span>
          </li>
        </ul>
      </nav>
      <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1C2B57] text-sm font-semibold">
          {usuario.nombre[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{`${usuario.nombre} ${usuario.apellido}`}</span>
          <span className="block truncate text-xs text-[#A9B4CC]">{usuario.email}</span>
        </span>
        <a href={href('b', 'login')} aria-label="Cerrar sesión" className="rounded-md p-1.5 text-[#A9B4CC] hover:bg-white/5 hover:text-white">
          <LogOut aria-hidden="true" className="size-4" />
        </a>
      </div>
    </div>
  )
}

function Inicio() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-dvh bg-caa-niebla lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden lg:sticky lg:top-0 lg:block lg:h-dvh">
        <Sidebar />
      </aside>

      <header className="flex h-14 items-center justify-between bg-caa-tinta px-4 lg:hidden">
        <img src={logotipoOscuro} alt="CAA_SP" className="h-6 w-auto" />
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex size-10 items-center justify-center rounded-lg text-white hover:bg-white/10"
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>
      {menuOpen && (
        <div className="lg:hidden">
          <Sidebar onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <main className="px-4 py-8 sm:px-8 lg:px-12 lg:py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-[2rem] font-bold tracking-[-0.03em] text-caa-tinta">
                {`${saludo()}, ${usuario.nombre}`}
              </h1>
              <p className="mt-1 text-[0.9375rem] text-caa-gris">
                {`${plural(pacientesACargo, 'paciente', 'pacientes')} a tu cargo en ${plural(espacios.length, 'espacio', 'espacios')}.`}
              </p>
            </div>
            <div className="flex gap-2">
              <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex h-10 items-center rounded-lg border border-[#C9D2E3] bg-white px-4 text-sm font-semibold text-caa-tinta hover:border-caa-gris">
                Gestionar pacientes
              </a>
              <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-caa-azul px-4 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(47,91,234,0.5)] hover:bg-caa-azul-hover">
                <Plus aria-hidden="true" className="size-4" />
                Nuevo paciente
              </a>
            </div>
          </div>

          <section aria-labelledby="b-espacios">
            <h2 id="b-espacios" className="font-display text-lg font-bold tracking-[-0.01em] text-caa-tinta">
              Tus espacios
            </h2>
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {espacios.map((espacio) => (
                <li key={espacio.id} className="flex flex-col rounded-xl border border-caa-borde bg-white p-5 shadow-[0_1px_2px_rgba(15,27,61,0.04)]">
                  <div className="flex items-start gap-3">
                    <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EAF0FE] font-display font-bold text-caa-azul">
                      {espacio.nombre[0]}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-caa-tinta">{espacio.nombre}</p>
                      <p className="text-sm text-caa-gris">{rolTexto(espacio)}</p>
                    </div>
                  </div>
                  <p className="mt-5 text-sm text-caa-gris">
                    <span className="font-display text-2xl font-bold tabular-nums text-caa-tinta">{espacio.pacientes}</span>{' '}
                    {espacio.pacientes === 1 ? 'paciente' : 'pacientes'}
                  </p>
                  <div className="mt-4 flex gap-4 border-t border-caa-borde pt-4 text-sm font-semibold">
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-caa-azul hover:text-caa-azul-hover">Pacientes</a>
                    <a href="#" onClick={(e) => e.preventDefault()} className="text-caa-azul hover:text-caa-azul-hover">Miembros</a>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="b-compartidos" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-caa-borde bg-white px-5 py-4">
            <div>
              <h2 id="b-compartidos" className="font-semibold text-caa-tinta">Pacientes compartidos</h2>
              <p className="text-sm text-caa-gris">{`${plural(pacientesCompartidos, 'paciente', 'pacientes')} con acceso como familiar.`}</p>
            </div>
            <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-1 text-sm font-semibold text-caa-azul hover:text-caa-azul-hover">
              Ver <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </section>
        </div>
      </main>
    </div>
  )
}
