import express from 'express';
import { getStatus, updateMaintenance } from '../controllers/maintenanceController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/status', getStatus);
router.put('/', protect, superAdminOnly, updateMaintenance);

export default router;
