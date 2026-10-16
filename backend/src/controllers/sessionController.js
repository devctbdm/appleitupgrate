import Session from '../models/Session.js';

export const getSessions = async (req, res) => {
  try {
    const sessions = await Session.find({ user: req.user._id })
      .sort({ lastActive: -1 })
      .limit(20);
    res.json({ success: true, sessions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, user: req.user._id });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    if (session.isCurrent) {
      return res.status(400).json({ success: false, message: 'Cannot revoke current session' });
    }
    await session.deleteOne();
    res.json({ success: true, message: 'Session revoked' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
