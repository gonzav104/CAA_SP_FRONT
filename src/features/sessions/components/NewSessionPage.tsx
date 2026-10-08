import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { paths } from '@/app/paths'
import { getSessionWriteErrorMessage } from '@/api/errors'
import { useCreateSession } from '../hooks'
import { toWriteRequest } from '../sessionForm'
import type { SessionFormValues } from '../sessionForm'
import { SessionForm } from './SessionForm'

function nowAsDateTimeInputValue(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

/** Dedicated page to register a session, reached from the Sesiones list or the workspace nav. */
export function NewSessionPage() {
  const { pacienteId } = useParams()
  if (!pacienteId) return <Navigate to={paths.patients()} replace />
  return <NewSessionPageContent patientId={pacienteId} />
}

function NewSessionPageContent({ patientId }: { patientId: string }) {
  const navigate = useNavigate()
  const createSession = useCreateSession(patientId)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (values: SessionFormValues) => {
    setError(null)
    try {
      const session = await createSession.mutateAsync(toWriteRequest(values))
      navigate(paths.sessionDetail(patientId, session.id))
    } catch (err) {
      setError(getSessionWriteErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        to={paths.sessions(patientId)}
        className="inline-flex min-h-10 w-fit items-center gap-1.5 rounded-md text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Volver a sesiones
      </Link>
      <SessionForm
        title="Registrar sesión"
        submitLabel="Registrar sesión"
        pendingLabel="Registrando…"
        isPending={createSession.isPending}
        error={error}
        onSubmit={(values) => void handleSubmit(values)}
        onCancel={() => navigate(paths.sessions(patientId))}
        defaultValues={{
          fechaHora: nowAsDateTimeInputValue(),
          disposicion: '',
          objetivosTrabajados: '',
          observaciones: '',
          estrategiasYProximosPasos: '',
        }}
      />
    </div>
  )
}
