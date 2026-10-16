import express from 'express';
import {
  getStaff,
  getStaffStats,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
} from '../controllers/staffController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();

// All staff management routes require super_admin
router.use(protect, superAdminOnly);

router.get('/stats', getStaffStats);
router.get('/', getStaff);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.patch('/:id/status', toggleStaffStatus);
router.delete('/:id', deleteStaff);

export default router;
