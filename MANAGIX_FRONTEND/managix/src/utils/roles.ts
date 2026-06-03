/** Normalize role strings from API/localStorage (e.g. "Quality Assurance" → QA). */
export type AppRole = 'Admin' | 'Manager' | 'Employee' | 'QA' | 'Member';

export function normalizeAppRole(role: string | null | undefined): AppRole {
  const r = (role || '').trim().toLowerCase();
  if (r === 'admin' || r.includes('administrator')) return 'Admin';
  if (r === 'manager' || r.includes('management')) return 'Manager';
  if (r === 'employee' || r.includes('developer')) return 'Employee';
  if (r === 'qa' || r.includes('quality')) return 'QA';
  return 'Member';
}

export function canUploadResume(role: string | null | undefined): boolean {
  const ar = normalizeAppRole(role);
  return ar === 'Employee' || ar === 'Manager' || ar === 'QA';
}

export function isQaRole(role: string | null | undefined): boolean {
  return normalizeAppRole(role) === 'QA';
}
