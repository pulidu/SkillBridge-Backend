import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface ICertificate {
  serialNumber: string;
  course: Types.ObjectId;
  student: Types.ObjectId;
  enrollment: Types.ObjectId;
  finalScore?: number;
  issuedAt: Date;
  revokedAt?: Date;
  revokedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CertificateDocument = HydratedDocument<ICertificate>;
export type CertificateModel = Model<ICertificate>;

const certificateSchema = new Schema<ICertificate, CertificateModel>(
  {
    serialNumber: {
      type: String,
      required: [true, 'Serial number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment', required: true },
    finalScore: { type: Number, min: 0, max: 100 },
    issuedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date },
    revokedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret: Record<string, unknown>) {
        ret.id = String(ret._id);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

// `serialNumber` is declared unique inline; only the compound lookup needs an
// explicit index.
certificateSchema.index({ student: 1, course: 1 }, { unique: true });

/** Builds a human-verifiable serial such as `SB-2026-0001A2B`. */
export const buildSerialNumber = (sequence: number, salt: string): string =>
  `SB-${new Date().getFullYear()}-${String(sequence).padStart(6, '0')}${salt.toUpperCase()}`;

export const Certificate = model<ICertificate, CertificateModel>('Certificate', certificateSchema);
