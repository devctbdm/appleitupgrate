import mongoose from 'mongoose';

const homeSliderTextSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: [true, 'Text is required'],
      trim: true,
      maxlength: [200, 'Text cannot exceed 200 characters'],
    },
    active: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      min: [0, 'Sort order cannot be negative'],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

homeSliderTextSchema.index({ active: 1, sortOrder: 1 });

const HomeSliderText = mongoose.model('HomeSliderText', homeSliderTextSchema);
export default HomeSliderText;
