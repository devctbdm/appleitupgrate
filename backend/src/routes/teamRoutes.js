import express from 'express';
import {
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
} from '../controllers/teamController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, adminOnly, getTeamMembers);
router.post('/', protect, adminOnly, createTeamMember);
router.put('/:id', protect, adminOnly, updateTeamMember);
router.delete('/:id', protect, adminOnly, deleteTeamMember);

export default router;
