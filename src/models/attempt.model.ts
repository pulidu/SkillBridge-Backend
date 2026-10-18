import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface AttemptAnswer {
  question: Types.ObjectId;
  selectedOptionIds: Types.ObjectId[];
  textAnswer?: string;
  isCorrect: boolean;
  pointsAwarded: number;
}

export interface IAttempt {
  quiz: Types.ObjectId;
  course: Types.ObjectId;
  student: Types.ObjectId;
  enrollment?: Types.ObjectId;
  answers: AttemptAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  attemptNumber: number;
  timeSpentSeconds: number;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type AttemptDocument = HydratedDocument<IAttempt>;
export type AttemptModel = Model<IAttempt>;

const attemptAnswerSchema = new Schema<AttemptAnswer>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Quiz.questions', required: true },
    selectedOptionIds: { type: [{ type: Schema.Types.ObjectId }], default: [] },
    textAnswer: { type: String, trim: true },
    isCorrect: { type: Boolean, default: false },
    pointsAwarded: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const attemptSchema = new Schema<IAttempt, AttemptModel>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz is required'],
      index: true,
    },
    // Denormalised so roster analytics need no aggregation across quizzes.
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
      index: true,
    },
    enrollment: { type: Schema.Types.ObjectId, ref: 'Enrollment' },
    answers: { type: [attemptAnswerSchema], default: [] },
    score: { type: Number, default: 0, min: 0 },
    maxScore: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    passed: { type: Boolean, default: false },
    attemptNumber: { type: Number, default: 1, min: 1 },
    timeSpentSeconds: { type: Number, default: 0, min: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

attemptSchema.index({ quiz: 1, student: 1, attemptNumber: 1 });
attemptSchema.index({ student: 1, createdAt: -1 });

export const Attempt = model<IAttempt, AttemptModel>('Attempt', attemptSchema);
