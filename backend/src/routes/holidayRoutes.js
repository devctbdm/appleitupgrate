import express from 'express';
import {
  getHolidayConfig,
  updateHolidayConfig,
} from '../controllers/holidayController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public config consumed by the storefront holiday page
router.get('/', getHolidayConfig);

// Admin only
router.use(protect, adminOnly);
router.put('/', updateHolidayConfig);

export default router;
