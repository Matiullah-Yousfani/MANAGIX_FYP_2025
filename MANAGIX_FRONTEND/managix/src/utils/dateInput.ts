/** Min date for date inputs — blocks picking past dates (today UTC). */
export function minDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}
