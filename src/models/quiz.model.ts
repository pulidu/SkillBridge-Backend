import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { QUESTION_TYPES, type QuestionType } from '../constants';

export interface QuestionOption {
  _id?: unknown;
  text: string;
  isCorrect: boolean;
}

export interface IQuestion {
  /** Assigned by Mongoose for embedded documents. */
  _id?: unknown;
  text: string;
  type: QuestionType;
  options: QuestionOption[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
}

export interface IQuiz {
  course: Types.ObjectId;
  lesson?: Types.ObjectId;
  title: string;
  description?: string;
  questions: IQuestion[];
  passingScore: number;
  timeLimitMinutes?: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type QuizDocument = HydratedDocument<IQuiz>;
export type QuizModel = Model<IQuiz>;

const questionSchema = new Schema<IQuestion>(
  {
    text: { type: String, required: [true, 'Question text is required'], trim: true },
    type: { type: String, enum: QUESTION_TYPES, default: 'single' },
    options: {
      type: [
        new Schema<QuestionOption>(
          {
            text: { type: String, required: true, trim: true },
            isCorrect: { type: Boolean, default: false },
          },
          { _id: true },
        ),
      ],
      default: [],
    },
    correctAnswer: { type: String, trim: true },
    points: { type: Number, default: 1, min: 0 },
    explanation: { type: String, trim: true, maxlength: [1000, 'Explanation is too long'] },
  },
  { _id: true },
);

const quizSchema = new Schema<IQuiz, QuizModel>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    lesson: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [160, 'Title must be at most 160 characters'],
    },
    description: { type: String, trim: true, maxlength: [1000, 'Description is too long'] },
    questions: { type: [questionSchema], default: [] },
    passingScore: { type: Number, default: 70, min: 0, max: 100 },
    timeLimitMinutes: { type: Number, min: 1 },
    maxAttempts: { type: Number, default: 3, min: 1 },
    shuffleQuestions: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
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
        return ret;
      },
    },
  },
);

/** Question shape returned to students: no answer key, options keep their ids. */
export interface SanitisedQuestion {
  _id: unknown;
  text: string;
  type: QuestionType;
  options: { _id: unknown; text: string }[];
  points: number;
  explanation?: string;
}

/** A quiz with its answer key removed. */
export type SanitisedQuiz<T> = Omit<T, 'questions'> & { questions: SanitisedQuestion[] };

/**
 * Strips the answer key before a quiz is sent to a student, so correct options
 * can never be read out of a network payload.
 */
export const sanitiseQuizForStudent = <T extends { questions: IQuestion[] }>(
  quiz: T,
): SanitisedQuiz<T> => ({
  ...quiz,
  questions: quiz.questions.map((question) => ({
    _id: question._id,
    text: question.text,
    type: question.type,
    points: question.points,
    explanation: question.explanation,
    options: question.options.map((option) => ({
      _id: option._id,
      text: option.text,
    })),
  })),
});

export const Quiz = model<IQuiz, QuizModel>('Quiz', quizSchema);
