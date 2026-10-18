import { Schema, model, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface IRating {
  course: Types.ObjectId;
  user: Types.ObjectId;
  value: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type RatingDocument = HydratedDocument<IRating>;
export type RatingModel = Model<IRating>;

const ratingSchema = new Schema<IRating, RatingModel>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
      index: true,
    },
    value: {
      type: Number,
      required: [true, 'Rating value is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
    },
    review: { type: String, trim: true, maxlength: [1000, 'Review is too long'] },
  },
  { timestamps: true },
);

// One rating per user per course; re-rating updates the existing document.
ratingSchema.index({ course: 1, user: 1 }, { unique: true });

export const Rating = model<IRating, RatingModel>('Rating', ratingSchema);
