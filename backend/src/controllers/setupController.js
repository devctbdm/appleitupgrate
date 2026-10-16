// backend/src/controllers/setupController.js
// One-time initial setup: lets the website owner create the very first
// super_admin account. As soon as a super_admin exists (in either the User or
// TeamMember collection) both endpoints refuse to run again, so this route
// can never be used to mint extra super admins later.

import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember.js';
import User from '../models/User.js';

// Same pattern the User schema uses for its email validation.
const EMAIL_RE = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
const MIN_PASSWORD = Number(process.env.SETUP_MIN_PASSWORD) || 8;

// Serialize concurrent POSTs: two simultaneous requests must not both pass
// the "no super admin yet" check and create duplicate owner accounts.
let setupLock = Promise.resolve();
const withSetupLock = async (fn) => {
  const previous = setupLock;
  let release;
  setupLock = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
};

const hasSuperAdmin = async () => {
  const [user, member] = await Promise.all([
    User.exists({ role: 'super_admin' }),
    TeamMember.exists({ role: 'super_admin' }),
  ]);
  return Boolean(user || member);
};

const validateSetupInput = ({ name, email, phone, password }) => {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) return 'Please provide your name';
  if (trimmedName.length > 50) return 'Name cannot be more than 50 characters';
  if (!email || !EMAIL_RE.test(String(email).trim()))
    return 'Please provide a valid email';
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 7) return 'Please provide a valid phone number';
  if (!password || String(password).length < MIN_PASSWORD)
    return `Password must be at least ${MIN_PASSWORD} characters`;
  return null;
};

// @desc    Whether the site still needs its first super admin
// @route   GET /api/setup/status
// @access  Public (reveals nothing but a boolean)
export const getSetupStatus = async (req, res) => {
  try {
    const setupRequired = !(await hasSuperAdmin());
    res.json({ success: true, setupRequired });
  } catch (error) {
    console.error('Setup status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create the first super_admin account (runs at most once)
// @route   POST /api/setup
// @access  Public, rate-limited; permanently disabled after first success
export const runSetup = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body || {};

    const validationError = validateSetupInput({ name, email, phone, password });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const lookup = String(email).trim().toLowerCase();

    const result = await withSetupLock(async () => {
      if (await hasSuperAdmin()) {
        return {
          status: 409,
          body: {
            success: false,
            message:
              'Setup already completed. Sign in from the admin panel instead.',
          },
        };
      }

      const existing = await User.findOne({ email: lookup });
      if (existing) {
        return {
          status: 409,
          body: {
            success: false,
            message: 'An account with this email already exists',
          },
        };
      }

      // Password is hashed by the User model's pre-save hook.
      const user = await User.create({
        name: String(name).trim(),
        email: lookup,
        password: String(password),
        phone: String(phone).trim(),
        role: 'super_admin',
        status: 'active',
      });

      const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
        expiresIn: '3h',
      });

      console.log(`🎉 Initial super admin created: ${user.email}`);

      return {
        status: 201,
        body: {
          success: true,
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            address: user.address,
            isTeam: false,
            active: user.status === 'active',
          },
        },
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Setup error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
