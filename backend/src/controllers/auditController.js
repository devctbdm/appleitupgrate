import AuditLog from '../models/AuditLog.js';

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (req.query.role && req.query.role !== 'all') query['actor.role'] = req.query.role;
    if (req.query.status === 'success') query['changes.statusCode'] = { $lt: 400 };
    if (req.query.status === 'failed') query['changes.statusCode'] = { $gte: 400 };
    if (req.query.search) {
      const search = String(req.query.search).trim();
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { 'actor.name': { $regex: search, $options: 'i' } },
        { ip: { $regex: search, $options: 'i' } },
      ];
    }
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      AuditLog.countDocuments(query),
    ]);
    res.json({ success: true, logs, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};