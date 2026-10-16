// backend/src/controllers/authController.js

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { recordLogin } from '../middleware/audit.js';
import Session from '../models/Session.js';
import { getSmsSetting } from '../models/SmsSetting.js';
import TeamMember from '../models/TeamMember.js';
import User from '../models/User.js';
import { sendLoginOtp, sendPasswordResetOtp } from '../services/smsService.js';
import { parseUserAgent } from '../utils/parseUA.js';

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '3h' });
};

// Record a login session, safe to call even if it fails
const recordSession = async (userId, req) => {
  try {
    await Session.updateMany({ user: userId }, { isCurrent: false });
    const ua = parseUserAgent(req.headers['user-agent'] || '');
    await Session.create({
      user: userId,
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      ip: req.ip || req.connection?.remoteAddress || '',
      lastActive: new Date(),
      isCurrent: true,
    });
  } catch {
    // non-blocking
  }
};

// Shape the user object returned to the client
const publicUser = (u, isTeam = false) => ({
  id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  phone: isTeam ? '' : u.phone,
  address: isTeam ? {} : u.address,
  isTeam,
  active: u.active,
});

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

const phoneRegex = (phone) => {
  const digits = String(phone).replace(/[^\d]/g, '');
  return new RegExp(`${digits.slice(-10)}$`);
};

// ---- Brute-force protection: per-account lockout ----
const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS) || 5;
const LOCK_MINUTES = Number(process.env.LOCK_TIME_MINUTES) || 15;

const isLocked = (account) =>
  !!account.lockUntil && account.lockUntil > new Date();

const lockMinutesRemaining = (account) =>
  Math.max(1, Math.ceil((account.lockUntil - Date.now()) / 60000));

// Count a wrong password; lock the account after MAX_LOGIN_ATTEMPTS failures
const registerFailedLogin = async (account) => {
  account.loginAttempts = (account.loginAttempts || 0) + 1;
  if (account.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
    account.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    account.loginAttempts = 0;
  }
  await account.save();
};

// A correct password resets the failure counters
const clearLoginAttempts = async (account) => {
  if (!account.loginAttempts && !account.lockUntil) return;
  account.loginAttempts = 0;
  account.lockUntil = undefined;
  await account.save();
};

