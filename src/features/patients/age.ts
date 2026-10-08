const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Age in whole years from an ISO birth date, computed from local calendar fields (no timezone shifts). */
export function ageFrom(birthDateIso: string, today: Date): number | null {
  const match = ISO_DATE.exec(birthDateIso)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])

  let age = today.getFullYear() - year
  const birthdayAlreadyHappenedThisYear =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day)
  if (!birthdayAlreadyHappenedThisYear) age -= 1

  return age
}
