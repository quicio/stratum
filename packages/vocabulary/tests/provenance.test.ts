import { describe, it, expect } from 'vitest';
import {
  type Provenance,
  isUser,
  isResolver,
  isBaseline,
} from '../src/domain/provenance.js';

const user: Provenance<number> = { value: 7, source: 'user' };
const resolver: Provenance<number> = { value: 8, source: 'resolver' };
const baseline: Provenance<number> = { value: 9, source: 'baseline' };

describe('isUser / isResolver / isBaseline', () => {
  it('isUser matches user provenance only', () => {
    expect(isUser(user)).toBe(true);
    expect(isUser(resolver)).toBe(false);
    expect(isUser(baseline)).toBe(false);
  });

  it('isResolver matches resolver provenance only', () => {
    expect(isResolver(user)).toBe(false);
    expect(isResolver(resolver)).toBe(true);
    expect(isResolver(baseline)).toBe(false);
  });

  it('isBaseline matches baseline provenance only', () => {
    expect(isBaseline(user)).toBe(false);
    expect(isBaseline(resolver)).toBe(false);
    expect(isBaseline(baseline)).toBe(true);
  });
});
