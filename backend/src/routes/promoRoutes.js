import express from 'express';
import {
  validatePromo,
  getAllPromos,
  getPromoStats,
  createPromo,
  updatePromo,
  deletePromo,
} from '../controllers/promoController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// Public: validate a code during checkout
router.post('/validate', validatePromo);

// Admin only
router.use(protect, adminOnly);
router.get('/', getAllPromos);
router.get('/stats', getPromoStats);
router.post('/', createPromo);
router.put('/:id', updatePromo);
router.delete('/:id', deletePromo);

export default router;
