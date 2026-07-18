export type ProvenanceSource = 'user' | 'resolver' | 'baseline';

export interface Provenance<T> {
  value: T;
  source: ProvenanceSource;
}

export function isUser<T>(p: Provenance<T>): boolean {
  return p.source === 'user';
}

export function isResolver<T>(p: Provenance<T>): boolean {
  return p.source === 'resolver';
}

export function isBaseline<T>(p: Provenance<T>): boolean {
  return p.source === 'baseline';
}
