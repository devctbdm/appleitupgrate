// backend/src/routes/authRoutes.js
import express from 'express';
import { register, login, verifyOtp, getMe, updateProfile, changePassword, forgotPassword, resetPassword, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } from '../controllers/authController.js';
import { getSessions, revokeSession } from '../controllers/sessionController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);
router.put('/me/password', protect, changePassword);
router.get('/me/sessions', protect, getSessions);
router.delete('/me/sessions/:id', protect, revokeSession);

router.get('/me/addresses', protect, getAddresses);
router.post('/me/addresses', protect, addAddress);
router.put('/me/addresses/:id', protect, updateAddress);
router.delete('/me/addresses/:id', protect, deleteAddress);
router.put('/me/addresses/:id/default', protect, setDefaultAddress);

export default router;
