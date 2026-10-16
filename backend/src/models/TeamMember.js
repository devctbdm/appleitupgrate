import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const teamMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'super_admin'],
      default: 'manager',
    },
    active: { type: Boolean, default: true },
    lastLogin: { type: Date },
    password: { type: String, select: false },
    phone: { type: String, trim: true },
    twoFactorOtp: String,
    twoFactorOtpExpire: Date,
    twoFactorAttempts: { type: Number, default: 0 },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

// ---- Hash password before saving ----
teamMemberSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ---- Compare entered password with hashed password ----
teamMemberSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    return false;
  }
  return await bcrypt.compare(candidatePassword, this.password);
};

const TeamMember = mongoose.model('TeamMember', teamMemberSchema);
export default TeamMember;
