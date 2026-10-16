// backend/src/models/Question.js

import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please provide a product'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide an asker'],
    },
    question: {
      type: String,
      required: [true, 'Please provide a question'],
      trim: true,
      maxlength: [1000, 'Question cannot be more than 1000 characters'],
    },
    answer: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Answer cannot be more than 2000 characters'],
    },
    answeredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'answered', 'rejected'],
      default: 'pending',
    },
    featured: {
      type: Boolean,
      default: false,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ---- Indexes for faster queries ----
questionSchema.index({ product: 1, status: 1, createdAt: -1 });
questionSchema.index({ createdAt: -1 });

const Question = mongoose.model('Question', questionSchema);
export default Question;
