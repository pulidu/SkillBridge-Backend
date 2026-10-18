"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const constants_1 = require("../constants");
const auditLogSchema = new mongoose_1.Schema({
    actor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', index: true },
    actorRole: { type: String, enum: constants_1.ROLES },
    action: { type: String, required: [true, 'Action is required'], trim: true, index: true },
    entity: { type: String, required: [true, 'Entity is required'], trim: true, index: true },
    entityId: { type: mongoose_1.Schema.Types.ObjectId, index: true },
    meta: { type: mongoose_1.Schema.Types.Mixed },
    ip: { type: String, trim: true },
    userAgent: { type: String, trim: true },
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, entityId: 1 });
exports.AuditLog = (0, mongoose_1.model)('AuditLog', auditLogSchema);
//# sourceMappingURL=auditlog.model.js.map