import type { CurrentUser } from '@/features/auth/types'

// Mirrors the backend ownership check used for item edits: only the board's creator may edit.
export function canEditBoard(user: CurrentUser | null | undefined, creatorId: string): boolean {
  return !!user && user.id === creatorId
}
