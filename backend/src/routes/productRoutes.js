import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  addRating,
  getPcParts,
} from '../controllers/productController.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

// ---- Public routes ----
router.get('/', getAllProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/slug/:slug', getProductBySlug);
router.get('/pc-parts', getPcParts);
router.get('/:id', getProductById);

// ---- Authenticated user routes ----
router.post('/:id/ratings', protect, addRating);

// ---- Admin-only routes (protected) ----
router.post(
  '/',
  protect,
  adminOnly,
  uploadMultiple, // field name: 'images' (max 10)
  createProduct
);

router.put(
  '/:id',
  protect,
  adminOnly,
  uploadMultiple, // optional: can send updated images
  updateProduct
);

router.delete('/:id', protect, adminOnly, deleteProduct);

export default router;
