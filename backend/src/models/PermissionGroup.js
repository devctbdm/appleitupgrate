import mongoose from 'mongoose';

// ── Module-level permissions subdoc (mirrors TeamMember's customPermissions) ─
const modulePermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    manage: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
  },
  { _id: false }
);

const permissionGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 300,
    },
    color: {
      type: String,
      default: '#6366f1', // indigo — just a UI hint stored with the group
      trim: true,
    },
    permissions: {
      type: [modulePermissionSchema],
      default: [],
    },
    // Who created / last modified this group (soft audit trail)
    createdBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, default: '' },
    },
    updatedBy: {
      id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String, default: '' },
    },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const PermissionGroup =
  mongoose.models.PermissionGroup ||
  mongoose.model('PermissionGroup', permissionGroupSchema);
export default PermissionGroup;
