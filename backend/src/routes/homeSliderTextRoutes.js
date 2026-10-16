import express from 'express';
import {
  getAllHomeSliderTexts,
  getHomeSliderTextById,
  createHomeSliderText,
  updateHomeSliderText,
  deleteHomeSliderText,
  reorderHomeSliderTexts,
} from '../controllers/homeSliderTextController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Public routes (storefront) ----
router.get('/', getAllHomeSliderTexts);
router.get('/:id', getHomeSliderTextById);

// ---- Admin-only routes ----
router.post('/', protect, adminOnly, createHomeSliderText);
router.put('/reorder', protect, adminOnly, reorderHomeSliderTexts);
router.put('/:id', protect, adminOnly, updateHomeSliderText);
router.delete('/:id', protect, adminOnly, deleteHomeSliderText);

export default router;
