/**
 * permissionGroupController.js
 *
 * CRUD for reusable PermissionGroup templates.
 * Mounted at /api/permission-groups — all routes require protect + superAdminOnly.
 */

import AuditLog from '../models/AuditLog.js';
import PermissionGroup from '../models/PermissionGroup.js';
import TeamMember from '../models/TeamMember.js';
import { MODULES, ACTIONS } from '../utils/permissions.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const logAction = (req, eventType, target, changes = {}) =>
  AuditLog.create({
    actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
    action: eventType,
    target: String(target || ''),
    changes,
    ip: req.ip || req.connection?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
    eventType,
  }).catch(() => {});

const validatePermissions = (perms) => {
  if (!Array.isArray(perms)) return 'permissions must be an array';
  const validModules = new Set(MODULES.map((m) => m.key));
  for (const entry of perms) {
    if (!validModules.has(entry.module)) {
      return `Unknown module: "${entry.module}"`;
    }
    for (const key of Object.keys(entry)) {
      if (key === 'module') continue;
      if (!ACTIONS.includes(key)) {
        return `Unknown action "${key}" on module "${entry.module}"`;
      }
    }
  }
  return null;
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/permission-groups
 * All permission groups with a count of how many staff use each one.
 */
export const getPermissionGroups = async (req, res) => {
  try {
    const groups = await PermissionGroup.find().sort({ createdAt: -1 }).lean();

    // Attach usage counts
    const ids = groups.map((g) => g._id);
    const usageCounts = await TeamMember.aggregate([
      { $match: { permissionGroup: { $in: ids } } },
      { $group: { _id: '$permissionGroup', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(
      usageCounts.map((u) => [String(u._id), u.count])
    );

    const enriched = groups.map((g) => ({
      ...g,
      usageCount: countMap[String(g._id)] || 0,
    }));

    res.json({ success: true, groups: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/permission-groups/:id
 */
export const getPermissionGroupById = async (req, res) => {
  try {
    const group = await PermissionGroup.findById(req.params.id).lean();
    if (!group) {
      return res.status(404).json({ success: false, message: 'Permission group not found' });
    }
    const usageCount = await TeamMember.countDocuments({
      permissionGroup: group._id,
    });
    res.json({ success: true, group: { ...group, usageCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/permission-groups
 * Create a new reusable permission template.
 */
export const createPermissionGroup = async (req, res) => {
  try {
    const { name, description, color, permissions } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'Name is required' });
    }

    const dup = await PermissionGroup.findOne({
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
    });
    if (dup) {
      return res.status(400).json({
        success: false,
        message: 'A permission group with this name already exists',
      });
    }

    if (permissions?.length) {
      const err = validatePermissions(permissions);
      if (err) return res.status(400).json({ success: false, message: err });
    }

    const group = await PermissionGroup.create({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '#6366f1',
      permissions: permissions || [],
      createdBy: { id: req.user._id, name: req.user.name },
      updatedBy: { id: req.user._id, name: req.user.name },
    });

    await logAction(req, 'PERMISSION_GROUP_CREATED', group._id, { name: group.name });

    res.status(201).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PUT /api/permission-groups/:id
 * Update a permission group.  Changes propagate automatically because staff
 * members populate the group at request time via Mongoose populate().
 */
export const updatePermissionGroup = async (req, res) => {
  try {
    const group = await PermissionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Permission group not found' });
    }

    const { name, description, color, permissions, active } = req.body;

    if (name !== undefined) {
      const newName = name.trim();
      if (newName !== group.name) {
        const dup = await PermissionGroup.findOne({
          name: { $regex: `^${newName}$`, $options: 'i' },
          _id: { $ne: group._id },
        });
        if (dup) {
          return res.status(400).json({
            success: false,
            message: 'A permission group with this name already exists',
          });
        }
      }
      group.name = newName;
    }
    if (description !== undefined) group.description = description.trim();
    if (color !== undefined) group.color = color;
    if (typeof active === 'boolean') group.active = active;

    if (permissions !== undefined) {
      if (permissions.length) {
        const err = validatePermissions(permissions);
        if (err) return res.status(400).json({ success: false, message: err });
      }
      group.permissions = permissions;
    }

    group.updatedBy = { id: req.user._id, name: req.user.name };
    await group.save();

    await logAction(req, 'PERMISSION_GROUP_UPDATED', group._id, { name: group.name });

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/permission-groups/:id
 * Delete a permission group.  Staff members that referenced it will fall back
 * to role-based default permissions automatically.
 */
export const deletePermissionGroup = async (req, res) => {
  try {
    const group = await PermissionGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Permission group not found' });
    }

    const usageCount = await TeamMember.countDocuments({
      permissionGroup: group._id,
    });

    // Unlink all staff members that referenced this group
    if (usageCount > 0) {
      await TeamMember.updateMany(
        { permissionGroup: group._id },
        { $set: { permissionGroup: null } }
      );
    }

    await logAction(req, 'PERMISSION_GROUP_DELETED', group._id, {
      name: group.name,
      affectedStaff: usageCount,
    });

    await group.deleteOne();

    res.json({
      success: true,
      message: `Permission group "${group.name}" deleted. ${usageCount} staff member(s) reverted to role defaults.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
