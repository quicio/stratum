import type { Provenance } from '../domain/provenance.js';

export type RequiredField<T> = { value: T; source: 'user' | 'baseline' };

export function resolvePerformanceField(
  userValue: number | null | undefined,
  baselineValue: number | undefined,
): RequiredField<number> {
  if (userValue !== undefined && userValue !== null) {
    return { value: userValue, source: 'user' };
  }
  if (baselineValue !== undefined) {
    return { value: baselineValue, source: 'baseline' };
  }
  throw new Error('Performance field has no source: neither user nor baseline supplied');
}

export function wrapResolverValue<T>(value: T | undefined): Provenance<T> | null {
  if (value === undefined) return null;
  return { value, source: 'resolver' };
}

export function wrapResolverNumber(value: number | undefined): Provenance<number> | null {
  if (value === undefined) return null;
  return { value, source: 'resolver' };
}
