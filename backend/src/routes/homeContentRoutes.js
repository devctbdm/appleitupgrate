import express from 'express';
import {
    deleteHomeContent,
    getHomeContent,
    upsertHomeContent,
} from '../controllers/homeContentController.js';
import { adminOnly, protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getHomeContent);
router.put('/', protect, adminOnly, upsertHomeContent);
router.delete('/', protect, adminOnly, deleteHomeContent);

export default router;