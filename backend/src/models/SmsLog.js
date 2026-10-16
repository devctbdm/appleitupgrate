import mongoose from 'mongoose';

const smsLogSchema = new mongoose.Schema(
  {
    to: { type: [String], required: true },
    message: { type: String, required: true },
    segments: { type: Number, default: 1 },
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    providerStatus: { type: String, default: '' },
    providerMessage: { type: String, default: '' },
    errorCode: { type: String, default: '' },
    raw: { type: mongoose.Schema.Types.Mixed, default: {} },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

smsLogSchema.index({ createdAt: -1 });

const SmsLog = mongoose.model('SmsLog', smsLogSchema);
export default SmsLog;
