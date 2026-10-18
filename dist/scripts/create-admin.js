"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Creates the very first administrator.
 *
 * Self-registration can only ever create a `student`, so the platform needs one
 * trusted way to mint an admin. That is this script, and it is deliberately
 * awkward to run by accident:
 *
 *   - credentials come from the environment, never from argv, so they never
 *     land in shell history or in a process listing;
 *   - `ADMIN_PASSWORD` must satisfy the same policy as every other password,
 *     and the obvious `SEED_PASSWORD` placeholder is rejected in production;
 *   - it refuses to run if an administrator already exists, so it cannot be
 *     used to quietly add a second privileged account;
 *   - the password is hashed with bcrypt before it is stored and never logged.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='...' npm run create-admin
 *
 * Run it once against a fresh database.
 */
const zod_1 = require("zod");
const database_1 = require("../config/database");
const env_1 = require("../config/env");
const auth_service_1 = require("../services/auth.service");
const models_1 = require("../models");
const auth_validator_1 = require("../validators/auth.validator");
const credentialsSchema = zod_1.z.object({
    fullName: zod_1.z.string().trim().min(2).max(80).default('Platform Administrator'),
    email: auth_validator_1.emailSchema,
    password: auth_validator_1.passwordSchema,
});
const fail = (message) => {
    console.error(`\ncreate-admin failed: ${message}\n`);
    process.exit(1);
};
const run = async () => {
    const parsed = credentialsSchema.safeParse({
        fullName: env_1.env.bootstrapAdmin.fullName || undefined,
        email: env_1.env.bootstrapAdmin.email,
        password: env_1.env.bootstrapAdmin.password,
    });
    if (!parsed.success) {
        fail('ADMIN_EMAIL and ADMIN_PASSWORD must be set to valid values.\n' +
            parsed.error.issues
                .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
                .join('\n'));
        return;
    }
    const { fullName, email, password } = parsed.data;
    if (env_1.env.isProduction && password === env_1.env.seedPassword) {
        fail('ADMIN_PASSWORD still matches the SEED_PASSWORD placeholder. Choose a unique password.');
    }
    await (0, database_1.connectDatabase)();
    const admins = await models_1.User.countDocuments({ roles: 'admin', isDeleted: false });
    if (admins > 0) {
        fail(`${admins} administrator account(s) already exist. ` +
            'This command is only for bootstrapping the first admin.');
    }
    const existing = await models_1.User.findOne({ email });
    if (existing)
        fail(`an account already exists for ${email}`);
    const user = await models_1.User.create({
        fullName,
        email,
        // Hashed here; the plaintext never reaches the database or the log.
        password: await (0, auth_service_1.hashPassword)(password),
        roles: ['admin'],
    });
    console.log(`\nAdministrator created.\n` +
        `  id:    ${String(user._id)}\n` +
        `  email: ${user.email}\n` +
        `  role:  ${user.roles.join(', ')}\n\n` +
        `Sign in at /login, then create instructor accounts from Admin > Users.\n` +
        `Remove ADMIN_PASSWORD from your environment once this account exists.\n`);
    await (0, database_1.disconnectDatabase)();
};
run().catch(async (error) => {
    console.error(`\ncreate-admin failed: ${error instanceof Error ? error.message : String(error)}\n`);
    await (0, database_1.disconnectDatabase)().catch(() => undefined);
    process.exit(1);
});
//# sourceMappingURL=create-admin.js.map