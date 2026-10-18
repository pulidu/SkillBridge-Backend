"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaginationMeta = exports.parsePagination = void 0;
const constants_1 = require("../constants");
/** Normalises and clamps page/limit coming from the query string. */
const parsePagination = (input = {}) => {
    const page = Math.max(1, Math.trunc(Number(input.page) || constants_1.PAGINATION.DEFAULT_PAGE));
    const requestedLimit = Math.trunc(Number(input.limit) || constants_1.PAGINATION.DEFAULT_LIMIT);
    const limit = Math.min(Math.max(1, requestedLimit), constants_1.PAGINATION.MAX_LIMIT);
    return { page, limit, skip: (page - 1) * limit };
};
exports.parsePagination = parsePagination;
/** Builds the pagination metadata block for a list response. */
const buildPaginationMeta = (total, page, limit) => {
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
exports.buildPaginationMeta = buildPaginationMeta;
//# sourceMappingURL=pagination.js.map