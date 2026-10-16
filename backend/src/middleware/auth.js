import jwt from 'jsonwebtoken';
import TeamMember from '../models/TeamMember.js';
import User from '../models/User.js';
import { auditAdminRequest } from './audit.js';

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
      TeamMember.findById(decoded.id).select('-password'),
    ]);

    if (user) {
      req.user = user;
      req.isTeam = false;
      return next();
    }
    if (member) {
      if (!member.active) {
        return res.status(403).json({ success: false, message: 'Account is inactive' });
      }
      req.user = member;
      req.isTeam = true;
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
