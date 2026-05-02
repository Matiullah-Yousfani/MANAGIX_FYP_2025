/** Mirrors backend auth validation where applicable (trim, lengths). */

export function normalizeEmail(email: string): string {
  return (email ?? '').trim();
}

export function normalizeName(name: string): string {
  return (name ?? '').trim();
}

export function validateLoginInput(email: string, password: string): string | null {
  if (!normalizeEmail(email)) return 'Email is required.';
  if (!(password ?? '').trim().length) return 'Password is required.';
  return null;
}

/** @param deadlineIso `YYYY-MM-DD` from date input */
export function validateProjectStep2(deadlineIso: string, budget: number): string | null {
  if (!deadlineIso?.trim()) return 'Project deadline is required.';
  const d = new Date(deadlineIso + 'T12:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  if (d < today) return 'Project deadline must be today or a future date.';
  if (budget < 0) return 'Budget cannot be negative.';
  return null;
}

export function validateSignupInput(input: {
  fullName: string;
  email: string;
  password: string;
  roleId: string;
}): string | null {
  if (!normalizeName(input.fullName)) return 'Full name is required.';
  if (!normalizeEmail(input.email)) return 'Email is required.';
  const pw = input.password ?? '';
  if (!pw.trim().length) return 'Password is required.';
  if (pw.length < 6) return 'Password must be at least 6 characters.';
  if (!input.roleId) return 'Please select a role.';
  return null;
}
