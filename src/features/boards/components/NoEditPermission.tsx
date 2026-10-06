import { Link } from 'react-router'
import { paths } from '@/app/paths'
import { buttonVariants } from '@/components/ui/button'

interface NoEditPermissionProps {
  patientId: string
  boardId: string
}

export function NoEditPermission({ patientId, boardId }: NoEditPermissionProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/40 p-6 text-center">
      <p role="alert" className="text-lg font-medium">
        No tienes permiso para editar esta cartilla.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link to={paths.boardUse(patientId, boardId)} className={buttonVariants({ size: 'lg' })}>
          Abrir en Modo Uso
        </Link>
        <Link to={paths.boards(patientId)} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          Volver a las cartillas
        </Link>
      </div>
    </div>
  )
}
