/**
 * staffController.js
 *
 * All Staff & Access Management endpoints.
 * Mounted at /api/staff — every route requires protect + superAdminOnly.
 *
 * Endpoints:
 *   GET    /api/staff              – paginated list with stats
 *   GET    /api/staff/stats        – overview counts only
 *   GET    /api/staff/:id          – single staff member (with resolved permissions)
 *   POST   /api/staff              – create staff member
 *   PUT    /api/staff/:id          – update details / role / permissions
 *   PATCH  /api/staff/:id/status   – toggle active / inactive
 *   DELETE /api/staff/:id          – remove staff member
 */

import AuditLog from '../models/AuditLog.js';
import PermissionGroup from '../models/PermissionGroup.js';
import TeamMember from '../models/TeamMember.js';
import { MODULES, ACTIONS, resolvePermissions } from '../utils/permissions.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Shape returned to the client – never expose hashed password or OTP fields */
const publicMember = (m) => {
  const obj = m.toObject ? m.toObject() : { ...m };
  delete obj.password;
  delete obj.twoFactorOtp;
  delete obj.twoFactorOtpExpire;
  delete obj.twoFactorAttempts;
  delete obj.loginAttempts;
  delete obj.lockUntil;
  return obj;
};

/** Write a structured audit log entry for staff management actions */
const logStaffAction = (req, eventType, target, changes = {}) =>
  AuditLog.create({
    actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
    action: eventType,
    target: String(target || ''),
    changes,
    ip: req.ip || req.connection?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    eventType,
  }).catch(() => {});

