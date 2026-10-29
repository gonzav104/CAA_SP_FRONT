import { Button } from '@/components/ui/button'
import { formatBirthDate, PERMISSION_LABELS } from '@/features/patients/format'
import { isInvitationExpired } from '../mappers'
import type { FamilyInvitation } from '../types'

interface InvitationRowProps {
  invitation: FamilyInvitation
  /** True while any invitation operation is pending: both actions are disabled. */
  actionsDisabled: boolean
  error: string | null
  onResend: () => void
  onRevoke: () => void
}

/** One family invitation not accepted yet: who, which permission it proposes, and until when it is valid. */
export function InvitationRow({ invitation, actionsDisabled, error, onResend, onRevoke }: InvitationRowProps) {
  const expired = isInvitationExpired(invitation)
  const permission = PERMISSION_LABELS[invitation.permission]

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-dashed border-border bg-background p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{invitation.email}</span>
          <span className="text-sm text-muted-foreground">{`Invitación pendiente · ${permission}`}</span>
          {expired ? (
            <span className="text-sm text-amber-900">Invitación vencida</span>
          ) : (
            invitation.expiresAt && (
              <span className="text-sm text-muted-foreground">
                {`Vence el ${formatBirthDate(invitation.expiresAt.slice(0, 10))}`}
              </span>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={actionsDisabled}
            aria-label={`Reenviar invitación a ${invitation.email}`}
            onClick={onResend}
          >
            Reenviar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={actionsDisabled}
            aria-label={`Revocar invitación a ${invitation.email}`}
            onClick={onRevoke}
          >
            Revocar
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
    </li>
  )
}
