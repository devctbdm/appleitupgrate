import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot be more than 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Excludes password from queries by default
    },
    phone: {
      type: String,
      required: [true, 'Please provide a phone number'],
      trim: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: 'Dhaka' },
      state: { type: String, default: 'Dhaka' },
      postcode: { type: String, default: '1000' },
      country: { type: String, default: 'Bangladesh' },
    },
    addresses: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        label: { type: String, default: 'Home' },
        fullName: { type: String, default: '' },
        phone: { type: String, default: '' },
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postcode: { type: String, default: '' },
        country: { type: String, default: 'Bangladesh' },
        deliveryArea: { type: String, default: '' },
        isDefault: { type: Boolean, default: false },
      },
    ],
    role: {
      type: String,
      enum: ['super_admin', 'admin', 'manager', 'customer'],
      default: 'customer',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    twoFactorOtp: String,
    twoFactorOtpExpire: Date,
    twoFactorAttempts: { type: Number, default: 0 },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  {
    timestamps: true, // Adds createdAt & updatedAt
  }
);

// ---- Hash password before saving ----
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ---- Compare entered password with hashed password ----
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// ---- Remove password when converting to JSON ----
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

const User = mongoose.model('User', userSchema);
export default User;
