import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getMyBuilds,
  saveBuild,
  deleteBuild,
} from '../controllers/pcBuildController.js';

const router = express.Router();

router.get('/builds', protect, getMyBuilds);
router.post('/builds', protect, saveBuild);
router.delete('/builds/:id', protect, deleteBuild);

export default router;