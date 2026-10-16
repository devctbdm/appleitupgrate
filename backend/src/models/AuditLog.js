import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.Mixed, default: null }, // { id, name, role }
  action: { type: String, required: true },

  /**
   * Structured event type for programmatic querying — distinct from `action`
   * which is the raw "METHOD /path" string from the generic audit middleware.
   * Staff management events use explicit identifiers like:
   *   STAFF_CREATED | STAFF_UPDATED | STAFF_DELETED | STAFF_STATUS_CHANGED |
   *   STAFF_ROLE_CHANGED | STAFF_PERMISSIONS_UPDATED |
   *   PERMISSION_GROUP_CREATED | PERMISSION_GROUP_UPDATED | PERMISSION_GROUP_DELETED |
   *   LOGIN
   */
  eventType: { type: String, default: '' },

  target: { type: String, default: '' },
  changes: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, default: '' },
  userAgent: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient staff-activity queries used by the overview dashboard
auditLogSchema.index({ eventType: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.id': 1, createdAt: -1 });

export default mongoose.models.AuditLog ||
  mongoose.model('AuditLog', auditLogSchema);
