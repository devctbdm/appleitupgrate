import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember.js';
import User from '../models/User.js';
import { auditAdminRequest } from './audit.js';
import { resolvePermissions, hasPermission, DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions.js';

export const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [user, member] = await Promise.all([
      User.findById(decoded.id).select('-password'),
      TeamMember.findById(decoded.id)
        .select('-password')
        .populate('permissionGroup', 'name permissions'),
    ]);

    if (user) {
      req.user = user;
      req.isTeam = false;
      // Attach role-based default permissions for User-collection staff
      if (['super_admin', 'admin', 'manager'].includes(user.role)) {
        const fn = DEFAULT_ROLE_PERMISSIONS[user.role];
        req.permissions = fn ? fn() : [];
      }
      return next();
    }
    if (member) {
      if (!member.active) {
        return res.status(403).json({ success: false, message: 'Account is inactive' });
      }
      req.user = member;
      req.isTeam = true;
      req.permissions = resolvePermissions(member);
      return next();
    }

    return res.status(401).json({ success: false, message: 'User not found' });
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'manager')
  ) {
    auditAdminRequest(req, res, next);
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

export const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'super_admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Super admin access required' });
  }
};

/**
 * Granular module-level permission gate.
 *
 * Usage in a route file:
 *   router.get('/', protect, adminOnly, requirePermission('orders', 'view'), handler);
 *
 * Rules:
 *  - super_admin always passes.
 *  - 'manage' on a module implicitly grants every other action within that module.
 *  - Falls back to req.permissions set by protect() for both User and TeamMember accounts.
 *
 * @param {string} module  Module key from MODULES list (e.g. 'orders')
 * @param {string} action  Action key: view | create | edit | delete | manage | export
 */
export const requirePermission = (module, action) => (req, res, next) => {
  const { user } = req;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Not authorized' });
  }

  // super_admin always bypasses granular checks
  if (user.role === 'super_admin') return next();

  const perms = req.permissions;
  if (perms && hasPermission(perms, module, action)) return next();

  return res.status(403).json({
    success: false,
    message: `You don't have permission to ${action} ${module}`,
  });
};
