import express from 'express';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadOfferImage } from '../middleware/upload.js';
import {
  getAllOffers,
  getOfferBySlug,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
} from '../controllers/offerController.js';

const router = express.Router();

router.get('/', getAllOffers);
router.get('/slug/:slug', getOfferBySlug);
router.get('/:id', getOfferById);

router.post('/', protect, adminOnly, uploadOfferImage, createOffer);
router.put('/:id', protect, adminOnly, uploadOfferImage, updateOffer);
router.delete('/:id', protect, adminOnly, deleteOffer);

export default router;
