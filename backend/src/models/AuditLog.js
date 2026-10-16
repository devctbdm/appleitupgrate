import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.Mixed, default: null }, // { id, name, role }
  action: { type: String, required: true },
  target: { type: String, default: '' },
  changes: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);
