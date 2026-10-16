import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    device: { type: String, default: 'Unknown' },
    browser: { type: String, default: 'Unknown' },
    os: { type: String, default: 'Unknown' },
    ip: { type: String, default: '' },
    location: { type: String, default: '' },
    lastActive: { type: Date, default: Date.now },
    isCurrent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

sessionSchema.index({ user: 1, lastActive: -1 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
