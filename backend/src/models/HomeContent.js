import mongoose from 'mongoose';

const homeContentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      default: '',
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

const HomeContent = mongoose.model('HomeContent', homeContentSchema);
export default HomeContent;