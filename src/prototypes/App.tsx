import { useEffect, useState } from 'react'
import { PrototypeA } from './a/PrototypeA'
import { PrototypeB } from './b/PrototypeB'
import { PrototypeC } from './c/PrototypeC'
import { href, screens, type ProtoId, type Screen } from './shared'

const protos: { id: ProtoId; label: string }[] = [
  { id: 'a', label: 'A · Clínico' },
  { id: 'b', label: 'B · SaaS' },
  { id: 'c', label: 'C · Cálido' },
]

function parseHash(): { proto: ProtoId; screen: Screen } {
  const [, proto, screen] = window.location.hash.split('/')
  return {
    proto: protos.some((p) => p.id === proto) ? (proto as ProtoId) : 'a',
    screen: screens.some((s) => s.id === screen) ? (screen as Screen) : 'login',
  }
}

/** Review toolbar: not part of any design, only switches prototype and screen. */
function Toolbar({ proto, screen }: { proto: ProtoId; screen: Screen }) {
  return (
    <nav
      aria-label="Prototipos de diseño"
      className="z-50 flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#0B1430] px-4 py-2 text-xs text-white/70 lg:fixed lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 lg:rounded-full lg:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
    >
      <span className="font-semibold text-white">Prototipo</span>
      <div className="flex gap-1">
        {protos.map((p) => (
          <a
            key={p.id}
            href={href(p.id, screen)}
            aria-current={p.id === proto ? 'page' : undefined}
            className="rounded px-2 py-1 hover:text-white aria-[current=page]:bg-white aria-[current=page]:text-[#0B1430]"
          >
            {p.label}
          </a>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {screens.map((s) => (
          <a
            key={s.id}
            href={href(proto, s.id)}
            aria-current={s.id === screen ? 'page' : undefined}
            className="rounded px-2 py-1 hover:text-white aria-[current=page]:bg-white/15 aria-[current=page]:text-white"
          >
            {s.label}
          </a>
        ))}
      </div>
    </nav>
  )
}

export function App() {
  const [route, setRoute] = useState(parseHash)
  useEffect(() => {
    const onHash = () => {
      setRoute(parseHash())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const Proto = { a: PrototypeA, b: PrototypeB, c: PrototypeC }[route.proto]
  return (
    <>
      <Toolbar {...route} />
      <Proto screen={route.screen} />
    </>
  )
}
