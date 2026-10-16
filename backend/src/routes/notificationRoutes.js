import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from '../controllers/notificationController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, getNotifications);
router.get('/unread-count', protect, adminOnly, getUnreadCount);
router.patch('/:id/read', protect, adminOnly, markRead);
router.post('/read-all', protect, adminOnly, markAllRead);

export default router;
