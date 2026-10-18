import { Schema, model, type HydratedDocument, type Model } from 'mongoose';
import { slugify } from '../utils/slug';

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<ICategory>;
export type CategoryModel = Model<ICategory>;

const categorySchema = new Schema<ICategory, CategoryModel>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      unique: true,
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name must be at most 60 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: { type: String, trim: true, maxlength: [300, 'Description is too long'] },
    icon: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
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

// Derive the slug when the caller did not supply one.
categorySchema.pre('validate', function (next) {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name);
  }
  next();
});

export const Category = model<ICategory, CategoryModel>('Category', categorySchema);
