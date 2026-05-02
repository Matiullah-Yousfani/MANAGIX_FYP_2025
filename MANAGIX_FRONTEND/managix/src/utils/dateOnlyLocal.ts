/** Local calendar YYYY-MM-DD (avoid toISOString() which shifts the day in most timezones). */
export function formatLocalDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Parse a date input / API string as a local noon instant (stable comparisons). */
export function parseYmdLocal(ymd: string): Date {
  const [y, mo, da] = (ymd || '').split('-').map((x) => parseInt(x, 10));
  if (!y || !mo || !da) return new Date(NaN);
  return new Date(y, mo - 1, da, 12, 0, 0, 0);
}

export function compareYmd(a: string, b: string): number {
  const da = parseYmdLocal(a);
  const db = parseYmdLocal(b);
  return da.getTime() - db.getTime();
}
