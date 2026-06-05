/** Decimal hours → "02:15:30" (hr:min:sec) */
export function formatHoursHms(hours: number): string {
  const totalSec = Math.max(0, Math.round(hours * 3600));
  return formatSecondsHms(totalSec);
}

/** Total seconds → "00:00:00" */
export function formatSecondsHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
