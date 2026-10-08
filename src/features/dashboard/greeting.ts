/** Time-of-day greeting in Spanish. Pure function of the hour, for easy testing. */
export function greetingFor(date: Date): string {
  const hour = date.getHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 13) return 'Buenos días'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}
