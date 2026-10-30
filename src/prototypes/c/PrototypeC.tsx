import { useState } from 'react'
import { ChevronRight, Eye, EyeOff, Heart, Home, LogOut, Plus, Settings, Users } from 'lucide-react'
import logotipo from '../brand/caa-sp-logotipo.svg'
import isotipo from '../brand/caa-sp-isotipo.svg'
import { espacios, pacientesACargo, pacientesCompartidos, plural, rolTexto, saludo, usuario } from '../data'
import { GoogleSlot } from '../GoogleSlot'
import { authLinks, authScreens, href, type AuthField, type AuthScreen, type Screen } from '../shared'

/**
 * C · Warm, human, accessible. Larger type and targets (48px+), plain language, every icon labelled,
 * show-password toggles and a bottom tab bar on mobile so the main destinations stay one tap away.
 */
export function PrototypeC({ screen }: { screen: Screen }) {
  return screen === 'inicio' ? <Inicio /> : <Auth screen={screen} />
}

function Field({ field }: { field: AuthField }) {
  const [visible, setVisible] = useState(false)
  const isPassword = field.type === 'password'
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={`c-${field.id}`} className="text-base font-semibold text-caa-tinta">
        {field.label}
      </label>
      <div className="relative">
        <input
          id={`c-${field.id}`}
          type={isPassword && visible ? 'text' : field.type}
          autoComplete={field.autoComplete}
          aria-describedby={field.hint ? `c-${field.id}-hint` : undefined}
          className="h-14 w-full rounded-xl border-2 border-[#C9D2E3] bg-white px-4 text-lg text-caa-tinta outline-none transition-colors hover:border-caa-gris focus-visible:border-caa-azul focus-visible:outline-none"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            className="absolute inset-y-1.5 right-1.5 flex items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-caa-gris hover:bg-caa-niebla hover:text-caa-tinta"
          >
            {visible ? <EyeOff aria-hidden="true" className="size-5" /> : <Eye aria-hidden="true" className="size-5" />}
            {visible ? 'Ocultar' : 'Mostrar'}
          </button>
        )}
      </div>
      {field.hint && (
        <p id={`c-${field.id}-hint`} className="text-[0.9375rem] leading-relaxed text-caa-gris">
          {field.hint}
        </p>
      )}
    </div>
  )
}

