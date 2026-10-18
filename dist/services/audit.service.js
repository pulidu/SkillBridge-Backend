"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAudit = void 0;
const models_1 = require("../models");
const logger_1 = require("../config/logger");
/**
 * Appends an audit trail entry. Never throws: an audit failure must not break
 * the request that triggered it, so problems are logged instead.
 */
const recordAudit = async (input) => {
    try {
        await models_1.AuditLog.create({
            actor: input.actorId,
            actorRole: input.actorRole,
            action: input.action,
            entity: input.entity,
            entityId: input.entityId,
            meta: input.meta,
            ip: input.req?.ip,
            userAgent: input.req?.get('user-agent'),
        });
    }
    catch (error) {
        logger_1.logger.error({ err: error, action: input.action }, 'Failed to write audit log');
    }
};
exports.recordAudit = recordAudit;
//# sourceMappingURL=audit.service.js.map