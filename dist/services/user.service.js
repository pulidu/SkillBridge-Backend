"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableStatuses = exports.deleteUser = exports.updateUserStatus = exports.updateUserRole = exports.updateUser = exports.getUserById = exports.createUser = exports.listUsers = void 0;
const constants_1 = require("../constants");
const models_1 = require("../models");
const ApiError_1 = require("../utils/ApiError");
const pagination_1 = require("../utils/pagination");
const auth_validator_1 = require("../validators/auth.validator");
const auth_service_1 = require("./auth.service");
const audit_service_1 = require("./audit.service");
/** Paginated user list with role, status and text search filters. */
const listUsers = async (input) => {
    const { page, limit, skip } = (0, pagination_1.parsePagination)(input);
    const filter = { isDeleted: false };
    if (input.role)
        filter.roles = input.role;
    if (input.status)
        filter.status = input.status;
    if (input.search) {
        // Escaped so a search term is treated as text, never as a regex.
        const safe = input.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        filter.$or = [
            { fullName: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
        ];
    }
    const [users, total] = await Promise.all([
        models_1.User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        models_1.User.countDocuments(filter),
    ]);
    return { items: users.map(models_1.toUserResponse), meta: (0, pagination_1.buildPaginationMeta)(total, page, limit) };
};
exports.listUsers = listUsers;
/**
 * Creates a privileged account on behalf of an administrator.
 *
 * This is the only path besides `scripts/create-admin.ts` that can produce a
 * non-student role. The caller's authority is already established by
 * `authorize('admin')` on the route; the role is additionally narrowed to the
 * privileged set so a schema slip can never mint an arbitrary role, and the
 * password is hashed here rather than accepted pre-hashed from the client.
 */
const createUser = async (input, req) => {
    if (!auth_validator_1.PRIVILEGED_ROLES.includes(input.role)) {
        throw ApiError_1.ApiError.forbidden('Only instructor and admin accounts can be created here');
    }
    const existing = await models_1.User.findOne({ email: input.email });
    if (existing)
        throw ApiError_1.ApiError.conflict('An account with that email already exists');
    const user = await models_1.User.create({
        fullName: input.fullName,
        email: input.email,
        password: await (0, auth_service_1.hashPassword)(input.password),
        roles: [input.role],
        bio: input.bio,
    });
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'user.create',
        entity: 'User',
        entityId: String(user._id),
        // The password is never recorded, not even hashed.
        meta: { email: user.email, role: input.role },
    });
    return (0, models_1.toUserResponse)(user);
};
exports.createUser = createUser;
const getUserById = async (id) => {
    const user = await models_1.User.findById(id);
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    return (0, models_1.toUserResponse)(user);
};
exports.getUserById = getUserById;
const updateUser = async (id, input, req) => {
    if (input.email) {
        const duplicate = await models_1.User.findOne({ email: input.email, _id: { $ne: id } });
        if (duplicate)
            throw ApiError_1.ApiError.conflict('That email is already in use');
    }
    const user = await models_1.User.findByIdAndUpdate(id, { $set: input }, { new: true, runValidators: true });
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'user.update',
        entity: 'User',
        entityId: id,
        meta: { fields: Object.keys(input) },
    });
    return (0, models_1.toUserResponse)(user);
};
exports.updateUser = updateUser;
/**
 * Changes a role. Guards against removing the last active administrator, which
 * would lock everyone out of the admin surface.
 */
const updateUserRole = async (id, role, req) => {
    const user = await models_1.User.findById(id);
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    const isSelf = String(user._id) === req.user?.id;
    if (isSelf && role !== user.roles[0]) {
        throw ApiError_1.ApiError.badRequest('You cannot change your own role');
    }
    const losingAdmin = user.roles.includes('admin') && role !== 'admin';
    if (losingAdmin) {
        const remainingAdmins = await models_1.User.countDocuments({
            roles: 'admin',
            status: 'active',
            isDeleted: false,
            _id: { $ne: user._id },
        });
        if (remainingAdmins === 0) {
            throw ApiError_1.ApiError.badRequest('At least one active administrator must remain');
        }
    }
    user.roles = [role];
    await user.save();
    // The old role's permissions no longer apply, so drop live sessions.
    await (0, auth_service_1.revokeAllSessions)(id);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'user.role_change',
        entity: 'User',
        entityId: id,
        meta: { role },
    });
    return (0, models_1.toUserResponse)(user);
};
exports.updateUserRole = updateUserRole;
/** Suspends or reactivates an account and revokes its sessions. */
const updateUserStatus = async (id, status, req) => {
    if (req.user?.id === id)
        throw ApiError_1.ApiError.badRequest('You cannot change your own status');
    const user = await models_1.User.findById(id);
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    if (status === 'suspended' && user.roles.includes('admin')) {
        const remainingAdmins = await models_1.User.countDocuments({
            roles: 'admin',
            status: 'active',
            isDeleted: false,
            _id: { $ne: user._id },
        });
        if (remainingAdmins === 0) {
            throw ApiError_1.ApiError.badRequest('At least one active administrator must remain');
        }
    }
    user.status = status;
    await user.save();
    if (status === 'suspended')
        await (0, auth_service_1.revokeAllSessions)(id);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'user.status_change',
        entity: 'User',
        entityId: id,
        meta: { status },
    });
    return (0, models_1.toUserResponse)(user);
};
exports.updateUserStatus = updateUserStatus;
/** Soft delete so enrolments and certificates keep valid references. */
const deleteUser = async (id, req) => {
    if (req.user?.id === id)
        throw ApiError_1.ApiError.badRequest('You cannot delete your own account');
    const user = await models_1.User.findByIdAndUpdate(id, { $set: { isDeleted: true, status: 'suspended' } }, { new: true });
    if (!user)
        throw ApiError_1.ApiError.notFound('User not found');
    await (0, auth_service_1.revokeAllSessions)(id);
    await (0, audit_service_1.recordAudit)({
        req,
        actorId: req.user?.id,
        actorRole: req.user?.roles[0],
        action: 'user.delete',
        entity: 'User',
        entityId: id,
    });
};
exports.deleteUser = deleteUser;
/** All statuses, used by the admin user table filter dropdown. */
const availableStatuses = () => constants_1.USER_STATUSES;
exports.availableStatuses = availableStatuses;
//# sourceMappingURL=user.service.js.map