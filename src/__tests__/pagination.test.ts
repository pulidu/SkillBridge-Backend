import { describe, expect, it } from 'vitest';
import { buildPaginationMeta, parsePagination } from '../utils/pagination';
import { PAGINATION } from '../constants';

describe('parsePagination', () => {
  it('applies defaults when nothing is provided', () => {
    expect(parsePagination()).toEqual({
      page: PAGINATION.DEFAULT_PAGE,
      limit: PAGINATION.DEFAULT_LIMIT,
      skip: 0,
    });
  });

  it('computes skip from page and limit', () => {
    expect(parsePagination({ page: 3, limit: 10 })).toEqual({ page: 3, limit: 10, skip: 20 });
  });

  it('parses numeric strings from the query string', () => {
    const query = { page: '2', limit: '5' } as unknown as Parameters<typeof parsePagination>[0];
    expect(parsePagination(query)).toEqual({ page: 2, limit: 5, skip: 5 });
  });

  it('clamps the limit to the maximum', () => {
    const { limit } = parsePagination({ limit: 5_000 });
    expect(limit).toBe(PAGINATION.MAX_LIMIT);
  });

  it('never produces a page below one', () => {
    expect(parsePagination({ page: 0, limit: -3 }).page).toBe(1);
  });
});

describe('buildPaginationMeta', () => {
  it('computes the page count', () => {
    expect(buildPaginationMeta(87, 1, 20)).toEqual({
      page: 1,
      limit: 20,
      total: 87,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('reports the last page as having no next', () => {
    const meta = buildPaginationMeta(87, 5, 20);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(true);
  });

  it('handles an empty result set', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta.totalPages).toBe(0);
    expect(meta.hasNext).toBe(false);
    expect(meta.hasPrev).toBe(false);
  });
});
