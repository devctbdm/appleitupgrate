import mongoose from 'mongoose';

const phoneSchema = new mongoose.Schema(
  {
    label: { type: String, default: '', trim: true, maxlength: 40 },
    number: { type: String, default: '', trim: true, maxlength: 40 },
  },
  { _id: false }
);

const physicalStoreSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Store title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters'],
    },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    description: { type: String, default: '', trim: true, maxlength: 300 },
    phones: { type: [phoneSchema], default: [] },
    openTime: { type: String, default: '', trim: true, maxlength: 40 },
    closeTime: { type: String, default: '', trim: true, maxlength: 40 },
    offDay: { type: String, default: '', trim: true, maxlength: 40 },
    mapUrl: { type: String, default: '', trim: true, maxlength: 500 },
    active: { type: Boolean, default: true },
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
  { timestamps: true }
);

physicalStoreSchema.index({ active: 1, sortOrder: 1 });

const PhysicalStore = mongoose.model('PhysicalStore', physicalStoreSchema);
export default PhysicalStore;
