import { describe, expect, it } from 'vitest';
import { calculateProgress } from '../models/enrollment.model';

describe('calculateProgress', () => {
  it('returns zero when there is no content', () => {
    expect(calculateProgress(0, 0)).toBe(0);
    expect(calculateProgress(3, 0)).toBe(0);
  });

  it('returns zero when nothing is complete', () => {
    expect(calculateProgress(0, 10)).toBe(0);
  });

  it('returns a whole-number percentage', () => {
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
  });

  it('returns 100 when everything is complete', () => {
    expect(calculateProgress(7, 7)).toBe(100);
  });

  it('caps at 100 if more lessons are completed than exist', () => {
    expect(calculateProgress(12, 10)).toBe(100);
  });

  it('clamps a negative count to zero', () => {
    expect(calculateProgress(-5, 10)).toBe(0);
  });
});