/** Validate that custom permissions contain valid module keys and action fields */
const validatePermissions = (perms) => {
  if (!Array.isArray(perms)) return 'customPermissions must be an array';
  const validModules = new Set(MODULES.map((m) => m.key));
  for (const entry of perms) {
    if (!validModules.has(entry.module)) {
      return `Unknown module: "${entry.module}"`;
    }
    for (const action of Object.keys(entry)) {
      if (action === 'module') continue;
      if (!ACTIONS.includes(action)) {
        return `Unknown action "${action}" on module "${entry.module}"`;
      }
    }
  }
  return null;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/staff/stats
 * Quick aggregated counts – used by the overview cards.
 */
export const getStaffStats = async (req, res) => {
  try {
    const [total, active, inactive, bySuperAdmin, byAdmin, byManager] =
      await Promise.all([
        TeamMember.countDocuments(),
        TeamMember.countDocuments({ active: true }),
        TeamMember.countDocuments({ active: false }),
        TeamMember.countDocuments({ role: 'super_admin' }),
        TeamMember.countDocuments({ role: 'admin' }),
        TeamMember.countDocuments({ role: 'manager' }),
      ]);

    // Recent staff activity from the audit log
    const recentActivity = await AuditLog.find({
      eventType: {
        $in: [
          'STAFF_CREATED',
          'STAFF_UPDATED',
          'STAFF_DELETED',
          'STAFF_STATUS_CHANGED',
          'STAFF_PERMISSIONS_UPDATED',
          'STAFF_ROLE_CHANGED',
        ],
      },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      stats: {
        total,
        active,
        inactive,
        byRole: { super_admin: bySuperAdmin, admin: byAdmin, manager: byManager },
      },
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/staff
 * Paginated staff list with optional search, role, and status filters.
 */
export const getStaff = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'all') query.role = role;
    if (status === 'active') query.active = true;
    if (status === 'inactive') query.active = false;

    const [total, members] = await Promise.all([
      TeamMember.countDocuments(query),
      TeamMember.find(query)
        .select('-password -twoFactorOtp -twoFactorOtpExpire -twoFactorAttempts -loginAttempts -lockUntil')
        .populate('permissionGroup', 'name color description')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit)),
    ]);

    res.json({
      success: true,
      count: members.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      members,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/staff/:id
 * Single staff member – includes resolved effective permissions.
 */
export const getStaffById = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id)
      .select('-password -twoFactorOtp -twoFactorOtpExpire -twoFactorAttempts -loginAttempts -lockUntil')
      .populate('permissionGroup', 'name color description permissions');

    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({
      success: true,
      member: publicMember(member),
      effectivePermissions: resolvePermissions(member),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/staff
 * Create a new staff member.
 * Only super_admin can call this endpoint (enforced by route).
 */
export const createStaff = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      permissionGroup,
      customPermissions,
    } = req.body;

    // ── Basic validation ─────────────────────────────────────────────────
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }
    if (!email?.trim()) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }
    const validRoles = ['admin', 'manager', 'super_admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // ── Duplicate email check ─────────────────────────────────────────────
    const existing = await TeamMember.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    // ── Validate custom permissions if provided ───────────────────────────
    if (customPermissions?.length) {
      const err = validatePermissions(customPermissions);
      if (err) return res.status(400).json({ success: false, message: err });
    }

    // ── Validate permissionGroup reference ────────────────────────────────
    if (permissionGroup) {
      const pg = await PermissionGroup.findById(permissionGroup);
      if (!pg) {
        return res.status(400).json({ success: false, message: 'Permission group not found' });
      }
    }

    const member = new TeamMember({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone?.trim() || '',
      role: role || 'manager',
      permissionGroup: permissionGroup || null,
      customPermissions: customPermissions || [],
    });

    await member.save();

    await logStaffAction(req, 'STAFF_CREATED', member._id, {
      name: member.name,
      email: member.email,
      role: member.role,
    });

    res.status(201).json({ success: true, member: publicMember(member) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/staff/:id
 * Update a staff member's details, role, or permissions.
 * Protections:
 *  – Cannot lower/change own role
 *  – Cannot remove the last active super_admin
 *  – customPermissions and permissionGroup are mutually exclusive (custom wins)
 */
export const updateStaff = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    const {
      name,
      email,
      phone,
      password,
      role,
      permissionGroup,
      customPermissions,
    } = req.body;

    const changes = {};

    // ── Role change guards ────────────────────────────────────────────────
    if (role !== undefined && role !== member.role) {
      const validRoles = ['admin', 'manager', 'super_admin'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
      }
      // Cannot self-demote
      if (String(req.user._id) === String(member._id)) {
        return res.status(403).json({
          success: false,
          message: 'You cannot change your own role',
        });
      }
      // Cannot remove the last active super_admin
      if (member.role === 'super_admin' && role !== 'super_admin') {
        const superAdminCount = await TeamMember.countDocuments({
          role: 'super_admin',
          active: true,
          _id: { $ne: member._id },
        });
        if (superAdminCount === 0) {
          return res.status(403).json({
            success: false,
            message: 'Cannot demote the last active super admin',
          });
        }
      }
      changes.role = { from: member.role, to: role };
      member.role = role;
    }

    // ── Field updates ─────────────────────────────────────────────────────
    if (name !== undefined) {
      member.name = name.trim();
      changes.name = name.trim();
    }
    if (email !== undefined) {
      const newEmail = email.toLowerCase().trim();
      if (newEmail !== member.email) {
        const dup = await TeamMember.findOne({
          email: newEmail,
          _id: { $ne: member._id },
        });
        if (dup) {
          return res.status(400).json({ success: false, message: 'Email already in use' });
        }
      }
      member.email = newEmail;
      changes.email = newEmail;
    }
    if (phone !== undefined) {
      member.phone = phone.trim();
    }
    if (password && password.length >= 8) {
      member.password = password; // pre-save hook will hash it
      changes.passwordChanged = true;
    }

    // ── Permissions ───────────────────────────────────────────────────────
    if (customPermissions !== undefined) {
      if (customPermissions.length) {
        const err = validatePermissions(customPermissions);
        if (err) return res.status(400).json({ success: false, message: err });
      }
      member.customPermissions = customPermissions;
      // Clear the group when explicit custom perms are set
      member.permissionGroup = null;
      changes.permissionsUpdated = true;
    } else if (permissionGroup !== undefined) {
      if (permissionGroup) {
        const pg = await PermissionGroup.findById(permissionGroup);
        if (!pg) {
          return res.status(400).json({ success: false, message: 'Permission group not found' });
        }
      }
      member.permissionGroup = permissionGroup || null;
      // Clear custom perms when a group is assigned
      member.customPermissions = [];
      changes.permissionsUpdated = true;
    }

    await member.save();

    // ── Structured audit logging ──────────────────────────────────────────
    const eventType =
      changes.role
        ? 'STAFF_ROLE_CHANGED'
        : changes.permissionsUpdated
          ? 'STAFF_PERMISSIONS_UPDATED'
          : 'STAFF_UPDATED';

    await logStaffAction(req, eventType, member._id, {
      target: member.name,
      ...changes,
    });

    const populated = await TeamMember.findById(member._id)
      .select('-password -twoFactorOtp -twoFactorOtpExpire -twoFactorAttempts -loginAttempts -lockUntil')
      .populate('permissionGroup', 'name color description');

    res.json({ success: true, member: publicMember(populated) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/staff/:id/status
 * Toggle the active flag of a staff member.
 * Protection: cannot deactivate the last active super_admin.
 */
export const toggleStaffStatus = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Cannot deactivate self
    if (String(req.user._id) === String(member._id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    const nextActive = !member.active;

    // Cannot deactivate the last active super_admin
    if (member.role === 'super_admin' && !nextActive) {
      const activeSuperAdminCount = await TeamMember.countDocuments({
        role: 'super_admin',
        active: true,
        _id: { $ne: member._id },
      });
      if (activeSuperAdminCount === 0) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate the last active super admin',
        });
      }
    }

    member.active = nextActive;
    await member.save();

    await logStaffAction(req, 'STAFF_STATUS_CHANGED', member._id, {
      target: member.name,
      active: nextActive,
    });

    res.json({
      success: true,
      active: member.active,
      message: `${member.name} is now ${member.active ? 'active' : 'inactive'}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/staff/:id
 * Permanently remove a staff member.
 * Cannot delete the last active super_admin or yourself.
 */
export const deleteStaff = async (req, res) => {
  try {
    const member = await TeamMember.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Cannot delete yourself
    if (String(req.user._id) === String(member._id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // Cannot delete the last active super_admin
    if (member.role === 'super_admin') {
      const remaining = await TeamMember.countDocuments({
        role: 'super_admin',
        active: true,
        _id: { $ne: member._id },
      });
      if (remaining === 0) {
        return res.status(403).json({
          success: false,
          message: 'Cannot delete the last active super admin',
        });
      }
    }

    await logStaffAction(req, 'STAFF_DELETED', member._id, {
      name: member.name,
      email: member.email,
      role: member.role,
    });

    await member.deleteOne();

    res.json({ success: true, message: `${member.name} has been removed` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
