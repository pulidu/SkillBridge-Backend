import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { LESSON_TYPES, type LessonType } from '../constants';
import { slugify } from '../utils/slug';

export interface LessonAttachment {
  name: string;
  url: string;
  size: number;
  mimeType?: string;
}

export interface ILesson {
  course: Types.ObjectId;
  module?: Types.ObjectId;
  title: string;
  slug: string;
  content?: string;
  videoUrl?: string;
  attachments: LessonAttachment[];
  type: LessonType;
  position: number;
  durationMinutes: number;
  isPreview: boolean;
  isPublished: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type LessonDocument = HydratedDocument<ILesson>;
export type LessonModel = Model<ILesson>;

const attachmentSchema = new Schema<LessonAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    size: { type: Number, default: 0, min: 0 },
    mimeType: { type: String, trim: true },
  },
  { _id: false },
);

const lessonSchema = new Schema<ILesson, LessonModel>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    module: { type: Schema.Types.ObjectId, ref: 'Module', index: true },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [160, 'Title must be at most 160 characters'],
    },
    slug: { type: String, required: true, lowercase: true, trim: true },
    content: { type: String, default: '' },
    videoUrl: { type: String, trim: true },
    attachments: { type: [attachmentSchema], default: [] },
    type: { type: String, enum: LESSON_TYPES, default: 'article' },
    position: { type: Number, default: 0, min: 0 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    isPreview: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false, index: true },
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

lessonSchema.index({ course: 1, position: 1 });
lessonSchema.index({ course: 1, slug: 1 }, { unique: true });

lessonSchema.pre('validate', function (next) {
  if (this.title && !this.slug) {
    this.slug = slugify(this.title);
  }
  next();
});

export const Lesson = model<ILesson, LessonModel>('Lesson', lessonSchema);
