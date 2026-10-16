import Notification from '../models/Notification.js';

// @desc    List notifications (most recent first) with optional filters
// @route   GET /api/notifications
// @access  Private/Admin
export const getNotifications = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

    const filter = {};
    if (req.query.read === 'true') filter.read = true;
    if (req.query.read === 'false') filter.read = false;
    if (req.query.category) filter.category = req.query.category;

    const [items, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(
          (page - 1) *
            Math.min(50, Math.max(1, Number(req.query.limit) || 20))
        )
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({ read: false }),
    ]);

    res.json({
      success: true,
      notifications: items,
      total,
      unreadCount,
      page,
      pages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get the current unread count
// @route   GET /api/notifications/unread-count
// @access  Private/Admin
export const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ read: false });
    res.json({ success: true, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private/Admin
export const markRead = async (req, res) => {
  try {
    const doc = await Notification.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!doc) {
      return res
        .status(404)
        .json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, notification: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   POST /api/notifications/read-all
// @access  Private/Admin
export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ read: false }, { read: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
