import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Permission subdoc schema ────────────────────────────────────────────────
// Stores per-module boolean flags for each action type.
const modulePermissionSchema = new mongoose.Schema(
  {
    module: { type: String, required: true }, // e.g. 'orders', 'products'
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false },
    manage: { type: Boolean, default: false },
    export: { type: Boolean, default: false },
  },
  { _id: false }
);

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ['admin', 'manager', 'super_admin'],
      default: 'manager',
    },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date },
    password: { type: String, select: false },
    phone: { type: String, trim: true, default: '' },
    avatar: { type: String, default: '' },

    // ── Permission Group (optional template reference) ──────────────────
    permissionGroup: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PermissionGroup',
      default: null,
    },

    // ── Granular custom permissions (overrides the group if present) ─────
    // When customPermissions is non-empty it takes complete precedence over
    // any linked permissionGroup so each member can have tailor-made access.
    customPermissions: {
      type: [modulePermissionSchema],
      default: [],
    },

    // ── Two-factor auth fields ───────────────────────────────────────────
    twoFactorOtp: String,
    twoFactorOtpExpire: Date,
    twoFactorAttempts: { type: Number, default: 0 },

    // ── Brute-force protection fields ───────────────────────────────────
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

// ── Hash password before saving ─────────────────────────────────────────────
teamMemberSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Compare entered password with hashed password ───────────────────────────
teamMemberSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Strip sensitive fields from JSON output ─────────────────────────────────
teamMemberSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.twoFactorOtp;
    delete ret.twoFactorOtpExpire;
    delete ret.twoFactorAttempts;
    delete ret.loginAttempts;
    delete ret.lockUntil;
    return ret;
  },
});

const TeamMember =
  mongoose.models.TeamMember ||
  mongoose.model('TeamMember', teamMemberSchema);
export default TeamMember;
