import AuditLog from '../models/AuditLog.js';

const safeChanges = (body = {}) => {
  const changes = { ...body };
  for (const key of ['password', 'apiKey', 'token', 'pendingToken', 'otp']) {
    delete changes[key];
  }
  return Object.keys(changes).length ? changes : null;
};

export const auditAdminRequest = (req, res, next) => {
  res.on('finish', () => {
    if (req.originalUrl.startsWith('/api/audit')) return;
    AuditLog.create({
      actor: { id: req.user?._id, name: req.user?.name, role: req.user?.role },
      action: `${req.method} ${req.baseUrl}${req.path}`,
      target: req.params?.id || req.body?.orderId || '',
      changes: { request: safeChanges(req.body), statusCode: res.statusCode },
      ip: req.ip || req.connection?.remoteAddress || '',
      userAgent: req.headers['user-agent'] || '',
    }).catch(() => {});
  });
  next();
};

export const recordLogin = (req, account) =>
  AuditLog.create({
    actor: { id: account._id, name: account.name, role: account.role },
    action: 'LOGIN',
    target: 'authentication',
    ip: req.ip || req.connection?.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
  }).catch(() => {});