// Issue an SMS OTP challenge for a staff account and answer with pendingToken.
// Works for both User and TeamMember accounts (`source` marks which collection).
const startTwoFactorChallenge = async (req, res, account, source) => {
  const smsSetting = await getSmsSetting();
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Math.max(15, smsSetting.otpExpirySeconds || 60);
  account.twoFactorOtp = hashOtp(otp);
  account.twoFactorOtpExpire = Date.now() + expiry * 1000;
  account.twoFactorAttempts = 0;
  await account.save();

  const result = await sendLoginOtp({
    phone: account.phone,
    otp,
    expirySeconds: expiry,
  });
  if (result.skipped || !result.success) {
    console.error(
      'Login 2FA SMS failed:',
      result.reason || result.log?.providerMessage
    );
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        success: false,
        message:
          'Could not send the verification code. SMS service is not configured or is unavailable.',
      });
    }
    // Dev fallback: surface the OTP in the server console so the second
    // factor can still be completed without a delivered SMS.
    console.warn(
      `[DEV 2FA] Verification code for ${account.phone || account.email}: ${otp}`
    );
  }

  const pendingToken = jwt.sign(
    { id: account._id.toString(), purpose: '2fa-login', source },
    process.env.JWT_SECRET,
    { expiresIn: '5m' }
  );
  return res.json({
    success: false,
    twoFactorRequired: true,
    pendingToken,
    expiresIn: expiry,
    message: 'Enter the code sent to your phone',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user (password hashed automatically by User model pre-save hook)
    const user = new User({
      name,
      email,
      password,
      phone,
      address,
      role: 'customer', // default
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const email = req.body.email || identifier;
    const lookup = email.toLowerCase().trim();

    // 1) Try a regular customer/admin User account
    const user = await User.findOne({
      $or: [{ email: lookup }, { phone: email.trim() }],
    }).select('+password');

    if (user) {
      // Brute-force guard: temporary lock after repeated failures
      if (isLocked(user)) {
        return res.status(429).json({
          success: false,
          message: `Account temporarily locked after too many failed attempts. Try again in ${lockMinutesRemaining(user)} minute(s).`,
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        await registerFailedLogin(user);
        return res.status(401).json({
          success: false,
          message: 'Invalid email/phone or password',
        });
      }
      await clearLoginAttempts(user);

      // Two-factor authentication for staff (admin/manager/super_admin)
      const smsSetting = await getSmsSetting();
      const isStaff =
        user.role === 'admin' ||
        user.role === 'super_admin' ||
        user.role === 'manager';
      if (isStaff && smsSetting.twoFactorEnabled) {
        return startTwoFactorChallenge(req, res, user, 'user');
      }

      const token = generateToken(user._id);
      await recordSession(user._id, req);
      if (isStaff) recordLogin(req, user);
      return res.json({
        success: true,
        token,
        user: publicUser(user, false),
      });
    }

    // 2) Try a TeamMember (staff / team collection)
    const member = await TeamMember.findOne({ email: lookup }).select('+password');
    if (!member) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password',
      });
    }
    if (!member.active) {
      return res.status(403).json({
        success: false,
        message: 'This account is inactive. Contact an administrator.',
      });
    }

    // Brute-force guard: temporary lock after repeated failures
    if (isLocked(member)) {
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked after too many failed attempts. Try again in ${lockMinutesRemaining(member)} minute(s).`,
      });
    }

    const isMatch = await member.comparePassword(password);
    if (!isMatch) {
      await registerFailedLogin(member);
      return res.status(401).json({
        success: false,
        message: 'Invalid email/phone or password',
      });
    }
    await clearLoginAttempts(member);

    // Two-factor authentication for team members (same policy as staff Users)
    const smsSetting = await getSmsSetting();
    if (smsSetting.twoFactorEnabled) {
      return startTwoFactorChallenge(req, res, member, 'team');
    }

    // Generate token
    const token = generateToken(member._id);
    // Update last login time
    member.lastLogin = new Date();
    await member.save();
    recordLogin(req, member);

    res.json({
      success: true,
      token,
      user: {
        id: member._id,
        name: member.name,
        email: member.email,
        role: member.role,
        phone: '',
        address: {},
        isTeam: true,
        active: member.active,
      },
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify the 2FA OTP and complete login (staff only)
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res) => {
  try {
    const { pendingToken, otp } = req.body;
    if (!pendingToken || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Verification token and OTP are required',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(pendingToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Verification session expired. Please log in again.',
      });
    }
    if (decoded.purpose !== '2fa-login') {
      return res.status(401).json({
        success: false,
        message: 'Invalid verification token',
      });
    }

    // The pending token records which collection authenticated (User vs TeamMember)
    const isTeamAccount = decoded.source === 'team';
    const account = isTeamAccount
      ? await TeamMember.findById(decoded.id).select('+password')
      : await User.findById(decoded.id).select('+password');
    if (!account) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please log in again.',
      });
    }

    if (!account.twoFactorOtp || !account.twoFactorOtpExpire) {
      return res.status(400).json({
        success: false,
        message: 'No verification code was requested. Please log in again.',
      });
    }
    if (account.twoFactorOtpExpire < Date.now()) {
      account.twoFactorOtp = undefined;
      account.twoFactorOtpExpire = undefined;
      account.twoFactorAttempts = 0;
      await account.save();
      return res.status(400).json({
        success: false,
        message: 'Code has expired. Please log in again.',
      });
    }
    if ((account.twoFactorAttempts || 0) >= 5) {
      account.twoFactorOtp = undefined;
      account.twoFactorOtpExpire = undefined;
      account.twoFactorAttempts = 0;
      await account.save();
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please log in again.',
      });
    }
    if (account.twoFactorOtp !== hashOtp(otp)) {
      account.twoFactorAttempts = (account.twoFactorAttempts || 0) + 1;
      await account.save();
      return res.status(400).json({
        success: false,
        message: 'Invalid code. Please try again.',
      });
    }

    // Success — clear OTP and complete login
    account.twoFactorOtp = undefined;
    account.twoFactorOtpExpire = undefined;
    account.twoFactorAttempts = 0;

    const token = generateToken(account._id);

    if (isTeamAccount) {
      account.lastLogin = new Date();
      await account.save();
      recordLogin(req, account);
      return res.json({
        success: true,
        token,
        user: {
          id: account._id,
          name: account.name,
          email: account.email,
          role: account.role,
          phone: '',
          address: {},
          isTeam: true,
          active: account.active,
        },
      });
    }

    await account.save();
    await recordSession(account._id, req);
    recordLogin(req, account);
    return res.json({
      success: true,
      token,
      user: publicUser(account, false),
    });
  } catch (error) {
    console.error('Verify OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    if (req.isTeam) {
      return res.json({
        success: true,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: '',
          address: {},
          isTeam: true,
          active: req.user.active,
        },
      });
    }
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        isTeam: false,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/me
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) {
      user.name = name;
    }
    if (phone) {
      user.phone = phone;
    }
    if (address) {
      if (address.street) {
        user.address.street = address.street;
      }
      if (address.city) {
        user.address.city = address.city;
      }
      if (address.state) {
        user.address.state = address.state;
      }
      if (address.postcode) {
        user.address.postcode = address.postcode;
      }
      if (address.country) {
        user.address.country = address.country;
      }
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request a password reset OTP via SMS
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const user = await User.findOne({ phone: phoneRegex(phone) });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this phone number',
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordToken = hashOtp(otp);
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    const result = await sendPasswordResetOtp({ phone: user.phone, otp });
    if (result.skipped || !result.success) {
      console.error('Forgot password SMS failed:', result.reason || result.log?.providerMessage);
      return res.status(500).json({
        success: false,
        message: 'Could not send the code. SMS service is not configured or is unavailable.',
      });
    }

    res.json({ success: true, message: 'OTP sent to your phone' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset password with the SMS OTP
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { phone, otp, newPassword } = req.body;
    if (!phone || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'phone, otp and newPassword are required',
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    const user = await User.findOne({ phone: phoneRegex(phone) }).select('+password');
    if (!user || !user.resetPasswordToken) {
      return res.status(400).json({
        success: false,
        message: 'No password reset was requested for this phone',
      });
    }
    if (!user.resetPasswordExpire || user.resetPasswordExpire < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Request a new code.',
      });
    }
    if (user.resetPasswordToken !== hashOtp(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please login.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all saved addresses of logged-in user
// @route   GET /api/auth/me/addresses
// @access  Private
export const getAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, addresses: user.addresses || [] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a new saved address
// @route   POST /api/auth/me/addresses
// @access  Private
export const addAddress = async (req, res) => {
  try {
    const {
      label,
      fullName,
      phone,
      street,
      city,
      state,
      postcode,
      country,
      deliveryArea,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isFirst = user.addresses.length === 0;
    user.addresses.push({
      label: label || 'Home',
      fullName: fullName || user.name,
      phone: phone || user.phone,
      street: street || '',
      city: city || '',
      state: state || '',
      postcode: postcode || '',
      country: country || 'Bangladesh',
      deliveryArea: deliveryArea || '',
      isDefault: isFirst,
    });

    await user.save();
    res.status(201).json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a saved address
// @route   PUT /api/auth/me/addresses/:id
// @access  Private
export const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      label,
      fullName,
      phone,
      street,
      city,
      state,
      postcode,
      country,
      deliveryArea,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (label !== undefined) address.label = label;
    if (fullName !== undefined) address.fullName = fullName;
    if (phone !== undefined) address.phone = phone;
    if (street !== undefined) address.street = street;
    if (city !== undefined) address.city = city;
    if (state !== undefined) address.state = state;
    if (postcode !== undefined) address.postcode = postcode;
    if (country !== undefined) address.country = country;
    if (deliveryArea !== undefined) address.deliveryArea = deliveryArea;

    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a saved address
// @route   DELETE /api/auth/me/addresses/:id
// @access  Private
export const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    const wasDefault = address.isDefault;
    address.deleteOne();
    await user.save();

    // If the deleted address was default, promote the first remaining one
    if (wasDefault && user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
      user.addresses[0].isDefault = true;
      await user.save();
    }

    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set an address as default
// @route   PUT /api/auth/me/addresses/:id/default
// @access  Private
export const setDefaultAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const address = user.addresses.id(id);
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    user.addresses.forEach((a) => { a.isDefault = a._id.toString() === id; });
    await user.save();
    res.json({ success: true, addresses: user.addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
