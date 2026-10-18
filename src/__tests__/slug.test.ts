import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '../utils/slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Modern TypeScript for Web Developers')).toBe(
      'modern-typescript-for-web-developers',
    );
  });

  it('strips punctuation and collapses separators', () => {
    expect(slugify('React & Redux:  A  Guide')).toBe('react-redux-a-guide');
  });

  it('removes diacritics', () => {
    expect(slugify('Chloé Dubois')).toBe('chloe-dubois');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });

  it('returns an empty string when nothing survives', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    const result = await uniqueSlug('New Course', async () => false);
    expect(result).toBe('new-course');
  });

  it('appends a suffix when the base is taken', async () => {
    const taken = new Set(['new-course']);
    const result = await uniqueSlug('New Course', async (candidate) => taken.has(candidate));
    expect(result).toMatch(/^new-course-[a-z0-9]{4}$/);
  });

  it('falls back to a timestamp when every candidate is taken', async () => {
    const result = await uniqueSlug('Taken', async () => true);
    expect(result.startsWith('taken-')).toBe(true);
  });

  it('never returns an empty slug', async () => {
    const result = await uniqueSlug('!!!', async () => false);
    expect(result).toBe('item');
  });
});
