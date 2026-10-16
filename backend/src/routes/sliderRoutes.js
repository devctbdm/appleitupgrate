import express from 'express';
import {
  getAllSliders,
  getSliderById,
  createSlider,
  updateSlider,
  deleteSlider,
  reorderSliders,
} from '../controllers/sliderController.js';
import { uploadSliderImage } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Public routes (storefront) ----
router.get('/', getAllSliders);
router.get('/:id', getSliderById);

// ---- Admin-only routes ----
router.post('/', protect, adminOnly, uploadSliderImage, createSlider);
router.put('/reorder', protect, adminOnly, reorderSliders);
router.put('/:id', protect, adminOnly, uploadSliderImage, updateSlider);
router.delete('/:id', protect, adminOnly, deleteSlider);

export default router;
