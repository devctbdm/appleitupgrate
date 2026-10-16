import express from 'express';
import {
  getPermissionGroups,
  getPermissionGroupById,
  createPermissionGroup,
  updatePermissionGroup,
  deletePermissionGroup,
} from '../controllers/permissionGroupController.js';
import { protect, superAdminOnly } from '../middleware/auth.js';

const router = express.Router();

// All permission group routes require super_admin
router.use(protect, superAdminOnly);

router.get('/', getPermissionGroups);
router.get('/:id', getPermissionGroupById);
router.post('/', createPermissionGroup);
router.put('/:id', updatePermissionGroup);
router.delete('/:id', deletePermissionGroup);

export default router;
