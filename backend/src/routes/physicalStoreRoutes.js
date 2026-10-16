import express from 'express';
import {
  getAllPhysicalStores,
  getPhysicalStoreById,
  createPhysicalStore,
  updatePhysicalStore,
  deletePhysicalStore,
  reorderPhysicalStores,
  getPhysicalStoreSettingStatus,
  updatePhysicalStoreSettingStatus,
} from '../controllers/physicalStoreController.js';
import { uploadPhysicalStoreBanner } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Public routes (storefront) ----
router.get('/', getAllPhysicalStores);
router.get('/setting', getPhysicalStoreSettingStatus);
router.get('/:id', getPhysicalStoreById);

// ---- Admin-only routes ----
router.post('/', protect, adminOnly, createPhysicalStore);
router.put('/reorder', protect, adminOnly, reorderPhysicalStores);
router.put('/setting', protect, adminOnly, uploadPhysicalStoreBanner, updatePhysicalStoreSettingStatus);
router.put('/:id', protect, adminOnly, updatePhysicalStore);
router.delete('/:id', protect, adminOnly, deletePhysicalStore);

export default router;
