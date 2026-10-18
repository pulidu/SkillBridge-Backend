import bcrypt from 'bcryptjs';
import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { ROLES, USER_STATUSES, type Role, type UserStatus } from '../constants';

export interface RefreshToken {
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface IUser {
  fullName: string;
  email: string;
  password: string;
  roles: Role[];
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastLoginAt?: Date;
  refreshTokens: RefreshToken[];
  passwordChangedAt: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

export type UserDocument = HydratedDocument<IUser, IUserMethods>;
export type UserModel = Model<IUser, Record<string, never>, IUserMethods>;

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [80, 'Full name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never returned unless explicitly selected.
      select: false,
    },
    roles: {
      type: [{ type: String, enum: ROLES }],
      default: ['student'],
      validate: {
        validator: (value: string[]) => Array.isArray(value) && value.length > 0,
        message: 'A user must have at least one role',
      },
    },
    avatarUrl: { type: String, trim: true },
    bio: { type: String, trim: true, maxlength: [500, 'Bio must be at most 500 characters'] },
    status: { type: String, enum: USER_STATUSES, default: 'active', index: true },
    lastLoginAt: { type: Date },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
    passwordChangedAt: { type: Date, default: Date.now, select: false },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.passwordChangedAt;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

userSchema.index({ roles: 1 });

userSchema.virtual('primaryRole').get(function (this: UserDocument): Role {
  if (!this.roles || !Array.isArray(this.roles)) return 'student';
  const priority: Role[] = ['admin', 'instructor', 'student'];
  return priority.find((role) => this.roles.includes(role)) ?? 'student';
});

userSchema.virtual('initials').get(function (this: UserDocument): string {
  if (!this.fullName) return 'U';
  return this.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

/** Fields that are safe to expose to any client. */
export const toUserResponse = (user: {
  _id: Types.ObjectId | string;
  fullName: string;
  email: string;
  roles: Role[];
  avatarUrl?: string;
  bio?: string;
  status: UserStatus;
  lastLoginAt?: Date;
  createdAt: Date;
}) => {
  const roles = user.roles || ['student'];
  const priority: Role[] = ['admin', 'instructor', 'student'];
  const primaryRole: Role = priority.find((role) => roles.includes(role)) ?? 'student';
  const initials = user.fullName
    ? user.fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('')
    : 'U';

  return {
    id: String(user._id),
    fullName: user.fullName,
    email: user.email,
    roles: user.roles,
    primaryRole,
    initials,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
};

export const User = model<IUser, UserModel>('User', userSchema);
