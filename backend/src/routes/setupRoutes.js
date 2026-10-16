// backend/src/routes/setupRoutes.js
import express from 'express';
import { getSetupStatus, runSetup } from '../controllers/setupController.js';

const router = express.Router();

router.get('/status', getSetupStatus);
router.post('/', runSetup);

export default router;
