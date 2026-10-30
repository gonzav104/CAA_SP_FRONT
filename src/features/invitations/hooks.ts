import { useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationKeys } from '@/features/organizations/hooks'
import { patientKeys } from '@/features/patients/hooks'
import type { AceptarInvitacionResponse } from './apiTypes'
import { acceptInvitation } from './invitationsApi'

/** Accepting grants a membership or a family link: both the organizations and the patients change. */
export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation<AceptarInvitacionResponse, Error, string>({
    mutationFn: (token) => acceptInvitation(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: organizationKeys.all })
      void queryClient.invalidateQueries({ queryKey: patientKeys.all })
    },
  })
}
