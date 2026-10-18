"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const ApiError_1 = require("../utils/ApiError");
/**
 * Validates and coerces request input with Zod, then REPLACES the raw value on
 * the request with the parsed one. Controllers therefore only ever read
 * validated, typed data - and payloads such as `{ "$ne": null }` are rejected
 * before they can reach a Mongo query.
 */
const validate = (options) => (req, _res, next) => {
    const parsed = {
        body: req.body ?? {},
        params: req.params ?? {},
        query: req.query ?? {},
    };
    const errors = [];
    for (const source of ['body', 'params', 'query']) {
        const schema = options[source];
        if (!schema)
            continue;
        const result = schema.safeParse(parsed[source]);
        if (!result.success) {
            for (const issue of result.error.issues) {
                errors.push({ field: `${source}.${issue.path.join('.')}`.replace(/\.$/, ''), message: issue.message });
            }
            continue;
        }
        // Express 5 exposes `req.query` via a getter, so assign defensively.
        if (source === 'query') {
            Object.defineProperty(req, 'query', { value: result.data, writable: true, configurable: true });
        }
        else {
            req[source] = result.data;
        }
        parsed[source] = result.data;
    }
    if (errors.length > 0) {
        return next(ApiError_1.ApiError.unprocessable('Validation failed', errors));
    }
    req.valid = { body: parsed.body, params: parsed.params, query: parsed.query };
    return next();
};
exports.validate = validate;
//# sourceMappingURL=validate.middleware.js.map