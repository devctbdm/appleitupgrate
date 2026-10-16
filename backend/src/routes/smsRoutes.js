import express from 'express';
import {
  getSettings,
  updateSettings,
  getBalance,
  sendSms,
  getLogs,
} from '../controllers/smsController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', protect, adminOnly, getSettings);
router.put('/settings', protect, adminOnly, updateSettings);
router.get('/balance', protect, adminOnly, getBalance);
router.get('/logs', protect, adminOnly, getLogs);
router.post('/send', protect, adminOnly, sendSms);

export default router;
