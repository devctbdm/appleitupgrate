import express from 'express';
import { getStoreSettings, updateStoreSettings, getPublicStoreSettings } from '../controllers/storeController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', getPublicStoreSettings);
router.get('/', protect, adminOnly, getStoreSettings);
router.put('/', protect, adminOnly, updateStoreSettings);

export default router;
