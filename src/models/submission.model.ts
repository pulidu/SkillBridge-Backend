import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { SUBMISSION_STATUSES, type SubmissionStatus } from '../constants';

export interface SubmissionAttachment {
  name: string;
  url: string;
  size: number;
  mimeType?: string;
}

export interface ISubmission {
  course: Types.ObjectId;
  /** Set when the work answers a first-class `Assignment`. */
  assignment?: Types.ObjectId;
  lesson?: Types.ObjectId;
  /** Denormalised so lists and emails render without an extra join. */
  assignmentTitle: string;
  student: Types.ObjectId;
  enrollment?: Types.ObjectId;
  /** The written answer. */
  content: string;
  /** The answer, when it is hosted elsewhere. */
  answerUrl?: string;
  attachments: SubmissionAttachment[];
  /** Copied from the assignment so historical grades stay stable. */
  maxMarks?: number;
  status: SubmissionStatus;
  grade?: number;
  feedback?: string;
  gradedBy?: Types.ObjectId;
  gradedAt?: Date;
  dueAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type SubmissionDocument = HydratedDocument<ISubmission>;
export type SubmissionModel = Model<ISubmission>;

const submissionAttachmentSchema = new Schema<SubmissionAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    size: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, trim: true },
  },
  { _id: false },
);

const submissionSchema = new Schema<ISubmission, SubmissionModel>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson', index: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true },
    assignmentTitle: {
      type: String,
      required: [true, 'Assignment title is required'],
      trim: true,
      maxlength: [160, 'Title must be at most 160 characters'],
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
    content: { type: String, trim: true, default: '' },
    answerUrl: { type: String, trim: true },
    attachments: { type: [submissionAttachmentSchema], default: [] },
    maxMarks: { type: Number, min: 1, max: 1000 },
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'submitted', index: true },
    grade: { type: Number, min: 0, max: 100 },
    feedback: { type: String, trim: true, maxlength: [2000, 'Feedback is too long'] },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    dueAt: { type: Date },
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

/**
 * A submission must carry an answer. Without this rule a record created by a
 * background job or a malformed request could sit in the grading queue with
 * nothing to grade.
 */
submissionSchema.pre('validate', function (next) {
  if (!this.content && !this.answerUrl && this.attachments.length === 0) {
    this.invalidate('content', 'Provide written content, a URL, or an attachment');
  }
  next();
});

submissionSchema.index({ course: 1, student: 1 });
submissionSchema.index({ status: 1, course: 1 });

/*
 * Duplicate prevention.
 *
 * A learner may answer each task exactly once:
 *   - assignment-based work is keyed on { assignment, student }
 *   - legacy lesson-based work (a lesson with type = 'assignment') on { lesson, student }
 *
 * Both indexes are partial so a submission that uses one path never blocks the
 * other, and neither applies to documents where the key is absent.
 */
submissionSchema.index(
  { assignment: 1, student: 1 },
  { unique: true, partialFilterExpression: { assignment: { $type: 'objectId' } } },
);
submissionSchema.index(
  { lesson: 1, student: 1 },
  { unique: true, partialFilterExpression: { lesson: { $type: 'objectId' } } },
);

export const Submission = model<ISubmission, SubmissionModel>('Submission', submissionSchema);
