import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';
import { slugify } from '../utils/slug';

export interface IModule {
  course: Types.ObjectId;
  title: string;
  description?: string;
  position: number;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ModuleDocument = HydratedDocument<IModule>;
export type ModuleModel = Model<IModule>;

const moduleSchema = new Schema<IModule, ModuleModel>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Module title is required'],
      trim: true,
      maxlength: [120, 'Title must be at most 120 characters'],
    },
    description: { type: String, trim: true, maxlength: [1000, 'Description is too long'] },
    position: { type: Number, default: 0, min: 0 },
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

moduleSchema.index({ course: 1, position: 1 });
moduleSchema.pre('validate', function (next) {
  if (!this.title) next();
  else {
    this.title = this.title.trim();
    next();
  }
});

/** Convenience export so titles can be slugged consistently. */
export const moduleSlug = slugify;

export const CourseModule = model<IModule, ModuleModel>('Module', moduleSchema);
