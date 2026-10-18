import { PAGINATION } from '../constants';
import type { PaginationMeta } from '../types';

/** Input accepted by list endpoints. Already coerced by the Zod validators. */
export interface PaginationInput {
  page?: number;
  limit?: number;
  [key: string]: unknown;
}

/** Normalises and clamps page/limit coming from the query string. */
export const parsePagination = (input: PaginationInput = {}): Required<
  Pick<PaginationInput, 'page' | 'limit'>
> & { skip: number } => {
  const page = Math.max(1, Math.trunc(Number(input.page) || PAGINATION.DEFAULT_PAGE));
  const requestedLimit = Math.trunc(Number(input.limit) || PAGINATION.DEFAULT_LIMIT);
  const limit = Math.min(Math.max(1, requestedLimit), PAGINATION.MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
};

/** Builds the pagination metadata block for a list response. */
export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1 && total > 0,
  };
};