function Auth({ screen }: { screen: AuthScreen }) {
  const copy = authScreens[screen]
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[#E6F6F3] px-4 py-8 sm:py-14">
      <img src={logotipo} alt="CAA_SP" className="h-9 w-auto" />
      <main className="mt-8 w-full max-w-[30rem] rounded-3xl bg-white px-6 py-8 shadow-[0_2px_4px_rgba(15,27,61,0.04),0_12px_32px_-12px_rgba(15,27,61,0.18)] sm:px-10 sm:py-10">
        <img src={isotipo} alt="" className="size-12" />
        <h1 className="mt-6 font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] text-caa-tinta">{copy.title}</h1>
        <p className="mt-2 text-lg leading-relaxed text-caa-gris">{copy.description}</p>
        <form
          className="mt-8 flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault()
            window.location.hash = href('c', screen === 'recuperar' ? 'login' : 'inicio')
          }}
        >
          {copy.fields.map((field) => (
            <Field key={field.id} field={field} />
          ))}
          <button
            type="submit"
            className="h-14 rounded-xl bg-caa-azul text-lg font-bold text-white transition-colors hover:bg-caa-azul-hover"
          >
            {copy.submit}
          </button>
        </form>
        {copy.google && (
          <>
            <p className="my-6 text-center text-base text-caa-gris">o también</p>
            <GoogleSlot className="h-14 rounded-xl text-base" />
          </>
        )}
        <ul className="mt-8 flex flex-col gap-3 border-t-2 border-caa-niebla pt-6 text-base text-caa-gris">
          {authLinks(screen).map((link) => (
            <li key={link.to}>
              {link.text && `${link.text} `}
              <a href={href('c', link.to)} className="font-semibold text-caa-cian-texto underline decoration-2 underline-offset-4 hover:text-caa-tinta">
                {link.action}
              </a>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}

const tabs = [
  { label: 'Inicio', icon: Home, active: true },
  { label: 'Pacientes', icon: Users, active: false },
]

function Inicio() {
  return (
    <div className="min-h-dvh bg-caa-niebla pb-24 lg:grid lg:grid-cols-[17rem_minmax(0,1fr)] lg:pb-0">
      <aside className="hidden h-dvh flex-col gap-8 bg-white px-5 py-7 lg:sticky lg:top-0 lg:flex">
        <img src={logotipo} alt="CAA_SP" className="h-8 w-auto self-start px-2" />
        <nav aria-label="Principal" className="flex-1">
          <ul className="flex flex-col gap-1.5">
            {tabs.map(({ label, icon: Icon, active }) => (
              <li key={label}>
                <a
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  aria-current={active ? 'page' : undefined}
                  className="flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium text-caa-gris hover:bg-caa-niebla hover:text-caa-tinta aria-[current=page]:bg-[#E6F6F3] aria-[current=page]:font-bold aria-[current=page]:text-caa-tinta"
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {label}
                </a>
              </li>
            ))}
            <li>
              <span className="flex h-12 items-center gap-3 px-3 text-base text-caa-gris/70">
                <Settings aria-hidden="true" className="size-5" />
                Configuración
              </span>
            </li>
          </ul>
        </nav>
        <div className="flex flex-col gap-3 rounded-2xl bg-caa-niebla p-4">
          <p className="text-base font-semibold text-caa-tinta">{`${usuario.nombre} ${usuario.apellido}`}</p>
          <p className="-mt-2 truncate text-sm text-caa-gris">{usuario.email}</p>
          <a href={href('c', 'login')} className="flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-[#C9D2E3] bg-white text-base font-semibold text-caa-tinta hover:border-caa-gris">
            <LogOut aria-hidden="true" className="size-5" />
            Cerrar sesión
          </a>
        </div>
      </aside>

      <header className="flex h-16 items-center justify-between bg-white px-4 lg:hidden">
        <img src={logotipo} alt="CAA_SP" className="h-7 w-auto" />
        <a href={href('c', 'login')} className="flex h-11 items-center gap-2 rounded-xl px-3 text-base font-semibold text-caa-tinta hover:bg-caa-niebla">
          <LogOut aria-hidden="true" className="size-5" />
          Salir
        </a>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <section className="rounded-3xl bg-white p-6 sm:p-8">
          <h1 className="font-display text-[2rem] font-bold leading-tight tracking-[-0.02em] text-caa-tinta sm:text-[2.5rem]">
            {`${saludo()}, ${usuario.nombre}`}
          </h1>
          <p className="mt-2 text-lg text-caa-gris">¿Qué querés hacer hoy?</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <a href="#" onClick={(e) => e.preventDefault()} className="flex min-h-16 items-center gap-4 rounded-2xl bg-caa-azul px-5 py-4 text-white hover:bg-caa-azul-hover">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Plus className="size-6" />
              </span>
              <span className="text-lg font-bold">Nuevo paciente</span>
            </a>
            <a href="#" onClick={(e) => e.preventDefault()} className="flex min-h-16 items-center gap-4 rounded-2xl border-2 border-caa-borde px-5 py-4 text-caa-tinta hover:border-caa-gris">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-caa-niebla">
                <Users className="size-6 text-caa-azul" />
              </span>
              <span>
                <span className="block text-lg font-bold">Ver mis pacientes</span>
                <span className="block text-base text-caa-gris">{plural(pacientesACargo, 'paciente', 'pacientes')} a tu cargo</span>
              </span>
            </a>
          </div>
        </section>

        <section aria-labelledby="c-espacios" className="mt-10">
          <h2 id="c-espacios" className="font-display text-2xl font-bold text-caa-tinta">Tus espacios</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {espacios.map((espacio) => (
              <li key={espacio.id}>
                <a href="#" onClick={(e) => e.preventDefault()} className="flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5 py-4 hover:shadow-[0_6px_20px_-10px_rgba(15,27,61,0.3)]">
                  <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F6F3] font-display text-xl font-bold text-caa-cian-texto">
                    {espacio.nombre[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-bold text-caa-tinta">{espacio.nombre}</span>
                    <span className="block text-base text-caa-gris">
                      {`${rolTexto(espacio)} · ${plural(espacio.pacientes, 'paciente', 'pacientes')}`}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-caa-gris" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="c-compartidos" className="mt-10">
          <h2 id="c-compartidos" className="font-display text-2xl font-bold text-caa-tinta">Pacientes compartidos</h2>
          <a href="#" onClick={(e) => e.preventDefault()} className="mt-4 flex min-h-20 items-center gap-4 rounded-2xl bg-white px-5 py-4 hover:shadow-[0_6px_20px_-10px_rgba(15,27,61,0.3)]">
            <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-caa-niebla">
              <Heart className="size-6 text-caa-azul" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-bold text-caa-tinta">{plural(pacientesCompartidos, 'paciente', 'pacientes')}</span>
              <span className="block text-base text-caa-gris">Compartidos con vos como familiar</span>
            </span>
            <ChevronRight aria-hidden="true" className="size-6 shrink-0 text-caa-gris" />
          </a>
        </section>
      </main>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 border-t border-caa-borde bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-2">
          {tabs.map(({ label, icon: Icon, active }) => (
            <li key={label}>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                aria-current={active ? 'page' : undefined}
                className="flex h-16 flex-col items-center justify-center gap-1 text-sm font-medium text-caa-gris aria-[current=page]:font-bold aria-[current=page]:text-caa-azul"
              >
                <Icon aria-hidden="true" className="size-6" />
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
