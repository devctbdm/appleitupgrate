import mongoose from 'mongoose';

const sliderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    image: {
      type: String,
      default: '',
    },
    link: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: ['hero', 'ad_top', 'ad_bottom'],
      default: 'hero',
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

sliderSchema.index({ type: 1, sortOrder: 1 });
sliderSchema.index({ active: 1 });

const Slider = mongoose.model('Slider', sliderSchema);
export default Slider;
