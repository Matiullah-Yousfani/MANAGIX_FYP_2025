import { describe, expect, it } from 'vitest';
import {
  normalizeEmail,
  validateLoginInput,
  validateProjectStep1,
  validateProjectStep2,
  MIN_PROJECT_BUDGET_USD,
  MIN_PROJECT_DESCRIPTION_CHARS,
  validateSignupInput,
} from './formValidation';

describe('formValidation', () => {
  it('normalizeEmail trims', () => {
    expect(normalizeEmail('  A@B.C  ')).toBe('A@B.C');
  });

  it('validateLoginInput catches empty email or password', () => {
    expect(validateLoginInput('', 'x')).toMatch(/email/i);
    expect(validateLoginInput('a@b.com', '')).toMatch(/password/i);
    expect(validateLoginInput('a@b.com', 'secret')).toBeNull();
  });

  it('validateProjectStep1 requires title and min description length', () => {
    expect(validateProjectStep1('', 'x'.repeat(MIN_PROJECT_DESCRIPTION_CHARS))).toMatch(/title/i);
    expect(validateProjectStep1('Title', '')).toMatch(/description/i);
    expect(validateProjectStep1('Title', 'short')).toMatch(/200/);
    expect(validateProjectStep1('Title', 'x'.repeat(MIN_PROJECT_DESCRIPTION_CHARS))).toBeNull();
  });

  it('validateProjectStep2 requires future deadline and min budget', () => {
    const past = '2000-01-01';
    expect(validateProjectStep2(past, 100)).not.toBeNull();
    expect(validateProjectStep2('', MIN_PROJECT_BUDGET_USD)).not.toBeNull();
    expect(validateProjectStep2('2099-12-31', MIN_PROJECT_BUDGET_USD - 1)).toMatch(/50/);
    const future = new Date();
    future.setDate(future.getDate() + 7);
    const iso = future.toISOString().slice(0, 10);
    expect(validateProjectStep2(iso, MIN_PROJECT_BUDGET_USD)).toBeNull();
    expect(validateProjectStep2(iso, 0)).not.toBeNull();
  });

  it('validateSignupInput matches backend rules', () => {
    expect(
      validateSignupInput({
        fullName: '',
        email: 'a@a.com',
        password: '123456',
        roleId: 'x',
      }),
    ).toMatch(/name/i);
    expect(
      validateSignupInput({
        fullName: 'A',
        email: '',
        password: '123456',
        roleId: 'x',
      }),
    ).toMatch(/email/i);
    expect(
      validateSignupInput({
        fullName: 'A',
        email: 'a@a.com',
        password: '12345',
        roleId: 'x',
      }),
    ).toMatch(/6/);
    expect(
      validateSignupInput({
        fullName: 'A',
        email: 'a@a.com',
        password: '123456',
        roleId: '',
      }),
    ).toMatch(/role/i);
    expect(
      validateSignupInput({
        fullName: 'A',
        email: 'a@a.com',
        password: '123456',
        roleId: 'rid',
      }),
    ).toBeNull();
  });
});
