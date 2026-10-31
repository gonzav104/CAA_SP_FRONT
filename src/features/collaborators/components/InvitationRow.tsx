import { Mail, MailWarning } from 'lucide-react'
import { FormAlert } from '@/components/FormAlert'
import { Button } from '@/components/ui/button'
import { formatBirthDate } from '@/features/patients/format'
import { isInvitationExpired } from '../mappers'
import type { FamilyInvitation } from '../types'

interface InvitationRowProps {
  invitation: Pick<FamilyInvitation, 'id' | 'email' | 'status' | 'expiresAt'>
  /** What the invitation proposes, e.g. "Invitación pendiente · Solo lectura". */
  description: string
  /** True while any invitation operation is pending: both actions are disabled. */
  actionsDisabled: boolean
  error: string | null
  onResend: () => void
  onRevoke: () => void
}

/** One invitation not accepted yet: who, what it proposes, and until when it is valid. */
export function InvitationRow({ invitation, description, actionsDisabled, error, onResend, onRevoke }: InvitationRowProps) {
  const expired = isInvitationExpired(invitation)

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
          >
            {expired ? <MailWarning className="size-5" /> : <Mail className="size-5" />}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium wrap-anywhere text-foreground">{invitation.email}</span>
            <span className="text-sm text-muted-foreground">{description}</span>
            {expired ? (
              <span className="text-sm font-medium text-amber-900">Invitación vencida</span>
            ) : (
              invitation.expiresAt && (
                <span className="text-sm text-muted-foreground">
                  {`Vence el ${formatBirthDate(invitation.expiresAt.slice(0, 10))}`}
                </span>
              )
            )}
          </div>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 flex-1 sm:h-9 sm:flex-none"
            disabled={actionsDisabled}
            aria-label={`Reenviar invitación a ${invitation.email}`}
            onClick={onResend}
          >
            Reenviar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 flex-1 sm:h-9 sm:flex-none"
            disabled={actionsDisabled}
            aria-label={`Revocar invitación a ${invitation.email}`}
            onClick={onRevoke}
          >
            Revocar
          </Button>
        </div>
      </div>
      <FormAlert message={error} />
    </li>
  )
}
