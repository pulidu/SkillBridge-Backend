import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export type StudyTaskPriority = 'low' | 'medium' | 'high';
export type StudyTaskStatus = 'todo' | 'in_progress' | 'completed';
export type StudyTaskSource = 'manual' | 'assignment';

export interface IStudyTask {
  student: Types.ObjectId;
  course?: Types.ObjectId;
  assignment?: Types.ObjectId;
  title: string;
  description?: string;
  dueDate: Date;
  estimatedStudyMinutes: number;
  priority: StudyTaskPriority;
  status: StudyTaskStatus;
  source: StudyTaskSource;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type StudyTaskDocument = HydratedDocument<IStudyTask>;
export type StudyTaskModel = Model<IStudyTask>;

const studyTaskSchema = new Schema<IStudyTask, StudyTaskModel>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      index: true,
    },
    assignment: {
      type: Schema.Types.ObjectId,
      ref: 'Assignment',
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    dueDate: {
      type: Date,
      required: [true, 'Due date is required'],
      index: true,
    },
    estimatedStudyMinutes: {
      type: Number,
      required: [true, 'Estimated study time is required'],
      min: [5, 'Estimated study time must be at least 5 minutes'],
      max: [720, 'Estimated study time cannot exceed 12 hours'],
      default: 60,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      index: true,
    },
    status: {
      type: String,
      enum: ['todo', 'in_progress', 'completed'],
      default: 'todo',
      index: true,
    },
    source: {
      type: String,
      enum: ['manual', 'assignment'],
      default: 'manual',
    },
    completedAt: {
      type: Date,
    },
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

// Indexes
studyTaskSchema.index({ student: 1, status: 1, dueDate: 1 });
studyTaskSchema.index({ student: 1, dueDate: 1 });

// Prevent duplicate assignment tasks per student
studyTaskSchema.index(
  { student: 1, assignment: 1 },
  {
    unique: true,
    partialFilterExpression: {
      assignment: { $type: 'objectId' },
    },
  },
);

export const StudyTask = model<IStudyTask, StudyTaskModel>('StudyTask', studyTaskSchema);
