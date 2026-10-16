// backend/src/routes/paymentRoutes.js

import express from 'express';
import {
  initiatePayment,
  validatePayment,
  ipnListener,
  cancelPayment,
  queryTransaction,
} from '../controllers/paymentController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/initiate', protect, initiatePayment);
router.get('/validate', validatePayment);
router.post('/validate', validatePayment);
router.post('/ipn', ipnListener);
router.get('/transaction/:tran_id', protect, adminOnly, queryTransaction);
router.get('/cancel', cancelPayment);
router.post('/cancel', cancelPayment);

export default router;
