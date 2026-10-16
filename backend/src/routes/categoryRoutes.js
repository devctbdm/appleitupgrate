import express from 'express';
import {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from '../controllers/categoryController.js';
import { uploadCategoryFields } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// ---- Public routes (storefront) ----
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);

// ---- Admin-only routes ----
router.post('/', protect, adminOnly, uploadCategoryFields, createCategory);
router.put('/reorder', protect, adminOnly, reorderCategories);
router.put('/:id', protect, adminOnly, uploadCategoryFields, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);

export default router;
