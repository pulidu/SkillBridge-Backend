import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { ENROLLMENT_STATUSES, type EnrollmentStatus } from '../constants';

export interface IEnrollment {
  course: Types.ObjectId;
  student: Types.ObjectId;
  status: EnrollmentStatus;
  progress: number;
  completedLessons: Types.ObjectId[];
  timeSpentMinutes: number;
  lastAccessedAt: Date;
  completedAt?: Date;
  finalScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentDocument = HydratedDocument<IEnrollment>;
export type EnrollmentModel = Model<IEnrollment>;

const enrollmentSchema = new Schema<IEnrollment, EnrollmentModel>(
  {
    course: {
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
    status: { type: String, enum: ENROLLMENT_STATUSES, default: 'active', index: true },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    completedLessons: { type: [{ type: Schema.Types.ObjectId, ref: 'Lesson' }], default: [] },
    timeSpentMinutes: { type: Number, default: 0, min: 0 },
    lastAccessedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    finalScore: { type: Number, min: 0, max: 100 },
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

// One enrolment per student per course.
enrollmentSchema.index({ course: 1, student: 1 }, { unique: true });
enrollmentSchema.index({ student: 1, status: 1 });

/**
 * Progress is derived, never trusted from the client: it is always a rounded
 * percentage of completed published lessons.
 */
export const calculateProgress = (completed: number, total: number): number => {
  if (total <= 0) return 0;
  const percent = (completed / total) * 100;
  return Math.min(100, Math.max(0, Math.round(percent)));
};

export const Enrollment = model<IEnrollment, EnrollmentModel>('Enrollment', enrollmentSchema);
